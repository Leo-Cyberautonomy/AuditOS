"""
Real file processing endpoint for AuditOS.

Pipeline per file:
  - JPEG/PNG  → Gemini 2.5 Flash Vision (inline_data)
  - PDF       → pdfplumber text extraction
  - XLSX/XLS  → pandas (openpyxl engine) → tabular string
  - CSV       → raw text decode
  - other     → markitdown if available, else raw text

All extracted text is sent together to Gemini with a structured
JSON-extraction prompt, returning EnergyRow[] + totals + log.

SSE event format:
  data: {"type": "info"|"ok"|"warn"|"error", "text": "..."}
  data: {"type": "done", "result": <EnergyResult> | null}
"""

import asyncio
import io
import json
import os
from typing import List

from dotenv import load_dotenv
from fastapi import APIRouter, File, UploadFile
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types

load_dotenv()

router = APIRouter()

MODEL = "gemini-3-flash-preview"

# ─────────────────────────────── prompt ────────────────────────────────────

EXTRACTION_PROMPT = """\
Du bist ein österreichischer Energieauditor. Analysiere die folgenden Dokumente \
(Strom- und Gasrechnungen, Excel-Tabellen) und extrahiere die monatlichen \
Energieverbrauchsdaten.

Gib das Ergebnis AUSSCHLIESSLICH als valides JSON zurück (kein Markdown, kein Codeblock):

{{
  "energy_data": [
    {{
      "month": "Jan 23",
      "strom_kwh": 34200,
      "gas_kwh": 62400,
      "fernwaerme_kwh": null,
      "status": "confirmed",
      "anomaly_note": null,
      "missing_note": null,
      "estimated_note": null
    }}
  ],
  "totals": {{
    "strom_kwh": 430000,
    "gas_kwh": 519600,
    "fernwaerme_kwh": 0,
    "total_kwh": 949600,
    "readiness_score": 83,
    "complete_months": 10,
    "estimated_months": 1,
    "missing_months": 1
  }},
  "log": [
    {{"type": "ok",    "text": "Was gefunden wurde"}},
    {{"type": "warn",  "text": "Hinweis oder Anomalie"}},
    {{"type": "error", "text": "Fehlende oder problematische Daten"}}
  ]
}}

REGELN:
- month: deutsches Monatsformat "Mmm JJ" (Jan Feb Mär Apr Mai Jun Jul Aug Sep Okt Nov Dez)
- status "confirmed"  wenn Wert eindeutig aus Dokument
- status "anomaly"    wenn Verbrauch >30 % über Monatsdurchschnitt → anomaly_note erklären
- status "estimated"  wenn Wert unklar/interpoliert → estimated_note erklären
- status "missing"    wenn keine Daten → missing_note: wo Daten anfordern?
- Alle 12 Monate MÜSSEN vorhanden sein (fehlende als status="missing")
- Werte in kWh — falls MWh erkannt, ×1000 umrechnen und im log warnen
- readiness_score = round((confirmed + estimated) / 12 * 100)
- Nur JSON, absolut kein sonstiger Text

Dokumente:
{docs}"""


# ─────────────────────────────── extractors ────────────────────────────────

def _make_client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


async def _extract_image(content: bytes, mime: str, fname: str) -> tuple[str, list[dict]]:
    client = _make_client()
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=MODEL,
            contents=[
                types.Part.from_bytes(data=content, mime_type=mime),
                (
                    "Extrahiere ALLE Text- und Zahlenwerte aus dieser Rechnung. "
                    "Strukturiere die Ausgabe: Abrechnungszeitraum, kWh-Verbrauch, "
                    "Zählerstand, Preis, Rechnungsnummer. Alle Zahlen explizit nennen."
                ),
            ],
        )
        text = response.text or ""
        return text, [
            {"type": "ok", "text": f"{fname}: Bildanalyse abgeschlossen ({len(text)} Zeichen extrahiert)"}
        ]
    except Exception as exc:
        return "", [{"type": "error", "text": f"{fname}: Bildanalyse fehlgeschlagen — {exc}"}]


async def _extract_pdf(content: bytes, fname: str) -> tuple[str, list[dict]]:
    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages_text = [p.extract_text() or "" for p in pdf.pages]
            n_pages = len(pdf.pages)
        text = "\n\n".join(t for t in pages_text if t.strip())
        return text, [
            {"type": "ok", "text": f"{fname}: PDF extrahiert ({n_pages} Seiten, {len(text)} Zeichen)"}
        ]
    except Exception as exc:
        return "", [{"type": "error", "text": f"{fname}: PDF-Extraktion fehlgeschlagen — {exc}"}]


async def _extract_excel(content: bytes, fname: str) -> tuple[str, list[dict]]:
    try:
        import pandas as pd

        xl = pd.ExcelFile(io.BytesIO(content))
        parts: list[str] = []
        for sheet in xl.sheet_names:
            df = xl.parse(sheet).dropna(how="all")
            parts.append(f"[Tabellenblatt: {sheet}]\n{df.to_string(index=False)}")
        text = "\n\n".join(parts)
        return text, [
            {
                "type": "ok",
                "text": f"{fname}: Excel extrahiert ({len(xl.sheet_names)} Blatt/Blätter, {len(text)} Zeichen)",
            }
        ]
    except Exception as exc:
        return "", [{"type": "error", "text": f"{fname}: Excel-Extraktion fehlgeschlagen — {exc}"}]


async def _extract_markitdown(content: bytes, fname: str) -> tuple[str, list[dict]]:
    """Fallback for unknown formats using MarkItDown (Microsoft)."""
    try:
        import tempfile
        from markitdown import MarkItDown  # type: ignore

        suffix = "." + fname.rsplit(".", 1)[-1] if "." in fname else ".bin"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        md = MarkItDown()
        result = md.convert(tmp_path)
        os.unlink(tmp_path)
        text = result.text_content or ""
        return text, [
            {"type": "ok", "text": f"{fname}: via MarkItDown extrahiert ({len(text)} Zeichen)"}
        ]
    except Exception as exc:
        return "", [{"type": "warn", "text": f"{fname}: Unbekanntes Format — übersprungen ({exc})"}]


async def _extract_file(file: UploadFile) -> tuple[str, list[dict]]:
    content = await file.read()
    fname = file.filename or "datei"
    mime = (file.content_type or "").lower()
    ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""

    if mime.startswith("image/") or ext in ("jpg", "jpeg", "png", "webp", "gif"):
        actual_mime = mime if mime.startswith("image/") else f"image/{ext}"
        return await _extract_image(content, actual_mime, fname)

    if ext == "pdf" or "pdf" in mime:
        return await _extract_pdf(content, fname)

    if ext in ("xlsx", "xls") or "spreadsheet" in mime or "excel" in mime:
        return await _extract_excel(content, fname)

    if ext == "csv" or "csv" in mime:
        text = content.decode("utf-8", errors="replace")
        return text, [{"type": "ok", "text": f"{fname}: CSV geladen ({len(text.splitlines())} Zeilen)"}]

    # Unknown format — try markitdown, then raw text
    text, logs = await _extract_markitdown(content, fname)
    if text:
        return text, logs
    text = content.decode("utf-8", errors="replace")
    return text, [{"type": "warn", "text": f"{fname}: Unbekanntes Format — als Text interpretiert"}]


# ─────────────────────────────── endpoint ──────────────────────────────────

@router.post("/process")
async def process_upload(files: List[UploadFile] = File(...)):
    """
    SSE stream: processes uploaded files and returns structured energy data.
    Event stream ends with {"type": "done", "result": <json> | null}.
    """

    async def generate():
        n = len(files)
        yield f"data: {json.dumps({'type': 'info', 'text': f'Analysiere {n} Datei(en)...'})}\n\n"
        await asyncio.sleep(0.2)

        all_texts: list[str] = []

        for file in files:
            yield f"data: {json.dumps({'type': 'info', 'text': f'Verarbeite {file.filename}...'})}\n\n"
            text, logs = await _extract_file(file)
            if text:
                all_texts.append(f"=== DATEI: {file.filename} ===\n{text}")
            for log in logs:
                await asyncio.sleep(0.15)
                yield f"data: {json.dumps(log)}\n\n"

        await asyncio.sleep(0.3)
        yield f"data: {json.dumps({'type': 'info', 'text': 'KI-Extraktion der Energiedaten läuft...'})}\n\n"

        combined = "\n\n".join(all_texts)
        prompt = EXTRACTION_PROMPT.format(docs=combined[:60_000])  # ~15k token budget

        def _call_gemini():
            c = _make_client()
            return c.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

        try:
            response = await asyncio.to_thread(_call_gemini)
            result: dict = json.loads(response.text)

            for entry in result.get("log", []):
                await asyncio.sleep(0.15)
                yield f"data: {json.dumps(entry)}\n\n"

            score = result.get("totals", {}).get("readiness_score", "?")
            yield f"data: {json.dumps({'type': 'ok', 'text': f'✓ Verarbeitung abgeschlossen — Datenbereitschaft: {score}%'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'done', 'result': result})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'text': f'KI-Extraktion fehlgeschlagen: {exc}'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'result': None})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
