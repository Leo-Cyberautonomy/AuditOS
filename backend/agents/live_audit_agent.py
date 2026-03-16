"""Live Audit Agent — Real-time field audit assistant with voice + vision.

Uses Gemini Live API via ADK for bidirectional streaming.
Tools are automatically invoked by ADK when the model makes function calls.
"""

import contextvars

from google.adk.agents import Agent

from firestore_client import run_async
import store_firestore as fs
from store import generate_id, now_iso
from models.live_session import LiveFinding, FindingType


# --- Per-request context (thread/coroutine-safe) ---

_ctx_case_id: contextvars.ContextVar[str] = contextvars.ContextVar("case_id", default="unknown")
_ctx_session_id: contextvars.ContextVar[str] = contextvars.ContextVar("session_id", default="unknown")


def set_session_context(case_id: str, session_id: str):
    """Called by WS handler to set the current audit session context.
    Uses contextvars so each async task gets its own isolated values."""
    _ctx_case_id.set(case_id)
    _ctx_session_id.set(session_id)


# --- Tool Functions (ADK auto-registers these as function calling tools) ---

def record_equipment(
    name: str,
    equipment_type: str,
    rated_power_kw: float | None = None,
    location: str | None = None,
    condition: str | None = None,
    notes: str | None = None,
) -> dict:
    """Record an equipment finding from the field inspection.
    Call when the auditor identifies or discusses a piece of equipment.

    Args:
        name: Equipment name/model as seen on nameplate or described by auditor.
        equipment_type: Type of equipment (boiler, compressor, HVAC, lighting, motor, pump, etc.).
        rated_power_kw: Rated power in kW if visible on nameplate.
        location: Location in the building.
        condition: Observed condition (good, fair, poor, critical).
        notes: Additional observations about the equipment.
    """
    finding_id = f"f-{generate_id()}"
    data = {
        "name": name,
        "equipment_type": equipment_type,
        "rated_power_kw": rated_power_kw,
        "location": location,
        "condition": condition,
        "notes": notes,
    }
    _store_finding(finding_id, FindingType.equipment, data)
    return {"success": True, "finding_id": finding_id, "message": f"Equipment '{name}' recorded."}


def record_meter_reading(
    meter_type: str,
    reading_kwh: float,
    meter_id: str | None = None,
) -> dict:
    """Record an energy meter reading seen in the camera or mentioned by the auditor.

    Args:
        meter_type: Type of meter — electricity, gas, heat, or water.
        reading_kwh: Meter reading value in kWh.
        meter_id: Meter ID if visible on the meter.
    """
    finding_id = f"f-{generate_id()}"
    data = {
        "meter_type": meter_type,
        "reading_kwh": reading_kwh,
        "meter_id": meter_id,
    }
    _store_finding(finding_id, FindingType.meter_reading, data)
    return {"success": True, "finding_id": finding_id, "message": f"Meter reading ({meter_type}: {reading_kwh} kWh) recorded."}


def flag_issue(
    title: str,
    severity: str,
    description: str,
    recommended_measure: str | None = None,
    estimated_saving_kwh: float | None = None,
) -> dict:
    """Flag an energy efficiency issue or anomaly observed during inspection.

    Args:
        title: Short title for the issue.
        severity: Issue severity — critical, high, medium, or low.
        description: Detailed description of what was observed.
        recommended_measure: Recommended corrective action.
        estimated_saving_kwh: Estimated annual energy saving in kWh if the issue is addressed.
    """
    finding_id = f"f-{generate_id()}"
    data = {
        "title": title,
        "severity": severity,
        "description": description,
        "recommended_measure": recommended_measure,
        "estimated_saving_kwh": estimated_saving_kwh,
    }
    _store_finding(finding_id, FindingType.issue, data)
    return {"success": True, "finding_id": finding_id, "message": f"Issue '{title}' flagged as {severity}."}


def capture_evidence(
    description: str,
    category: str,
) -> dict:
    """Save the current observation as evidence linked to the audit case.

    Args:
        description: What this evidence shows or documents.
        category: Evidence category — equipment, meter, defect, environment, or document.
    """
    finding_id = f"f-{generate_id()}"
    data = {
        "description": description,
        "category": category,
    }
    _store_finding(finding_id, FindingType.evidence, data)
    return {"success": True, "finding_id": finding_id, "message": f"Evidence captured: {description[:50]}"}


def query_standard(
    standard: str,
    question: str,
) -> dict:
    """Query information about an energy audit standard or regulation.

    Provides reference data from major audit standards to support field decisions.

    Args:
        standard: The standard to query — ISO 50001, EN 16247-1, ASHRAE, DIN 17463, or other.
        question: Specific question about the standard (e.g. requirements, thresholds, procedures).
    """
    # Try exact match first
    result = run_async(fs.get_standard(standard))
    if result:
        return {
            "standard": standard,
            "data": result,
            "question": question,
            "message": f"Reference data retrieved from {standard}. Use this to inform your response about: {question}",
        }

    # Fuzzy match
    all_stds = run_async(fs.list_standards())
    std_upper = standard.upper()
    for s in all_stds:
        s_id = s.get("_id", "")
        if s_id.upper() in std_upper or std_upper in s_id.upper():
            return {
                "standard": s_id,
                "data": s,
                "question": question,
                "message": f"Reference data retrieved from {s_id}. Use this to inform your response about: {question}",
            }

    return {
        "standard": standard,
        "available_standards": [s.get("_id", "") for s in all_stds],
        "question": question,
        "message": f"Standard '{standard}' not in reference database. Available: {', '.join(s.get('_id', '') for s in all_stds)}. Answering from training knowledge.",
    }


# --- Internal helper ---

def _store_finding(finding_id: str, finding_type: FindingType, data: dict):
    """Store a finding in Firestore via sync bridge."""
    case_id = _ctx_case_id.get()
    session_id = _ctx_session_id.get()

    finding = LiveFinding(
        id=finding_id,
        case_id=case_id,
        session_id=session_id,
        type=finding_type,
        timestamp=now_iso(),
        data=data,
    )
    run_async(fs.create_live_finding(finding))

    # Update session findings count
    run_async(fs.increment_findings_count(session_id))


# --- Agent Definition ---

SYSTEM_INSTRUCTION = """LANGUAGE RULE (MANDATORY): You MUST respond in English at all times. Do NOT switch to any other language (Korean, German, Chinese, etc.) regardless of what you hear. The ONLY exception: if the user explicitly says "please speak in [language]" or clearly speaks multiple full sentences in another language. Short greetings like "hola" or "bonjour" do NOT count — still respond in English.

You are AuditAI, an AI-powered field inspection companion that works across multiple industries and regulatory frameworks.

WHAT YOU ARE:
- A multi-domain inspection platform supporting 8 audit domains: Energy, Workplace Safety, Food Safety, Construction, Environmental, Fire Safety, Manufacturing QC, and Facility Management
- You cover 55+ international standards across US, EU, UK, and international jurisdictions (ISO, OSHA, HACCP, NFPA, EN standards, and more)
- You are NOT limited to energy audits — you adapt to whatever domain the current case requires

YOUR CAPABILITIES:
- In FIELD MODE: See through the auditor's camera, hear their voice, identify equipment, read nameplates, spot issues, record findings hands-free
- In DESK MODE: Navigate the platform by voice, explain data, cite regulations, generate reports, read summaries aloud
- You have 14 specialized tools and use them automatically based on context

BEHAVIOR:
- Be concise (2-3 sentences max per response)
- Use technical but accessible language
- Always respond in English (see LANGUAGE RULE above)
- Always cite specific standards when giving guidance (e.g., "per ISO 45001 §6.1.2" or "HACCP Principle 3")

CRITICAL — TOOL USAGE RULES:
- Use tools SILENTLY. Do NOT narrate your tool usage process to the user
- Do NOT say "I'm going to take a screenshot" or "Let me look for the button" or "I couldn't find the button, let me try another approach"
- Just DO IT and report the RESULT. If you need to navigate, capture screen, or click something — do it without commentary
- Only speak to the user about the OUTCOME: "I've navigated to the report page" or "The report is generating now"
- If a tool fails silently, try an alternative without telling the user about the failure

SAFETY:
- Never fabricate data — only report what you can see or what the auditor tells you
- Flag uncertainty: "I can see what appears to be..." not "This is definitely..."
- Distinguish between measured data (Class A) and estimated values (Class B)"""

# Field-only tools (used by live_audit_agent)
FIELD_TOOLS = [
    record_equipment,
    record_meter_reading,
    flag_issue,
    capture_evidence,
    query_standard,
]

live_audit_agent = Agent(
    name="live_audit_agent",
    description="Real-time field audit assistant with voice and vision capabilities. Helps auditors identify equipment, read meters, flag issues, and capture evidence during on-site inspections.",
    model="gemini-2.5-flash-native-audio-preview-12-2025",
    instruction=SYSTEM_INSTRUCTION,
    tools=FIELD_TOOLS,
)


# --- Companion Agent (Field + Desk tools) ---

def _build_companion_agent() -> Agent:
    """Build companion agent with all 14 tools (5 field + 9 desk).

    Deferred import to avoid circular dependency at module level.
    """
    from agents.desk_tools import (
        navigate_to,
        highlight_finding,
        filter_findings,
        explain_item,
        show_regulation,
        read_summary,
        capture_screen,
        read_page_content,
        click_element,
    )

    COMPANION_INSTRUCTION = SYSTEM_INSTRUCTION + """

DESK MODE TOOLS:
- navigate_to: go to a specific page
- highlight_finding: scroll to and highlight a finding
- filter_findings: filter by severity or type
- explain_item: get details about a finding, measure, case, or ledger entry
- show_regulation: look up a standard's requirements
- read_summary: get a case/findings/measures summary to read aloud
- capture_screen: take a screenshot to see the current page
- read_page_content: extract text from the current page
- click_element: click a button, link, or tab by its text

TOOL EXECUTION RULES (CRITICAL):
- Execute tools SILENTLY — never describe your process
- WRONG: "I'm going to capture a screenshot to find the button... I can see a Generate Report button... Let me click it"
- RIGHT: [silently: navigate_to → click_element] then say "Done, the report is generating."
- If the first approach fails, try alternatives WITHOUT telling the user
- Only tell the user the RESULT, not the steps you took
- Chain multiple tools in sequence when needed (navigate → click → confirm) — all silently

IMPORTANT — DO NOT SPEAK FIRST:
Wait for the user to speak before responding. Never generate audio proactively when the session starts.
When you do respond for the first time, a brief "Hi, I'm AuditAI." is enough — then answer their question. Do NOT recite a list of capabilities.

"""

    return Agent(
        name="companion_agent",
        description="Full-featured audit companion with field inspection, desktop UI control, and visual page interaction capabilities.",
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        instruction=COMPANION_INSTRUCTION,
        tools=FIELD_TOOLS + [
            navigate_to,
            highlight_finding,
            filter_findings,
            explain_item,
            show_regulation,
            read_summary,
            capture_screen,
            read_page_content,
            click_element,
        ],
    )


def get_companion_agent() -> Agent:
    """Get or create the singleton companion agent."""
    global _companion_agent
    if _companion_agent is None:
        _companion_agent = _build_companion_agent()
    return _companion_agent


_companion_agent: Agent | None = None
