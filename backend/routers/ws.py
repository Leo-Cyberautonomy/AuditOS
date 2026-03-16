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
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from client, skipping")
                continue

            try:
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
            except Exception as e:
                logger.warning(f"Error processing message type={msg.get('type')}: {e}")
                continue

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
    """Receive events from ADK runner, forward to frontend WebSocket.

    Same streaming design as _companion_downstream.
    """
    _turn_id = 0
    _input_acc = ""
    _output_acc = ""
    try:
        async for event in runner.run_live(
            session=session,
            live_request_queue=live_queue,
            run_config=run_config,
        ):
            if event.error_code:
                await websocket.send_json({
                    "type": "error",
                    "message": f"{event.error_code}: {event.error_message}",
                })
                continue

            if event.input_transcription and event.input_transcription.text:
                if getattr(event.input_transcription, 'finished', False):
                    _input_acc = event.input_transcription.text
                else:
                    _input_acc += event.input_transcription.text
                clean = _input_acc.strip()
                if clean:
                    await websocket.send_json({
                        "type": "transcript_delta",
                        "role": "user",
                        "text": clean,
                        "turn_id": _turn_id,
                    })

            if event.output_transcription and event.output_transcription.text:
                if getattr(event.output_transcription, 'finished', False):
                    _output_acc = event.output_transcription.text
                else:
                    _output_acc += event.output_transcription.text
                clean = _output_acc.strip()
                if clean and not _is_thinking_text(clean):
                    await websocket.send_json({
                        "type": "transcript_delta",
                        "role": "assistant",
                        "text": clean,
                        "turn_id": _turn_id,
                    })

            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.inline_data and part.inline_data.data:
                        audio_b64 = base64.b64encode(part.inline_data.data).decode()
                        await websocket.send_json({
                            "type": "audio",
                            "data": audio_b64,
                        })

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

            if event.turn_complete:
                if _input_acc.strip():
                    await _save_transcript(session_id, "user", _input_acc.strip())
                if _output_acc.strip():
                    await _save_transcript(session_id, "assistant", _output_acc.strip())
                _turn_id += 1
                _input_acc = ""
                _output_acc = ""
                await websocket.send_json({"type": "turn_complete"})

            if event.interrupted:
                _turn_id += 1
                _input_acc = ""
                _output_acc = ""
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
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Companion upstream: invalid JSON from client, skipping")
                continue

            msg_type = msg.get("type")

            try:
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
                    # Mode-only update: just log it. Mode is included in
                    # screen_context messages to avoid a separate send_content()
                    # which would force Gemini to respond immediately.
                    mode = msg.get("mode", "desk")
                    logger.info(f"Companion mode changed to: {mode} (session={session_id})")

                elif msg_type == "screen_context":
                    page = msg.get("page", "unknown")
                    data = msg.get("data", {})
                    mode = msg.get("mode")
                    logger.info(f"Companion screen context: page={page} mode={mode} (session={session_id})")
                    # Send ONE combined context message to agent.
                    # Each send_content() forces turn_complete=true so Gemini
                    # responds immediately — must minimize these calls.
                    context_parts = [f"[CONTEXT] User is viewing: {page}"]
                    if mode:
                        mode_desc = (
                            "Focus on camera observation and field tools."
                            if mode == "field"
                            else "Focus on UI navigation, data lookup, and explanation."
                        )
                        context_parts.append(f"Mode: {mode.upper()} — {mode_desc}")
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
            except Exception as e:
                logger.warning(f"Companion upstream: error processing message type={msg_type}: {e}")
                continue

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

    Streaming design (based on ADK source code):
      - Audio chunks: forwarded immediately. Arrive in order, faster than
        real-time. Frontend plays via sequential scheduling.
      - Transcription: ADK yields INCREMENTAL chunks (partial=True) then
        one FINAL event (finished=True) with the full accumulated text.
        We accumulate incremental chunks server-side and stream the
        cumulative text to the frontend as transcript_delta. The frontend
        REPLACES the bubble text on each delta (same turn_id + role).
      - turn_complete: finalises the turn; frontend seals the bubble.
      - Tool results with "action" key also emit a ui_command.
    """
    _turn_id = 0
    _input_acc = ""    # accumulates INCREMENTAL input_transcription chunks
    _output_acc = ""   # accumulates INCREMENTAL output_transcription chunks
    try:
        async for event in runner.run_live(
            session=session,
            live_request_queue=live_queue,
            run_config=run_config,
        ):
            if event.error_code:
                await websocket.send_json({
                    "type": "error",
                    "message": f"{event.error_code}: {event.error_message}",
                })
                continue

            # ── Transcription (streaming) ──
            # ADK output_transcription: partial events have incremental text,
            # final event (finished=True) has full accumulated text.
            # We accumulate ourselves for partials, and use the final text
            # as the authoritative version.

            if event.input_transcription and event.input_transcription.text:
                if getattr(event.input_transcription, 'finished', False):
                    _input_acc = event.input_transcription.text
                else:
                    _input_acc += event.input_transcription.text
                clean = _input_acc.strip()
                if clean:
                    await websocket.send_json({
                        "type": "transcript_delta",
                        "role": "user",
                        "text": clean,
                        "turn_id": _turn_id,
                    })

            if event.output_transcription and event.output_transcription.text:
                if getattr(event.output_transcription, 'finished', False):
                    _output_acc = event.output_transcription.text
                else:
                    _output_acc += event.output_transcription.text
                clean = _output_acc.strip()
                if clean and not _is_thinking_text(clean):
                    await websocket.send_json({
                        "type": "transcript_delta",
                        "role": "assistant",
                        "text": clean,
                        "turn_id": _turn_id,
                    })

            # ── Audio & tool calls (forwarded as-is) ──
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.inline_data and part.inline_data.data:
                        audio_b64 = base64.b64encode(part.inline_data.data).decode()
                        await websocket.send_json({
                            "type": "audio",
                            "data": audio_b64,
                        })

                    if part.function_call:
                        await websocket.send_json({
                            "type": "tool_call",
                            "name": part.function_call.name,
                            "args": dict(part.function_call.args) if part.function_call.args else {},
                        })

                    if part.function_response:
                        result = dict(part.function_response.response) if part.function_response.response else {}
                        await websocket.send_json({
                            "type": "tool_result",
                            "name": part.function_response.name,
                            "result": result,
                        })
                        if "action" in result:
                            ui_cmd = {"type": "ui_command"}
                            ui_cmd.update(result)
                            await websocket.send_json(ui_cmd)

            # ── Turn complete ──
            if event.turn_complete:
                if _input_acc.strip():
                    await _save_transcript(session_id, "user", _input_acc.strip())
                if _output_acc.strip():
                    await _save_transcript(session_id, "assistant", _output_acc.strip())
                _turn_id += 1
                _input_acc = ""
                _output_acc = ""
                await websocket.send_json({"type": "turn_complete"})

            # ── Interrupted ──
            if event.interrupted:
                _turn_id += 1
                _input_acc = ""
                _output_acc = ""
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
    r"\*\*[A-Z][^*]*\*\*|"              # **Any Bold Title**
    r"^I'm (focusing|solidifying|aiming|analyzing|checking|reviewing|assessing|examining|considering|planning|thinking|looking|trying)|"
    r"^My (primary goal|current focus|aim|objective)|"
    r"^I (should|need to|don't need|ought to|must|will now)|"
    r"^Let me |"
    r"^I'll (start|begin|try|focus|look|check|analyze)|"
    r"^I want to |"
    r"^I have to |"
    r"^This (requires|means|suggests|indicates) |"
    r"^First,? I |"
    r"^Now I |"
    r"^Okay,? (so |let me |I )",
    re.MULTILINE | re.IGNORECASE
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
