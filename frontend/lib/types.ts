// ─── Core Types ─────────────────────────────────────────────────────────────

export type CaseStatus =
  | "intake"
  | "data_preparation"
  | "analysis"
  | "report_draft"
  | "review"
  | "approved"
  | "submitted"
  | "archived";

export interface Company {
  name: string;
  address: string;
  nace_code: string;
  industry: string;
  employees: number;
  building_area_m2: number;
  annual_turnover_eur: number | null;
  audit_year: number;
}

export interface Auditor {
  name: string;
  e_control_id: string;
  company: string;
}

export interface CaseProgress {
  documents_uploaded: number;
  data_completeness_pct: number;
  measures_identified: number;
  review_items_pending: number;
  compliance_fields_confirmed: number;
  compliance_fields_total: number;
}

export interface Case {
  id: string;
  company: Company;
  auditor: Auditor;
  status: CaseStatus;
  domain?: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  progress: CaseProgress;
}

export interface CaseCreate {
  company: Company;
  auditor: Auditor;
  notes?: string;
}

// ─── Document Types ─────────────────────────────────────────────────────────

export type DocCategory =
  | "electricity_bill"
  | "gas_bill"
  | "heat_bill"
  | "excel_data"
  | "floor_plan"
  | "equipment_list"
  | "measurement_protocol"
  | "photo"
  | "other";

export type DocStatus = "uploaded" | "processing" | "extracted" | "error";

export interface CaseDocument {
  id: string;
  case_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  category: DocCategory | null;
  category_confidence: number | null;
  status: DocStatus;
  extracted_fields_count: number;
  uploaded_at: string;
}

// ─── Ledger Types ───────────────────────────────────────────────────────────

export type EnergyCarrier = "strom" | "gas" | "fernwaerme" | "diesel" | "heizoel" | "other";

export type EntryStatus = "confirmed" | "anomaly" | "estimated" | "missing";

export interface LedgerEntry {
  id: string;
  case_id: string;
  month: string;
  carrier: EnergyCarrier;
  value_kwh: number | null;
  status: EntryStatus;
  note: string | null;
  source_doc_id: string | null;
  confidence: number | null;
  review_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerTotals {
  strom_kwh: number;
  gas_kwh: number;
  fernwaerme_kwh: number;
  total_kwh: number;
  readiness_score: number;
  complete_months: number;
  estimated_months: number;
  missing_months: number;
}

// ─── Review Types ───────────────────────────────────────────────────────────

export type ReviewPriority = "critical" | "high" | "medium" | "low";

export type ReviewStatus = "pending" | "approved" | "rejected" | "deferred";

export type ReviewCategory =
  | "anomaly"
  | "missing_data"
  | "estimation"
  | "measure"
  | "compliance_field";

export interface ReviewItem {
  id: string;
  case_id: string;
  category: ReviewCategory;
  priority: ReviewPriority;
  title: string;
  description: string | null;
  status: ReviewStatus;
  related_entity_id: string | null;
  related_entity_type: string | null;
  reviewer_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  deferred: number;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
}

// ─── Audit Log Types ────────────────────────────────────────────────────────

export type AuditAction =
  | "case_created"
  | "case_updated"
  | "case_status_changed"
  | "document_uploaded"
  | "document_classified"
  | "document_deleted"
  | "extraction_started"
  | "extraction_completed"
  | "ledger_entry_created"
  | "ledger_entry_updated"
  | "ledger_entry_deleted"
  | "review_item_created"
  | "review_approved"
  | "review_rejected"
  | "review_deferred"
  | "measure_created"
  | "measure_updated"
  | "report_generated"
  | "report_section_edited"
  | "export_generated"
  | "compliance_prefill_generated";

export interface AuditLogEntry {
  id: string;
  case_id: string | null;
  action: AuditAction;
  actor: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: string | null;
  timestamp: string;
}

// ─── Measures ─────────────────────────────────────────────────────────────

export interface MeasureEvidence {
  measurement: string;
  nameplate?: string;
  method: string;
  price_basis: string;
  confidence: number;
  confidence_note?: string;
}

export interface Measure {
  id: string;
  case_id: string;
  measure_id: string;
  title: string;
  description: string;
  annual_saving_kwh: number;
  annual_saving_eur: number;
  investment_eur: number;
  payback_years: number;
  priority: "sehr hoch" | "hoch" | "mittel" | "niedrig";
  evidence: MeasureEvidence;
  created_at: string;
  updated_at: string;
}

export interface MeasuresSummary {
  count: number;
  total_savings_eur: number;
  total_investment_eur: number;
  avg_payback: number;
}

// ─── Compliance ───────────────────────────────────────────────────────────

export interface ComplianceField {
  section: string;
  key: string;
  label: string;
  value: unknown;
  unit?: string;
  status: "green" | "yellow" | "red";
  source?: string;
  review_note?: string;
}

export interface ComplianceResponse {
  fields: ComplianceField[];
  summary: {
    total: number;
    green: number;
    yellow: number;
    red: number;
    completion_pct: number;
  };
}

// ─── SSE Event ──────────────────────────────────────────────────────────────

export interface SSEEvent {
  type: "info" | "ok" | "warn" | "error" | "done";
  text: string;
  result?: unknown;
}
