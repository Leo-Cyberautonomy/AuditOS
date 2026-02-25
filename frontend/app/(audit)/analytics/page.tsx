"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Leaf, CheckCircle, Download, TrendingDown, Lock } from "lucide-react";
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
import { DEMO_COMPANY, DEMO_ENERGY_DATA, DEMO_TOTALS, DEMO_MEASURES, EnergyRow, Measure } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";
import { getWorkflowState, loadSessionData, loadMeasures } from "@/lib/workflow-state";

type TimeFilter = "full" | "h1" | "h2";

const CHART_IDS = ["energy", "donut", "co2", "benchmark", "roi", "savings"] as const;
type ChartId = typeof CHART_IDS[number];

// Derive year and month labels from actual data — works for any upload year
function deriveFilterMeta(data: EnergyRow[]) {
  if (data.length === 0) return { year: "—", h1Label: "H1", h2Label: "H2" };
  // Month format: "Jan 23", "Feb 24", etc.
  const yearSuffix = data[0].month.split(" ")[1];
  const year = yearSuffix ? "20" + yearSuffix : "—";
  const h1 = data.slice(0, 6);
  const h2 = data.slice(6);
  const monthOf = (r: EnergyRow) => r.month.split(" ")[0];
  const h1Label = h1.length > 0
    ? `${monthOf(h1[0])}–${monthOf(h1[h1.length - 1])}`
    : "H1";
  const h2Label = h2.length > 0
    ? `${monthOf(h2[0])}–${monthOf(h2[h2.length - 1])}`
    : "H2";
  return { year, h1Label, h2Label };
}

export default function DashboardPage() {
  const { t, locale } = useT();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("full");
  const [selectedCharts, setSelectedCharts] = useState<Set<ChartId>>(new Set(CHART_IDS));
  const [selectedMonth, setSelectedMonth] = useState<EnergyRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [workflow, setWorkflow] = useState({ step1Done: false, step2Done: false });
  const [sessionEnergy, setSessionEnergy] = useState<EnergyRow[]>(DEMO_ENERGY_DATA);
  const [sessionTotals, setSessionTotals] = useState(DEMO_TOTALS);
  const [sessionMeasures, setSessionMeasures] = useState<Measure[]>(DEMO_MEASURES);

  useEffect(() => {
    setWorkflow(getWorkflowState());
    const session = loadSessionData();
    if (session) {
      setSessionEnergy(session.energyData);
      setSessionTotals(session.totals);
    }
    const stored = loadMeasures();
    if (stored && stored.length > 0) setSessionMeasures(stored);
  }, []);

  // Refs for each chart card content (for html-to-image)
  const chartRefs = useRef<Partial<Record<ChartId, HTMLDivElement | null>>>({});

  // Filter energy data based on time selection
  const filteredData = sessionEnergy.filter((_, i) => {
    if (timeFilter === "h1") return i < 6;
    if (timeFilter === "h2") return i >= 6;
    return true;
  });

  const toggleChart = useCallback((id: string) => {
    setSelectedCharts(prev => {
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
            a.download = `auditOS-${id}.png`;
            a.click();
            await new Promise(r => setTimeout(r, 300)); // stagger downloads
          } catch (e) {
            console.error(`Export failed for ${id}:`, e);
          }
        }
      }
    }
    setExporting(false);
  }, [selectedCharts]);

  // Derive filter labels from actual data
  const { year, h1Label, h2Label } = deriveFilterMeta(sessionEnergy);

  // KPI values
  const totalMWh = (sessionTotals.total_kwh / 1000).toFixed(1);
  const totalCost = Math.round(sessionTotals.strom_kwh * 0.18 + sessionTotals.gas_kwh * 0.085);
  const totalCO2 = ((sessionTotals.strom_kwh * 0.132 + sessionTotals.gas_kwh * 0.201) / 1000).toFixed(1);

  const kpis = [
    { title: t.dashboard.kpiEnergy, value: totalMWh, unit: t.dashboard.kpiUnit.energy, icon: Zap, color: "#3B82F6" },
    { title: t.dashboard.kpiCost, value: `€${totalCost.toLocaleString("de-AT")}`, unit: t.dashboard.kpiUnit.cost, icon: TrendingDown, color: "#D97706" },
    { title: t.dashboard.kpiCO2, value: totalCO2, unit: t.dashboard.kpiUnit.co2, icon: Leaf, color: "#22C55E" },
    { title: t.dashboard.kpiReadiness, value: `${sessionTotals.readiness_score}`, unit: t.dashboard.kpiUnit.readiness, icon: CheckCircle, color: "#8B5CF6" },
  ];

  // Filter labels derived from actual data, not hardcoded
  const filterOptions: { key: TimeFilter; label: string }[] = [
    { key: "full", label: `${year} ${locale === "en" ? "Full Year" : "Gesamt"}` },
    { key: "h1", label: `H1 (${h1Label})` },
    { key: "h2", label: `H2 (${h2Label})` },
  ];

  const selectedCount = selectedCharts.size;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F6F9" }}>
      {/* Dashboard header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t.dashboard.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {DEMO_COMPANY.name} · {locale === "en" ? "Audit Year" : "Auditjahr"} {year}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Time filter */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
              {filterOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTimeFilter(opt.key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: timeFilter === opt.key ? "white" : "transparent",
                    color: timeFilter === opt.key ? "#111827" : "#6B7280",
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
        {/* KPI row — skeleton when workflow not started */}
        <div className="grid grid-cols-4 gap-4">
          {workflow.step1Done ? (
            kpis.map((kpi, i) => (
              <KPICard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                unit={kpi.unit}
                icon={kpi.icon}
                accentColor={kpi.color}
                delay={i * 0.08}
              />
            ))
          ) : (
            [0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-xl p-5 space-y-3 animate-pulse"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              >
                <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                <div className="h-7 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-100 rounded w-1/3" />
              </motion.div>
            ))
          )}
        </div>

        {/* Charts section — blurred with lock overlay until both steps done */}
        <div className="relative">
          <div
            style={{
              filter: !workflow.step1Done || !workflow.step2Done ? "blur(3px)" : "none",
              pointerEvents: !workflow.step1Done || !workflow.step2Done ? "none" : "auto",
              userSelect: !workflow.step1Done || !workflow.step2Done ? "none" : "auto",
              transition: "filter 0.4s ease",
            }}
          >

        {/* Row 1: Energy area (8/12) + Donut (4/12) */}
        <div className="grid grid-cols-12 gap-4 relative">
          <div className="col-span-8">
            <ChartCard
              id="energy"
              title=""
              selected={selectedCharts.has("energy")}
              onToggle={toggleChart}
              delay={0.1}
              ref={el => { chartRefs.current["energy"] = el; }}
            >
              <EnergyAreaChart
                data={filteredData}
                onMonthClick={row => setSelectedMonth(prev => prev?.month === row.month ? null : row)}
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
              ref={el => { chartRefs.current["donut"] = el; }}
            >
              <EnergyDonutChart totals={sessionTotals} />
            </ChartCard>
            {/* Month detail panel slides over the donut card */}
            <AnimatePresence>
              {selectedMonth && (
                <MonthDetailPanel
                  row={selectedMonth}
                  onClose={() => setSelectedMonth(null)}
                />
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
            ref={el => { chartRefs.current["co2"] = el; }}
          >
            <CO2BarChart data={filteredData} />
          </ChartCard>
          <ChartCard
            id="benchmark"
            title=""
            selected={selectedCharts.has("benchmark")}
            onToggle={toggleChart}
            delay={0.25}
            ref={el => { chartRefs.current["benchmark"] = el; }}
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
            ref={el => { chartRefs.current["roi"] = el; }}
          >
            <ROIScatterChart measures={sessionMeasures} />
          </ChartCard>
          <ChartCard
            id="savings"
            title=""
            selected={selectedCharts.has("savings")}
            onToggle={toggleChart}
            delay={0.35}
            ref={el => { chartRefs.current["savings"] = el; }}
          >
            <SavingsWaterfallChart measures={sessionMeasures} />
          </ChartCard>
        </div>

          </div>{/* end blur wrapper */}

          {/* Lock overlay */}
          <AnimatePresence>
            {(!workflow.step1Done || !workflow.step2Done) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(244,246,249,0.55)" }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="bg-white rounded-2xl px-8 py-7 shadow-xl text-center"
                  style={{ maxWidth: 320 }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: "#F3F4F6" }}
                  >
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    {locale === "en" ? "Complete workflow to unlock" : "Workflow abschließen"}
                  </p>
                  <p className="text-xs text-gray-400 mb-5">
                    {locale === "en"
                      ? "Process data and generate a report first."
                      : "Daten verarbeiten und Bericht generieren."}
                  </p>
                  <div className="space-y-2 text-left">
                    {[
                      { done: workflow.step1Done, label: locale === "en" ? "Data preparation" : "Datenvorbereitung", href: "/upload" },
                      { done: workflow.step2Done, label: locale === "en" ? "Generate report" : "Bericht generieren", href: "/report" },
                    ].map((step) => (
                      <a
                        key={step.href}
                        href={step.done ? undefined : step.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: step.done ? "#F0FDF4" : "#FEF3C7",
                          color: step.done ? "#15803D" : "#92400E",
                          pointerEvents: step.done ? "none" : "auto",
                          cursor: step.done ? "default" : "pointer",
                        }}
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: step.done ? "#22C55E" : "#D97706",
                            color: "white",
                          }}
                        >
                          {step.done ? "✓" : "→"}
                        </span>
                        {step.label}
                      </a>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>{/* end relative container */}
      </div>
    </div>
  );
}
