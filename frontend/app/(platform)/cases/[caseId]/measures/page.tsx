"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingDown, DollarSign, Clock, ChevronRight, X } from "lucide-react";
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
          className="flex items-center gap-3 mb-6"
        >
          <Zap size={22} style={{ color: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
            {t.measures.title}
          </h1>
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

        {/* Measures Grid */}
        {measures.length === 0 ? (
          <EmptyState
            icon={Zap}
            title={locale === "de" ? "Noch keine Maßnahmen identifiziert" : "No measures identified yet"}
            description={locale === "de" ? "Bericht generieren, um Maßnahmen zu extrahieren" : "Generate a report to extract measures"}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {measures.map((m, idx) => {
              const pColor = priorityColors[m.priority] ?? priorityColors.niedrig;
              const isSelected = selectedMeasure?.measure_id === m.measure_id && evidencePanelOpen;
              const confidenceColor =
                m.evidence.confidence >= 80 ? "#22C55E" : m.evidence.confidence >= 50 ? "#F59E0B" : "#EF4444";

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
                      <div className="ml-auto flex items-center gap-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: confidenceColor }}
                        />
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: confidenceColor }}>
                          {m.evidence.confidence}%
                        </span>
                      </div>
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
