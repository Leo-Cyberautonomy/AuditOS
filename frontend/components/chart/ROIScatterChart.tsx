"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { DEMO_MEASURES, Measure } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface ROIScatterChartProps {
  measures?: Measure[];
}

export function ROIScatterChart({ measures: measuresProp }: ROIScatterChartProps = {}) {
  const { t, locale } = useT();
  const fmt = locale === "de" ? "de-DE" : "en-US";

  const measures = measuresProp ?? DEMO_MEASURES;

  const quickWins = measures.filter((m) => m.payback_years <= 2.5).map((m) => ({
    investition: m.investment_eur,
    einsparung: m.annual_saving_eur,
    payback: m.payback_years,
    label: m.title,
    id: m.measure_id,
  }));

  const longer = measures.filter((m) => m.payback_years > 2.5).map((m) => ({
    investition: m.investment_eur,
    einsparung: m.annual_saving_eur,
    payback: m.payback_years,
    label: m.title,
    id: m.measure_id,
  }));

  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div
        className="rounded-lg px-3 py-2.5 text-xs shadow-xl max-w-[200px]"
        style={{ background: "#1F2937" }}
      >
        <p className="text-white font-semibold mb-1 leading-snug">{d.id}: {d.label}</p>
        <p className="text-gray-300 tabular-nums">{t.chart.tooltipInvestment}: €{d.investition.toLocaleString(fmt)}</p>
        <p className="text-gray-300 tabular-nums">{t.chart.tooltipSavings}: €{d.einsparung.toLocaleString(fmt)}/{t.chart.tooltipYears}</p>
        <p className="text-amber-400 font-medium tabular-nums">{t.chart.tooltipPayback}: {d.payback} {t.chart.tooltipYears}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t.chart.roiTitle}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#D97706" }} />
            {t.chart.quickWins}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#9CA3AF" }} />
            {t.chart.mediumTerm}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EE" />
          <XAxis
            dataKey="investition"
            type="number"
            name={t.chart.tooltipInvestment}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            label={{ value: t.chart.investmentLabel, position: "insideBottom", offset: -12, fontSize: 11, fill: "#9CA3AF" }}
          />
          <YAxis
            dataKey="einsparung"
            type="number"
            name={t.chart.tooltipSavings}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={quickWins} fill="#D97706" opacity={0.9} />
          <Scatter data={longer} fill="#9CA3AF" opacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
