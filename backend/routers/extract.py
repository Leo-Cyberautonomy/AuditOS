import json
import asyncio
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

DEMO_DATA_PATH = Path(__file__).parent.parent / "data" / "demo_dataset.json"


def _load_demo():
    with open(DEMO_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


@router.post("")
async def extract_files():
    """
    Demo endpoint: returns the hardcoded Mühlviertler Feinkost dataset.
    In production this would accept multipart file uploads and run OCR.
    """
    data = _load_demo()
    return {
        "company": data["company"],
        "energy_data": data["energy_data"],
        "totals": data["totals"],
        "benchmarks": data["benchmarks"],
    }


@router.get("/stream-log")
async def stream_processing_log():
    """
    SSE endpoint that streams a realistic processing log for the demo upload flow.
    Frontend connects here after drag-drop to get the terminal log effect.
    """
    data = _load_demo()
    log_entries = data["processing_log"]

    async def event_generator():
        for entry in log_entries:
            await asyncio.sleep(entry["delay_ms"] / 1000)
            payload = json.dumps({"type": entry["type"], "text": entry["text"]})
            yield f"data: {payload}\n\n"
        # Signal completion
        yield f"data: {json.dumps({'type': 'done', 'text': ''})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
