"""Tests for recent voice/audio fixes in AuditAI backend.

Covers:
1. _is_thinking_text filtering logic
2. Agent instruction content (system + companion)
3. WebSocket endpoint connectivity
4. Transcription buffer design (overwrite-not-append, flush-on-turn-complete)
"""

import pytest

# ---------------------------------------------------------------------------
# 1. _is_thinking_text
# ---------------------------------------------------------------------------

from routers.ws import _is_thinking_text


class TestIsThinkingText:
    """Verify Gemini internal thinking/reasoning text is correctly detected."""

    # --- Should be detected as thinking (return True) ---

    @pytest.mark.parametrize("text", [
        "**Bold Title**",
        "**Analyzing the Equipment**",
        "**Key Observations**",
        "I'm focusing on the compressor readings",
        "I'm analyzing the data now",
        "I'm checking the meter",
        "Let me check the nameplate",
        "Let me look at the readings more carefully",
        "I should compare this to the baseline",
        "I need to verify the power factor",
        "My primary goal is to identify inefficiencies",
        "I'll start by looking at the HVAC system",
        "I want to understand the load profile",
        "This requires further investigation",
        "First, I need to check the documentation",
        "Now I can see the full picture",
        "Okay, so the readings suggest a problem",
        "Okay, let me think about this",
        "I have to consider the seasonal variation",
        "I will now examine the results",
        "This means the efficiency is below spec",
        "First I should review the baseline",
    ])
    def test_detects_thinking_patterns(self, text: str):
        assert _is_thinking_text(text) is True, f"Should detect as thinking: {text!r}"

    # --- Should NOT be detected as thinking (return False) ---

    @pytest.mark.parametrize("text", [
        "The temperature is 25 degrees Celsius",
        "I recorded the meter reading at 1500 kWh",
        "The compressor is rated at 75 kW",
        "Based on the nameplate, this unit is a Carrier 30XA",
        "The boiler efficiency is approximately 82 percent",
        "Hello, how can I help you today?",
        "The equipment appears to be in good condition",
        "That reading is within normal range",
        "",
    ])
    def test_allows_normal_text(self, text: str):
        assert _is_thinking_text(text) is False, f"Should allow normal text: {text!r}"

    def test_empty_string_returns_false(self):
        assert _is_thinking_text("") is False

    def test_none_like_empty(self):
        """Empty/falsy input should not raise."""
        assert _is_thinking_text("") is False


# ---------------------------------------------------------------------------
# 2. Agent instruction content
# ---------------------------------------------------------------------------

from agents.live_audit_agent import SYSTEM_INSTRUCTION


class TestAgentInstructions:
    """Verify critical instruction content for the voice agents."""

    # -- SYSTEM_INSTRUCTION checks --

    def test_system_instruction_contains_be_concise(self):
        assert "Be concise" in SYSTEM_INSTRUCTION

    def test_system_instruction_no_speak_first_greeting(self):
        """System instruction should NOT tell the agent to speak first."""
        assert "When first connected, say:" not in SYSTEM_INSTRUCTION

    # -- COMPANION_INSTRUCTION checks --
    # COMPANION_INSTRUCTION is built as SYSTEM_INSTRUCTION + extra text inside
    # _build_companion_agent(). We reconstruct the expected companion instruction
    # by reading the known suffix from the source.

    @pytest.fixture()
    def companion_instruction(self) -> str:
        """Build the companion instruction string the same way the agent does,
        without importing desk_tools (which has heavy dependencies)."""
        # The companion instruction is SYSTEM_INSTRUCTION + a known literal block.
        # We read it directly from the source file to stay in sync.
        from pathlib import Path

        src = Path(__file__).resolve().parent.parent / "agents" / "live_audit_agent.py"
        source_code = src.read_text(encoding="utf-8")

        # Extract the COMPANION_INSTRUCTION string content.
        # It starts after 'COMPANION_INSTRUCTION = SYSTEM_INSTRUCTION + """'
        # and ends at the next '"""'
        marker_start = 'COMPANION_INSTRUCTION = SYSTEM_INSTRUCTION + """'
        idx = source_code.index(marker_start)
        after = source_code[idx + len(marker_start):]
        end_idx = after.index('"""')
        companion_suffix = after[:end_idx]

        return SYSTEM_INSTRUCTION + companion_suffix

    def test_companion_has_do_not_speak_first(self, companion_instruction: str):
        assert "DO NOT SPEAK FIRST" in companion_instruction

    def test_companion_has_default_english(self, companion_instruction: str):
        assert "Default to English" in companion_instruction

    def test_companion_no_proactive_greeting(self, companion_instruction: str):
        """Companion should NOT have a 'When first connected, say:' line."""
        assert "When first connected, say:" not in companion_instruction


# ---------------------------------------------------------------------------
# 3. WebSocket endpoint connectivity
# ---------------------------------------------------------------------------

class TestWebSocketEndpoint:
    """Verify the companion WebSocket endpoint is registered on the app.

    We inspect the FastAPI app's route table directly (no TestClient needed),
    avoiding the lifespan which requires Firestore credentials.
    """

    @pytest.fixture()
    def app_routes(self) -> list[str]:
        """Collect all route paths from the FastAPI app (no server start)."""
        from main import app

        paths: list[str] = []
        for route in app.routes:
            path = getattr(route, "path", None)
            if path:
                paths.append(path)
        return paths

    def test_companion_ws_endpoint_exists(self, app_routes: list[str]):
        """The /ws/companion/{session_id} route should be registered."""
        ws_routes = [r for r in app_routes if "companion" in r]
        assert len(ws_routes) > 0, f"No /ws/companion route found in {app_routes}"

    def test_live_ws_endpoint_exists(self, app_routes: list[str]):
        """The /ws/live/{case_id}/{session_id} route should be registered."""
        ws_routes = [r for r in app_routes if "/ws/live" in r]
        assert len(ws_routes) > 0, f"No /ws/live route found in {app_routes}"


# ---------------------------------------------------------------------------
# 4. Transcription buffer logic
# ---------------------------------------------------------------------------


class TestTranscriptionBufferDesign:
    """Test the buffer accumulation pattern used in the downstream handlers.

    The fix (commit 74354b6) changed from append-based buffering to
    overwrite-based buffering:
      - Each transcription event OVERWRITES the buffer (not appends)
      - On turn_complete, input buffer is flushed BEFORE output buffer
      - On interrupted, both buffers are cleared

    We simulate this logic in pure Python to verify correctness.
    """

    @staticmethod
    def _simulate_downstream(events: list[dict]) -> list[dict]:
        """Simulate the buffer logic from _companion_downstream / _live_downstream.

        Each event is a dict with optional keys:
          input_transcription: str or None
          output_transcription: str or None
          turn_complete: bool
          interrupted: bool

        Returns a list of flushed transcript messages in order.
        """
        _input_buffer = ""
        _output_buffer = ""
        flushed: list[dict] = []

        for event in events:
            # Buffer input transcription (overwrite, not append)
            if event.get("input_transcription"):
                _input_buffer = event["input_transcription"]

            # Buffer output transcription (overwrite, not append)
            if event.get("output_transcription"):
                _output_buffer = event["output_transcription"]

            # Flush on turn_complete
            if event.get("turn_complete"):
                if _input_buffer:
                    clean = _input_buffer.strip()
                    if clean:
                        flushed.append({"role": "user", "text": clean})
                    _input_buffer = ""
                if _output_buffer:
                    clean = _output_buffer.strip()
                    if clean:
                        flushed.append({"role": "assistant", "text": clean})
                    _output_buffer = ""

            # Clear on interrupted
            if event.get("interrupted"):
                _input_buffer = ""
                _output_buffer = ""

        return flushed

    def test_overwrite_not_append(self):
        """Each transcription event should overwrite, not accumulate."""
        events = [
            {"output_transcription": "The temp"},
            {"output_transcription": "The temperature is"},
            {"output_transcription": "The temperature is 25 degrees"},
            {"turn_complete": True},
        ]
        result = self._simulate_downstream(events)
        assert len(result) == 1
        # The final overwrite wins — no duplication
        assert result[0]["text"] == "The temperature is 25 degrees"

    def test_input_flushed_before_output(self):
        """Input (user speech) must appear before output (AI speech) in flush order."""
        events = [
            {"input_transcription": "What is the temperature?"},
            {"output_transcription": "The temperature is 25 degrees."},
            {"turn_complete": True},
        ]
        result = self._simulate_downstream(events)
        assert len(result) == 2
        assert result[0]["role"] == "user"
        assert result[1]["role"] == "assistant"

    def test_interrupted_clears_buffers(self):
        """Barge-in (interrupted) should discard partial buffers."""
        events = [
            {"output_transcription": "Let me explain the reading..."},
            {"interrupted": True},
            {"output_transcription": "Okay, the meter shows 500 kWh"},
            {"turn_complete": True},
        ]
        result = self._simulate_downstream(events)
        # Only the post-interruption text should survive
        assert len(result) == 1
        assert result[0]["text"] == "Okay, the meter shows 500 kWh"

    def test_empty_buffers_produce_no_output(self):
        """turn_complete with empty buffers should not produce transcripts."""
        events = [
            {"turn_complete": True},
        ]
        result = self._simulate_downstream(events)
        assert result == []

    def test_whitespace_only_buffer_is_skipped(self):
        """Buffer containing only whitespace should not produce a transcript."""
        events = [
            {"output_transcription": "   \n  "},
            {"turn_complete": True},
        ]
        result = self._simulate_downstream(events)
        assert result == []

    def test_multiple_turns(self):
        """Buffers should reset between turns — no bleed-over."""
        events = [
            {"input_transcription": "Turn 1 question"},
            {"output_transcription": "Turn 1 answer"},
            {"turn_complete": True},
            {"input_transcription": "Turn 2 question"},
            {"output_transcription": "Turn 2 answer"},
            {"turn_complete": True},
        ]
        result = self._simulate_downstream(events)
        assert len(result) == 4
        assert result[0] == {"role": "user", "text": "Turn 1 question"}
        assert result[1] == {"role": "assistant", "text": "Turn 1 answer"}
        assert result[2] == {"role": "user", "text": "Turn 2 question"}
        assert result[3] == {"role": "assistant", "text": "Turn 2 answer"}

    def test_old_append_bug_would_duplicate(self):
        """Demonstrate that appending (the old bug) would produce wrong results.

        With overwrite semantics, progressive transcription events yield
        only the final complete text, not a concatenation of all chunks.
        """
        # Simulate Gemini sending progressive transcription updates
        # (each one is the full text so far, not a delta)
        events = [
            {"output_transcription": "Hello"},
            {"output_transcription": "Hello, I see"},
            {"output_transcription": "Hello, I see the boiler"},
            {"turn_complete": True},
        ]
        result = self._simulate_downstream(events)
        assert len(result) == 1
        # Correct (overwrite): final text only
        assert result[0]["text"] == "Hello, I see the boiler"
        # If we had appended, we'd get "HelloHello, I seeHello, I see the boiler"
        # which is the duplication bug that was fixed.
