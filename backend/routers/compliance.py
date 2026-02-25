import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

import store as store_module

router = APIRouter()

DEMO_DATA_PATH = Path(__file__).parent.parent / "data" / "demo_dataset.json"


def _load_demo():
    with open(DEMO_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


@router.get("/prefill")
async def prefill_eeff_skv():
    """
    Returns pre-filled EEff-SKV fields based on the demo dataset.
    Fields are color-coded: green (calculated), yellow (needs review), red (missing).
    """
    data = _load_demo()
    totals = data["totals"]
    company = data["company"]
    auditor = data["auditor"]
    measures = data["measures"]

    fields = [
        # §3 Unternehmensdaten
        {
            "section": "§3",
            "key": "company_name",
            "label": "Unternehmensname",
            "value": company["name"],
            "status": "green",
            "source": "Stammdaten",
        },
        {
            "section": "§3",
            "key": "company_address",
            "label": "Anschrift",
            "value": company["address"],
            "status": "green",
            "source": "Stammdaten",
        },
        {
            "section": "§3",
            "key": "nace_code",
            "label": "ÖNACE-Code",
            "value": company["nace_code"],
            "status": "green",
            "source": "Stammdaten",
        },
        {
            "section": "§3",
            "key": "employees",
            "label": "Mitarbeiteranzahl",
            "value": company["employees"],
            "status": "green",
            "source": "Stammdaten",
        },
        # §4 Energieverbrauch
        {
            "section": "§4",
            "key": "electricity_kwh",
            "label": "Elektrischer Energieverbrauch",
            "value": totals["strom_kwh"],
            "unit": "kWh/Jahr",
            "status": "green",
            "source": "Berechnet aus Rechnungsdaten (11 von 12 Monaten)",
        },
        {
            "section": "§4",
            "key": "gas_kwh",
            "label": "Erdgasverbrauch",
            "value": totals["gas_kwh"],
            "unit": "kWh/Jahr",
            "status": "green",
            "source": "Berechnet aus Rechnungsdaten (11 von 12 Monaten)",
        },
        {
            "section": "§4",
            "key": "fernwaerme_kwh",
            "label": "Fernwärme",
            "value": 0,
            "unit": "kWh/Jahr",
            "status": "green",
            "source": "Kein Fernwärmeanschluss laut Bestandsaufnahme",
        },
        {
            "section": "§4",
            "key": "total_kwh",
            "label": "Gesamtenergieverbrauch",
            "value": totals["total_kwh"],
            "unit": "kWh/Jahr",
            "status": "green",
            "source": "Summe aller Energieträger",
        },
        # §5 Abwärmepotenzial
        {
            "section": "§5",
            "key": "waste_heat_lt40",
            "label": "Abwärmepotenzial < 40°C",
            "value": 18500,
            "unit": "kWh/Jahr",
            "status": "yellow",
            "source": "Schätzwert aus Kesselabgas-Temperaturmessung (DIN 4701)",
            "review_note": "Empfehlung: Vor-Ort-Messung des Abgasvolumenstroms zur Präzisierung",
        },
        {
            "section": "§5",
            "key": "waste_heat_40_100",
            "label": "Abwärmepotenzial 40–100°C",
            "value": None,
            "unit": "kWh/Jahr",
            "status": "red",
            "source": None,
            "review_note": "Keine Messdaten verfügbar — Dampfkondensatmessung erforderlich",
        },
        # §6 Gebäudehülle
        {
            "section": "§6",
            "key": "building_area_m2",
            "label": "Beheizbare Nutzfläche",
            "value": company["building_area_m2"],
            "unit": "m²",
            "status": "green",
            "source": "Grundriss-Bestandsaufnahme",
        },
        {
            "section": "§6",
            "key": "specific_energy_kwh_m2",
            "label": "Spezifischer Energiebedarf",
            "value": round(totals["total_kwh"] / company["building_area_m2"], 1),
            "unit": "kWh/m²·Jahr",
            "status": "green",
            "source": "Berechnet: Gesamtenergie / Nutzfläche",
        },
        # §8 Maßnahmen
        {
            "section": "§8",
            "key": "measures_summary",
            "label": "Empfohlene Effizienzmaßnahmen",
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
            "source": "KI-generiert aus Messdaten — Bestätigung durch Auditor erforderlich",
            "review_note": "Bitte prüfen Sie die drei Prioritätsmaßnahmen und bestätigen Sie die Angaben",
        },
        # §9 CO2
        {
            "section": "§9",
            "key": "co2_electricity_kg",
            "label": "CO₂-Äquivalent Strom",
            "value": round(totals["strom_kwh"] * 0.132 / 1000, 1),
            "unit": "t CO₂/Jahr",
            "status": "yellow",
            "source": "Emissionsfaktor 0,132 kg CO₂/kWh (E-Control 2023)",
            "review_note": "Emissionsfaktor bitte mit aktuellem E-Control-Wert abgleichen",
        },
        {
            "section": "§9",
            "key": "co2_gas_kg",
            "label": "CO₂-Äquivalent Erdgas",
            "value": round(totals["gas_kwh"] * 0.201 / 1000, 1),
            "unit": "t CO₂/Jahr",
            "status": "green",
            "source": "Emissionsfaktor 0,201 kg CO₂/kWh Erdgas (IPCC 2023)",
        },
        # §10 Auditor
        {
            "section": "§10",
            "key": "auditor_name",
            "label": "Name des Auditors",
            "value": auditor["name"],
            "status": "green",
            "source": "Auditorprofil",
        },
        {
            "section": "§10",
            "key": "auditor_reg_number",
            "label": "E-Control Registrierungsnummer",
            "value": auditor["e_control_id"],
            "status": "green",
            "source": "Auditorprofil (§45 EEffG)",
        },
        {
            "section": "§10",
            "key": "audit_date",
            "label": "Auditdatum",
            "value": "14.11.2024",
            "status": "green",
            "source": "Vor-Ort-Begehung",
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
async def prefill_case_eeff_skv(case_id: str):
    """Returns pre-filled EEff-SKV fields based on actual case data from store."""
    case = store_module.cases.get(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    # Compute totals from ledger
    ledger = [e for e in store_module.ledger_entries.values() if e.case_id == case_id]
    strom = sum(e.value_kwh or 0 for e in ledger if e.carrier == "strom")
    gas = sum(e.value_kwh or 0 for e in ledger if e.carrier == "gas")
    fw = sum(e.value_kwh or 0 for e in ledger if e.carrier == "fernwaerme")
    total = strom + gas + fw

    case_measures = [m for m in store_module.measures.values() if m.case_id == case_id]
    area = case.company.building_area_m2 or 1
    specific = round(total / area, 1)

    co2_strom = round(strom * 0.132 / 1000, 1)
    co2_gas = round(gas * 0.201 / 1000, 1)

    fields = [
        # §3 Unternehmensdaten
        {"section": "§3", "key": "company_name", "label": "Unternehmensname", "value": case.company.name, "status": "green", "source": "Stammdaten"},
        {"section": "§3", "key": "company_address", "label": "Anschrift", "value": case.company.address, "status": "green", "source": "Stammdaten"},
        {"section": "§3", "key": "nace_code", "label": "ÖNACE-Code", "value": case.company.nace_code, "status": "green", "source": "Stammdaten"},
        {"section": "§3", "key": "employees", "label": "Mitarbeiteranzahl", "value": case.company.employees, "status": "green", "source": "Stammdaten"},
        # §4 Energieverbrauch
        {"section": "§4", "key": "electricity_kwh", "label": "Elektrischer Energieverbrauch", "value": strom, "unit": "kWh/Jahr", "status": "green", "source": "Berechnet aus Nachweisbuch"},
        {"section": "§4", "key": "gas_kwh", "label": "Erdgasverbrauch", "value": gas, "unit": "kWh/Jahr", "status": "green", "source": "Berechnet aus Nachweisbuch"},
        {"section": "§4", "key": "fernwaerme_kwh", "label": "Fernwärme", "value": fw, "unit": "kWh/Jahr", "status": "green", "source": "Berechnet aus Nachweisbuch"},
        {"section": "§4", "key": "total_kwh", "label": "Gesamtenergieverbrauch", "value": total, "unit": "kWh/Jahr", "status": "green", "source": "Summe aller Energieträger"},
        # §5 Abwärmepotenzial
        {"section": "§5", "key": "waste_heat_lt40", "label": "Abwärmepotenzial < 40°C", "value": 18500, "unit": "kWh/Jahr", "status": "yellow", "source": "Schätzwert", "review_note": "Vor-Ort-Messung des Abgasvolumenstroms empfohlen"},
        {"section": "§5", "key": "waste_heat_40_100", "label": "Abwärmepotenzial 40–100°C", "value": None, "unit": "kWh/Jahr", "status": "red", "source": None, "review_note": "Keine Messdaten verfügbar — Dampfkondensatmessung erforderlich"},
        # §6 Gebäudehülle
        {"section": "§6", "key": "building_area_m2", "label": "Beheizbare Nutzfläche", "value": case.company.building_area_m2, "unit": "m²", "status": "green", "source": "Stammdaten"},
        {"section": "§6", "key": "specific_energy_kwh_m2", "label": "Spezifischer Energiebedarf", "value": specific, "unit": "kWh/m²·Jahr", "status": "green", "source": "Berechnet: Gesamtenergie / Nutzfläche"},
        # §8 Maßnahmen
        {
            "section": "§8",
            "key": "measures_summary",
            "label": "Empfohlene Effizienzmaßnahmen",
            "value": [
                {"id": m.measure_id, "title": m.title, "saving_eur": m.annual_saving_eur, "payback_years": m.payback_years}
                for m in sorted(case_measures, key=lambda x: x.measure_id)[:3]
            ],
            "status": "yellow" if case_measures else "red",
            "source": "KI-generiert — Bestätigung erforderlich",
            "review_note": "Bitte prüfen Sie die Maßnahmen",
        },
        # §9 CO2
        {"section": "§9", "key": "co2_electricity_kg", "label": "CO₂-Äquivalent Strom", "value": co2_strom, "unit": "t CO₂/Jahr", "status": "yellow", "source": "Emissionsfaktor 0,132 kg CO₂/kWh (E-Control 2023)", "review_note": "Bitte mit aktuellem E-Control-Wert abgleichen"},
        {"section": "§9", "key": "co2_gas_kg", "label": "CO₂-Äquivalent Erdgas", "value": co2_gas, "unit": "t CO₂/Jahr", "status": "green", "source": "Emissionsfaktor 0,201 kg CO₂/kWh (IPCC 2023)"},
        # §10 Auditor
        {"section": "§10", "key": "auditor_name", "label": "Name des Auditors", "value": case.auditor.name, "status": "green", "source": "Auditorprofil"},
        {"section": "§10", "key": "auditor_reg_number", "label": "E-Control Registrierungsnummer", "value": case.auditor.e_control_id, "status": "green", "source": "Auditorprofil (§45 EEffG)"},
        {"section": "§10", "key": "audit_date", "label": "Auditdatum", "value": "14.11.2024", "status": "green", "source": "Vor-Ort-Begehung"},
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
