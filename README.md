# AuditAI — Real-Time AI Field Audit Assistant

> **Gemini Live Agent Challenge** | Track 3: UI Navigator

AuditAI is an AI-powered platform that transforms energy auditing through real-time multimodal interaction. Auditors speak naturally and point their camera at equipment — Gemini sees, understands, and acts as a knowledgeable co-pilot during field inspections.

## The Problem

Energy audits are critical for compliance (ISO 50001, EN 16247-1) and identifying savings opportunities. Today, auditors juggle clipboards, cameras, measurement tools, and reference manuals simultaneously. They record findings on paper, manually transcribe nameplate data, and later spend hours assembling reports. **Data gets lost, context gets forgotten, and the report quality suffers.**

## The Solution

AuditAI puts an expert AI co-pilot in the auditor's pocket:

- **Talk naturally** — describe what you see, ask questions about standards, get instant guidance
- **Point your camera** — AI reads equipment nameplates, spots defects, identifies energy waste
- **Hands-free data capture** — AI automatically records equipment, meter readings, and issues via function calling
- **Instant reports** — structured audit reports generated from collected evidence, compliant with international standards

## Architecture

```
┌─────────────────────────────────┐
│       AuditAI Frontend          │
│     (Next.js 16 + React 19)     │
│                                 │
│  Camera ─┐                      │
│  Mic ────┤  WebSocket Client    │── WS ──→  FastAPI Backend (Cloud Run)
│  Speaker ┘                      │                    │
│                                 │             ADK Runner.run_live()
│  Cases │ Docs │ Reports │ KPIs  │── REST ──→         │
└─────────────────────────────────┘             Gemini Live API
                                            (native audio + vision)
```

**Architecture: Google ADK Multi-Agent System**

```
                    ┌──────────────────────┐
                    │   Root Coordinator   │
                    │  (gemini-3-flash)    │
                    └──────┬───────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
   ┌──────────────┐ ┌────────────┐ ┌───────────────┐
   │ LiveAuditAgent│ │ReportAgent │ │ExtractionAgent│
   │ (native-audio)│ │(3-flash)   │ │  (3-flash)    │
   │              │ │            │ │               │
   │ 14 Tools:   │ │ 3 Tools:   │ │ 2 Tools:      │
   │ 5 Field:    │ │ - case data│ │ - extract data│
   │ - equipment │ │ - measures │ │ - anomalies   │
   │ - meters    │ │ - evidence │ │               │
   │ - issues    │ │            │ │               │
   │ - evidence  │ │            │ │               │
   │ - standards │ │            │ │               │
   │ 9 Desk:     │ │            │ │               │
   │ - navigate  │ │            │ │               │
   │ - highlight │ │            │ │               │
   │ - filter    │ │            │ │               │
   │ - explain   │ │            │ │               │
   │ - regulation│ │            │ │               │
   │ - summary   │ │            │ │               │
   │ - screenshot│ │            │ │               │
   │ - read page │ │            │ │               │
   │ - click     │ │            │ │               │
   └──────────────┘ └────────────┘ └───────────────┘
```

**Key architectural decisions:**
- Frontend connects to backend WebSocket, **not** directly to Gemini — API keys stay server-side
- Google ADK (`google-adk`) manages agent lifecycle, function calling, and session state
- `Runner.run_live()` provides bidirectional streaming with automatic tool execution
- `contextvars` ensure thread-safe session isolation for concurrent users

## Features

| Feature | Description | Gemini Usage |
|---------|-------------|-------------|
| **Live Field Audit** | Real-time voice + vision AI assistant during inspections | ADK `run_live()` with native audio model + function calling |
| **Document Intelligence** | Upload invoices/bills → OCR extraction + anomaly detection | Gemini 3 Flash Vision API |
| **AI Report Generation** | EN 16247-1 / ISO 50001 compliant streaming reports | Gemini 3 Flash (text generation) |
| **Evidence Anchoring** | Every AI finding linked to source evidence with confidence scores | Structured extraction |
| **Compliance Engine** | Auto-fill regulatory forms from audit data | Rule engine + Gemini |
| **Multi-Standard** | ISO 50001, EN 16247-1, ASHRAE Level I/II/III, DIN 17463 | `query_standard` tool with reference data |
| **Multilingual** | German + English UI, responds in auditor's language | Gemini native multilingual |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| State Management | Zustand |
| Real-time | WebSocket (frontend ↔ backend ↔ Gemini Live API) |
| Backend | Python 3.13, FastAPI, Google ADK (`google-adk`) |
| Database | **Google Cloud Firestore** (9 collections, async CRUD) |
| Agent Framework | Google ADK — `Agent`, `Runner`, `InMemorySessionService`, `LiveRequestQueue` |
| Models | **Gemini 2.5 Flash Native Audio** (live), **Gemini 3 Flash** (batch) |
| Deployment | **Google Cloud Run** (backend + frontend) |
| Document Processing | pdfplumber, Pandas, Pillow, markitdown |
| Deployment | **Google Cloud Run** (backend + frontend), **Cloud Build** |

## Google Cloud Services

- **Gemini API** — Live API (real-time native audio + vision), Vision API (document OCR), Generation API (reports)
- **Google ADK** — Multi-agent orchestration with automatic function calling
- **Cloud Run** — Full-stack deployment (backend + frontend) with WebSocket support
- **Cloud Build** — Automated container builds from source

## Live Demo

- **Frontend:** https://auditai-frontend-342109712917.us-central1.run.app
- **Backend API:** https://auditai-backend-342109712917.us-central1.run.app

## Reproducible Testing Instructions

### Option 1: Use the Live Demo (Recommended)

1. Open https://auditai-frontend-342109712917.us-central1.run.app
2. Click **"Enter Platform"** → you'll see 5 pre-seeded audit cases across different domains
3. Click the **"AI"** button in the top-right of the sidebar to activate the AI companion
4. **Allow microphone access** when prompted
5. Try these voice commands:
   - *"Introduce yourself"* — AI describes its capabilities
   - *"Take me to Case 1 overview"* — voice navigation
   - *"Give me a summary of this case"* — screen reading
   - *"Go to the review page"* — page navigation
   - *"Show me only the critical findings"* — data filtering
   - *"Highlight the first one"* — visual highlighting
   - *"What does ISO 50001 say about energy performance indicators?"* — regulation lookup
   - *"Go to the report page and click Generate Report"* — button clicking
   - *"Go to the live audit page"* — field mode with camera
6. In field mode, point camera at any equipment and describe what you see — AI records findings automatically

### Option 2: Run Locally

**Prerequisites:** Python 3.13+, Node.js 20+, a [Gemini API key](https://aistudio.google.com/)

```bash
# Backend
cd backend
echo "GEMINI_API_KEY=your_key_here" > .env
uv venv && source .venv/bin/activate
uv pip install fastapi 'uvicorn[standard]' google-genai google-adk pandas pdfplumber pillow python-dotenv markitdown openpyxl python-multipart google-cloud-firestore
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm install
npm run dev
```

Open http://localhost:3000 → Enter Platform → Click AI button → Start talking

### Option 3: Deploy to Google Cloud Run

```bash
# Enable APIs
gcloud services enable firestore.googleapis.com generativelanguage.googleapis.com

# Create Firestore database
gcloud firestore databases create --location=nam5 --type=firestore-native

# Deploy backend
cd backend
gcloud run deploy auditai-backend --source . --region us-central1 \
  --allow-unauthenticated --session-affinity --timeout 3600 --min-instances 1 \
  --set-env-vars "GEMINI_API_KEY=your_key,GOOGLE_API_KEY=your_key"

# Deploy frontend (update Dockerfile ARG with your backend URL first)
cd frontend
gcloud run deploy auditai-frontend --source . --region us-central1 \
  --allow-unauthenticated --min-instances 0 --timeout 60
```


## Live Audit — How It Works

1. **Start Session** — Auditor opens a case and starts a live audit session
2. **Camera + Mic** — Browser captures video frames (JPEG, 2fps) and audio (PCM 16-bit, 16kHz)
3. **WebSocket → ADK** — Audio/video sent to backend via WebSocket, forwarded to ADK `LiveRequestQueue`
4. **ADK Runner** — `Runner.run_live()` streams to Gemini Live API, handles function calls automatically
5. **Function Calling** — AI automatically invokes tools (server-side, via ADK):
   - `record_equipment` — Log equipment with type, power rating, condition
   - `record_meter_reading` — Capture meter readings (electricity, gas, heat, water)
   - `flag_issue` — Flag efficiency issues with severity and recommended measures
   - `capture_evidence` — Save visual evidence linked to the audit case
   - `query_standard` — Query ISO 50001, EN 16247-1, ASHRAE, DIN 17463 reference data
6. **Findings Panel** — All findings appear in real-time in the UI via WebSocket
7. **Report** — Generate a standards-compliant audit report from all collected evidence

## Project Structure

```
AuditAI/
├── backend/                  # FastAPI backend
│   ├── main.py              # App entry point + router registration
│   ├── store.py             # In-memory data store
│   ├── agents/              # Google ADK agent definitions
│   │   ├── live_audit_agent.py  # Live field audit (native audio)
│   │   ├── report_agent.py      # Report generation
│   │   ├── extraction_agent.py  # Document extraction
│   │   └── root_agent.py       # Multi-agent coordinator
│   ├── models/              # Pydantic models
│   ├── routers/             # API endpoints
│   │   ├── ws.py            # WebSocket ↔ ADK bridge
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
│   │   ├── live-audit.ts    # WebSocket client (connects to backend)
│   │   └── stores/          # Zustand stores
│   ├── components/          # Shared UI components
│   └── Dockerfile           # Cloud Run deployment
└── .env.example             # Environment variable template
```

## License

MIT
