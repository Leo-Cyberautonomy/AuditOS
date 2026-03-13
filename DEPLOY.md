# AuditAI — Deployment Guide

## Local Development

### Prerequisites
- Python 3.13+
- Node.js 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Backend
```bash
cd backend
cp ../.env.example .env  # Edit with your GEMINI_API_KEY
uv venv && uv pip install -e .
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp ../.env.example .env.local  # Edit with your API keys
npm install
npm run dev
```

Open http://localhost:3000

## Google Cloud Run Deployment

### 1. Set up Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### 2. Deploy Backend
```bash
cd backend
gcloud run deploy auditai-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY,FRONTEND_URL=https://your-frontend-url.vercel.app" \
  --session-affinity \
  --timeout 3600 \
  --min-instances 1
```

### 3. Deploy Frontend (Vercel)
```bash
cd frontend
npx vercel --prod
# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://auditai-backend-xxxxx.run.app
# NEXT_PUBLIC_GEMINI_API_KEY = your-key
```

## Architecture

See [docs/architecture-diagram.md](docs/architecture-diagram.md) for the full system architecture.
