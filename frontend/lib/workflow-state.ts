/**
 * Workflow state — persisted in localStorage across page navigations.
 *
 * Workflow:
 *   Step 1  Upload / Data preparation   → step1Done
 *   Step 2  Report generated            → step2Done
 *   Step 3  EEff-SKV compliance done    → step3Done
 *
 * Data payloads (separate keys):
 *   auditOS_energy    → { energyData: EnergyRow[], totals: Totals }
 *   auditOS_measures  → Measure[]
 */

import type { EnergyRow, Measure } from "./demo-data";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkflowState {
  step1Done: boolean;
  step2Done: boolean;
  step3Done: boolean;
}

export interface StoredTotals {
  strom_kwh: number;
  gas_kwh: number;
  fernwaerme_kwh: number;
  total_kwh: number;
  readiness_score: number;
  complete_months: number;
  estimated_months: number;
  missing_months: number;
}

export interface SessionData {
  energyData: EnergyRow[];
  totals: StoredTotals;
}

// ─── Keys ───────────────────────────────────────────────────────────────────

const KEY_WORKFLOW = "auditOS_workflow";
const KEY_ENERGY   = "auditOS_energy";
const KEY_MEASURES = "auditOS_measures";

// ─── Workflow steps ──────────────────────────────────────────────────────────

export function getWorkflowState(): WorkflowState {
  if (typeof window === "undefined")
    return { step1Done: false, step2Done: false, step3Done: false };
  try {
    const raw = localStorage.getItem(KEY_WORKFLOW);
    if (!raw) return { step1Done: false, step2Done: false, step3Done: false };
    return { step1Done: false, step2Done: false, step3Done: false, ...JSON.parse(raw) };
  } catch {
    return { step1Done: false, step2Done: false, step3Done: false };
  }
}

export function markWorkflowStep(step: keyof WorkflowState): void {
  if (typeof window === "undefined") return;
  const state = getWorkflowState();
  state[step] = true;
  localStorage.setItem(KEY_WORKFLOW, JSON.stringify(state));
}

export function resetWorkflowState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_WORKFLOW);
  localStorage.removeItem(KEY_ENERGY);
  localStorage.removeItem(KEY_MEASURES);
}

// ─── Session data (energy + totals) ─────────────────────────────────────────

export function saveSessionData(energyData: EnergyRow[], totals: StoredTotals): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_ENERGY, JSON.stringify({ energyData, totals }));
  } catch {
    // localStorage quota exceeded — skip silently
  }
}

export function loadSessionData(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_ENERGY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

// ─── Measures (from report streaming) ───────────────────────────────────────

export function saveMeasures(measures: Measure[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_MEASURES, JSON.stringify(measures));
  } catch {}
}

export function loadMeasures(): Measure[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_MEASURES);
    if (!raw) return null;
    return JSON.parse(raw) as Measure[];
  } catch {
    return null;
  }
}
