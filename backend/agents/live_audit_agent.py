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
        # ── Occupational Health & Safety ──────────────────────────────────
        "ISO 45001": {
            "scope": "Occupational health and safety management systems — Requirements with guidance for use",
            "key_clauses": {
                "5.4": "Consultation and participation of workers",
                "6.1": "Actions to address risks and opportunities",
                "6.1.2": "Hazard identification and assessment of risks and opportunities",
                "6.1.3": "Determination of legal requirements and other requirements",
                "8.1": "Operational planning and control",
                "8.1.2": "Eliminating hazards and reducing OH&S risks (hierarchy of controls)",
                "8.2": "Emergency preparedness and response",
                "9.1": "Monitoring, measurement, analysis and performance evaluation",
                "10.2": "Incident, nonconformity and corrective action",
            },
            "hierarchy_of_controls": [
                "Elimination",
                "Substitution",
                "Engineering controls",
                "Administrative controls",
                "Personal protective equipment (PPE)",
            ],
        },
        "OSHA 29 CFR 1910": {
            "scope": "US Occupational Safety and Health Standards for General Industry",
            "key_sections": {
                "1910.132": "General requirements for personal protective equipment (PPE)",
                "1910.134": "Respiratory protection — fit testing, medical evaluation, program requirements",
                "1910.147": "The control of hazardous energy (lockout/tagout) — servicing and maintenance",
                "1910.178": "Powered industrial trucks — operator training and certification",
                "1910.212": "General requirements for all machines — guarding",
                "1910.303": "Electrical — general requirements for wiring design and protection",
                "1910.1200": "Hazard communication — Safety Data Sheets, labeling, training",
            },
            "enforcement": "OSHA inspections may be programmed, complaint-driven, or triggered by fatality/catastrophe; willful violations up to $156,259 per violation",
        },
        "OSHA 29 CFR 1926": {
            "scope": "US Safety and Health Regulations for Construction",
            "key_sections": {
                "1926.20": "General safety and health provisions — accident prevention programs",
                "1926.451": "Scaffolding — general requirements for capacity, construction, and access",
                "1926.501": "Fall protection — duty to have fall protection at 6 feet or more",
                "1926.502": "Fall protection systems criteria and practices (guardrails, safety nets, PFAS)",
                "1926.602": "Material handling equipment — earthmoving, compactors, hauling",
                "1926.1053": "Ladders — design, use, and load capacity requirements",
                "1926.1101": "Asbestos — permissible exposure limits, monitoring, medical surveillance",
            },
            "focus_four_hazards": [
                "Falls (36.5% of construction fatalities)",
                "Struck-by objects (10.1%)",
                "Electrocution (8.5%)",
                "Caught-in/between (1.4%)",
            ],
        },
        # ── Food Safety ──────────────────────────────────────────────────
        "HACCP": {
            "scope": "Hazard Analysis and Critical Control Points — systematic preventive approach to food safety",
            "seven_principles": {
                "Principle 1": "Conduct a hazard analysis — identify biological, chemical, and physical hazards",
                "Principle 2": "Determine Critical Control Points (CCPs) — points where control is essential",
                "Principle 3": "Establish critical limits — maximum/minimum values for each CCP (e.g., temperature, pH, time)",
                "Principle 4": "Establish monitoring procedures — scheduled testing/observation at each CCP",
                "Principle 5": "Establish corrective actions — predefined steps when monitoring shows a CCP deviation",
                "Principle 6": "Establish verification procedures — confirm HACCP system works effectively",
                "Principle 7": "Establish record-keeping and documentation — CCP logs, deviation records, verification records",
            },
            "prerequisite_programs": [
                "Good Manufacturing Practices (GMP)",
                "Sanitation Standard Operating Procedures (SSOPs)",
                "Supplier control",
                "Allergen management",
                "Pest control",
            ],
        },
        "FDA FSMA": {
            "scope": "Food Safety Modernization Act — US federal law shifting focus from response to prevention of foodborne illness",
            "key_rules": {
                "21 CFR 117": "Current Good Manufacturing Practice, Hazard Analysis, and Risk-Based Preventive Controls for Human Food",
                "21 CFR 112": "Standards for the Growing, Harvesting, Packing, and Holding of Produce for Human Consumption",
                "21 CFR 1.500": "Foreign Supplier Verification Programs (FSVP) for Importers of Food for Humans and Animals",
                "21 CFR 121": "Intentional Adulteration — mitigation strategies for food defense",
            },
            "preventive_controls": [
                "Process controls (e.g., cooking, acidification)",
                "Allergen controls (labeling, cross-contact prevention)",
                "Sanitation controls (pathogen harborage)",
                "Supply-chain controls (supplier verification)",
                "Recall plan (mandatory written plan)",
            ],
        },
        "SQF": {
            "scope": "Safe Quality Food — GFSI-benchmarked certification program for food safety and quality management",
            "key_elements": {
                "Module 2": "SQF system elements — management commitment, document control, specifications, food defense",
                "Module 7": "Good manufacturing practices for processing of food products",
                "Module 11": "Good manufacturing practices for storage and distribution",
                "HACCP Plan": "SQF food safety plan based on HACCP principles and Codex Alimentarius guidelines",
            },
            "certification_levels": {
                "Level 1": "Food safety fundamentals — basic GMP/GAP",
                "Level 2": "Certified HACCP-based food safety plan",
                "Level 3": "Comprehensive food safety and quality management system",
            },
        },
        "ISO 22000": {
            "scope": "Food safety management systems — Requirements for any organization in the food chain",
            "key_clauses": {
                "4.1": "Understanding the organization and its context in the food chain",
                "5.1": "Leadership and commitment to food safety",
                "7.1": "Preliminary steps to enable hazard analysis (PRPs, product characteristics, intended use, flow diagrams)",
                "7.4": "Hazard analysis — hazard identification, assessment, and selection of control measures",
                "7.5": "Establishing operational prerequisite programmes (oPRPs)",
                "7.6": "Establishing the HACCP plan — CCP identification, critical limits, monitoring",
                "8.1": "Operational planning and control — PRP, traceability, emergency preparedness",
                "8.4": "Verification planning for the food safety management system",
            },
            "integration": "Combines ISO management system structure (Annex SL) with Codex Alimentarius HACCP principles for a unified food safety approach",
        },
        # ── Fire Safety ──────────────────────────────────────────────────
        "NFPA 72": {
            "scope": "National Fire Alarm and Signaling Code — installation, performance, testing, and maintenance of fire alarm systems",
            "key_chapters": {
                "Chapter 10": "Fundamentals — purpose, application, equipment performance, documentation requirements",
                "Chapter 12": "Circuits and pathways — circuit designations (Class A, B, X), survivability, and pathway performance",
                "Chapter 14": "Inspection, testing, and maintenance — frequencies, methods, and record requirements",
                "Chapter 17": "Initiating devices — smoke detectors, heat detectors, manual pull stations, waterflow switches",
                "Chapter 18": "Notification appliances — audible (horns, speakers) and visible (strobes) appliance placement and performance",
                "Chapter 21": "Emergency communications systems — mass notification, in-building fire emergency voice/alarm",
                "Chapter 23": "Protected premises fire alarm systems — system design and arrangement",
            },
            "inspection_frequencies": {
                "Smoke detectors (sensitivity)": "1 year",
                "Waterflow switches": "Quarterly",
                "Batteries (lead-acid)": "Semiannually",
                "Control equipment": "Annually",
            },
        },
        "NFPA 101": {
            "scope": "Life Safety Code — minimum building design, construction, operation, and maintenance requirements to protect occupants from fire and similar emergencies",
            "key_chapters": {
                "Chapter 7": "Means of egress — components (doors, stairs, corridors), capacity, travel distance, illumination, signage",
                "Chapter 8": "Features of fire protection — construction, compartmentation, opening protectives, smoke barriers",
                "Chapter 9": "Building service and fire protection equipment — HVAC, elevators, detection, suppression, emergency lighting",
                "Chapter 20": "New assembly occupancies — occupant load, egress width, furnishing requirements",
                "Chapter 28": "New industrial occupancies — special-purpose, general-purpose, and high-hazard classifications",
                "Chapter 40": "Industrial storage occupancies — commodity classification, storage arrangement, protection levels",
            },
            "occupancy_classifications": [
                "Assembly", "Educational", "Day-care", "Health care", "Ambulatory health care",
                "Detention/correctional", "Residential", "Mercantile", "Business", "Industrial", "Storage",
            ],
        },
        "EN 54": {
            "scope": "Fire detection and fire alarm systems — European harmonized standard series for system components and design",
            "key_parts": {
                "Part 1": "Introduction — overview of system components and their interrelation",
                "Part 2": "Control and indicating equipment (CIE) — requirements for the central fire alarm panel",
                "Part 3": "Fire alarm devices — audible (sounders) requirements and performance",
                "Part 5": "Heat detectors — point-type, performance requirements and test methods",
                "Part 7": "Smoke detectors — point-type using scattered light, transmitted light, or ionization",
                "Part 11": "Manual call points — design, performance, and marking requirements",
                "Part 13": "Compatibility assessment of system components — interoperability criteria",
                "Part 23": "Fire alarm devices — visual alarm devices (VADs/beacons)",
            },
            "ce_marking": "Products must be CE-marked and tested to EN 54 by a Notified Body before being placed on the European market (Construction Products Regulation)",
        },
        "ISO 7240": {
            "scope": "Fire detection and alarm systems — international standard series covering system design and component performance",
            "key_parts": {
                "Part 1": "General and definitions — system architecture, terminology, and basic requirements",
                "Part 7": "Point-type smoke detectors using scattered light, transmitted light, or ionization — sensitivity and response tests",
                "Part 8": "Carbon monoxide fire detectors — detection principle and performance criteria",
                "Part 11": "Manual call points — ergonomic and performance requirements",
                "Part 14": "Design, installation, commissioning, and service of fire detection and alarm systems in and around buildings",
                "Part 28": "Fire protection control equipment — interface devices for ancillary functions (dampers, doors)",
            },
            "relationship_to_en54": "EN 54 and ISO 7240 are technically aligned; EN 54 parts take precedence in Europe while ISO 7240 applies internationally",
        },
        # ── Environmental Management ─────────────────────────────────────
        "ISO 14001": {
            "scope": "Environmental management systems — Requirements with guidance for use (EMS framework)",
            "key_clauses": {
                "4.1": "Understanding the organization and its context (internal/external environmental issues)",
                "6.1.1": "Actions to address risks and opportunities related to environmental aspects",
                "6.1.2": "Environmental aspects — identify activities, products, services that interact with the environment",
                "6.1.3": "Compliance obligations — legal requirements and other commitments",
                "6.2": "Environmental objectives and planning to achieve them (measurable where practicable)",
                "8.1": "Operational planning and control — processes for significant environmental aspects",
                "8.2": "Emergency preparedness and response for potential environmental incidents",
                "9.1": "Monitoring, measurement, analysis and evaluation of environmental performance",
                "9.2": "Internal audit of the environmental management system",
            },
            "lifecycle_perspective": "Organizations must consider environmental aspects across the product/service lifecycle including procurement, design, delivery, use, and end-of-life",
        },
        # ── Building Code ────────────────────────────────────────────────
        "IBC": {
            "scope": "International Building Code — model code for building design, construction, and occupancy adopted throughout the United States",
            "key_chapters": {
                "Chapter 3": "Use and occupancy classification — Groups A through U (assembly, business, factory, hazardous, etc.)",
                "Chapter 5": "General building heights and areas — allowable height, number of stories, building area by construction type",
                "Chapter 7": "Fire and smoke protection features — fire-resistance-rated construction, fire walls, shaft enclosures",
                "Chapter 9": "Fire protection and life safety systems — automatic sprinklers, standpipes, fire alarm, emergency lighting",
                "Chapter 16": "Structural design — load combinations, dead/live/wind/seismic loads, design methods",
                "Chapter 17": "Special inspections and tests — required inspections during construction (structural, fireproofing, sprinklers)",
                "Chapter 29": "Plumbing systems — minimum fixture counts, materials, sizing",
            },
            "construction_types": {
                "Type I": "Noncombustible, highest fire resistance (I-A: 3-hr structural, I-B: 2-hr)",
                "Type II": "Noncombustible, reduced fire resistance (II-A: 1-hr, II-B: 0-hr)",
                "Type III": "Exterior noncombustible, interior any material",
                "Type IV": "Heavy timber (mass timber) construction",
                "Type V": "Wood-frame, any material (V-A: 1-hr, V-B: 0-hr)",
            },
        },
        # ── Quality Management ───────────────────────────────────────────
        "ISO 9001": {
            "scope": "Quality management systems — Requirements for consistent delivery of products and services that meet customer and regulatory requirements",
            "key_clauses": {
                "4.4": "Quality management system and its processes — process approach, inputs/outputs, interactions",
                "6.1": "Actions to address risks and opportunities (risk-based thinking)",
                "7.1": "Resources — people, infrastructure, process environment, monitoring/measuring resources, organizational knowledge",
                "7.5": "Documented information — creation, updating, and control",
                "8.1": "Operational planning and control of product/service provision",
                "8.4": "Control of externally provided processes, products and services (supplier management)",
                "8.5": "Production and service provision — controlled conditions, identification, traceability, preservation",
                "8.7": "Control of nonconforming outputs — detection, segregation, disposition",
                "9.1": "Monitoring, measurement, analysis and evaluation (including customer satisfaction)",
                "10.2": "Nonconformity and corrective action — root cause analysis, effectiveness verification",
            },
            "quality_principles": [
                "Customer focus",
                "Leadership",
                "Engagement of people",
                "Process approach",
                "Improvement",
                "Evidence-based decision making",
                "Relationship management",
            ],
        },
        # ── Audit Practice ───────────────────────────────────────────────
        "ISO 19011": {
            "scope": "Guidelines for auditing management systems — applicable to all organizations conducting internal or external audits",
            "key_clauses": {
                "5.2": "Establishing audit programme objectives",
                "5.3": "Determining and evaluating audit programme risks and opportunities",
                "5.4": "Establishing the audit programme — scope, resources, schedules",
                "6.2": "Initiating the audit — establishing contact, determining feasibility",
                "6.3": "Preparing audit activities — document review, audit plan, work assignments",
                "6.4": "Conducting audit activities — opening meeting, evidence collection, generating findings",
                "6.5": "Preparing and distributing the audit report",
                "6.6": "Completing the audit — closing meeting, follow-up actions",
                "7.2": "Determining auditor competence — personal behaviour, knowledge, skills",
                "7.4": "Maintaining and improving auditor competence through continual professional development",
            },
            "audit_evidence_methods": [
                "Interviews",
                "Observation of activities and processes",
                "Review of documented information (records, procedures, policies)",
                "Sampling",
            ],
        },
        # ── Property Assessment ──────────────────────────────────────────
        "ASTM E2018": {
            "scope": "Standard Guide for Property Condition Assessments — baseline physical condition evaluation of commercial real estate",
            "key_sections": {
                "Section 6": "Scope of the PCA — site improvements, structural frame, building envelope, mechanical/electrical/plumbing systems",
                "Section 7": "Walk-through survey — visual non-invasive observation of accessible areas and systems",
                "Section 8": "Document review — plans, maintenance records, certificates of occupancy, code violation history",
                "Section 9": "Interviews — discussions with property owner, manager, maintenance staff, and tenants",
                "Section 10": "Opinions of probable costs — replacement reserves, immediate repair costs, deferred maintenance",
                "Section 11": "Reporting — property description, system summaries, cost tables, photos, conclusions",
            },
            "opinion_cost_categories": {
                "Immediate repairs": "Items requiring action within 0-1 year due to existing deficiency or failed condition",
                "Short-term repairs": "Items requiring action within 1-2 years",
                "Replacement reserves": "Capital expenditure projections over the evaluation period (typically 12 years)",
            },
        },
        # ── Facility Management ──────────────────────────────────────────
        "ISO 41001": {
            "scope": "Facility management — Management systems requirements and guidance for developing and implementing an FM system",
            "key_clauses": {
                "4.2": "Understanding the needs and expectations of interested parties (occupants, clients, regulators)",
                "6.1": "Actions to address risks and opportunities in FM service delivery",
                "6.2": "FM objectives and planning to achieve them — measurable and monitored",
                "7.1": "Resources — people, infrastructure, work environment, knowledge for FM operations",
                "8.1": "Operational planning and control — service level agreements, demand management, FM processes",
                "8.2": "Coordination of processes involving interested parties and multi-discipline integration",
                "9.1": "Monitoring, measurement, analysis and evaluation of FM performance (KPIs, benchmarking)",
                "9.2": "Internal audit of the FM management system",
                "10.1": "Nonconformity and corrective action in FM service delivery",
            },
            "fm_service_areas": [
                "Space and workplace management",
                "Health, safety and environment",
                "Maintenance and operations of built assets",
                "Cleaning and pest control",
                "Security and access management",
                "Energy management and sustainability",
            ],
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


# ─── Companion Agent (Field + Desk tools) ──────────────────────────────────

def _build_companion_agent() -> Agent:
    """Build companion agent with all 11 tools (5 field + 6 desk).

    Deferred import to avoid circular dependency at module level.
    """
    from agents.desk_tools import (
        navigate_to,
        highlight_finding,
        filter_findings,
        explain_item,
        show_regulation,
        read_summary,
    )

    COMPANION_INSTRUCTION = SYSTEM_INSTRUCTION + """

COMPANION MODE (DESK):
When in desk mode, you also act as the user's desktop assistant:
- You can navigate the UI to specific pages using navigate_to
- You can highlight findings in the current view using highlight_finding
- You can filter the findings list using filter_findings
- You can explain any audit item (finding, measure, case, ledger entry) using explain_item
- You can look up regulations and standards using show_regulation
- You can read summaries of cases, findings, or measures using read_summary
- When the user asks about data or wants to see something, use the appropriate desk tool
- When navigating, always confirm what page you're taking the user to
- When explaining items, read the details in a clear, professional tone

MODE SWITCHING:
- In FIELD mode: focus on camera/audio observation and field tools
- In DESK mode: focus on UI navigation, data lookup, and explanation tools
- You may use field tools in desk mode if the user asks about standards or wants to flag something
"""

    return Agent(
        name="companion_agent",
        description="Full-featured audit companion with field inspection and desktop UI control capabilities.",
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        instruction=COMPANION_INSTRUCTION,
        tools=FIELD_TOOLS + [
            navigate_to,
            highlight_finding,
            filter_findings,
            explain_item,
            show_regulation,
            read_summary,
        ],
    )


def get_companion_agent() -> Agent:
    """Get or create the singleton companion agent."""
    global _companion_agent
    if _companion_agent is None:
        _companion_agent = _build_companion_agent()
    return _companion_agent


_companion_agent: Agent | None = None
