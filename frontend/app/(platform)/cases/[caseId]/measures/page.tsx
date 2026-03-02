"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingDown, DollarSign, Clock, ChevronRight, X, Plus, LayoutList, Table2, LayoutGrid } from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchMeasures, fetchMeasuresSummary } from "@/lib/api";
import type { Measure, MeasuresSummary } from "@/lib/types";
import { EvidencePanel } from "@/components/report/EvidencePanel";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Measure as DemoMeasure } from "@/lib/demo-data";

// Priority color mapping
const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  "sehr hoch": { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" },
  hoch: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
  mittel: { bg: "#DBEAFE", text: "#1E40AF", border: "#3B82F6" },
  niedrig: { bg: "#F3F4F6", text: "#6B7280", border: "#6B7280" },
};

// Convert API Measure to demo Measure format for EvidencePanel
function toEvidenceMeasure(m: Measure): DemoMeasure {
  return {
    measure_id: m.measure_id,
    title: m.title,
    description: m.description,
    annual_saving_kwh: m.annual_saving_kwh,
    annual_saving_eur: m.annual_saving_eur,
    investment_eur: m.investment_eur,
    payback_years: m.payback_years,
    priority: m.priority,
    evidence: {
      measurement: m.evidence.measurement,
      nameplate: m.evidence.nameplate,
      method: m.evidence.method,
      price_basis: m.evidence.price_basis,
      confidence: m.evidence.confidence,
      confidence_note: m.evidence.confidence_note ?? "",
    },
  };
}

export default function MeasuresPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;
  const { t, locale } = useT();

  const [measures, setMeasures] = useState<Measure[]>([]);
  const [summary, setSummary] = useState<MeasuresSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<Measure | null>(null);
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSavings, setNewSavings] = useState("");
  const [newInvestment, setNewInvestment] = useState("");
  const [newPayback, setNewPayback] = useState("");
  const [newPriority, setNewPriority] = useState<"sehr hoch" | "hoch" | "mittel" | "niedrig">("mittel");

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;

    async function load() {
      try {
        const [measuresData, summaryData] = await Promise.all([
          fetchMeasures(caseId),
          fetchMeasuresSummary(caseId).catch(() => null),
        ]);
        if (cancelled) return;
        setMeasures(measuresData);
        setSummary(summaryData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load measures");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const handleAddMeasure = () => {
    if (!newName.trim()) return;
    const nextId = `M${(measures.length + 1).toString().padStart(3, "0")}`;
    const newMeasure: Measure = {
      id: crypto.randomUUID(),
      case_id: caseId,
      measure_id: nextId,
      title: newName.trim(),
      description: "",
      annual_saving_kwh: 0,
      annual_saving_eur: parseFloat(newSavings) || 0,
      investment_eur: parseFloat(newInvestment) || 0,
      payback_years: parseFloat(newPayback) || 0,
      priority: newPriority,
      evidence: {
        measurement: "",
        method: "",
        price_basis: "",
        confidence: 0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMeasures((prev) => [newMeasure, ...prev]);
    // Update summary locally
    setSummary((prev) => {
      if (!prev) {
        return {
          count: 1,
          total_savings_eur: newMeasure.annual_saving_eur,
          total_investment_eur: newMeasure.investment_eur,
          avg_payback: newMeasure.payback_years,
        };
      }
      const newCount = prev.count + 1;
      const newTotalSavings = prev.total_savings_eur + newMeasure.annual_saving_eur;
      const newTotalInvestment = prev.total_investment_eur + newMeasure.investment_eur;
      const newAvgPayback = (prev.avg_payback * prev.count + newMeasure.payback_years) / newCount;
      return {
        count: newCount,
        total_savings_eur: newTotalSavings,
        total_investment_eur: newTotalInvestment,
        avg_payback: newAvgPayback,
      };
    });
    // Reset form
    setNewName("");
    setNewSavings("");
    setNewInvestment("");
    setNewPayback("");
    setNewPriority("mittel");
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setNewName("");
    setNewSavings("");
    setNewInvestment("");
    setNewPayback("");
    setNewPriority("mittel");
    setShowAddForm(false);
  };

  const handleSelectMeasure = (m: Measure) => {
    if (selectedMeasure?.measure_id === m.measure_id && evidencePanelOpen) {
      setEvidencePanelOpen(false);
      setTimeout(() => setSelectedMeasure(null), 300);
    } else {
      setSelectedMeasure(m);
      setEvidencePanelOpen(true);
    }
  };

  const priorityLabel = (p: string) => {
    const labels = t.finding.priorities as Record<string, string>;
    return labels[p] ?? p;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-48 animate-pulse" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="max-w-md rounded-xl p-6 text-center"
          style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <Zap size={22} style={{ color: "#D97706" }} />
            <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
              {t.measures.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              {([
                { mode: "list" as const, icon: LayoutList, label: "List" },
                { mode: "table" as const, icon: Table2, label: "Table" },
                { mode: "grid" as const, icon: LayoutGrid, label: "Grid" },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={label}
                  className="flex items-center justify-center w-8 h-8 transition-colors duration-150"
                  style={{
                    backgroundColor: viewMode === mode ? "#D97706" : "white",
                    color: viewMode === mode ? "white" : "#6B7280",
                  }}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>

            {/* Add Measure button */}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: "#D97706", color: "white" }}
            >
              <Plus size={14} />
              {locale === "de" ? "+ Maßnahme" : "+ Measure"}
            </button>
          </div>
        </motion.div>

        {/* Summary bar */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="grid grid-cols-4 gap-4 mb-6"
          >
            {[
              {
                icon: TrendingDown,
                color: "#22C55E",
                label: locale === "de" ? "Einsparung/Jahr" : "Savings/Year",
                value: `\u20AC${summary.total_savings_eur.toLocaleString("de-AT")}`,
              },
              {
                icon: DollarSign,
                color: "#3B82F6",
                label: locale === "de" ? "Investition gesamt" : "Total Investment",
                value: `\u20AC${summary.total_investment_eur.toLocaleString("de-AT")}`,
              },
              {
                icon: Clock,
                color: "#F59E0B",
                label: locale === "de" ? "Amortisation \u00D8" : "Avg. Payback",
                value: `${summary.avg_payback.toFixed(1)} ${locale === "de" ? "Jahre" : "years"}`,
              },
              {
                icon: Zap,
                color: "#8B5CF6",
                label: locale === "de" ? "Anzahl Maßnahmen" : "Measure Count",
                value: String(summary.count),
              },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                  className="bg-white rounded-xl p-4"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `4px solid ${stat.color}` }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: stat.color + "1A" }}
                    >
                      <Icon size={14} style={{ color: stat.color }} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: "#0F1117" }}>
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Add Measure Inline Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-6 overflow-hidden"
            >
              <div
                className="bg-white rounded-xl p-5"
                style={{
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  borderLeft: "4px solid #D97706",
                }}
              >
                <h3 className="text-sm font-bold mb-4" style={{ color: "#0F1117" }}>
                  {locale === "de" ? "Neue Maßnahme hinzufügen" : "Add New Measure"}
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Name */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6B7280" }}>
                      {locale === "de" ? "Bezeichnung" : "Name"} *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={locale === "de" ? "z.B. LED-Beleuchtung Umrüstung" : "e.g. LED Lighting Retrofit"}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      style={{
                        border: "1px solid #D1D5DB",
                        backgroundColor: "#FAFAFA",
                        color: "#0F1117",
                      }}
                    />
                  </div>
                  {/* Annual Savings EUR */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6B7280" }}>
                      {locale === "de" ? "Einsparung/Jahr (EUR)" : "Annual Savings (EUR)"}
                    </label>
                    <input
                      type="number"
                      value={newSavings}
                      onChange={(e) => setNewSavings(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      style={{
                        border: "1px solid #D1D5DB",
                        backgroundColor: "#FAFAFA",
                        color: "#0F1117",
                      }}
                    />
                  </div>
                  {/* Investment EUR */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6B7280" }}>
                      {locale === "de" ? "Investition (EUR)" : "Investment (EUR)"}
                    </label>
                    <input
                      type="number"
                      value={newInvestment}
                      onChange={(e) => setNewInvestment(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      style={{
                        border: "1px solid #D1D5DB",
                        backgroundColor: "#FAFAFA",
                        color: "#0F1117",
                      }}
                    />
                  </div>
                  {/* Payback Years */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6B7280" }}>
                      {locale === "de" ? "Amortisation (Jahre)" : "Payback (Years)"}
                    </label>
                    <input
                      type="number"
                      value={newPayback}
                      onChange={(e) => setNewPayback(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      style={{
                        border: "1px solid #D1D5DB",
                        backgroundColor: "#FAFAFA",
                        color: "#0F1117",
                      }}
                    />
                  </div>
                  {/* Priority */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6B7280" }}>
                      {locale === "de" ? "Priorität" : "Priority"}
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as typeof newPriority)}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      style={{
                        border: "1px solid #D1D5DB",
                        backgroundColor: "#FAFAFA",
                        color: "#0F1117",
                      }}
                    >
                      <option value="sehr hoch">sehr hoch</option>
                      <option value="hoch">hoch</option>
                      <option value="mittel">mittel</option>
                      <option value="niedrig">niedrig</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddMeasure}
                    disabled={!newName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{
                      backgroundColor: newName.trim() ? "#D97706" : "#E5E7EB",
                      color: newName.trim() ? "white" : "#9CA3AF",
                      cursor: newName.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    <Plus size={13} />
                    {locale === "de" ? "Hinzufügen" : "Add"}
                  </button>
                  <button
                    onClick={handleCancelAdd}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80"
                    style={{
                      backgroundColor: "#F3F4F6",
                      color: "#6B7280",
                    }}
                  >
                    <X size={13} />
                    {locale === "de" ? "Abbrechen" : "Cancel"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Measures Content */}
        {measures.length === 0 ? (
          <EmptyState
            icon={Zap}
            title={locale === "de" ? "Noch keine Maßnahmen identifiziert" : "No measures identified yet"}
            description={locale === "de" ? "Bericht generieren, um Maßnahmen zu extrahieren" : "Generate a report to extract measures"}
          />
        ) : viewMode === "table" ? (
          /* ───── Table View ───── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>ID</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                    {locale === "de" ? "Maßnahme" : "Measure"}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                    {locale === "de" ? "Einsparung/J." : "Savings/yr"}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                    {locale === "de" ? "Investition" : "Investment"}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                    {t.finding.payback}
                  </th>
                  <th className="text-center px-4 py-3 font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                    {locale === "de" ? "Priorität" : "Priority"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {measures.map((m) => {
                  const pColor = priorityColors[m.priority] ?? priorityColors.niedrig;
                  const isSelected = selectedMeasure?.measure_id === m.measure_id && evidencePanelOpen;
                  return (
                    <tr
                      key={m.measure_id}
                      onClick={() => handleSelectMeasure(m)}
                      className="cursor-pointer transition-colors duration-100"
                      style={{
                        borderBottom: "1px solid #F3F4F6",
                        backgroundColor: isSelected ? "#FFFBEB" : "white",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "white";
                      }}
                    >
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isSelected ? "#D97706" : "#F3F4F6",
                            color: isSelected ? "white" : "#6B7280",
                          }}
                        >
                          {m.measure_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm font-semibold leading-snug truncate" style={{ color: "#0F1117" }}>
                          {m.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: "#22C55E" }}>
                        {"\u20AC"}{m.annual_saving_eur.toLocaleString("de-AT")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: "#6B7280" }}>
                        {"\u20AC"}{m.investment_eur.toLocaleString("de-AT")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: "#6B7280" }}>
                        {t.finding.paybackYears(m.payback_years)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: pColor.bg, color: pColor.text }}
                        >
                          {priorityLabel(m.priority)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        ) : (
          /* ───── Grid / List View (cards) ───── */
          <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}>
            {measures.map((m, idx) => {
              const pColor = priorityColors[m.priority] ?? priorityColors.niedrig;
              const isSelected = selectedMeasure?.measure_id === m.measure_id && evidencePanelOpen;

              return (
                <motion.div
                  key={m.measure_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.04, duration: 0.3 }}
                  onClick={() => handleSelectMeasure(m)}
                  className="bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-150"
                  style={{
                    boxShadow: isSelected ? "0 0 0 3px rgba(217, 119, 6, 0.2)" : "0 1px 4px rgba(0,0,0,0.08)",
                    borderLeft: `4px solid ${pColor.border}`,
                  }}
                >
                  <div className="p-5">
                    {/* Header: ID + priority */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isSelected ? "#D97706" : "#F3F4F6",
                          color: isSelected ? "white" : "#6B7280",
                        }}
                      >
                        {m.measure_id}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: pColor.bg, color: pColor.text }}
                      >
                        {priorityLabel(m.priority)}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold leading-snug mb-1" style={{ color: "#0F1117" }}>
                      {m.title}
                    </p>
                    <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: "#6B7280" }}>
                      {m.description}
                    </p>

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown size={12} style={{ color: "#22C55E" }} />
                        <span className="font-semibold tabular-nums" style={{ color: "#0F1117" }}>
                          {"\u20AC"}
                          {m.annual_saving_eur.toLocaleString("de-AT")}/
                          {locale === "de" ? "Jahr" : "yr"}
                        </span>
                      </div>
                      <span style={{ color: "#D1D5DB" }}>|</span>
                      <span style={{ color: "#6B7280" }} className="tabular-nums">
                        {m.annual_saving_kwh.toLocaleString("de-AT")} kWh
                      </span>
                      <span style={{ color: "#D1D5DB" }}>|</span>
                      <span style={{ color: "#6B7280" }} className="tabular-nums">
                        {"\u20AC"}
                        {m.investment_eur.toLocaleString("de-AT")}
                      </span>
                    </div>

                    {/* Payback bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: "#6B7280" }}>
                        <span>{t.finding.payback}</span>
                        <span className="font-semibold tabular-nums">{t.finding.paybackYears(m.payback_years)}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((1 / m.payback_years) * 50, 100)}%`,
                            backgroundColor:
                              m.payback_years <= 2 ? "#22C55E" : m.payback_years <= 4 ? "#F59E0B" : "#9CA3AF",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div
                      className="px-5 py-2 border-t text-xs font-medium flex items-center gap-1.5"
                      style={{ borderColor: "#FDE68A", color: "#D97706", backgroundColor: "#FFFBEB" }}
                    >
                      <ChevronRight size={12} />
                      {t.finding.evidenceOpened}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Evidence Panel (right slide-out) */}
      <AnimatePresence>
        {evidencePanelOpen && selectedMeasure && (
          <EvidencePanel
            measure={toEvidenceMeasure(selectedMeasure)}
            onClose={() => {
              setEvidencePanelOpen(false);
              setTimeout(() => setSelectedMeasure(null), 300);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
