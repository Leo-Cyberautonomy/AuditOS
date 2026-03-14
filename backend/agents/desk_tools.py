"""Desk-mode tools for the AuditAI Companion Agent.

These tools control the frontend UI and retrieve data for the agent to explain
to the user. They are called by the ADK Agent and their results are forwarded
to the frontend via WebSocket.
"""

import store
from agents.live_audit_agent import _ctx_case_id, _ctx_session_id


def navigate_to(page: str, case_id: str | None = None) -> dict:
    """Navigate the user's browser to a specific page in AuditAI.

    Args:
        page: Target page -- dashboard, cases, live-audit, documents, evidence,
              review, analytics, measures, report, compliance, exports, audit-log.
        case_id: Case ID, required for case-specific pages.
    """
    return {
        "action": "navigate_to",
        "page": page,
        "case_id": case_id or _ctx_case_id.get(),
        "message": f"Navigating to {page}",
    }


def highlight_finding(finding_id: str) -> dict:
    """Scroll to and visually highlight a specific finding in the current view.

    Args:
        finding_id: The finding ID to highlight.
    """
    finding = store.live_findings.get(finding_id)
    detail = finding.data if finding else {}
    return {
        "action": "highlight_finding",
        "finding_id": finding_id,
        "detail": detail,
        "message": f"Highlighting finding {finding_id}",
    }


def filter_findings(
    severity: str | None = None, finding_type: str | None = None
) -> dict:
    """Filter the findings list displayed in the UI.

    Args:
        severity: Filter by severity -- critical, high, medium, low. None for all.
        finding_type: Filter by type -- equipment, meter_reading, issue, evidence. None for all.
    """
    return {
        "action": "filter_findings",
        "severity": severity,
        "type": finding_type,
        "message": f"Filtering: severity={severity}, type={finding_type}",
    }


def explain_item(item_type: str, item_id: str) -> dict:
    """Retrieve detailed information about an audit item to explain to the user.

    Args:
        item_type: Type of item -- finding, measure, case, ledger_entry.
        item_id: ID of the item to explain.
    """
    if item_type == "finding":
        item = store.live_findings.get(item_id)
        if item:
            data = {
                "type": item.type.value,
                "data": item.data,
                "session_id": item.session_id,
                "timestamp": item.timestamp,
            }
        else:
            data = {"error": "Finding not found"}
    elif item_type == "measure":
        item = store.measures.get(item_id)
        if item:
            data = {
                "title": item.title,
                "annual_saving_kwh": item.annual_saving_kwh,
                "annual_saving_eur": item.annual_saving_eur,
                "investment_eur": item.investment_eur,
                "payback_years": item.payback_years,
            }
        else:
            data = {"error": "Measure not found"}
    elif item_type == "case":
        item = store.cases.get(item_id)
        if item:
            data = {
                "company": item.company.name,
                "status": item.status,
                "domain": item.domain,
                "address": item.company.address,
            }
        else:
            data = {"error": "Case not found"}
    elif item_type == "ledger_entry":
        item = store.ledger_entries.get(item_id)
        if item:
            data = {
                "month": item.month,
                "carrier": item.carrier,
                "value_kwh": item.value_kwh,
                "status": item.status,
            }
        else:
            data = {"error": "Ledger entry not found"}
    else:
        data = {"error": f"Unknown item_type: {item_type}"}

    return {
        "item_type": item_type,
        "item_id": item_id,
        "data": data,
        "message": "Item details retrieved. Explain these to the user clearly.",
    }


def show_regulation(standard: str, section: str | None = None) -> dict:
    """Look up a specific regulation or standard and provide reference text.

    The agent should read the relevant information aloud to the user.

    Args:
        standard: Standard name -- ISO 50001, ISO 45001, OSHA, HACCP, NFPA, EN 16247-1, etc.
        section: Specific section or clause number if known.
    """
    from agents.live_audit_agent import query_standard

    result = query_standard(standard, section or "general overview")
    result["action"] = "show_regulation"
    return result


def read_summary(scope: str = "case", case_id: str | None = None) -> dict:
    """Retrieve a data summary for the agent to read aloud to the user.

    Args:
        scope: What to summarize -- case (overview), findings (all findings), measures (recommended actions).
        case_id: Case ID. Uses current context case if not specified.
    """
    cid = case_id or _ctx_case_id.get()

    if scope == "case":
        case = store.cases.get(cid)
        if not case:
            return {
                "error": f"Case {cid} not found",
                "message": "Could not find the specified case.",
            }
        findings = [f for f in store.live_findings.values() if f.case_id == cid]
        measures = [m for m in store.measures.values() if m.case_id == cid]
        return {
            "company": case.company.name,
            "status": case.status,
            "domain": case.domain,
            "total_findings": len(findings),
            "critical_findings": sum(
                1 for f in findings if f.data.get("severity") == "critical"
            ),
            "high_findings": sum(
                1 for f in findings if f.data.get("severity") == "high"
            ),
            "total_measures": len(measures),
            "total_savings_kwh": sum(m.annual_saving_kwh for m in measures),
            "message": "Read this summary aloud to the user in a clear, professional tone.",
        }
    elif scope == "findings":
        findings = [f for f in store.live_findings.values() if f.case_id == cid]
        return {
            "findings": [
                {
                    "id": f.id,
                    "type": f.type.value,
                    "data": f.data,
                    "timestamp": f.timestamp,
                }
                for f in findings
            ],
            "total": len(findings),
            "message": "Summarize these findings for the user, highlighting critical items first.",
        }
    elif scope == "measures":
        measures = [m for m in store.measures.values() if m.case_id == cid]
        return {
            "measures": [
                {
                    "id": m.measure_id,
                    "title": m.title,
                    "saving_kwh": m.annual_saving_kwh,
                    "saving_eur": m.annual_saving_eur,
                    "investment": m.investment_eur,
                    "payback": m.payback_years,
                }
                for m in measures
            ],
            "total": len(measures),
            "message": "Summarize the recommended measures, ordered by savings impact.",
        }

    return {
        "scope": scope,
        "case_id": cid,
        "message": f"Summary for scope '{scope}' requested.",
    }
