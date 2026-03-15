import type {
  Case,
  CaseCreate,
  CaseDocument,
  LedgerEntry,
  LedgerTotals,
  ReviewItem,
  ReviewStats,
  AuditLogEntry,
  SSEEvent,
  Measure,
  MeasuresSummary,
  ComplianceResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Existing endpoints (backward compatible) ──────────────────────────────

export async function fetchExtractedData() {
  const res = await fetch(`${API_BASE}/extract`, { method: "POST", headers: { "Content-Length": "0" } });
  if (!res.ok) throw new Error("Extract failed");
  return res.json();
}

export async function fetchCompliancePrefill() {
  const res = await fetch(`${API_BASE}/compliance/prefill`);
  if (!res.ok) throw new Error("Compliance prefill failed");
  return res.json();
}

export function createReportStream(): EventSource {
  return new EventSource(`${API_BASE}/report/stream`);
}

export async function* streamReport(): AsyncGenerator<string> {
  const res = await fetch(`${API_BASE}/report/stream`, { method: "POST", headers: { "Content-Length": "0" } });
  if (!res.ok || !res.body) throw new Error("Stream failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6).trim();
        if (payload) yield payload;
      }
    }
  }
}

export function formatDe(n: number): string {
  return n.toLocaleString("de-AT");
}

// ─── SSE helper ────────────────────────────────────────────────────────────

async function* sseStream(url: string, method = "POST"): AsyncGenerator<SSEEvent> {
  const res = await fetch(url, { method });
  if (!res.ok || !res.body) throw new Error(`SSE stream failed: ${url}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6).trim());
        } catch {
          // skip malformed
        }
      }
    }
  }
}

// ─── Cases ─────────────────────────────────────────────────────────────────

export async function fetchCases(params?: { status?: string; search?: string }): Promise<Case[]> {
  const url = new URL(`${API_BASE}/cases`);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.search) url.searchParams.set("search", params.search);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

export async function fetchCase(caseId: string): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error(`Failed to fetch case ${caseId}`);
  return res.json();
}

export async function createCase(data: CaseCreate): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create case");
  return res.json();
}

export async function transitionCase(caseId: string, to: string): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to }),
  });
  if (!res.ok) throw new Error(`Failed to transition case ${caseId}`);
  return res.json();
}

// ─── Documents ─────────────────────────────────────────────────────────────

export async function fetchDocuments(caseId: string): Promise<CaseDocument[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocuments(caseId: string, files: File[]): Promise<CaseDocument[]> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${API_BASE}/cases/${caseId}/documents`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload documents");
  return res.json();
}

export async function deleteDocument(caseId: string, docId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function classifyDocument(
  caseId: string,
  docId: string,
  category: string
): Promise<CaseDocument> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/documents/${docId}/classify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });
  if (!res.ok) throw new Error("Failed to classify document");
  return res.json();
}

export async function* streamDocumentProcessing(caseId: string): AsyncGenerator<SSEEvent> {
  yield* sseStream(`${API_BASE}/cases/${caseId}/documents/process`);
}

// ─── Ledger ────────────────────────────────────────────────────────────────

export async function fetchLedger(
  caseId: string,
  filters?: { carrier?: string; status?: string; month?: string; review_status?: string }
): Promise<LedgerEntry[]> {
  const url = new URL(`${API_BASE}/cases/${caseId}/ledger`);
  if (filters?.carrier) url.searchParams.set("carrier", filters.carrier);
  if (filters?.status) url.searchParams.set("status", filters.status);
  if (filters?.month) url.searchParams.set("month", filters.month);
  if (filters?.review_status) url.searchParams.set("review_status", filters.review_status);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch ledger");
  return res.json();
}

export async function fetchLedgerSummary(caseId: string): Promise<LedgerTotals> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/ledger/summary`);
  if (!res.ok) throw new Error("Failed to fetch ledger summary");
  return res.json();
}

export async function updateLedgerEntry(
  caseId: string,
  entryId: string,
  data: { value_kwh?: number; status?: string; note?: string; review_status?: string }
): Promise<LedgerEntry> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/ledger/${entryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update ledger entry");
  return res.json();
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export async function fetchReviews(params?: {
  case_id?: string;
  priority?: string;
  status?: string;
  category?: string;
}): Promise<ReviewItem[]> {
  const url = new URL(`${API_BASE}/reviews`);
  if (params?.case_id) url.searchParams.set("case_id", params.case_id);
  if (params?.priority) url.searchParams.set("priority", params.priority);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.category) url.searchParams.set("category", params.category);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export async function fetchReviewStats(caseId?: string): Promise<ReviewStats> {
  const url = new URL(`${API_BASE}/reviews/stats`);
  if (caseId) url.searchParams.set("case_id", caseId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch review stats");
  return res.json();
}

export async function updateReview(
  itemId: string,
  data: { status?: string; reviewer_note?: string }
): Promise<ReviewItem> {
  const res = await fetch(`${API_BASE}/reviews/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update review");
  return res.json();
}

export async function batchReviewAction(data: {
  item_ids: string[];
  action: "approve" | "reject" | "defer";
  note?: string;
}): Promise<ReviewItem[]> {
  const res = await fetch(`${API_BASE}/reviews/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to batch review");
  return res.json();
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

export async function fetchAuditLog(params?: {
  case_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  const url = new URL(`${API_BASE}/audit-log`);
  if (params?.case_id) url.searchParams.set("case_id", params.case_id);
  if (params?.action) url.searchParams.set("action", params.action);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

// ─── Measures ─────────────────────────────────────────────────────────────

export async function fetchMeasures(caseId: string): Promise<Measure[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/measures`);
  if (!res.ok) throw new Error("Failed to fetch measures");
  return res.json();
}

export async function fetchMeasuresSummary(caseId: string): Promise<MeasuresSummary> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/measures/summary`);
  if (!res.ok) throw new Error("Failed to fetch measures summary");
  return res.json();
}

export async function fetchMeasure(caseId: string, measureId: string): Promise<Measure> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/measures/${measureId}`);
  if (!res.ok) throw new Error("Failed to fetch measure");
  return res.json();
}

// ─── Case-scoped Report & Compliance ──────────────────────────────────────

export async function* streamCaseReport(caseId: string, lang = "de"): AsyncGenerator<string> {
  const res = await fetch(`${API_BASE}/report/case/${caseId}/stream?lang=${lang}`, {
    method: "POST",
    headers: { "Content-Length": "0" },
  });
  if (!res.ok || !res.body) throw new Error("Stream failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6).trim();
        if (payload) yield payload;
      }
    }
  }
}

export async function fetchCaseCompliancePrefill(caseId: string): Promise<ComplianceResponse> {
  const res = await fetch(`${API_BASE}/compliance/case/${caseId}/prefill`);
  if (!res.ok) throw new Error("Failed to fetch case compliance prefill");
  return res.json();
}
