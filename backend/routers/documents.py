"""Document management per case — real Gemini extraction pipeline."""

import asyncio
import io
import json
import os

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional, List

from dotenv import load_dotenv
from google import genai
from google.genai import types

import store_firestore as fs
from store import generate_id, now_iso, document_blobs
from models import DocumentMeta, DocumentClassifyRequest, LedgerEntry
from services.audit_log_service import log_event

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


async def _extract_file_content(content: bytes, fname: str, mime: str) -> tuple[str, list[dict]]:
    """Extract text from file content based on type."""
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


# ─────────────────────────────── CRUD endpoints ───────────────────────────

@router.get("", response_model=list[DocumentMeta])
async def list_documents(case_id: str, category: Optional[str] = Query(None)):
    result = await fs.list_documents(case_id, category=category)
    return sorted(result, key=lambda d: d.uploaded_at, reverse=True)


@router.post("", response_model=list[DocumentMeta])
async def upload_documents(case_id: str, files: List[UploadFile] = File(...)):
    """Upload files and store metadata + raw content for later processing."""
    case = await fs.get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    uploaded = []
    for f in files:
        content = await f.read()
        doc = DocumentMeta(
            id=f"doc-{generate_id()}",
            case_id=case_id,
            filename=f.filename or "unknown",
            file_size=len(content),
            mime_type=f.content_type or "application/octet-stream",
            status="uploaded",
            uploaded_at=now_iso(),
        )
        await fs.create_document(doc)
        # Store raw content for processing
        document_blobs[doc.id] = content
        uploaded.append(doc)
        await log_event(
            "document_uploaded",
            case_id=case_id,
            entity_type="document",
            entity_id=doc.id,
            detail=f"Datei '{doc.filename}' hochgeladen",
        )

    return uploaded


@router.get("/{doc_id}", response_model=DocumentMeta)
async def get_document(case_id: str, doc_id: str):
    doc = await fs.get_document(doc_id)
    if not doc or doc.case_id != case_id:
        raise HTTPException(404, f"Document {doc_id} not found in case {case_id}")
    return doc


@router.patch("/{doc_id}/classify", response_model=DocumentMeta)
async def classify_document(case_id: str, doc_id: str, data: DocumentClassifyRequest):
    doc = await fs.get_document(doc_id)
    if not doc or doc.case_id != case_id:
        raise HTTPException(404, f"Document {doc_id} not found in case {case_id}")

    doc = await fs.update_document(doc_id, {"category": data.category, "category_confidence": 100})
    await log_event(
        "document_classified",
        case_id=case_id,
        entity_type="document",
        entity_id=doc_id,
        detail=f"Dokument als '{data.category}' klassifiziert",
    )
    return doc


@router.delete("/{doc_id}")
async def delete_document(case_id: str, doc_id: str):
    doc = await fs.get_document(doc_id)
    if not doc or doc.case_id != case_id:
        raise HTTPException(404, f"Document {doc_id} not found in case {case_id}")

    await fs.delete_document(doc_id)
    document_blobs.pop(doc_id, None)
    await log_event(
        "document_deleted",
        case_id=case_id,
        entity_type="document",
        entity_id=doc_id,
        detail=f"Dokument '{doc.filename}' gelöscht",
    )
    return {"ok": True}


# ─────────────────────────────── process endpoint ─────────────────────────

@router.post("/process")
async def process_documents(case_id: str):
    """
    SSE stream: real Gemini extraction pipeline.

    1. Finds all 'uploaded' documents for this case
    2. Extracts text from each (image OCR, PDF, Excel, CSV)
    3. Sends combined text to Gemini for structured energy data extraction
    4. Writes extracted LedgerEntry rows into Firestore
    5. Updates document status to 'extracted'
    """
    case = await fs.get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    case_docs = await fs.list_documents(case_id)
    unprocessed = [d for d in case_docs if d.status == "uploaded"]
    already_done = [d for d in case_docs if d.status == "extracted"]

    async def generate():
        n_total = len(case_docs)
        n_new = len(unprocessed)
        yield f"data: {json.dumps({'type': 'info', 'text': f'{n_total} Dokument(e) gefunden, {n_new} neu zu verarbeiten'})}\n\n"
        await asyncio.sleep(0.2)

        # Report already-extracted docs
        for doc in already_done:
            yield f"data: {json.dumps({'type': 'ok', 'text': f'{doc.filename}: Bereits extrahiert ({doc.extracted_fields_count} Felder)'})}\n\n"

        if n_new == 0:
            # No new files — just return current totals
            entries = await fs.list_ledger_entries(case_id)
            result = _build_totals_result(entries)
            yield f"data: {json.dumps({'type': 'ok', 'text': 'Keine neuen Dokumente zu verarbeiten'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'result': result})}\n\n"
            return

        # Step 1: Extract text from each new document
        all_texts: list[str] = []
        doc_ids_processed: list[str] = []

        for doc in unprocessed:
            yield f"data: {json.dumps({'type': 'info', 'text': f'{doc.filename}: Verarbeitung...'})}\n\n"

            blob = document_blobs.get(doc.id)
            if blob is None:
                yield f"data: {json.dumps({'type': 'warn', 'text': f'{doc.filename}: Keine Datei-Daten verfügbar'})}\n\n"
                continue

            await fs.update_document(doc.id, {"status": "processing"})
            text, logs = await _extract_file_content(blob, doc.filename, doc.mime_type)

            for log_entry in logs:
                await asyncio.sleep(0.15)
                yield f"data: {json.dumps(log_entry)}\n\n"

            if text:
                all_texts.append(f"=== DATEI: {doc.filename} ===\n{text}")
                doc_ids_processed.append(doc.id)

        if not all_texts:
            yield f"data: {json.dumps({'type': 'warn', 'text': 'Keine extrahierbaren Inhalte gefunden'})}\n\n"
            for doc in unprocessed:
                await fs.update_document(doc.id, {"status": "error"})
            entries = await fs.list_ledger_entries(case_id)
            result = _build_totals_result(entries)
            yield f"data: {json.dumps({'type': 'done', 'result': result})}\n\n"
            return

        # Step 2: Send to Gemini for structured extraction
        await asyncio.sleep(0.2)
        yield f"data: {json.dumps({'type': 'info', 'text': 'Ada AI — Strukturierte Energiedaten-Extraktion läuft...'})}\n\n"

        combined = "\n\n".join(all_texts)
        prompt = EXTRACTION_PROMPT.format(docs=combined[:60_000])

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
            gemini_result: dict = json.loads(response.text)

            # Stream Gemini's log entries
            for entry in gemini_result.get("log", []):
                await asyncio.sleep(0.15)
                yield f"data: {json.dumps(entry)}\n\n"

            # Step 3: Write energy_data into the ledger
            energy_data = gemini_result.get("energy_data", [])
            n_entries = 0
            for row in energy_data:
                month = row.get("month", "")
                for carrier in ["strom", "gas", "fernwaerme"]:
                    value = row.get(f"{carrier}_kwh")
                    if value is not None and value > 0:
                        entry_id = f"le-{generate_id()}"
                        status = row.get("status", "confirmed")
                        # Map status
                        if status not in ("confirmed", "anomaly", "estimated", "missing"):
                            status = "confirmed"
                        note = row.get(f"{status}_note") or row.get("anomaly_note")
                        le = LedgerEntry(
                            id=entry_id,
                            case_id=case_id,
                            month=month,
                            carrier=carrier,
                            value_kwh=float(value),
                            status=status,
                            note=note,
                            source_doc_id=doc_ids_processed[0] if doc_ids_processed else None,
                            confidence=85,
                            review_status="pending",
                            created_at=now_iso(),
                            updated_at=now_iso(),
                        )
                        await fs.create_ledger_entry(le)
                        n_entries += 1

            yield f"data: {json.dumps({'type': 'ok', 'text': f'{n_entries} Ledger-Einträge aus {len(energy_data)} Monaten erstellt'})}\n\n"

            # Step 4: Update document status
            for doc_id in doc_ids_processed:
                await fs.update_document(doc_id, {"status": "extracted", "extracted_fields_count": n_entries})

            # Compute final totals from ledger
            all_entries = await fs.list_ledger_entries(case_id)
            result = _build_totals_result(all_entries)

            score = result["totals"]["readiness_score"]
            yield f"data: {json.dumps({'type': 'ok', 'text': f'Verarbeitung abgeschlossen — Datenbereitschaft: {score}%'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'done', 'result': result})}\n\n"

            await log_event(
                "extraction_completed",
                case_id=case_id,
                detail=f"Gemini-Extraktion: {n_entries} Einträge aus {n_new} Dokument(en), Bereitschaft {score}%",
            )

        except Exception as exc:
            # Mark docs as error
            for doc_id in doc_ids_processed:
                await fs.update_document(doc_id, {"status": "error"})
            yield f"data: {json.dumps({'type': 'error', 'text': f'KI-Extraktion fehlgeschlagen: {exc}'})}\n\n"
            entries = await fs.list_ledger_entries(case_id)
            result = _build_totals_result(entries)
            yield f"data: {json.dumps({'type': 'done', 'result': result})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _build_totals_result(entries: list[LedgerEntry]) -> dict:
    """Build totals dict from ledger entries."""
    strom = sum(e.value_kwh or 0 for e in entries if e.carrier == "strom")
    gas = sum(e.value_kwh or 0 for e in entries if e.carrier == "gas")
    fw = sum(e.value_kwh or 0 for e in entries if e.carrier == "fernwaerme")
    total = strom + gas + fw
    confirmed = sum(1 for e in entries if e.status == "confirmed")
    estimated = sum(1 for e in entries if e.status == "estimated")
    missing = sum(1 for e in entries if e.status == "missing")
    total_entries = len(entries)
    readiness = round((confirmed + estimated) / max(total_entries, 1) * 100) if total_entries > 0 else 0

    return {
        "entries_count": total_entries,
        "totals": {
            "strom_kwh": strom,
            "gas_kwh": gas,
            "fernwaerme_kwh": fw,
            "total_kwh": total,
            "readiness_score": readiness,
            "complete_months": confirmed,
            "estimated_months": estimated,
            "missing_months": missing,
        }
    }
