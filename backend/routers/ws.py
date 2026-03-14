"""WebSocket endpoint for ADK Live Audit streaming.

Bridges the frontend WebSocket connection to the ADK Runner.run_live() loop.
Frontend sends audio/video/text → LiveRequestQueue → ADK → Gemini Live API.
Gemini responses (audio, transcription, tool calls) → WebSocket → Frontend.
"""

import asyncio
import base64
import json
import logging
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.genai import types

from agents.live_audit_agent import live_audit_agent, set_session_context
import store

logger = logging.getLogger(__name__)

router = APIRouter()

# Shared session service (persists across requests)
session_service = InMemorySessionService()

APP_NAME = "auditai"


@router.websocket("/live/{case_id}/{session_id}")
async def live_audit_ws(websocket: WebSocket, case_id: str, session_id: str):
    """WebSocket endpoint for real-time live audit sessions.

    Protocol:
    Client → Server:
      {"type": "audio", "data": "<base64 PCM 16-bit 16kHz mono>"}
      {"type": "image", "data": "<base64 JPEG>"}
      {"type": "text", "text": "..."}

    Server → Client:
      {"type": "audio", "data": "<base64 PCM 24kHz>"}
      {"type": "transcript", "role": "user"|"assistant", "text": "..."}
      {"type": "tool_call", "name": "...", "args": {...}, "result": {...}}
      {"type": "turn_complete"}
      {"type": "error", "message": "..."}
    """
    await websocket.accept()

    # Set session context for tool functions
    set_session_context(case_id, session_id)

    # Ensure live session exists in store
    if session_id not in store.live_sessions:
        from models.live_session import LiveSession
        store.live_sessions[session_id] = LiveSession(
            id=session_id,
            case_id=case_id,
            started_at=store.now_iso(),
        )

    try:
        # Create ADK session
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=f"auditor-{case_id}",
        )

        # Create runner
        runner = Runner(
            agent=live_audit_agent,
            app_name=APP_NAME,
            session_service=session_service,
        )

        # Create request queue
        live_queue = LiveRequestQueue()

        # Configure for bidirectional audio streaming
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],
            output_audio_transcription=types.AudioTranscriptionConfig(),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Kore",
                    )
                )
            ),
        )

        # Run upstream and downstream concurrently
        upstream_task = asyncio.create_task(
            _upstream(websocket, live_queue)
        )
        downstream_task = asyncio.create_task(
            _downstream(websocket, runner, session, live_queue, run_config, session_id)
        )

        # Wait for either task to complete (disconnect or error)
        done, pending = await asyncio.wait(
            [upstream_task, downstream_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Cancel remaining task
        for task in pending:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        # End live session
        live_session = store.live_sessions.get(session_id)
        if live_session and not live_session.ended_at:
            live_session.ended_at = store.now_iso()
        try:
            await websocket.close()
        except Exception:
            pass


async def _upstream(websocket: WebSocket, live_queue: LiveRequestQueue):
    """Receive messages from frontend WebSocket, forward to ADK queue."""
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg["type"] == "audio":
                audio_bytes = base64.b64decode(msg["data"])
                blob = types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=audio_bytes,
                )
                live_queue.send_realtime(blob)

            elif msg["type"] == "image":
                image_bytes = base64.b64decode(msg["data"])
                blob = types.Blob(
                    mime_type="image/jpeg",
                    data=image_bytes,
                )
                live_queue.send_realtime(blob)

            elif msg["type"] == "text":
                content = types.Content(
                    role="user",
                    parts=[types.Part(text=msg["text"])],
                )
                live_queue.send_content(content)

    except WebSocketDisconnect:
        logger.info("Upstream: client disconnected")
    except Exception as e:
        logger.error(f"Upstream error: {e}")
    finally:
        live_queue.close()


async def _downstream(
    websocket: WebSocket,
    runner: Runner,
    session,
    live_queue: LiveRequestQueue,
    run_config: RunConfig,
    session_id: str,
):
    """Receive events from ADK runner, forward to frontend WebSocket."""
    try:
        async for event in runner.run_live(
            session=session,
            live_request_queue=live_queue,
            run_config=run_config,
        ):
            # Handle errors
            if event.error_code:
                await websocket.send_json({
                    "type": "error",
                    "message": f"{event.error_code}: {event.error_message}",
                })
                continue

            # Handle input transcription (user speech → text)
            if event.input_transcription and event.input_transcription.text:
                text = event.input_transcription.text
                await websocket.send_json({
                    "type": "transcript",
                    "role": "user",
                    "text": text,
                })
                # Save to session transcript
                _save_transcript(session_id, "user", text)

            # Handle output transcription (model speech → text)
            if event.output_transcription and event.output_transcription.text:
                text = event.output_transcription.text
                await websocket.send_json({
                    "type": "transcript",
                    "role": "assistant",
                    "text": text,
                })
                _save_transcript(session_id, "assistant", text)

            # Handle content (audio or text)
            if event.content and event.content.parts:
                for part in event.content.parts:
                    # Audio output
                    if part.inline_data and part.inline_data.data:
                        audio_b64 = base64.b64encode(part.inline_data.data).decode()
                        await websocket.send_json({
                            "type": "audio",
                            "data": audio_b64,
                        })

                    # Text output (when not in audio mode)
                    if part.text:
                        await websocket.send_json({
                            "type": "text",
                            "text": part.text,
                        })

                    # Tool call results (ADK handles execution automatically)
                    if part.function_call:
                        await websocket.send_json({
                            "type": "tool_call",
                            "name": part.function_call.name,
                            "args": dict(part.function_call.args) if part.function_call.args else {},
                        })

                    if part.function_response:
                        await websocket.send_json({
                            "type": "tool_result",
                            "name": part.function_response.name,
                            "result": dict(part.function_response.response) if part.function_response.response else {},
                        })

            # Handle turn complete
            if event.turn_complete:
                await websocket.send_json({"type": "turn_complete"})

            # Handle interrupted
            if event.interrupted:
                await websocket.send_json({"type": "interrupted"})

    except WebSocketDisconnect:
        logger.info("Downstream: client disconnected")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Downstream error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


def _save_transcript(session_id: str, role: str, text: str):
    """Save transcript entry to live session."""
    session = store.live_sessions.get(session_id)
    if session:
        session.transcript.append({
            "role": role,
            "text": text,
            "timestamp": store.now_iso(),
        })
