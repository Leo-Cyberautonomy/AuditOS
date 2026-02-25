"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { DEMO_BENCHMARKS } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface BenchmarkBarChartProps {
  actual?: number;
  industryAvg?: number;
  bestPractice?: number;
}

export function BenchmarkBarChart({ actual, industryAvg, bestPractice }: BenchmarkBarChartProps = {}) {
  const { t } = useT();

  const actualVal = actual ?? DEMO_BENCHMARKS.actual_electricity_kwh_per_m2;
  const avgVal = industryAvg ?? DEMO_BENCHMARKS.electricity_kwh_per_m2;
  const bestVal = bestPractice ?? 100;

  const data = [
    { name: t.chart.benchmarkActual, value: actualVal, fill: "#D97706" },
    { name: t.chart.benchmarkIndustry, value: avgVal, fill: "#9CA3AF" },
    { name: t.chart.benchmarkBest, value: bestVal, fill: "#22C55E" },
  ];

  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    if (!d) return null;
    return (
      <div
        className="rounded-lg px-3 py-2.5 text-xs shadow-xl"
        style={{ background: "#1F2937" }}
      >
        <p className="text-white font-semibold mb-1">{d.payload?.name}</p>
        <p className="text-gray-300 tabular-nums">
          {d.value} kWh/m²·Jahr
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t.chart.benchmarkTitle}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 24, right: 24, bottom: 8, left: 0 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E4E7EE" />
          <XAxis
            type="number"
            domain={[0, 180]}
            unit=" kWh/m²"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={avgVal}
            stroke="#D97706"
            strokeDasharray="4 3"
            label={{
              value: "Branche Ø",
              position: "insideTopRight",
              fontSize: 10,
              fill: "#D97706",
              dy: -14,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-amber-600 mt-2 tabular-nums">
        +{avgVal > 0 ? (((actualVal - avgVal) / avgVal) * 100).toFixed(0) : DEMO_BENCHMARKS.deviation_pct}% über Branchendurchschnitt
      </p>
    </div>
  );
}
