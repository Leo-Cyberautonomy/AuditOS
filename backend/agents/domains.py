"""Domain configuration for multi-domain audit support.

Each domain defines:
- name: Display name
- icon: Lucide icon name (for frontend)
- instruction: Domain-specific system prompt supplement
- standards: Supported standards with reference data
- equipment_types: Typical equipment for this domain
- severity_metric: How severity is measured in this domain
"""

DOMAIN_CONFIGS: dict[str, dict] = {
    "energy": {
        "name": "Energy Audit",
        "icon": "Zap",
        "instruction": (
            "You are specialized in energy efficiency auditing. "
            "Focus on energy consumption patterns, equipment efficiency ratings, "
            "insulation quality, HVAC performance, lighting efficiency, and motor/drive systems. "
            "Reference ISO 50001 for management systems, EN 16247-1 for audit procedures, "
            "ASHRAE levels for audit depth, and DIN 17463 for investment evaluation. "
            "Quantify findings in kWh savings and payback periods."
        ),
        "standards": ["ISO 50001", "EN 16247-1", "EN 16247-2", "EN 16247-3",
                      "EN 16247-4", "ASHRAE Level I", "ASHRAE Level II",
                      "ASHRAE Level III", "DIN 17463"],
        "equipment_types": ["boiler", "compressor", "HVAC", "motor", "pump",
                           "lighting", "transformer", "solar_panel", "insulation",
                           "heat_exchanger", "cooling_tower", "VFD"],
        "severity_metric": "kWh/year savings potential",
    },
    "food_safety": {
        "name": "Food Safety Inspection",
        "icon": "UtensilsCrossed",
        "instruction": (
            "You are specialized in food safety inspection. "
            "Focus on temperature control, cross-contamination risks, hygiene practices, "
            "pest control, allergen management, and storage conditions. "
            "Reference HACCP principles for hazard analysis, FDA FSMA for preventive controls, "
            "SQF for quality standards, and ISO 22000 for food safety management. "
            "Flag Critical Control Points (CCPs) and critical limits immediately."
        ),
        "standards": ["HACCP", "FDA FSMA", "SQF", "BRCGS", "ISO 22000",
                      "EU Regulation 852/2004", "Codex Alimentarius"],
        "equipment_types": ["refrigerator", "freezer", "prep_surface", "handwash_station",
                           "thermometer", "storage_rack", "cooking_equipment",
                           "dishwasher", "ventilation_hood", "pest_trap"],
        "severity_metric": "risk level (critical/major/minor/observation)",
    },
    "workplace_safety": {
        "name": "Workplace Safety",
        "icon": "HardHat",
        "instruction": (
            "You are specialized in occupational health and safety inspection. "
            "Focus on PPE compliance, fall protection, electrical safety, machine guarding, "
            "chemical hazards, ergonomics, and emergency preparedness. "
            "Reference ISO 45001 for management systems, OSHA 29 CFR 1910 for general industry, "
            "and EU Directive 89/391/EEC for framework requirements. "
            "Classify hazards by likelihood and severity."
        ),
        "standards": ["ISO 45001", "OSHA 29 CFR 1910", "OSHA 29 CFR 1926",
                      "EU Directive 89/391/EEC", "HSE (UK)", "ISO 31000"],
        "equipment_types": ["PPE", "scaffolding", "guardrail", "electrical_panel",
                           "emergency_exit", "fire_extinguisher", "machine_guard",
                           "ventilation", "first_aid_station", "safety_shower"],
        "severity_metric": "risk matrix (likelihood x severity)",
    },
    "construction": {
        "name": "Construction Safety",
        "icon": "HardHat",
        "instruction": (
            "You are specialized in construction site safety inspection. "
            "Focus on fall protection, scaffolding integrity, excavation safety, "
            "crane/heavy equipment, electrical safety, and structural adequacy. "
            "Reference OSHA 1926 for construction standards, IBC for building codes, "
            "Eurocodes for structural design, and CDM regulations for UK projects. "
            "Flag imminent danger situations immediately."
        ),
        "standards": ["OSHA 29 CFR 1926", "IBC", "Eurocodes (EN 1990-1999)",
                      "CDM Regulations (UK)", "ISO 45001", "ANSI A10"],
        "equipment_types": ["crane", "excavator", "scaffolding", "concrete_form",
                           "rebar", "fall_protection_anchor", "ladder",
                           "power_tool", "welding_equipment", "temporary_structure"],
        "severity_metric": "imminent danger / serious / other-than-serious / de minimis",
    },
    "environmental": {
        "name": "Environmental Compliance",
        "icon": "Leaf",
        "instruction": (
            "You are specialized in environmental compliance inspection. "
            "Focus on emissions monitoring, waste management, water discharge, "
            "soil contamination, noise levels, and habitat impact. "
            "Reference ISO 14001 for EMS, EPA regulations for US compliance, "
            "EU EIA Directive for impact assessment, and REACH for chemical safety. "
            "Document all measurements with precise units and sampling methods."
        ),
        "standards": ["ISO 14001", "EPA regulations", "EU EIA Directive",
                      "REACH", "Clean Air Act", "Clean Water Act",
                      "RCRA", "ISO 14040 (LCA)"],
        "equipment_types": ["emissions_monitor", "waste_container", "spill_kit",
                           "water_treatment", "stack_vent", "noise_meter",
                           "soil_sampler", "air_quality_sensor"],
        "severity_metric": "regulatory violation level + environmental impact",
    },
    "fire_safety": {
        "name": "Fire Safety",
        "icon": "Flame",
        "instruction": (
            "You are specialized in fire safety inspection. "
            "Focus on fire detection systems, suppression systems, egress paths, "
            "fire barriers, emergency lighting, and fire prevention practices. "
            "Reference NFPA codes for US standards, EN 54 for detection/alarm systems, "
            "ISO 7240 for fire detection components, and local fire codes. "
            "Check inspection tags, test dates, and maintenance records on all equipment."
        ),
        "standards": ["NFPA 1", "NFPA 25", "NFPA 72", "NFPA 101",
                      "EN 54", "ISO 7240", "BS 5839", "local fire codes"],
        "equipment_types": ["fire_extinguisher", "sprinkler_head", "smoke_detector",
                           "fire_door", "emergency_lighting", "alarm_panel",
                           "fire_hose", "standpipe", "fire_pump", "fire_damper"],
        "severity_metric": "life safety critical / significant / minor",
    },
    "manufacturing_qc": {
        "name": "Manufacturing Quality Control",
        "icon": "Factory",
        "instruction": (
            "You are specialized in manufacturing quality control inspection. "
            "Focus on product defects, process deviations, dimensional accuracy, "
            "surface finish, material properties, and calibration status. "
            "Reference ISO 9001 for QMS, relevant industry standards (ISO 3834 for welding, "
            "IATF 16949 for automotive, FDA 21 CFR for medical devices). "
            "Document defect types, rates, and root cause indicators."
        ),
        "standards": ["ISO 9001", "ISO 3834", "IATF 16949", "FDA 21 CFR",
                      "AS9100 (aerospace)", "GMP", "Six Sigma"],
        "equipment_types": ["CNC_machine", "welding_equipment", "measuring_instrument",
                           "conveyor", "clean_room", "injection_molder",
                           "press", "oven", "test_fixture", "CMM"],
        "severity_metric": "defect severity (critical/major/minor/cosmetic)",
    },
    "facility_management": {
        "name": "Facility Management",
        "icon": "Building2",
        "instruction": (
            "You are specialized in facility condition assessment. "
            "Focus on building systems (HVAC, plumbing, electrical), structural elements, "
            "roofing, facade, ADA compliance, and deferred maintenance. "
            "Reference RICS standards for property assessment, ASTM E2018 for condition surveys, "
            "and ISO 41001 for facility management. "
            "Estimate remaining useful life and replacement costs for major systems."
        ),
        "standards": ["RICS standards", "ASTM E2018", "ISO 41001",
                      "ADA Standards", "BOMA standards", "IFMA guidelines"],
        "equipment_types": ["HVAC_system", "plumbing", "roofing", "elevator",
                           "parking_structure", "facade", "electrical_distribution",
                           "fire_protection_system", "generator", "BMS"],
        "severity_metric": "condition rating (1-5) + urgency (immediate/short-term/long-term)",
    },
}

DEFAULT_DOMAIN = "energy"


def get_domain_config(domain: str) -> dict:
    """Get domain config, falling back to energy if not found."""
    return DOMAIN_CONFIGS.get(domain, DOMAIN_CONFIGS[DEFAULT_DOMAIN])


def get_domain_instruction(domain: str) -> str:
    """Get the domain-specific instruction supplement."""
    config = get_domain_config(domain)
    return config["instruction"]


def get_all_domain_names() -> dict[str, str]:
    """Return {slug: display_name} for all domains."""
    return {k: v["name"] for k, v in DOMAIN_CONFIGS.items()}
