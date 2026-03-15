"""AuditAI ADK Agents.

- live_audit_agent: Field inspection with voice + vision (used by /ws/live/)
- companion_agent: Full platform companion with field + desk tools (used by /ws/companion/)

Report generation and document extraction use direct Gemini API calls (genai.Client)
rather than ADK agents, because they are one-shot batch operations, not persistent
conversational agents.
"""

from agents.live_audit_agent import live_audit_agent, get_companion_agent

__all__ = ["live_audit_agent", "get_companion_agent"]
