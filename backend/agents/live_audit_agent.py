"""Live Audit Agent — Real-time field audit assistant with voice + vision.

Uses Gemini Live API via ADK for bidirectional streaming.
Tools are automatically invoked by ADK when the model makes function calls.
"""

import contextvars

from google.adk.agents import Agent

import store
from models.live_session import LiveFinding, FindingType


# ─── Per-request context (thread/coroutine-safe) ────────────────────────────

_ctx_case_id: contextvars.ContextVar[str] = contextvars.ContextVar("case_id", default="unknown")
_ctx_session_id: contextvars.ContextVar[str] = contextvars.ContextVar("session_id", default="unknown")


def set_session_context(case_id: str, session_id: str):
    """Called by WS handler to set the current audit session context.
    Uses contextvars so each async task gets its own isolated values."""
    _ctx_case_id.set(case_id)
    _ctx_session_id.set(session_id)


# ─── Tool Functions (ADK auto-registers these as function calling tools) ─────

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
    finding_id = f"f-{store.generate_id()}"
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
    finding_id = f"f-{store.generate_id()}"
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
    finding_id = f"f-{store.generate_id()}"
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
    finding_id = f"f-{store.generate_id()}"
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
    # Structured reference data for common audit standards
    refs: dict[str, dict] = {
        "ISO 50001": {
            "scope": "Energy management systems — Requirements with guidance for use",
            "key_clauses": {
                "4.1": "Understanding the organization and its context",
                "6.2": "Energy objectives, targets, and action plans",
                "6.3": "Energy review — analyze energy use and consumption",
                "6.6": "Design consideration for energy performance improvement",
                "8.2": "Operational planning and control",
                "9.1": "Monitoring, measurement, analysis and evaluation of EnPI",
            },
            "enpi_requirements": "Energy Performance Indicators must be measurable, verifiable, and based on documented methodology",
        },
        "EN 16247-1": {
            "scope": "Energy audits — General requirements (Part 1 of 5)",
            "phases": ["Initial contact", "Start-up meeting", "Data collection", "Field work", "Analysis", "Reporting"],
            "key_requirements": {
                "Section 5": "Energy audit process — systematic inspection and analysis",
                "Section 6": "Data collection — minimum 12 months of billing data",
                "Section 7": "Field work — on-site inspection of all significant energy users",
                "Section 8": "Analysis — establish energy balance, identify savings",
                "Section 9": "Report — must include executive summary, measures with costs/savings",
            },
            "data_quality": "Class A (measured) preferred, Class B (estimated) acceptable with documentation",
        },
        "ASHRAE": {
            "scope": "ASHRAE Energy Audit Levels I/II/III",
            "levels": {
                "Level I": "Walk-through — identify low/no-cost measures, ±40% accuracy",
                "Level II": "Energy survey and analysis — detailed calculations, ±15-20% accuracy",
                "Level III": "Detailed analysis of capital-intensive modifications, ±10% accuracy",
            },
            "requirements": "Level II/III require sub-metered data, engineering calculations, and financial analysis (NPV, IRR, SPP)",
        },
        "DIN 17463": {
            "scope": "VALERI — Valuation of Energy-Related Investments",
            "method": "NPV-based economic evaluation of energy efficiency measures",
            "key_sections": {
                "§3.2": "Calculation methodology — discount rate, energy price escalation",
                "§4": "Required inputs: investment cost, annual savings, useful life, maintenance",
                "§5": "Risk assessment via sensitivity analysis",
            },
        },
    }

    # Find best matching standard
    matched_key = None
    standard_upper = standard.upper()
    for key in refs:
        if key.upper() in standard_upper or standard_upper in key.upper():
            matched_key = key
            break

    if matched_key:
        ref_data = refs[matched_key]
        return {
            "standard": matched_key,
            "data": ref_data,
            "question": question,
            "message": f"Reference data retrieved from {matched_key}. Use this to inform your response about: {question}",
        }

    return {
        "standard": standard,
        "available_standards": list(refs.keys()),
        "question": question,
        "message": f"Standard '{standard}' not in reference database. Available: {', '.join(refs.keys())}. Answering from training knowledge.",
    }


# ─── Internal helper ─────────────────────────────────────────────────────────

def _store_finding(finding_id: str, finding_type: FindingType, data: dict):
    """Store a finding in the in-memory store."""
    case_id = _ctx_case_id.get()
    session_id = _ctx_session_id.get()

    finding = LiveFinding(
        id=finding_id,
        case_id=case_id,
        session_id=session_id,
        type=finding_type,
        timestamp=store.now_iso(),
        data=data,
    )
    store.live_findings[finding_id] = finding

    # Update session findings count
    session = store.live_sessions.get(session_id)
    if session:
        session.findings_count += 1


# ─── Agent Definition ────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """You are AuditAI, an expert energy auditor assistant working alongside the auditor during a live field inspection.

YOUR ROLE:
- You can see through the auditor's camera and hear their voice
- Proactively identify equipment, read nameplates, and spot potential energy efficiency issues
- When you see equipment, use the record_equipment function to log it
- When you see a meter, use the record_meter_reading function to capture the reading
- When you spot an issue (leaks, inefficiency, damage), use the flag_issue function
- When asked about standards or benchmarks, use the query_standard function
- Use capture_evidence to save important visual evidence

BEHAVIOR:
- Be concise in voice responses (2-3 sentences max)
- Proactively point out things you notice in the camera feed
- Use technical but accessible language
- Always cite the basis for your recommendations
- Support multiple audit standards: ISO 50001, EN 16247-1, ASHRAE Level I/II/III
- Adapt to the auditor's language (respond in the language they speak)

SAFETY:
- Never fabricate data - only report what you can see or what the auditor tells you
- Flag uncertainty: "I can see what appears to be..." not "This is definitely..."
- Distinguish between measured data (Class A) and estimated values (Class B)"""

live_audit_agent = Agent(
    name="live_audit_agent",
    description="Real-time field audit assistant with voice and vision capabilities. Helps auditors identify equipment, read meters, flag issues, and capture evidence during on-site inspections.",
    model="gemini-2.5-flash-native-audio-preview-12-2025",
    instruction=SYSTEM_INSTRUCTION,
    tools=[
        record_equipment,
        record_meter_reading,
        flag_issue,
        capture_evidence,
        query_standard,
    ],
)
