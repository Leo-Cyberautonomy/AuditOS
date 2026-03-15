"""WebSocket endpoints for ADK Live Audit streaming.

Bridges the frontend WebSocket connection to the ADK Runner.run_live() loop.
Frontend sends audio/video/text -> LiveRequestQueue -> ADK -> Gemini Live API.
Gemini responses (audio, transcription, tool calls) -> WebSocket -> Frontend.

Endpoints:
  /ws/live/{case_id}/{session_id}      — Field-only agent (original, backward-compatible)
  /ws/companion/{session_id}           — Full companion agent (field + desk tools)
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

from agents.live_audit_agent import live_audit_agent, set_session_context, get_companion_agent
import store_firestore as fs
from store import now_iso

logger = logging.getLogger(__name__)

router = APIRouter()

# Shared session service (persists across requests)
session_service = InMemorySessionService()

APP_NAME = "auditai"


# --- Original field-only endpoint (unchanged) ---

@router.websocket("/live/{case_id}/{session_id}")
async def live_audit_ws(websocket: WebSocket, case_id: str, session_id: str):
    """WebSocket endpoint for real-time live audit sessions.

    Protocol:
    Client -> Server:
      {"type": "audio", "data": "<base64 PCM 16-bit 16kHz mono>"}
      {"type": "image", "data": "<base64 JPEG>"}
      {"type": "text", "text": "..."}

    Server -> Client:
      {"type": "audio", "data": "<base64 PCM 24kHz>"}
      {"type": "transcript", "role": "user"|"assistant", "text": "..."}
      {"type": "tool_call", "name": "...", "args": {...}, "result": {...}}
      {"type": "turn_complete"}
      {"type": "error", "message": "..."}
    """
    await websocket.accept()

    # Set session context for tool functions
    set_session_context(case_id, session_id)

    # Ensure live session exists in Firestore
    existing = await fs.get_live_session(session_id)
    if not existing:
        from models.live_session import LiveSession
        session_obj = LiveSession(
            id=session_id,
            case_id=case_id,
            started_at=now_iso(),
        )
        await fs.create_live_session(session_obj)

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
        live_session = await fs.get_live_session(session_id)
        if live_session and not live_session.ended_at:
            await fs.update_live_session(session_id, {"ended_at": now_iso()})
        try:
            await websocket.close()
        except Exception:
            pass


# --- Companion endpoint (field + desk tools) ---

@router.websocket("/companion/{session_id}")
async def companion_ws(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for the AuditAI Companion agent.

    Supports both field and desk modes. The companion agent has access to all
    11 tools (5 field + 6 desk).

    Additional client -> server message types (beyond audio/image/text):
      {"type": "set_mode", "mode": "field"|"desk"}
      {"type": "screen_context", "page": "...", "data": {...}}
      {"type": "set_case", "case_id": "..."}

    Additional server -> client message types (beyond standard):
      {"type": "ui_command", "action": "...", ...}
    """
    await websocket.accept()

    # Initialize with no case context — will be set dynamically via set_case
    set_session_context("unknown", session_id)

    # Ensure live session exists in Firestore (case_id will be updated via set_case)
    existing = await fs.get_live_session(session_id)
    if not existing:
        from models.live_session import LiveSession
        session_obj = LiveSession(
            id=session_id,
            case_id="unknown",
            started_at=now_iso(),
        )
        await fs.create_live_session(session_obj)

    try:
        # Create ADK session
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=f"companion-{session_id}",
        )

        # Create runner with companion agent (all 11 tools)
        companion_agent = get_companion_agent()
        runner = Runner(
            agent=companion_agent,
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
            _companion_upstream(websocket, live_queue, session_id)
        )
        downstream_task = asyncio.create_task(
            _companion_downstream(websocket, runner, session, live_queue, run_config, session_id)
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
        logger.info(f"Companion WS disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"Companion WS error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        live_session = await fs.get_live_session(session_id)
        if live_session and not live_session.ended_at:
            await fs.update_live_session(session_id, {"ended_at": now_iso()})
        try:
            await websocket.close()
        except Exception:
            pass


# --- Original upstream/downstream (unchanged) ---

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

            # Handle input transcription (user speech -> text)
            if event.input_transcription and event.input_transcription.text:
                text = event.input_transcription.text
                await websocket.send_json({
                    "type": "transcript",
                    "role": "user",
                    "text": text,
                })
                # Save to session transcript
                await _save_transcript(session_id, "user", text)

            # Handle output transcription (model speech -> text)
            if event.output_transcription and event.output_transcription.text:
                text = event.output_transcription.text
                if not _is_thinking_text(text):
                    await websocket.send_json({
                        "type": "transcript",
                        "role": "assistant",
                        "text": text,
                    })
                    await _save_transcript(session_id, "assistant", text)

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

                    # Text output — skip thinking/reasoning parts
                    if part.text and not getattr(part, "thought", False) and not _is_thinking_text(part.text):
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


# --- Companion upstream/downstream ---

async def _companion_upstream(
    websocket: WebSocket,
    live_queue: LiveRequestQueue,
    session_id: str,
):
    """Receive messages from companion frontend, forward to ADK queue.

    Handles additional message types beyond audio/image/text:
    - set_mode: notify agent about mode change (field/desk)
    - screen_context: send current page context to agent
    - set_case: update the case context for tool functions
    """
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "audio":
                audio_bytes = base64.b64decode(msg["data"])
                blob = types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=audio_bytes,
                )
                live_queue.send_realtime(blob)

            elif msg_type == "image":
                image_bytes = base64.b64decode(msg["data"])
                blob = types.Blob(
                    mime_type="image/jpeg",
                    data=image_bytes,
                )
                live_queue.send_realtime(blob)

            elif msg_type == "text":
                content = types.Content(
                    role="user",
                    parts=[types.Part(text=msg["text"])],
                )
                live_queue.send_content(content)

            elif msg_type == "set_mode":
                mode = msg.get("mode", "desk")
                logger.info(f"Companion mode changed to: {mode} (session={session_id})")
                # Inform the agent about mode change via system message
                system_msg = types.Content(
                    role="user",
                    parts=[types.Part(text=(
                        f"[SYSTEM] Mode changed to {mode.upper()}. "
                        f"{'Focus on camera observation and field tools (record equipment, meters, flag issues, capture evidence).' if mode == 'field' else 'Focus on UI navigation, data lookup, and explanation. Use desk tools (navigate, highlight, filter, explain, show regulation, read summary) to help the user.'}"
                    ))],
                )
                live_queue.send_content(system_msg)

            elif msg_type == "screen_context":
                page = msg.get("page", "unknown")
                data = msg.get("data", {})
                logger.info(f"Companion screen context: page={page} (session={session_id})")
                # Send page context to agent as system message
                context_parts = [f"[SYSTEM] User is now viewing: {page}"]
                if data:
                    context_parts.append(f"Page data: {json.dumps(data, default=str)}")
                system_msg = types.Content(
                    role="user",
                    parts=[types.Part(text=" | ".join(context_parts))],
                )
                live_queue.send_content(system_msg)

            elif msg_type == "set_case":
                case_id = msg.get("case_id", "unknown")
                logger.info(f"Companion case set to: {case_id} (session={session_id})")
                # Update contextvars for tool functions
                set_session_context(case_id, session_id)
                # Update live session record
                await fs.update_live_session(session_id, {"case_id": case_id})
                # Inform the agent about the case change
                case = await fs.get_case(case_id)
                if case:
                    system_msg = types.Content(
                        role="user",
                        parts=[types.Part(text=(
                            f"[SYSTEM] Active case changed to {case_id}: "
                            f"{case.company.name} ({case.status}), "
                            f"domain={case.domain}, "
                            f"address={case.company.address}"
                        ))],
                    )
                else:
                    system_msg = types.Content(
                        role="user",
                        parts=[types.Part(text=f"[SYSTEM] Active case set to {case_id}.")],
                    )
                live_queue.send_content(system_msg)

    except WebSocketDisconnect:
        logger.info(f"Companion upstream: client disconnected (session={session_id})")
    except Exception as e:
        logger.error(f"Companion upstream error: {e}")
    finally:
        live_queue.close()


async def _companion_downstream(
    websocket: WebSocket,
    runner: Runner,
    session,
    live_queue: LiveRequestQueue,
    run_config: RunConfig,
    session_id: str,
):
    """Receive events from companion ADK runner, forward to frontend.

    In addition to all standard event forwarding, when a tool_call result
    contains an "action" key, a separate ui_command message is sent to the
    frontend so it can execute the UI action.
    """
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

            # Handle input transcription (user speech -> text)
            if event.input_transcription and event.input_transcription.text:
                text = event.input_transcription.text
                await websocket.send_json({
                    "type": "transcript",
                    "role": "user",
                    "text": text,
                })
                await _save_transcript(session_id, "user", text)

            # Handle output transcription (model speech -> text)
            if event.output_transcription and event.output_transcription.text:
                text = event.output_transcription.text
                if not _is_thinking_text(text):
                    await websocket.send_json({
                        "type": "transcript",
                        "role": "assistant",
                        "text": text,
                    })
                    await _save_transcript(session_id, "assistant", text)

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

                    # Text output — skip thinking/reasoning parts
                    if part.text and not getattr(part, "thought", False) and not _is_thinking_text(part.text):
                        await websocket.send_json({
                            "type": "text",
                            "text": part.text,
                        })

                    # Tool call (ADK handles execution automatically)
                    if part.function_call:
                        await websocket.send_json({
                            "type": "tool_call",
                            "name": part.function_call.name,
                            "args": dict(part.function_call.args) if part.function_call.args else {},
                        })

                    # Tool result — also emit ui_command if result has an "action" key
                    if part.function_response:
                        result = dict(part.function_response.response) if part.function_response.response else {}
                        await websocket.send_json({
                            "type": "tool_result",
                            "name": part.function_response.name,
                            "result": result,
                        })
                        # If the tool result contains an action, send a ui_command
                        if "action" in result:
                            ui_cmd = {"type": "ui_command"}
                            ui_cmd.update(result)
                            await websocket.send_json(ui_cmd)

            # Handle turn complete
            if event.turn_complete:
                await websocket.send_json({"type": "turn_complete"})

            # Handle interrupted
            if event.interrupted:
                await websocket.send_json({"type": "interrupted"})

    except WebSocketDisconnect:
        logger.info(f"Companion downstream: client disconnected (session={session_id})")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Companion downstream error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


# --- Shared helpers ---

import re

_THINKING_PATTERNS = re.compile(
    r"^\*\*[A-Z]|"           # **Bold Title at start (e.g., "**Defining AuditAI's Scope**")
    r"^I'm focusing on|"     # "I'm focusing on..."
    r"^I'm solidifying|"     # "I'm solidifying..."
    r"^I'm aiming|"          # "I'm aiming..."
    r"^My primary goal|"     # "My primary goal..."
    r"^My current focus|"    # "My current focus..."
    r"^I don't need any",    # "I don't need any special resources..."
    re.MULTILINE
)


def _is_thinking_text(text: str) -> bool:
    """Detect Gemini's internal thinking/reasoning text that should not be shown to users."""
    if not text:
        return False
    return bool(_THINKING_PATTERNS.search(text))


async def _save_transcript(session_id: str, role: str, text: str):
    """Save transcript entry to live session in Firestore."""
    await fs.append_transcript(session_id, {
        "role": role,
        "text": text,
        "timestamp": now_iso(),
    })
