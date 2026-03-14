"""Report Agent — Generates EN 16247-1 / ISO 50001 compliant audit reports.

This agent has access to case data via tools and generates structured
audit reports following international energy audit standards.
"""

import json

from google.adk.agents import Agent

import store as store_module


# ─── Tool Functions ──────────────────────────────────────────────────────────

def get_case_data(case_id: str) -> dict:
    """Retrieve complete case data including company info and energy consumption.

    Args:
        case_id: The audit case identifier.
    """
    case = store_module.cases.get(case_id)
    if not case:
        return {"error": f"Case {case_id} not found"}

    ledger = [e for e in store_module.ledger_entries.values() if e.case_id == case_id]
    strom = sum(e.value_kwh or 0 for e in ledger if e.carrier == "strom")
    gas = sum(e.value_kwh or 0 for e in ledger if e.carrier == "gas")
    fw = sum(e.value_kwh or 0 for e in ledger if e.carrier == "fernwaerme")

    return {
        "company": {
            "name": case.company.name,
            "address": case.company.address,
            "nace_code": case.company.nace_code,
            "industry": case.company.industry,
            "employees": case.company.employees,
            "building_area_m2": case.company.building_area_m2,
        },
        "energy_totals": {
            "electricity_kwh": strom,
            "gas_kwh": gas,
            "district_heating_kwh": fw,
            "total_kwh": strom + gas + fw,
        },
        "monthly_data": [
            {
                "month": e.month,
                "carrier": e.carrier,
                "value_kwh": e.value_kwh,
                "status": e.status,
                "note": e.note,
            }
            for e in sorted(ledger, key=lambda x: x.month)
        ],
    }


def get_measures(case_id: str) -> dict:
    """Retrieve efficiency measures identified for this case.

    Args:
        case_id: The audit case identifier.
    """
    measures = [m for m in store_module.measures.values() if m.case_id == case_id]
    return {
        "measures": [
            {
                "id": m.measure_id,
                "title": m.title,
                "description": m.description,
                "annual_saving_kwh": m.annual_saving_kwh,
                "annual_saving_eur": m.annual_saving_eur,
                "investment_eur": m.investment_eur,
                "payback_years": m.payback_years,
                "evidence": {
                    "measurement": m.evidence.measurement,
                    "method": m.evidence.method,
                    "confidence": m.evidence.confidence,
                    "confidence_note": m.evidence.confidence_note or "",
                },
            }
            for m in sorted(measures, key=lambda x: x.measure_id)
        ]
    }


def get_evidence_summary(case_id: str) -> dict:
    """Retrieve evidence and findings collected during live audit sessions.

    Args:
        case_id: The audit case identifier.
    """
    findings = [f for f in store_module.live_findings.values() if f.case_id == case_id]
    sessions = [s for s in store_module.live_sessions.values() if s.case_id == case_id]

    return {
        "sessions_count": len(sessions),
        "findings_count": len(findings),
        "findings": [
            {
                "type": f.type,
                "timestamp": f.timestamp,
                "data": f.data,
            }
            for f in sorted(findings, key=lambda x: x.timestamp)
        ],
    }


# ─── Agent Definition ────────────────────────────────────────────────────────

REPORT_INSTRUCTION = """You are an expert energy auditor generating a professional audit report.

FIRST: Call get_case_data, get_measures, and get_evidence_summary to retrieve all available data for the case.

Then generate a complete EN 16247-1 / ISO 50001 compliant energy audit report.

BEHAVIORAL RULES:
- Every measure recommendation MUST include concrete numerical values (kWh, kW, currency amounts)
- Every recommendation MUST cite its calculation basis (e.g., ISO 50002 §6.3, EN 16247-1 Section 5)
- Every claim MUST include a parenthesized source reference. At least ONE source reference PER PARAGRAPH.
- Clearly distinguish between Class A (measured data) and Class B (estimated values)
- Forbidden: invented numbers, vague phrases like "could" or "possibly"

FORMAT RULES (STRICTLY FOLLOW):
- Start the report DIRECTLY with the first section heading — NO title, NO introduction before the first ##
- Use EXACTLY these 9 section headings as ## (h2) Markdown headings:

## 1. Executive Summary
## 2. Background and Scope
## 3. Current Energy State and Data Analysis
## 4. Recommended Measures
## 5. Assessment and Prioritization
## 6. Economic Analysis
## 7. Implementation Plan
## 8. Quality Assurance
## 9. Appendices

- Sub-sections use ### (h3). NEVER use # (h1).

MANDATORY — DIGRESSION SECTION:
In section 8 (Quality Assurance), include one subsection:
### Digression: Supplementary Auditor Recommendation
This section contains an additional recommendation beyond the audit scope.

For each measure in section 4, ALSO output an evidence JSON block:

[EVIDENCE_START]
{"measure_id": "M1", "title": "...", "annual_saving_kwh": 0, "annual_saving_eur": 0, "investment_eur": 0, "payback_years": 0.0, "evidence": {"measurement": "...", "method": "...", "price_basis": "...", "confidence": 0, "confidence_note": "..."}}
[EVIDENCE_END]

The JSON must exactly match this schema. Numbers as number type, not as string."""

report_agent = Agent(
    name="report_agent",
    description="Generates comprehensive EN 16247-1 / ISO 50001 compliant energy audit reports. Retrieves case data, measures, and evidence, then produces a structured professional report.",
    model="gemini-3-flash-preview",
    instruction=REPORT_INSTRUCTION,
    tools=[
        get_case_data,
        get_measures,
        get_evidence_summary,
    ],
)
