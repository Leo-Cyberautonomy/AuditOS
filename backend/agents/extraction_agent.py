"""Extraction Agent — Intelligent document processing for energy data.

Extracts structured energy consumption data from uploaded documents
(invoices, bills, Excel files) using Gemini vision and text understanding.
"""

import io
import json
import asyncio
import os

from google.adk.agents import Agent
from google import genai
from google.genai import types


# ─── Tool Functions ──────────────────────────────────────────────────────────

def extract_energy_data(document_texts: str) -> dict:
    """Extract structured monthly energy consumption data from document text.

    Analyzes the provided document text (from invoices, bills, Excel exports)
    and returns structured energy data with monthly breakdowns.

    Args:
        document_texts: Combined text content from all uploaded documents.
    """
    # This is called by the agent after it processes the documents
    # The actual extraction logic is in the agent's instruction
    return {
        "status": "awaiting_extraction",
        "note": "Use the document content provided to extract energy data in the required JSON format.",
    }


def detect_anomalies(
    monthly_data: str,
) -> dict:
    """Analyze monthly energy data for anomalies and missing values.

    Checks for consumption spikes (>30% above average), missing months,
    and data quality issues.

    Args:
        monthly_data: JSON string of monthly energy data array.
    """
    try:
        data = json.loads(monthly_data)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON data"}

    anomalies = []
    missing = []
    values = [r.get("strom_kwh", 0) or 0 for r in data if r.get("strom_kwh")]

    if values:
        avg = sum(values) / len(values)
        for row in data:
            val = row.get("strom_kwh")
            if val is None:
                missing.append(row.get("month", "unknown"))
            elif val > avg * 1.3:
                anomalies.append({
                    "month": row.get("month"),
                    "value": val,
                    "average": round(avg),
                    "deviation_pct": round((val / avg - 1) * 100, 1),
                })

    return {
        "anomalies_found": len(anomalies),
        "missing_months": missing,
        "anomalies": anomalies,
        "average_kwh": round(avg) if values else 0,
    }


# ─── Agent Definition ────────────────────────────────────────────────────────

EXTRACTION_INSTRUCTION = """You are an expert energy data analyst. Your job is to extract structured energy consumption data from uploaded documents (utility invoices, bills, Excel spreadsheets).

When given document content, extract monthly energy data and return it in this exact JSON format:

{
  "energy_data": [
    {
      "month": "Jan 25",
      "strom_kwh": 34200,
      "gas_kwh": 62400,
      "fernwaerme_kwh": null,
      "status": "confirmed",
      "anomaly_note": null,
      "missing_note": null,
      "estimated_note": null
    }
  ],
  "totals": {
    "strom_kwh": 430000,
    "gas_kwh": 519600,
    "fernwaerme_kwh": 0,
    "total_kwh": 949600,
    "readiness_score": 83,
    "complete_months": 10,
    "estimated_months": 1,
    "missing_months": 1
  },
  "log": [
    {"type": "ok", "text": "Description of what was found"},
    {"type": "warn", "text": "Warning or anomaly detected"},
    {"type": "error", "text": "Missing or problematic data"}
  ]
}

RULES:
- Month format: "Mmm YY" (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec)
- status "confirmed" when value is clearly from document
- status "anomaly" when consumption is >30% above monthly average → explain in anomaly_note
- status "estimated" when value is unclear/interpolated → explain in estimated_note
- status "missing" when no data available → explain in missing_note where to request data
- All 12 months MUST be present (missing ones as status="missing")
- Values in kWh — if MWh detected, convert ×1000 and warn in log
- readiness_score = round((confirmed + estimated) / 12 * 100)

After extraction, use detect_anomalies to verify the data quality."""

extraction_agent = Agent(
    name="extraction_agent",
    description="Extracts structured energy consumption data from uploaded documents (invoices, bills, Excel files). Performs OCR, data extraction, anomaly detection, and quality validation.",
    model="gemini-3-flash-preview",
    instruction=EXTRACTION_INSTRUCTION,
    tools=[
        extract_energy_data,
        detect_anomalies,
    ],
)
