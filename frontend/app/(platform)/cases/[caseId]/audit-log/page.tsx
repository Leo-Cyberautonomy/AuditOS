"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Check,
  X,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  ChevronDown,
  Search,
  Loader2,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchAuditLog } from "@/lib/api";
import type { AuditLogEntry, AuditAction } from "@/lib/types";
import { EmptyState } from "@/components/shared/EmptyState";

// Relative time formatting (German)
function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

// Action type metadata
const actionMeta: Record<
  string,
  { icon: typeof FileText; color: string; bg: string }
> = {
  case_created: { icon: FileText, color: "#3B82F6", bg: "#EFF6FF" },
  case_updated: { icon: FileText, color: "#3B82F6", bg: "#EFF6FF" },
  case_status_changed: { icon: ArrowRight, color: "#3B82F6", bg: "#EFF6FF" },
  document_uploaded: { icon: Upload, color: "#10B981", bg: "#ECFDF5" },
  document_classified: { icon: FileText, color: "#10B981", bg: "#ECFDF5" },
  document_deleted: { icon: X, color: "#EF4444", bg: "#FEF2F2" },
  extraction_started: { icon: Clock, color: "#10B981", bg: "#ECFDF5" },
  extraction_completed: { icon: Check, color: "#10B981", bg: "#ECFDF5" },
  ledger_entry_created: { icon: FileText, color: "#F59E0B", bg: "#FFFBEB" },
  ledger_entry_updated: { icon: FileText, color: "#F59E0B", bg: "#FFFBEB" },
  ledger_entry_deleted: { icon: X, color: "#F59E0B", bg: "#FFFBEB" },
  review_item_created: { icon: AlertTriangle, color: "#8B5CF6", bg: "#F5F3FF" },
  review_approved: { icon: Check, color: "#8B5CF6", bg: "#F5F3FF" },
  review_rejected: { icon: X, color: "#8B5CF6", bg: "#F5F3FF" },
  review_deferred: { icon: Clock, color: "#8B5CF6", bg: "#F5F3FF" },
  measure_created: { icon: FileText, color: "#D97706", bg: "#FFFBEB" },
  measure_updated: { icon: FileText, color: "#D97706", bg: "#FFFBEB" },
  report_generated: { icon: FileText, color: "#D97706", bg: "#FFFBEB" },
  report_section_edited: { icon: FileText, color: "#D97706", bg: "#FFFBEB" },
  export_generated: { icon: FileText, color: "#D97706", bg: "#FFFBEB" },
  compliance_prefill_generated: { icon: Check, color: "#D97706", bg: "#FFFBEB" },
};

const defaultMeta = { icon: FileText, color: "#6B7280", bg: "#F3F4F6" };

// Action groups for filtering
const ACTION_GROUPS = [
  { key: "all", label: { de: "Alle Aktionen", en: "All Actions" } },
  { key: "case", label: { de: "Fallaktionen", en: "Case Actions" }, prefix: "case_" },
  { key: "document", label: { de: "Dokumente", en: "Documents" }, prefix: "document_" },
  { key: "extraction", label: { de: "Extraktion", en: "Extraction" }, prefix: "extraction_" },
  { key: "ledger", label: { de: "Nachweisbuch", en: "Ledger" }, prefix: "ledger_" },
  { key: "review", label: { de: "Prüfung", en: "Review" }, prefix: "review_" },
  { key: "report", label: { de: "Bericht", en: "Report" }, prefix: "report_" },
  { key: "measure", label: { de: "Maßnahmen", en: "Measures" }, prefix: "measure_" },
  { key: "export", label: { de: "Export", en: "Export" }, prefix: "export_" },
];

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;
  const { t, locale } = useT();

  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filterGroup, setFilterGroup] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Fetch events
  const loadEvents = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
        setEvents([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await fetchAuditLog({
          case_id: caseId,
          limit: PAGE_SIZE,
          offset: currentOffset,
        });
        if (reset) {
          setEvents(data);
          setOffset(data.length);
        } else {
          setEvents((prev) => [...prev, ...data]);
          setOffset((prev) => prev + data.length);
        }
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit log");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [caseId, offset]
  );

  useEffect(() => {
    if (!caseId) return;
    loadEvents(true);
  }, [caseId]);

  // Filter events
  const selectedGroup = ACTION_GROUPS.find((g) => g.key === filterGroup);
  const filteredEvents = events.filter((e) => {
    // Group filter
    if (filterGroup !== "all" && selectedGroup?.prefix) {
      if (!e.action.startsWith(selectedGroup.prefix)) return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.action.toLowerCase().includes(q) ||
        (e.detail ?? "").toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Human-readable action label
  const actionLabel = (action: string) => {
    // Convert snake_case to readable
    return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex items-center gap-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div className="w-9 h-9 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-2.5 bg-gray-100 rounded w-2/3" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-md rounded-xl p-6 text-center" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5" }}>
          <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-6"
      >
        <Clock size={22} style={{ color: "#D97706" }} />
        <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
          {t.nav.auditLog}
        </h1>
        <span className="ml-auto text-xs font-medium tabular-nums px-2.5 py-1 rounded-full" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
          {filteredEvents.length} {locale === "de" ? "Einträge" : "entries"}
        </span>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="bg-white rounded-xl p-4 mb-6 flex items-center gap-3"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {/* Action type dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen((p) => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: "#0F1117" }}
          >
            <Filter size={13} style={{ color: "#6B7280" }} />
            {selectedGroup
              ? (selectedGroup.label as Record<string, string>)[locale] ?? selectedGroup.label.de
              : "Filter"}
            <ChevronDown size={12} style={{ color: "#6B7280" }} />
          </button>
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-gray-200 py-1 z-20"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              >
                {ACTION_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => {
                      setFilterGroup(g.key);
                      setFilterOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors"
                    style={{
                      color: filterGroup === g.key ? "#D97706" : "#0F1117",
                      backgroundColor: filterGroup === g.key ? "#FFFBEB" : "transparent",
                    }}
                  >
                    {(g.label as Record<string, string>)[locale] ?? g.label.de}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
          <input
            type="text"
            placeholder={locale === "de" ? "Suchen..." : "Search..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border border-gray-200 focus:outline-none focus:border-amber-400 transition-colors"
            style={{ color: "#0F1117" }}
          />
        </div>
      </motion.div>

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={locale === "de" ? "Keine Protokolleinträge" : "No log entries"}
          description={locale === "de" ? "Für diesen Filter gibt es keine Einträge" : "No entries match this filter"}
        />
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event, idx) => {
            const meta = actionMeta[event.action] ?? defaultMeta;
            const Icon = meta.icon;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.5), duration: 0.3 }}
                className="bg-white rounded-xl px-5 py-4 flex items-start gap-4"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: meta.bg }}
                >
                  <Icon size={16} style={{ color: meta.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold" style={{ color: "#0F1117" }}>
                      {actionLabel(event.action)}
                    </p>
                    {event.entity_type && event.entity_id && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                      >
                        {event.entity_type}:{event.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  {event.detail && (
                    <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                      {event.detail}
                    </p>
                  )}
                </div>

                {/* Right: actor + time */}
                <div className="flex-shrink-0 text-right">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1"
                    style={{ backgroundColor: "#EFF6FF", color: "#1E40AF" }}
                  >
                    {event.actor}
                  </span>
                  <p className="text-[10px] tabular-nums" style={{ color: "#9CA3AF" }}>
                    {relativeTime(event.timestamp)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && filteredEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center mt-6"
        >
          <button
            onClick={() => loadEvents(false)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: loadingMore ? "#9CA3AF" : "#0F1117" }}
          >
            {loadingMore && <Loader2 size={14} className="animate-spin" />}
            {loadingMore
              ? locale === "de"
                ? "Laden..."
                : "Loading..."
              : locale === "de"
                ? "Mehr laden"
                : "Load more"}
          </button>
        </motion.div>
      )}
    </div>
  );
}
