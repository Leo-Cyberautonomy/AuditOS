import asyncio
import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from google import genai

import store as store_module
from services.audit_log_service import log_event

load_dotenv()

router = APIRouter()

DEMO_DATA_PATH = Path(__file__).parent.parent / "data" / "demo_dataset.json"

SYSTEM_PROMPT_DE = """Du bist ein bei E-Control (§45 EEffG) eingetragener österreichischer Energieauditor mit 10 Jahren Erfahrung.
Du kennst die ÖNORM EN 16247-1:2022, das EEffG BGBl. I Nr. 59/2023 und die EEff-SKV BGBl. II Nr. 242/2023 im Detail.

VERHALTENSREGELN:
- Jede Maßnahmenempfehlung MUSS konkrete Zahlenwerte (kWh, kW, €) enthalten
- Jede Empfehlung MUSS die Berechnungsgrundlage nennen (z.B. DIN 17463 §3.2)
- Jede Behauptung oder Empfehlung MUSS eine Quellenreferenz in Klammern enthalten — z.B. (Quelle: Stromrechnung Aug 2023), (Messung: Kompressor #2, 15.3.2023), (DIN 17463 §3.2), (EN 16247-1:2022 Abschnitt 5), (siehe Anlage 3), (vgl. Tabelle 2). PRO ABSATZ mindestens EINE Quellenreferenz.
- Unterscheide klar zwischen Klasse A (Messdaten) und Klasse B (Schätzwerte)
- Verboten: erfundene Zahlen, vage Formulierungen wie "könnte" oder "eventuell"
- Sprache: Deutsch, professioneller Auditbericht-Stil

FORMATREGELN (STRIKT EINHALTEN):
- Beginne den Bericht DIREKT mit der ersten Abschnittsüberschrift — KEIN Titel, KEINE Einleitung vor dem ersten ##
- Verwende EXAKT diese 9 Abschnittsüberschriften als ## (h2) Markdown-Heading. KEINE andere Heading-Ebene (NICHT # oder ###) für Hauptabschnitte:

## 1. Zusammenfassung
## 2. Hintergrund und Auftragsgegenstand
## 3. Ist-Zustand und Energiedatenanalyse
## 4. Maßnahmenvorschläge
## 5. Bewertung und Priorisierung
## 6. Wirtschaftlichkeitsberechnung
## 7. Umsetzungsplan
## 8. Qualitätssicherung
## 9. Anhänge

- Unterabschnitte innerhalb eines Hauptabschnitts verwenden ### (h3)
- NIEMALS # (h1) verwenden

PFLICHT — EXKURS-ABSCHNITT:
In Abschnitt 8 (Qualitätssicherung) MUSS ein Unterabschnitt eingefügt werden:
### Exkurs: Ergänzende Empfehlung des Auditors
Dieser Abschnitt enthält eine zusätzliche, NICHT im Auftrag enthaltene Empfehlung des Auditors auf Eigeninitiative — z.B. eine freiwillige Sonderuntersuchung, eine optionale Maßnahme oder einen Hinweis, der über den Auftragsgegenstand hinausgeht. Verwende dabei Formulierungen wie "zusätzlich zum Auftrag", "nicht im Auftrag enthalten", "ergänzend", "auf Eigeninitiative des Auditors", "freiwillige Empfehlung".

Für jeden Maßnahmenvorschlag in Abschnitt 4 gib ZUSÄTZLICH ein Beweis-JSON aus:

[EVIDENCE_START]
{"measure_id": "M1", "title": "...", "annual_saving_kwh": 0, "annual_saving_eur": 0, "investment_eur": 0, "payback_years": 0.0, "evidence": {"measurement": "...", "method": "...", "price_basis": "...", "confidence": 0, "confidence_note": "..."}}
[EVIDENCE_END]

Das JSON muss exakt diesem Schema entsprechen. Zahlen als number, nicht als string."""

SYSTEM_PROMPT_EN = """You are an Austrian energy auditor registered at E-Control (§45 EEffG) with 10 years of experience.
You have detailed knowledge of ÖNORM EN 16247-1:2022, EEffG BGBl. I Nr. 59/2023, and EEff-SKV BGBl. II Nr. 242/2023.

BEHAVIORAL RULES:
- Every measure recommendation MUST include concrete numerical values (kWh, kW, €)
- Every recommendation MUST cite its calculation basis (e.g., DIN 17463 §3.2)
- Every claim or recommendation MUST include a parenthesized source reference — e.g. (Source: Electricity bill Aug 2023), (Measurement: Compressor #2, 15.3.2023), (DIN 17463 §3.2), (EN 16247-1:2022 Section 5), (see Appendix 3), (cf. Table 2). At least ONE source reference PER PARAGRAPH.
- Clearly distinguish between Class A (measured data) and Class B (estimated values)
- Forbidden: invented numbers, vague phrases like "could" or "possibly"
- Language: English, professional energy audit report style

FORMAT RULES (STRICTLY FOLLOW):
- Start the report DIRECTLY with the first section heading — NO title, NO introduction before the first ##
- Use EXACTLY these 9 section headings as ## (h2) Markdown headings. Do NOT use any other heading level (NOT # or ###) for main sections:

## 1. Executive Summary
## 2. Background and Scope
## 3. Current Energy State and Data Analysis
## 4. Recommended Measures
## 5. Assessment and Prioritization
## 6. Economic Analysis
## 7. Implementation Plan
## 8. Quality Assurance
## 9. Appendices

- Sub-sections within a main section use ### (h3)
- NEVER use # (h1)

MANDATORY — DIGRESSION SECTION:
In section 8 (Quality Assurance), you MUST include one subsection:
### Digression: Supplementary Auditor Recommendation
This section contains an additional recommendation that is NOT part of the commissioned audit scope — e.g., a voluntary supplementary investigation, an optional measure, or a note beyond the original scope. Use phrases like "beyond the commissioned scope", "not commissioned", "supplementary", "voluntary recommendation", "additional to the audit scope", "on the auditor's own initiative".

For each measure recommendation in section 4, ALSO output an evidence JSON block:

[EVIDENCE_START]
{"measure_id": "M1", "title": "...", "annual_saving_kwh": 0, "annual_saving_eur": 0, "investment_eur": 0, "payback_years": 0.0, "evidence": {"measurement": "...", "method": "...", "price_basis": "...", "confidence": 0, "confidence_note": "..."}}
[EVIDENCE_END]

The JSON must exactly match this schema. Numbers as number type, not as string."""


def _build_user_prompt(data: dict) -> str:
    company = data["company"]
    totals = data["totals"]
    benchmarks = data["benchmarks"]
    measures = data["measures"]

    monthly = "\n".join(
        f"  {r['month']}: Strom {r['strom_kwh'] or 'FEHLT'} kWh, Gas {r['gas_kwh'] or 'FEHLT'} kWh"
        f"{' [ANOMALIE: ' + r.get('anomaly_note','') + ']' if r['status']=='anomaly' else ''}"
        f"{' [SCHÄTZWERT]' if r['status']=='estimated' else ''}"
        for r in data["energy_data"]
    )

    measures_txt = "\n".join(
        f"  {m['measure_id']}: {m['title']} — {m['annual_saving_kwh']:,} kWh/Jahr, €{m['annual_saving_eur']:,}/Jahr, "
        f"Investition €{m['investment_eur']:,}, Amortisation {m['payback_years']} Jahre\n"
        f"    Nachweis: {m['evidence']['measurement']}\n"
        f"    Methode: {m['evidence']['method']}\n"
        f"    Konfidenz: {m['evidence']['confidence']}% — {m['evidence']['confidence_note']}"
        for m in measures
    )

    return f"""AUFTRAG: Erstelle einen vollständigen EN 16247-1 Energieauditbericht für folgendes Unternehmen.

UNTERNEHMEN:
  Name: {company['name']}
  Adresse: {company['address']}
  Branche: {company['industry']} (ÖNACE {company['nace_code']})
  Mitarbeiter: {company['employees']}
  Nutzfläche: {company['building_area_m2']} m²

ENERGIEDATEN 2023 (monatlich):
{monthly}

JAHRESTOTALE:
  Strom: {totals['strom_kwh']:,} kWh
  Erdgas: {totals['gas_kwh']:,} kWh
  Gesamt: {totals['total_kwh']:,} kWh
  Datenbereitschaft: {totals['readiness_score']}%

BRANCHENVERGLEICH:
  Branche: {benchmarks['industry']}
  Branchendurchschnitt: {benchmarks['electricity_kwh_per_m2']} kWh/m²
  Tatsächlich: {benchmarks['actual_electricity_kwh_per_m2']} kWh/m²
  Abweichung: +{benchmarks['deviation_pct']}% über Branchendurchschnitt

IDENTIFIZIERTE MAßNAHMEN (aus Vor-Ort-Begehung und Messungen):
{measures_txt}

Schreibe jetzt den vollständigen Auditbericht. Nutze die oben genannten Maßnahmen und ihre Nachweise.
Für jede Maßnahme im Abschnitt 4 MUSS ein [EVIDENCE_START]...[EVIDENCE_END] Block folgen."""


@router.post("/stream")
async def stream_report(lang: str = "de"):
    """
    SSE endpoint: streams a complete EN 16247-1 audit report via Gemini 2.5 Flash.
    lang: "de" (default) or "en" — controls report language to match UI locale.
    """
    with open(DEMO_DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    user_prompt = _build_user_prompt(data)
    system_prompt = SYSTEM_PROMPT_EN if lang == "en" else SYSTEM_PROMPT_DE
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    async def event_generator():
        try:
            # Collect chunks in thread pool (sync SDK), then stream with delay for visual effect
            def collect_chunks():
                chunks = []
                for chunk in client.models.generate_content_stream(
                    model="gemini-2.5-flash",
                    contents=[
                        {"role": "user", "parts": [{"text": system_prompt + "\n\n" + user_prompt}]}
                    ],
                ):
                    if chunk.text:
                        chunks.append(chunk.text)
                return chunks

            chunks = await asyncio.to_thread(collect_chunks)
            for text in chunks:
                payload = json.dumps({"text": text})
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.012)  # ~12ms between chunks for streaming visual
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/case/{case_id}/stream")
async def stream_case_report(case_id: str, lang: str = "de"):
    """SSE: streams EN 16247-1 report using case data from store."""
    case = store_module.cases.get(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    # Build data dict from store
    ledger = [e for e in store_module.ledger_entries.values() if e.case_id == case_id]
    case_measures = [m for m in store_module.measures.values() if m.case_id == case_id]

    # Build energy_data array for the prompt
    energy_data = []
    months_order = ["Jan 23", "Feb 23", "Mär 23", "Apr 23", "Mai 23", "Jun 23",
                    "Jul 23", "Aug 23", "Sep 23", "Okt 23", "Nov 23", "Dez 23"]

    for month in months_order:
        month_entries = {e.carrier: e for e in ledger if e.month == month}
        strom_entry = month_entries.get("strom")
        gas_entry = month_entries.get("gas")
        status = "confirmed"
        anomaly_note = None
        missing_note = None

        if strom_entry:
            status = strom_entry.status
            if strom_entry.note:
                if status == "anomaly":
                    anomaly_note = strom_entry.note
                elif status == "missing":
                    missing_note = strom_entry.note

        energy_data.append({
            "month": month,
            "strom_kwh": strom_entry.value_kwh if strom_entry else None,
            "gas_kwh": gas_entry.value_kwh if gas_entry else None,
            "status": status,
            "anomaly_note": anomaly_note or "",
            "missing_note": missing_note or "",
        })

    strom_total = sum(e.value_kwh or 0 for e in ledger if e.carrier == "strom")
    gas_total = sum(e.value_kwh or 0 for e in ledger if e.carrier == "gas")
    fw_total = sum(e.value_kwh or 0 for e in ledger if e.carrier == "fernwaerme")
    total_kwh = strom_total + gas_total + fw_total

    confirmed_count = sum(1 for e in ledger if e.status == "confirmed")
    total_count = len(ledger)
    readiness = round(confirmed_count / max(total_count, 1) * 100)

    # Build benchmark data from company info
    area = case.company.building_area_m2 or 1
    actual_specific = round(total_kwh / area, 1)
    # Use industry averages based on NACE code
    industry_avg = 120  # default kWh/m2
    if case.company.nace_code and case.company.nace_code.startswith("C10"):
        industry_avg = 180  # food manufacturing
    elif case.company.nace_code and case.company.nace_code.startswith("C25"):
        industry_avg = 350  # metal works
    elif case.company.nace_code and case.company.nace_code.startswith("H"):
        industry_avg = 80   # logistics

    deviation = round((actual_specific / industry_avg - 1) * 100) if industry_avg > 0 else 0

    data = {
        "company": {
            "name": case.company.name,
            "address": case.company.address,
            "nace_code": case.company.nace_code,
            "industry": case.company.industry,
            "employees": case.company.employees,
            "building_area_m2": case.company.building_area_m2,
        },
        "energy_data": energy_data,
        "totals": {
            "strom_kwh": strom_total,
            "gas_kwh": gas_total,
            "total_kwh": total_kwh,
            "readiness_score": readiness,
        },
        "benchmarks": {
            "industry": case.company.industry or "Unbekannt",
            "electricity_kwh_per_m2": industry_avg,
            "actual_electricity_kwh_per_m2": actual_specific,
            "deviation_pct": deviation,
        },
        "measures": [
            {
                "measure_id": m.measure_id,
                "title": m.title,
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
            for m in sorted(case_measures, key=lambda x: x.measure_id)
        ],
    }

    user_prompt = _build_user_prompt(data)
    system_prompt = SYSTEM_PROMPT_EN if lang == "en" else SYSTEM_PROMPT_DE
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    async def event_generator():
        try:
            def collect_chunks():
                chunks = []
                for chunk in client.models.generate_content_stream(
                    model="gemini-2.5-flash",
                    contents=[
                        {"role": "user", "parts": [{"text": system_prompt + "\n\n" + user_prompt}]}
                    ],
                ):
                    if chunk.text:
                        chunks.append(chunk.text)
                return chunks

            chunks = await asyncio.to_thread(collect_chunks)
            for text in chunks:
                payload = json.dumps({"text": text})
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.012)
            yield f"data: {json.dumps({'done': True})}\n\n"

            # Log audit event
            log_event("report_generated", case_id=case_id, detail=f"Auditbericht generiert ({lang})")
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
