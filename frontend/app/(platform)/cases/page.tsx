"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderOpen, Plus, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchCases } from "@/lib/api";
import { useAppStore } from "@/lib/stores/app-store";
import { StatusChip } from "@/components/shared/StatusChip";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Case, CaseStatus } from "@/lib/types";

const ALL_STATUSES: CaseStatus[] = [
  "intake",
  "data_preparation",
  "analysis",
  "report_draft",
  "review",
  "approved",
  "submitted",
  "archived",
];

export default function CasesPage() {
  const { t } = useT();
  const setActiveCaseId = useAppStore((s: { setActiveCaseId: (id: string | null) => void }) => s.setActiveCaseId);

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; search?: string } = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const data = await fetchCases(params);
      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Sort cases by updated_at desc
  const sortedCases = [...cases].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const SkeletonRow = () => (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded"
            style={{
              backgroundColor: "#E5E7EB",
              width: i === 6 ? "100%" : `${50 + Math.random() * 50}%`,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );

  return (
    <div className="p-8" style={{ backgroundColor: "#FAFAFA", minHeight: "100%" }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <FolderOpen size={24} style={{ color: "#D97706" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#0F1117" }}>
            {t.cases.title}
          </h1>
        </div>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#D97706", color: "#FFFFFF" }}
        >
          <Plus size={16} />
          {t.cases.newCase}
        </button>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="flex items-center gap-4 mb-6"
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            color: "#0F1117",
            minWidth: 180,
          }}
        >
          <option value="">Alle</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {(t.shared.caseStatuses as Record<string, string>)[s]}
            </option>
          ))}
        </select>
        <div style={{ width: 280 }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`${t.cases.company}...`}
          />
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-6"
          style={{
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            borderLeft: "4px solid #EF4444",
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-white rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {!loading && sortedCases.length === 0 && !error ? (
          <EmptyState
            icon={FolderOpen}
            title={t.shared.noData}
            description={
              statusFilter || searchQuery
                ? "Versuchen Sie andere Filteroptionen."
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                  {[
                    t.cases.caseNumber,
                    t.cases.company,
                    t.cases.industry,
                    "Status",
                    t.cases.auditor,
                    t.cases.progress,
                    t.cases.updated,
                    t.cases.actions,
                  ].map((header) => (
                    <th
                      key={header}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#6B7280" }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))
                  : sortedCases.map((c, idx) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.12 + idx * 0.025,
                          duration: 0.3,
                        }}
                        className="group cursor-pointer"
                        style={{
                          borderBottom: "1px solid #F3F4F6",
                        }}
                        onClick={() => setActiveCaseId(c.id)}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/cases/${c.id}/overview`}
                            className="text-sm font-medium hover:underline"
                            style={{ color: "#D97706" }}
                            onClick={() => setActiveCaseId(c.id)}
                          >
                            {c.id.slice(0, 8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/cases/${c.id}/overview`}
                            className="text-sm font-medium"
                            style={{ color: "#0F1117" }}
                            onClick={() => setActiveCaseId(c.id)}
                          >
                            {c.company.name}
                          </Link>
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: "#6B7280" }}
                        >
                          {c.company.industry}
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip
                            status={c.status}
                            variant="case"
                            size="sm"
                          />
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: "#6B7280" }}
                        >
                          {c.auditor.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 h-2 rounded-full overflow-hidden"
                              style={{
                                backgroundColor: "#F3F4F6",
                                maxWidth: 100,
                              }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${c.progress.data_completeness_pct}%`,
                                  backgroundColor:
                                    c.progress.data_completeness_pct >= 80
                                      ? "#22C55E"
                                      : c.progress.data_completeness_pct >= 50
                                      ? "#F59E0B"
                                      : "#EF4444",
                                }}
                              />
                            </div>
                            <span
                              className="text-xs font-medium tabular-nums"
                              style={{ color: "#6B7280" }}
                            >
                              {c.progress.data_completeness_pct}%
                            </span>
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: "#6B7280" }}
                        >
                          {new Date(c.updated_at).toLocaleDateString("de-AT")}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/cases/${c.id}/overview`}
                            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                            style={{ color: "#D97706" }}
                            onClick={() => setActiveCaseId(c.id)}
                          >
                            {t.cases.open}
                            <ExternalLink size={12} />
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pulse animation for skeletons */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
