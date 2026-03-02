"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, ExternalLink, X, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchCases, createCase } from "@/lib/api";
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

const AUDIT_TYPES = [
  { value: "grosses_energieaudit", label: "Gro\u00DFes Energieaudit" },
  { value: "kleines_energieaudit", label: "Kleines Energieaudit" },
  { value: "internes_audit", label: "Internes Audit" },
];

export default function CasesPage() {
  const { t } = useT();
  const router = useRouter();
  const setActiveCaseId = useAppStore((s: { setActiveCaseId: (id: string | null) => void }) => s.setActiveCaseId);

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create-case modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    companyAddress: "",
    auditType: AUDIT_TYPES[0].value,
  });

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

  const handleCreateCase = async () => {
    if (!formData.companyName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const auditTypeLabel = AUDIT_TYPES.find((a) => a.value === formData.auditType)?.label ?? formData.auditType;
      const newCase = await createCase({
        company: {
          name: formData.companyName.trim(),
          address: formData.companyAddress.trim(),
          nace_code: "",
          industry: "",
          employees: 0,
          building_area_m2: 0,
          annual_turnover_eur: null,
          audit_year: new Date().getFullYear(),
        },
        auditor: {
          name: "",
          e_control_id: "",
          company: "",
        },
        notes: `Audit-Typ: ${auditTypeLabel}`,
      });
      setActiveCaseId(newCase.id);
      setShowCreateModal(false);
      setFormData({ companyName: "", companyAddress: "", auditType: AUDIT_TYPES[0].value });
      router.push(`/cases/${newCase.id}/overview`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Fehler beim Erstellen des Falls");
    } finally {
      setCreating(false);
    }
  };

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
          onClick={() => setShowCreateModal(true)}
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

      {/* Create Case Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => { if (!creating) setShowCreateModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl w-full max-w-lg mx-4 overflow-hidden"
              style={{
                backgroundColor: "#1E1F2B",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
              >
                <h2 className="text-lg font-semibold" style={{ color: "#F9FAFB" }}>
                  {t.cases.newCase}
                </h2>
                <button
                  onClick={() => { if (!creating) setShowCreateModal(false); }}
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: "#9CA3AF" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleCreateCase(); }}
                className="px-6 py-5 space-y-5"
              >
                {/* Error */}
                {createError && (
                  <div
                    className="rounded-lg px-4 py-3 text-sm"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      color: "#FCA5A5",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                    }}
                  >
                    {createError}
                  </div>
                )}

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#D1D5DB" }}
                  >
                    Unternehmen <span style={{ color: "#D97706" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="z.B. Mühlviertler Feinkost GmbH"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                    style={{
                      backgroundColor: "#2A2B3A",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F9FAFB",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#D97706"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.15)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>

                {/* Company Address */}
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#D1D5DB" }}
                  >
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyAddress: e.target.value }))}
                    placeholder="z.B. Industriestraße 12, 4240 Freistadt"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                    style={{
                      backgroundColor: "#2A2B3A",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F9FAFB",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#D97706"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.15)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>

                {/* Audit Type */}
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#D1D5DB" }}
                  >
                    Audit-Typ
                  </label>
                  <select
                    value={formData.auditType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, auditType: e.target.value }))}
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundColor: "#2A2B3A",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F9FAFB",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      paddingRight: "36px",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#D97706"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.15)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {AUDIT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center justify-end gap-3 pt-2"
                >
                  <button
                    type="button"
                    onClick={() => { if (!creating) setShowCreateModal(false); }}
                    disabled={creating}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      color: "#D1D5DB",
                      backgroundColor: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {t.shared.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !formData.companyName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity"
                    style={{
                      backgroundColor: creating || !formData.companyName.trim() ? "#92400E" : "#D97706",
                      color: "#FFFFFF",
                      opacity: creating || !formData.companyName.trim() ? 0.6 : 1,
                      cursor: creating || !formData.companyName.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {creating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Erstelle...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Fall anlegen
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
