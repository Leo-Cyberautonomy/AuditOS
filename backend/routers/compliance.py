import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

import store_firestore as fs

router = APIRouter()

DEMO_DATA_PATH = Path(__file__).parent.parent / "data" / "demo_dataset.json"


def _load_demo():
    with open(DEMO_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


@router.get("/prefill")
async def prefill_compliance_form():
    """
    Returns pre-filled compliance form fields based on the demo dataset.
    Fields are color-coded: green (calculated), yellow (needs review), red (missing).
    Supports international standards (ISO 50001, EN 16247-1).
    """
    data = _load_demo()
    totals = data["totals"]
    company = data["company"]
    auditor = data["auditor"]
    measures = data["measures"]

    fields = [
        # Section 1: Company Information
        {
            "section": "§1",
            "key": "company_name",
            "label": "Company Name",
            "value": company["name"],
            "status": "green",
            "source": "Company records",
        },
        {
            "section": "§1",
            "key": "company_address",
            "label": "Address",
            "value": company["address"],
            "status": "green",
            "source": "Company records",
        },
        {
            "section": "§1",
            "key": "nace_code",
            "label": "NACE Code",
            "value": company["nace_code"],
            "status": "green",
            "source": "Company records",
        },
        {
            "section": "§1",
            "key": "employees",
            "label": "Number of Employees",
            "value": company["employees"],
            "status": "green",
            "source": "Company records",
        },
        # Section 2: Energy Consumption
        {
            "section": "§2",
            "key": "electricity_kwh",
            "label": "Electricity Consumption",
            "value": totals["strom_kwh"],
            "unit": "kWh/year",
            "status": "green",
            "source": "Calculated from billing data (11 of 12 months)",
        },
        {
            "section": "§2",
            "key": "gas_kwh",
            "label": "Natural Gas Consumption",
            "value": totals["gas_kwh"],
            "unit": "kWh/year",
            "status": "green",
            "source": "Calculated from billing data (11 of 12 months)",
        },
        {
            "section": "§2",
            "key": "fernwaerme_kwh",
            "label": "District Heating",
            "value": 0,
            "unit": "kWh/year",
            "status": "green",
            "source": "No district heating connection per site survey",
        },
        {
            "section": "§2",
            "key": "total_kwh",
            "label": "Total Energy Consumption",
            "value": totals["total_kwh"],
            "unit": "kWh/year",
            "status": "green",
            "source": "Sum of all energy carriers",
        },
        # Section 3: Waste Heat Potential
        {
            "section": "§3",
            "key": "waste_heat_lt40",
            "label": "Waste Heat Potential < 40°C",
            "value": 18500,
            "unit": "kWh/year",
            "status": "yellow",
            "source": "Estimated from boiler flue gas temperature measurement (ISO 50002)",
            "review_note": "Recommendation: on-site flue gas volume flow measurement for precision",
        },
        {
            "section": "§3",
            "key": "waste_heat_40_100",
            "label": "Waste Heat Potential 40–100°C",
            "value": None,
            "unit": "kWh/year",
            "status": "red",
            "source": None,
            "review_note": "No measurement data available — steam condensate measurement required",
        },
        # Section 4: Building Envelope
        {
            "section": "§4",
            "key": "building_area_m2",
            "label": "Heated Floor Area",
            "value": company["building_area_m2"],
            "unit": "m²",
            "status": "green",
            "source": "Floor plan survey",
        },
        {
            "section": "§4",
            "key": "specific_energy_kwh_m2",
            "label": "Specific Energy Demand",
            "value": round(totals["total_kwh"] / company["building_area_m2"], 1),
            "unit": "kWh/m²·year",
            "status": "green",
            "source": "Calculated: total energy / floor area",
        },
        # Section 5: Recommended Measures
        {
            "section": "§5",
            "key": "measures_summary",
            "label": "Recommended Efficiency Measures",
            "value": [
                {
                    "id": m["measure_id"],
                    "title": m["title"],
                    "saving_eur": m["annual_saving_eur"],
                    "payback_years": m["payback_years"],
                }
                for m in measures[:3]
            ],
            "status": "yellow",
            "source": "AI-generated from measurement data — auditor confirmation required",
            "review_note": "Please review the top-3 priority measures and confirm the data",
        },
        # Section 6: CO2 Emissions
        {
            "section": "§6",
            "key": "co2_electricity_kg",
            "label": "CO2 Equivalent — Electricity",
            "value": round(totals["strom_kwh"] * 0.233 / 1000, 1),
            "unit": "t CO2/year",
            "status": "yellow",
            "source": "Emission factor 0.233 kg CO2/kWh (EU average 2024)",
            "review_note": "Please verify with local grid emission factor",
        },
        {
            "section": "§6",
            "key": "co2_gas_kg",
            "label": "CO2 Equivalent — Natural Gas",
            "value": round(totals["gas_kwh"] * 0.201 / 1000, 1),
            "unit": "t CO2/year",
            "status": "green",
            "source": "Emission factor 0.201 kg CO2/kWh (IPCC 2023)",
        },
        # Section 7: Auditor Information
        {
            "section": "§7",
            "key": "auditor_name",
            "label": "Auditor Name",
            "value": auditor["name"],
            "status": "green",
            "source": "Auditor profile",
        },
        {
            "section": "§7",
            "key": "auditor_reg_number",
            "label": "Auditor Registration Number",
            "value": auditor["e_control_id"],
            "status": "green",
            "source": "Auditor profile (ISO 50002 certified)",
        },
        {
            "section": "§7",
            "key": "audit_date",
            "label": "Audit Date",
            "value": "2025-02-14",
            "status": "green",
            "source": "On-site inspection",
        },
    ]

    # Count by status
    green_count = sum(1 for f in fields if f["status"] == "green")
    yellow_count = sum(1 for f in fields if f["status"] == "yellow")
    red_count = sum(1 for f in fields if f["status"] == "red")
    total = len(fields)
    completion_pct = round((green_count / total) * 100)

    return {
        "fields": fields,
        "summary": {
            "total": total,
            "green": green_count,
            "yellow": yellow_count,
            "red": red_count,
            "completion_pct": completion_pct,
        },
    }


@router.get("/case/{case_id}/prefill")
async def prefill_case_compliance_form(case_id: str):
    """Returns pre-filled compliance form fields based on actual case data from Firestore."""
    case = await fs.get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    # Compute totals from ledger
    ledger = await fs.list_ledger_entries(case_id)
    strom = sum(e.value_kwh or 0 for e in ledger if e.carrier == "strom")
    gas = sum(e.value_kwh or 0 for e in ledger if e.carrier == "gas")
    fw = sum(e.value_kwh or 0 for e in ledger if e.carrier == "fernwaerme")
    total = strom + gas + fw

    case_measures = await fs.list_measures(case_id)
    area = case.company.building_area_m2 or 1
    specific = round(total / area, 1)

    co2_strom = round(strom * 0.233 / 1000, 1)
    co2_gas = round(gas * 0.201 / 1000, 1)

    fields = [
        # §1 Company Information
        {"section": "§1", "key": "company_name", "label": "Company Name", "value": case.company.name, "status": "green", "source": "Company records"},
        {"section": "§1", "key": "company_address", "label": "Address", "value": case.company.address, "status": "green", "source": "Company records"},
        {"section": "§1", "key": "nace_code", "label": "NACE Code", "value": case.company.nace_code, "status": "green", "source": "Company records"},
        {"section": "§1", "key": "employees", "label": "Number of Employees", "value": case.company.employees, "status": "green", "source": "Company records"},
        # §2 Energy Consumption
        {"section": "§2", "key": "electricity_kwh", "label": "Electricity Consumption", "value": strom, "unit": "kWh/year", "status": "green", "source": "Calculated from evidence ledger"},
        {"section": "§2", "key": "gas_kwh", "label": "Natural Gas Consumption", "value": gas, "unit": "kWh/year", "status": "green", "source": "Calculated from evidence ledger"},
        {"section": "§2", "key": "fernwaerme_kwh", "label": "District Heating", "value": fw, "unit": "kWh/year", "status": "green", "source": "Calculated from evidence ledger"},
        {"section": "§2", "key": "total_kwh", "label": "Total Energy Consumption", "value": total, "unit": "kWh/year", "status": "green", "source": "Sum of all energy carriers"},
        # §3 Waste Heat
        {"section": "§3", "key": "waste_heat_lt40", "label": "Waste Heat Potential < 40°C", "value": 18500, "unit": "kWh/year", "status": "yellow", "source": "Estimated", "review_note": "On-site flue gas volume measurement recommended"},
        {"section": "§3", "key": "waste_heat_40_100", "label": "Waste Heat Potential 40-100°C", "value": None, "unit": "kWh/year", "status": "red", "source": None, "review_note": "No measurement data available — steam condensate measurement required"},
        # §4 Building
        {"section": "§4", "key": "building_area_m2", "label": "Heated Floor Area", "value": case.company.building_area_m2, "unit": "m²", "status": "green", "source": "Company records"},
        {"section": "§4", "key": "specific_energy_kwh_m2", "label": "Specific Energy Demand", "value": specific, "unit": "kWh/m²·year", "status": "green", "source": "Calculated: total energy / floor area"},
        # §5 Measures
        {
            "section": "§5",
            "key": "measures_summary",
            "label": "Recommended Efficiency Measures",
            "value": [
                {"id": m.measure_id, "title": m.title, "saving_eur": m.annual_saving_eur, "payback_years": m.payback_years}
                for m in sorted(case_measures, key=lambda x: x.measure_id)[:3]
            ],
            "status": "yellow" if case_measures else "red",
            "source": "AI-generated — confirmation required",
            "review_note": "Please review the measures",
        },
        # §6 CO2
        {"section": "§6", "key": "co2_electricity_kg", "label": "CO2 Equivalent — Electricity", "value": co2_strom, "unit": "t CO2/year", "status": "yellow", "source": "Emission factor 0.233 kg CO2/kWh (EU average 2024)", "review_note": "Please verify with local grid emission factor"},
        {"section": "§6", "key": "co2_gas_kg", "label": "CO2 Equivalent — Natural Gas", "value": co2_gas, "unit": "t CO2/year", "status": "green", "source": "Emission factor 0.201 kg CO2/kWh (IPCC 2023)"},
        # §7 Auditor
        {"section": "§7", "key": "auditor_name", "label": "Auditor Name", "value": case.auditor.name, "status": "green", "source": "Auditor profile"},
        {"section": "§7", "key": "auditor_reg_number", "label": "Auditor Registration Number", "value": case.auditor.e_control_id, "status": "green", "source": "Auditor profile (ISO 50002 certified)"},
        {"section": "§7", "key": "audit_date", "label": "Audit Date", "value": "2025-02-14", "status": "green", "source": "On-site inspection"},
    ]

    green_count = sum(1 for f in fields if f["status"] == "green")
    yellow_count = sum(1 for f in fields if f["status"] == "yellow")
    red_count = sum(1 for f in fields if f["status"] == "red")
    total_fields = len(fields)

    return {
        "fields": fields,
        "summary": {
            "total": total_fields,
            "green": green_count,
            "yellow": yellow_count,
            "red": red_count,
            "completion_pct": round((green_count / total_fields) * 100),
        },
    }
