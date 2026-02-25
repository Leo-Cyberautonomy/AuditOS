"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  X,
  FileText,
  ChevronDown,
  Database,
  CheckCircle2,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchLedger, fetchLedgerSummary, updateLedgerEntry } from "@/lib/api";
import { StatusChip } from "@/components/shared/StatusChip";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfidenceBar } from "@/components/evidence/ConfidenceBar";
import type { LedgerEntry, LedgerTotals, EnergyCarrier, EntryStatus } from "@/lib/types";

/* ─── Carrier dot colors ──────────────────────────────────────────────────── */
const carrierDotColors: Record<EnergyCarrier, string> = {
  strom: "#3B82F6",
  gas: "#F59E0B",
  fernwaerme: "#EF4444",
  diesel: "#8B5CF6",
  heizoel: "#F97316",
  other: "#6B7280",
};

/* ─── Row background tints for special statuses ───────────────────────────── */
const statusRowBg: Partial<Record<EntryStatus, string>> = {
  missing: "rgba(239,68,68,0.04)",
  anomaly: "rgba(245,158,11,0.04)",
};

/* ─── Filter types ────────────────────────────────────────────────────────── */
interface Filters {
  carrier: string;
  status: string;
  review_status: string;
  search: string;
}

const emptyFilters: Filters = {
  carrier: "",
  status: "",
  review_status: "",
  search: "",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function shortId(id: string): string {
  // Show last 8 chars or the whole thing if short
  if (id.length <= 10) return id;
  return id.slice(-8);
}

function formatMonth(month: string): string {
  // Expected format: "2023-01" or "Jan 23" etc.
  // Try to parse as date-like string
  try {
    const d = new Date(month + "-01");
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("de-AT", { month: "short", year: "2-digit" });
    }
  } catch {
    // Fall through
  }
  return month;
}

/* ─── Skeleton Components ─────────────────────────────────────────────────── */
function Skeleton({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div
      className="rounded"
      style={{
        backgroundColor: "#E5E7EB",
        width: w,
        height: h,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton w={`${40 + Math.random() * 50}%`} h={16} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Filter Dropdown ─────────────────────────────────────────────────────── */
function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white text-sm font-medium rounded-lg px-3 py-2 pr-8 cursor-pointer transition-colors focus:outline-none"
        style={{
          border: "1px solid #E5E7EB",
          color: value ? "#0F1117" : "#6B7280",
          minWidth: 160,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#9CA3AF",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ─── Detail Drawer ───────────────────────────────────────────────────────── */
function DetailDrawer({
  entry,
  onClose,
  t,
}: {
  entry: LedgerEntry;
  onClose: () => void;
  t: ReturnType<typeof useT>["t"];
}) {
  const carriers = t.evidence.carriers as Record<string, string>;
  const statuses = t.evidence.statuses as Record<string, string>;
  const reviewStatuses = t.evidence.reviewStatuses as Record<string, string>;

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: t.evidence.entryId, value: entry.id },
    {
      label: t.evidence.carrier,
      value: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: carrierDotColors[entry.carrier] ?? "#6B7280",
              flexShrink: 0,
            }}
          />
          {carriers[entry.carrier] ?? entry.carrier}
        </span>
      ),
    },
    { label: t.evidence.month, value: formatMonth(entry.month) },
    {
      label: t.evidence.value,
      value:
        entry.value_kwh !== null
          ? `${entry.value_kwh.toLocaleString("de-AT")} ${t.shared.kwh}`
          : "\u2013",
    },
    {
      label: t.evidence.status,
      value: <StatusChip status={entry.status} variant="entry" />,
    },
    {
      label: t.evidence.confidence,
      value: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ConfidenceBar value={entry.confidence} showLabel />
        </span>
      ),
    },
    {
      label: t.evidence.sourceDoc,
      value: entry.source_doc_id ?? "\u2013",
    },
    {
      label: "Notiz",
      value: entry.note ?? "\u2013",
    },
    {
      label: t.evidence.reviewStatus,
      value: entry.review_status ? (
        <StatusChip status={entry.review_status} variant="review" />
      ) : (
        "\u2013"
      ),
    },
    {
      label: t.evidence.lastUpdated,
      value: new Date(entry.updated_at).toLocaleDateString("de-AT"),
    },
  ];

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.2)",
          zIndex: 40,
        }}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          backgroundColor: "#FFFFFF",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} style={{ color: "#D97706" }} />
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0F1117",
                margin: 0,
              }}
            >
              {t.evidence.entryId}: {shortId(entry.id)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            style={{ color: "#6B7280" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {fields.map((f) => (
              <div key={f.label}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#6B7280",
                    marginBottom: 4,
                  }}
                >
                  {f.label}
                </div>
                <div style={{ fontSize: 14, color: "#0F1117" }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #F3F4F6",
          }}
        >
          <button
            onClick={onClose}
            className="w-full rounded-lg py-2 text-sm font-medium transition-colors hover:bg-gray-100"
            style={{
              border: "1px solid #E5E7EB",
              color: "#374151",
              backgroundColor: "#FFFFFF",
            }}
          >
            {t.shared.close}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE COMPONENT                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function EvidencePage() {
  const { t } = useT();
  const params = useParams();
  const caseId = params.caseId as string;

  /* ─── State ─────────────────────────────────────────────────────────────── */
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totals, setTotals] = useState<LedgerTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  /* ─── Data fetching ─────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const apiFilters: Record<string, string> = {};
      if (filters.carrier) apiFilters.carrier = filters.carrier;
      if (filters.status) apiFilters.status = filters.status;
      if (filters.review_status) apiFilters.review_status = filters.review_status;

      const [ledgerData, summaryData] = await Promise.all([
        fetchLedger(caseId, apiFilters),
        fetchLedgerSummary(caseId),
      ]);
      setEntries(ledgerData);
      setTotals(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [caseId, filters.carrier, filters.status, filters.review_status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Client-side search filter ─────────────────────────────────────────── */
  const filteredEntries = useMemo(() => {
    if (!filters.search.trim()) return entries;
    const q = filters.search.toLowerCase();
    const carriers = t.evidence.carriers as Record<string, string>;
    return entries.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        (carriers[e.carrier] ?? e.carrier).toLowerCase().includes(q) ||
        e.month.toLowerCase().includes(q) ||
        (e.note ?? "").toLowerCase().includes(q) ||
        (e.source_doc_id ?? "").toLowerCase().includes(q)
    );
  }, [entries, filters.search, t.evidence.carriers]);

  /* ─── Computed visible totals ───────────────────────────────────────────── */
  const visibleSum = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.value_kwh ?? 0), 0);
  }, [filteredEntries]);

  /* ─── Inline edit handlers ──────────────────────────────────────────────── */
  const startEdit = (entry: LedgerEntry) => {
    setEditingEntryId(entry.id);
    setEditValue(entry.value_kwh !== null ? String(entry.value_kwh) : "");
    // Focus input on next tick
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditingEntryId(null);
    setEditValue("");
  };

  const saveEdit = async (entryId: string) => {
    const numericValue = parseFloat(editValue.replace(",", "."));
    if (isNaN(numericValue)) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const updated = await updateLedgerEntry(caseId, entryId, {
        value_kwh: numericValue,
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? updated : e))
      );
    } catch {
      // Silently handle; could show toast
    } finally {
      setSaving(false);
      setEditingEntryId(null);
      setEditValue("");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, entryId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(entryId);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  /* ─── Filter options ────────────────────────────────────────────────────── */
  const carriers = t.evidence.carriers as Record<string, string>;
  const statuses = t.evidence.statuses as Record<string, string>;
  const reviewStatuses = t.evidence.reviewStatuses as Record<string, string>;

  const carrierOptions = Object.entries(carriers).map(([k, v]) => ({
    value: k,
    label: v,
  }));
  const statusOptions = Object.entries(statuses).map(([k, v]) => ({
    value: k,
    label: v,
  }));
  const reviewStatusOptions = Object.entries(reviewStatuses).map(([k, v]) => ({
    value: k,
    label: v,
  }));

  /* ─── Table headers ─────────────────────────────────────────────────────── */
  const headers = [
    { key: "id", label: t.evidence.entryId, align: "left" as const },
    { key: "carrier", label: t.evidence.carrier, align: "left" as const },
    { key: "month", label: t.evidence.month, align: "left" as const },
    { key: "value", label: t.evidence.value, align: "right" as const },
    { key: "unit", label: t.evidence.unit, align: "left" as const },
    { key: "status", label: t.evidence.status, align: "left" as const },
    { key: "confidence", label: t.evidence.confidence, align: "left" as const },
    { key: "sourceDoc", label: t.evidence.sourceDoc, align: "left" as const },
    { key: "reviewStatus", label: t.evidence.reviewStatus, align: "left" as const },
    { key: "updated", label: t.evidence.lastUpdated, align: "left" as const },
  ];

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ position: "relative" }}>
      {/* ── Page Header + Summary Stats Bar ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <BookOpen size={22} style={{ color: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
            {t.evidence.title}
          </h1>
        </div>

        {/* Summary Stats */}
        {totals && !loading && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex items-center gap-4 flex-wrap"
          >
            <StatBadge
              icon={<Database size={13} />}
              value={`${entries.length}`}
              label="Eintr\u00e4ge"
            />
            <StatBadge
              icon={<span style={{ fontSize: 12, fontWeight: 700 }}>kWh</span>}
              value={totals.total_kwh.toLocaleString("de-AT")}
              label={t.shared.kwh}
            />
            <StatBadge
              icon={<CheckCircle2 size={13} style={{ color: "#22C55E" }} />}
              value={`${Math.round(totals.readiness_score)}%`}
              label="Bereit"
            />
            <div
              className="hidden sm:flex items-center gap-2 text-xs"
              style={{ color: "#6B7280" }}
            >
              <span style={{ color: "#22C55E" }}>
                {totals.complete_months} vollst.
              </span>
              <span style={{ color: "#D97706" }}>
                {totals.estimated_months} gesch.
              </span>
              <span style={{ color: "#EF4444" }}>
                {totals.missing_months} fehl.
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="bg-white rounded-xl px-5 py-4 mb-5 flex flex-wrap items-center gap-3"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <FilterSelect
          value={filters.carrier}
          onChange={(v) =>
            setFilters((prev) => ({ ...prev, carrier: v }))
          }
          options={carrierOptions}
          placeholder={t.evidence.allCarriers}
        />
        <FilterSelect
          value={filters.status}
          onChange={(v) =>
            setFilters((prev) => ({ ...prev, status: v }))
          }
          options={statusOptions}
          placeholder={t.evidence.allStatuses}
        />
        <FilterSelect
          value={filters.review_status}
          onChange={(v) =>
            setFilters((prev) => ({ ...prev, review_status: v }))
          }
          options={reviewStatusOptions}
          placeholder={t.evidence.reviewStatus}
        />
        <div style={{ flex: 1, minWidth: 180 }}>
          <SearchInput
            value={filters.search}
            onChange={(v) =>
              setFilters((prev) => ({ ...prev, search: v }))
            }
            placeholder={t.evidence.searchPlaceholder}
          />
        </div>
      </motion.div>

      {/* ── Error State ─────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-5"
          style={{
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            borderLeft: "4px solid #EF4444",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Data Grid ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-white rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {!loading && filteredEntries.length === 0 && !error ? (
          <EmptyState
            icon={BookOpen}
            title={t.shared.noData}
            description={t.evidence.searchPlaceholder}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              {/* ── Table Head ─────────────────────────────────────────────── */}
              <thead>
                <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                  {headers.map((h) => (
                    <th
                      key={h.key}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color: "#6B7280",
                        textAlign: h.align,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ── Table Body ─────────────────────────────────────────────── */}
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))
                  : filteredEntries.map((entry, idx) => {
                      const isEditing = editingEntryId === entry.id;
                      const rowBg =
                        statusRowBg[entry.status] ?? "transparent";

                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: 0.12 + idx * 0.015,
                            duration: 0.25,
                          }}
                          onClick={(e) => {
                            // Don't open drawer if clicking on the value cell (edit zone)
                            const target = e.target as HTMLElement;
                            if (target.closest("[data-edit-zone]")) return;
                            setSelectedEntry(entry);
                          }}
                          className="cursor-pointer"
                          style={{
                            borderBottom: "1px solid #F3F4F6",
                            backgroundColor: rowBg,
                            transition: "background-color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              entry.status === "missing"
                                ? "rgba(239,68,68,0.07)"
                                : entry.status === "anomaly"
                                ? "rgba(245,158,11,0.07)"
                                : "#F9FAFB";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              rowBg;
                          }}
                        >
                          {/* ID */}
                          <td className="px-4 py-3">
                            <span
                              className="text-xs"
                              style={{
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                                color: "#9CA3AF",
                              }}
                            >
                              {shortId(entry.id)}
                            </span>
                          </td>

                          {/* Carrier */}
                          <td className="px-4 py-3">
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor:
                                    carrierDotColors[entry.carrier] ??
                                    "#6B7280",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                className="text-sm font-medium"
                                style={{ color: "#0F1117" }}
                              >
                                {carriers[entry.carrier] ?? entry.carrier}
                              </span>
                            </span>
                          </td>

                          {/* Month */}
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ color: "#374151" }}
                          >
                            {formatMonth(entry.month)}
                          </td>

                          {/* Value (editable) */}
                          <td
                            className="px-4 py-3"
                            style={{ textAlign: "right" }}
                            data-edit-zone
                          >
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) =>
                                  setEditValue(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  handleEditKeyDown(e, entry.id)
                                }
                                onBlur={() => saveEdit(entry.id)}
                                disabled={saving}
                                className="text-sm font-bold text-right rounded px-2 py-1 w-28 focus:outline-none"
                                style={{
                                  border: "2px solid #D97706",
                                  color: "#0F1117",
                                  backgroundColor: "#FFFBEB",
                                }}
                              />
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(entry);
                                }}
                                className="text-sm font-bold cursor-text rounded px-2 py-1 transition-colors hover:bg-amber-50"
                                style={{
                                  color:
                                    entry.value_kwh !== null
                                      ? "#0F1117"
                                      : "#9CA3AF",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                                title={t.shared.edit}
                              >
                                {entry.value_kwh !== null
                                  ? entry.value_kwh.toLocaleString("de-AT")
                                  : "\u2013"}
                              </span>
                            )}
                          </td>

                          {/* Unit */}
                          <td
                            className="px-4 py-3 text-xs"
                            style={{ color: "#9CA3AF" }}
                          >
                            {t.shared.kwh}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusChip
                              status={entry.status}
                              variant="entry"
                              size="sm"
                            />
                          </td>

                          {/* Confidence */}
                          <td className="px-4 py-3">
                            <ConfidenceBar
                              value={entry.confidence}
                              showLabel
                            />
                          </td>

                          {/* Source Document */}
                          <td className="px-4 py-3">
                            {entry.source_doc_id ? (
                              <span
                                className="text-xs truncate"
                                style={{
                                  color: "#3B82F6",
                                  maxWidth: 120,
                                  display: "block",
                                  fontFamily:
                                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                                }}
                              >
                                {shortId(entry.source_doc_id)}
                              </span>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "#D1D5DB" }}
                              >
                                {"\u2013"}
                              </span>
                            )}
                          </td>

                          {/* Review Status */}
                          <td className="px-4 py-3">
                            {entry.review_status ? (
                              <StatusChip
                                status={entry.review_status}
                                variant="review"
                                size="sm"
                              />
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "#D1D5DB" }}
                              >
                                {"\u2013"}
                              </span>
                            )}
                          </td>

                          {/* Updated */}
                          <td
                            className="px-4 py-3 text-xs"
                            style={{
                              color: "#9CA3AF",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(entry.updated_at).toLocaleDateString(
                              "de-AT"
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}

                {/* ── Totals Row ─────────────────────────────────────────── */}
                {!loading && filteredEntries.length > 0 && (
                  <tr
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderTop: "2px solid #E5E7EB",
                      position: "sticky",
                      bottom: 0,
                    }}
                  >
                    <td
                      className="px-4 py-3 text-sm font-bold"
                      colSpan={3}
                      style={{ color: "#0F1117" }}
                    >
                      {t.evidence.totalRow}
                    </td>
                    <td
                      className="px-4 py-3 text-sm font-bold"
                      style={{
                        textAlign: "right",
                        color: "#0F1117",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {visibleSum.toLocaleString("de-AT")}
                    </td>
                    <td
                      className="px-4 py-3 text-xs font-semibold"
                      style={{ color: "#6B7280" }}
                    >
                      {t.shared.kwh}
                    </td>
                    <td colSpan={5} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Detail Drawer ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedEntry && (
          <DetailDrawer
            key={selectedEntry.id}
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* ── Pulse animation for skeletons ───────────────────────────────────── */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}

/* ─── Stat Badge (for summary bar) ────────────────────────────────────────── */
function StatBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        backgroundColor: "#F9FAFB",
        border: "1px solid #F3F4F6",
      }}
    >
      <span style={{ color: "#D97706", display: "flex", alignItems: "center" }}>
        {icon}
      </span>
      <span
        className="text-sm font-bold"
        style={{
          color: "#0F1117",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: "#9CA3AF" }}>
        {label}
      </span>
    </div>
  );
}
