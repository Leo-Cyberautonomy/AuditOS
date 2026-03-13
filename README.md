# AuditAI — Real-Time AI Field Audit Assistant

> **Gemini Live Agent Challenge Submission** | Live Agents Track

AuditAI is an AI-powered platform that transforms energy auditing through real-time multimodal interaction. Auditors speak naturally and point their camera at equipment — Gemini sees, understands, and acts as a knowledgeable co-pilot during field inspections.

## The Problem

Energy audits are critical for compliance (ISO 50001, EN 16247-1) and identifying savings opportunities. Today, auditors juggle clipboards, cameras, measurement tools, and reference manuals simultaneously. They record findings on paper, manually transcribe nameplate data, and later spend hours assembling reports. **Data gets lost, context gets forgotten, and the report quality suffers.**

## The Solution

AuditAI puts an expert AI co-pilot in the auditor's pocket:

- **Talk naturally** — describe what you see, ask questions about standards, get instant guidance
- **Point your camera** — AI reads equipment nameplates, spots defects, identifies energy waste
- **Hands-free data capture** — AI automatically records equipment, meter readings, and issues via function calling
- **Instant reports** — structured audit reports generated from collected evidence, compliant with international standards

## Demo

https://github.com/user-attachments/assets/demo-placeholder

## Architecture

```
┌─────────────────────────────────┐
│       AuditAI Frontend          │
│     (Next.js 16 + React 19)     │
│                                 │
│  Camera ─┐                      │
│  Mic ────┤  @google/genai SDK   │─── WebSocket ──→ Gemini Live API
│  Speaker ┘  (Live API Client)   │                  (2.5 Flash)
│                                 │
│  Cases │ Docs │ Reports │ KPIs  │─── REST/SSE ──→ FastAPI Backend
└─────────────────────────────────┘                  (Cloud Run)
```

**Key architectural decision:** The frontend connects **directly** to Gemini Live API via WebSocket for lowest possible latency. The backend handles only data persistence and batch processing (documents, reports, analytics).

## Features

| Feature | Description | Gemini Usage |
|---------|-------------|-------------|
| **Live Field Audit** | Real-time voice + vision AI assistant during inspections | Live API (audio + video streaming + function calling) |
| **Document Intelligence** | Upload invoices/bills → OCR extraction + anomaly detection | Gemini Vision API |
| **AI Report Generation** | EN 16247-1 / ISO 50001 compliant streaming reports | Gemini 2.5 Flash (text generation) |
| **Evidence Anchoring** | Every AI finding linked to source evidence with confidence scores | Structured extraction |
| **Compliance Engine** | Auto-fill regulatory forms from audit data | Rule engine + Gemini |
| **Multi-Standard** | ISO 50001, EN 16247-1, ASHRAE Level I/II/III | Configurable prompts |
| **Multilingual** | German + English UI, responds in auditor's language | Gemini native multilingual |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| State Management | Zustand |
| AI (Frontend) | `@google/genai` — Live API for real-time multimodal |
| Backend | Python 3.13, FastAPI |
| AI (Backend) | `google-genai` — Vision, text generation, streaming |
| Model | **Gemini 2.5 Flash** (Live + batch) |
| Deployment | **Google Cloud Run** (backend), Vercel (frontend) |
| Document Processing | pdfplumber, Pandas, Pillow, markitdown |

## Google Cloud Services

- **Gemini API** — Live API (real-time audio/video), Vision API (document OCR), Generation API (reports)
- **Cloud Run** — Backend deployment with session affinity for WebSocket support

## Quick Start

### Prerequisites
- Python 3.13+
- Node.js 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Backend
```bash
cd backend
cp ../.env.example .env          # Add your GEMINI_API_KEY
python -m venv .venv && source .venv/bin/activate
pip install fastapi 'uvicorn[standard]' google-genai pandas pdfplumber pillow python-dotenv markitdown openpyxl python-multipart
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp ../.env.example .env.local    # Add your NEXT_PUBLIC_GEMINI_API_KEY
npm install
npm run dev
```

Open http://localhost:3000

### Deploy to Google Cloud Run
```bash
cd backend
gcloud run deploy auditai-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY" \
  --session-affinity \
  --timeout 3600
```

## Live Audit — How It Works

1. **Start Session** — Auditor opens a case and starts a live audit session
2. **Camera + Mic** — Browser captures video frames (JPEG, 2fps) and audio (PCM 16-bit, 16kHz)
3. **Gemini Live API** — Receives audio + video via WebSocket, responds with voice + function calls
4. **Function Calling** — AI automatically invokes tools:
   - `record_equipment` — Log equipment with type, power rating, condition
   - `record_meter_reading` — Capture meter readings (electricity, gas, heat, water)
   - `flag_issue` — Flag efficiency issues with severity and recommended measures
   - `capture_evidence` — Save visual evidence linked to the audit case
5. **Findings Panel** — All findings appear in real-time in the UI, synced to backend
6. **Report** — Generate a standards-compliant audit report from all collected evidence

## Project Structure

```
AuditAI/
├── backend/                  # FastAPI backend
│   ├── main.py              # App entry point
│   ├── store.py             # In-memory data store
│   ├── models/              # Pydantic models
│   ├── routers/             # API endpoints
│   │   ├── live_audit.py    # Live session REST API
│   │   ├── report.py        # AI report generation (SSE)
│   │   ├── compliance.py    # Compliance form engine
│   │   └── ...
│   ├── services/            # Business logic
│   └── Dockerfile           # Cloud Run deployment
├── frontend/                 # Next.js frontend
│   ├── app/                 # App router pages
│   │   └── (platform)/cases/[caseId]/
│   │       └── live-audit/  # Live audit page
│   ├── lib/
│   │   ├── live-audit.ts    # Gemini Live API client
│   │   └── stores/          # Zustand stores
│   └── components/          # Shared UI components
└── docs/                    # Architecture & design docs
```

## License

MIT
