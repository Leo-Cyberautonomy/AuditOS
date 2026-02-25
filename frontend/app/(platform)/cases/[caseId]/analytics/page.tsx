"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Leaf, CheckCircle, Download, TrendingDown } from "lucide-react";
import { toPng } from "html-to-image";
import { KPICard } from "@/components/dashboard/KPICard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { MonthDetailPanel } from "@/components/dashboard/MonthDetailPanel";
import { EnergyAreaChart } from "@/components/chart/EnergyAreaChart";
import { EnergyDonutChart } from "@/components/chart/EnergyDonutChart";
import { CO2BarChart } from "@/components/chart/CO2BarChart";
import { BenchmarkBarChart } from "@/components/chart/BenchmarkBarChart";
import { ROIScatterChart } from "@/components/chart/ROIScatterChart";
import { SavingsWaterfallChart } from "@/components/chart/SavingsWaterfallChart";
import { useT } from "@/lib/i18n";
import { fetchLedger, fetchLedgerSummary, fetchMeasures } from "@/lib/api";
import type { LedgerEntry, LedgerTotals, Measure as ApiMeasure } from "@/lib/types";
import type { EnergyRow, Measure as DemoMeasure } from "@/lib/demo-data";

type TimeFilter = "full" | "h1" | "h2";

const CHART_IDS = ["energy", "donut", "co2", "benchmark", "roi", "savings"] as const;
type ChartId = (typeof CHART_IDS)[number];

// Transform ledger entries to EnergyRow format for charts
function ledgerToEnergyRows(entries: LedgerEntry[]): EnergyRow[] {
  // Get unique months preserving order
  const monthSet = new Set<string>();
  entries.forEach((e) => monthSet.add(e.month));
  const months = Array.from(monthSet);

  return months.map((month) => {
    const strom = entries.find((e) => e.month === month && e.carrier === "strom");
    const gas = entries.find((e) => e.month === month && e.carrier === "gas");
    const fernwaerme = entries.find((e) => e.month === month && e.carrier === "fernwaerme");
    return {
      month,
      strom_kwh: strom?.value_kwh ?? null,
      gas_kwh: gas?.value_kwh ?? null,
      fernwaerme_kwh: fernwaerme?.value_kwh ?? null,
      status: (strom?.status ?? gas?.status ?? "missing") as EnergyRow["status"],
      anomaly_note: strom?.status === "anomaly" ? (strom?.note ?? undefined) : undefined,
      missing_note: strom?.status === "missing" ? (strom?.note ?? undefined) : undefined,
      estimated_note: strom?.status === "estimated" ? (strom?.note ?? undefined) : undefined,
    };
  });
}

// Transform API Measure to demo Measure format for chart components
function apiMeasuresToChartMeasures(measures: ApiMeasure[]): DemoMeasure[] {
  return measures.map((m) => ({
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
  }));
}

// Derive year and month labels from actual data
function deriveFilterMeta(data: EnergyRow[]) {
  if (data.length === 0) return { year: "--", h1Label: "H1", h2Label: "H2" };
  const yearSuffix = data[0].month.split(" ")[1];
  const year = yearSuffix ? "20" + yearSuffix : "--";
  const h1 = data.slice(0, 6);
  const h2 = data.slice(6);
  const monthOf = (r: EnergyRow) => r.month.split(" ")[0];
  const h1Label = h1.length > 0 ? `${monthOf(h1[0])}–${monthOf(h1[h1.length - 1])}` : "H1";
  const h2Label = h2.length > 0 ? `${monthOf(h2[0])}–${monthOf(h2[h2.length - 1])}` : "H2";
  return { year, h1Label, h2Label };
}

export default function AnalyticsPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;
  const { t, locale } = useT();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("full");
  const [selectedCharts, setSelectedCharts] = useState<Set<ChartId>>(new Set(CHART_IDS));
  const [selectedMonth, setSelectedMonth] = useState<EnergyRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const [energyData, setEnergyData] = useState<EnergyRow[]>([]);
  const [totals, setTotals] = useState<LedgerTotals | null>(null);
  const [measures, setMeasures] = useState<DemoMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;

    async function load() {
      try {
        const [ledgerEntries, summary, apiMeasures] = await Promise.all([
          fetchLedger(caseId),
          fetchLedgerSummary(caseId),
          fetchMeasures(caseId).catch(() => [] as ApiMeasure[]),
        ]);
        if (cancelled) return;
        setEnergyData(ledgerToEnergyRows(ledgerEntries));
        setTotals(summary);
        setMeasures(apiMeasuresToChartMeasures(apiMeasures));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics data");
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

  // Refs for each chart card content
  const chartRefs = useRef<Partial<Record<ChartId, HTMLDivElement | null>>>({});

  // Filter energy data based on time selection
  const filteredData = energyData.filter((_, i) => {
    if (timeFilter === "h1") return i < 6;
    if (timeFilter === "h2") return i >= 6;
    return true;
  });

  const toggleChart = useCallback((id: string) => {
    setSelectedCharts((prev) => {
      const next = new Set(prev);
      if (next.has(id as ChartId)) next.delete(id as ChartId);
      else next.add(id as ChartId);
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    for (const id of CHART_IDS) {
      if (selectedCharts.has(id)) {
        const el = chartRefs.current[id];
        if (el) {
          try {
            const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: "#ffffff" });
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `auditOS-${id}-${caseId}.png`;
            a.click();
            await new Promise((r) => setTimeout(r, 300));
          } catch (e) {
            console.error(`Export failed for ${id}:`, e);
          }
        }
      }
    }
    setExporting(false);
  }, [selectedCharts, caseId]);

  // Derive filter labels
  const { year, h1Label, h2Label } = deriveFilterMeta(energyData);

  // KPI values
  const totalMWh = totals ? (totals.total_kwh / 1000).toFixed(1) : "0";
  const totalCost = totals
    ? Math.round(totals.strom_kwh * 0.18 + totals.gas_kwh * 0.085)
    : 0;
  const totalCO2 = totals
    ? ((totals.strom_kwh * 0.132 + totals.gas_kwh * 0.201) / 1000).toFixed(1)
    : "0";

  const kpis = [
    { title: t.dashboard.kpiEnergy, value: totalMWh, unit: t.dashboard.kpiUnit.energy, icon: Zap, color: "#3B82F6" },
    {
      title: t.dashboard.kpiCost,
      value: `\u20AC${totalCost.toLocaleString("de-AT")}`,
      unit: t.dashboard.kpiUnit.cost,
      icon: TrendingDown,
      color: "#D97706",
    },
    { title: t.dashboard.kpiCO2, value: totalCO2, unit: t.dashboard.kpiUnit.co2, icon: Leaf, color: "#22C55E" },
    {
      title: t.dashboard.kpiReadiness,
      value: `${totals?.readiness_score ?? 0}`,
      unit: t.dashboard.kpiUnit.readiness,
      icon: CheckCircle,
      color: "#8B5CF6",
    },
  ];

  const filterOptions: { key: TimeFilter; label: string }[] = [
    { key: "full", label: `${year} ${locale === "en" ? "Full Year" : "Gesamt"}` },
    { key: "h1", label: `H1 (${h1Label})` },
    { key: "h2", label: `H2 (${h2Label})` },
  ];

  const selectedCount = selectedCharts.size;

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ backgroundColor: "#F4F6F9" }} className="min-h-full">
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-5 space-y-3 animate-pulse"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              >
                <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                <div className="h-7 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8 bg-white rounded-xl h-64 animate-pulse" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} />
            <div className="col-span-4 bg-white rounded-xl h-64 animate-pulse" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ backgroundColor: "#F4F6F9" }}>
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
    <div className="min-h-full" style={{ backgroundColor: "#F4F6F9" }}>
      {/* Dashboard header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#0F1117" }}>
              {t.dashboard.title}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
              {locale === "en" ? "Audit Year" : "Auditjahr"} {year}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Time filter */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
              {filterOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTimeFilter(opt.key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: timeFilter === opt.key ? "white" : "transparent",
                    color: timeFilter === opt.key ? "#0F1117" : "#6B7280",
                    boxShadow: timeFilter === opt.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Export button */}
            <motion.button
              onClick={handleExport}
              disabled={selectedCount === 0 || exporting}
              animate={{
                backgroundColor: selectedCount > 0 ? "#D97706" : "#E5E7EB",
                color: selectedCount > 0 ? "white" : "#9CA3AF",
              }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ cursor: selectedCount > 0 ? "pointer" : "not-allowed" }}
            >
              <Download size={14} />
              {exporting ? "..." : t.dashboard.exportBtnCount(selectedCount)}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              unit={kpi.unit}
              icon={kpi.icon}
              accentColor={kpi.color}
              delay={i * 0.08}
            />
          ))}
        </div>

        {/* Row 1: Energy area (8/12) + Donut (4/12) */}
        <div className="grid grid-cols-12 gap-4 relative">
          <div className="col-span-8">
            <ChartCard
              id="energy"
              title=""
              selected={selectedCharts.has("energy")}
              onToggle={toggleChart}
              delay={0.1}
              ref={(el) => {
                chartRefs.current["energy"] = el;
              }}
            >
              <EnergyAreaChart
                data={filteredData}
                onMonthClick={(row) => setSelectedMonth((prev) => (prev?.month === row.month ? null : row))}
              />
            </ChartCard>
          </div>
          <div className="col-span-4 relative">
            <ChartCard
              id="donut"
              title=""
              selected={selectedCharts.has("donut")}
              onToggle={toggleChart}
              delay={0.15}
              ref={(el) => {
                chartRefs.current["donut"] = el;
              }}
            >
              <EnergyDonutChart totals={totals ? { strom_kwh: totals.strom_kwh, gas_kwh: totals.gas_kwh, fernwaerme_kwh: totals.fernwaerme_kwh, total_kwh: totals.total_kwh } : undefined} />
            </ChartCard>
            <AnimatePresence>
              {selectedMonth && (
                <MonthDetailPanel row={selectedMonth} allData={energyData} onClose={() => setSelectedMonth(null)} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Row 2: CO2 (6/12) + Benchmark (6/12) */}
        <div className="grid grid-cols-2 gap-4">
          <ChartCard
            id="co2"
            title=""
            selected={selectedCharts.has("co2")}
            onToggle={toggleChart}
            delay={0.2}
            ref={(el) => {
              chartRefs.current["co2"] = el;
            }}
          >
            <CO2BarChart data={filteredData} />
          </ChartCard>
          <ChartCard
            id="benchmark"
            title=""
            selected={selectedCharts.has("benchmark")}
            onToggle={toggleChart}
            delay={0.25}
            ref={(el) => {
              chartRefs.current["benchmark"] = el;
            }}
          >
            <BenchmarkBarChart />
          </ChartCard>
        </div>

        {/* Row 3: ROI Scatter (6/12) + Savings Waterfall (6/12) */}
        <div className="grid grid-cols-2 gap-4">
          <ChartCard
            id="roi"
            title=""
            selected={selectedCharts.has("roi")}
            onToggle={toggleChart}
            delay={0.3}
            ref={(el) => {
              chartRefs.current["roi"] = el;
            }}
          >
            <ROIScatterChart measures={measures} />
          </ChartCard>
          <ChartCard
            id="savings"
            title=""
            selected={selectedCharts.has("savings")}
            onToggle={toggleChart}
            delay={0.35}
            ref={(el) => {
              chartRefs.current["savings"] = el;
            }}
          >
            <SavingsWaterfallChart measures={measures} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
