"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { DEMO_MEASURES, Measure } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface SavingsWaterfallChartProps {
  measures?: Measure[];
}

export function SavingsWaterfallChart({ measures: measuresProp }: SavingsWaterfallChartProps = {}) {
  const { t } = useT();

  const measures = measuresProp ?? DEMO_MEASURES;

  const sorted = [...measures].sort((a, b) => a.payback_years - b.payback_years);

  let cumulative = 0;
  const chartData = sorted.map((m) => {
    cumulative += m.annual_saving_eur;
    const rawLabel = m.title.split(":")[0];
    const label = rawLabel.length > 20 ? rawLabel.substring(0, 20) + "..." : rawLabel;
    return {
      id: m.measure_id,
      label,
      saving: m.annual_saving_eur,
      cumulative,
      payback: m.payback_years,
    };
  });

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const measure = measures.find((m) => m.measure_id === label);
    const saving = payload.find((p: any) => p.dataKey === "saving")?.value ?? 0;
    const cum = payload.find((p: any) => p.dataKey === "cumulative")?.value ?? 0;
    return (
      <div
        className="rounded-lg px-3 py-2.5 text-xs shadow-xl min-w-[220px]"
        style={{ background: "#1F2937" }}
      >
        <p className="text-white font-semibold mb-1 leading-snug">
          {label}: {measure?.title}
        </p>
        <p className="text-amber-400 tabular-nums">
          {t.chart.savingsPerMeasure}: €{(saving as number).toLocaleString("de-AT")}
        </p>
        <p className="text-green-400 tabular-nums">
          {t.chart.savingsCumulative}: €{(cum as number).toLocaleString("de-AT")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t.chart.savingsTitle}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded inline-block"
              style={{ backgroundColor: "#D97706" }}
            />
            {t.chart.savingsPerMeasure}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-4 h-0.5 inline-block"
              style={{ backgroundColor: "#22C55E" }}
            />
            {t.chart.savingsCumulative}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E4E7EE" />
          <XAxis
            dataKey="id"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
          />
          <YAxis
            unit=" €"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            width={55}
            tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#E4E7EE" />
          <Bar
            dataKey="saving"
            fill="#D97706"
            opacity={0.85}
            radius={[4, 4, 0, 0]}
            barSize={36}
          />
          <Line
            dataKey="cumulative"
            type="monotone"
            stroke="#22C55E"
            strokeWidth={2}
            dot={{ fill: "#22C55E", r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
