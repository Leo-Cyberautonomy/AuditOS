"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { DEMO_TOTALS } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

const STROM_COLOR = "#3B82F6";
const GAS_COLOR = "#F97316";

interface EnergyDonutChartProps {
  totals?: { strom_kwh: number; gas_kwh: number; fernwaerme_kwh: number; total_kwh: number };
}

export function EnergyDonutChart({ totals: totalsProp }: EnergyDonutChartProps = {}) {
  const { t, locale } = useT();
  const fmt = locale === "de" ? "de-DE" : "en-US";

  const src = totalsProp ?? DEMO_TOTALS;
  const strom = src.strom_kwh;
  const gas = src.gas_kwh;
  const total = src.total_kwh;

  const data = [
    { name: t.chart.donutStrom, value: strom },
    { name: t.chart.donutGas, value: gas },
  ];

  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    if (!d) return null;
    const pct = ((d.value / total) * 100).toFixed(1);
    return (
      <div
        className="rounded-lg px-3 py-2.5 text-xs shadow-xl"
        style={{ background: "#1F2937" }}
      >
        <p className="text-white font-semibold mb-1">{d.name}</p>
        <p className="text-gray-300 tabular-nums">
          {(d.value as number).toLocaleString(fmt)} kWh
        </p>
        <p className="text-gray-400 tabular-nums">{pct}%</p>
      </div>
    );
  }

  function CenterLabel({ cx, cy }: { cx: number; cy: number }) {
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} dy="-0.6em" fontSize="15" fontWeight="bold" fill="#111827">
          {(total / 1000).toFixed(0)} MWh
        </tspan>
        <tspan x={cx} dy="1.4em" fontSize="10" fill="#6B7280">
          {t.chart.donutTotal}
        </tspan>
      </text>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t.chart.donutTitle}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: STROM_COLOR }}
            />
            {t.chart.donutStrom}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: GAS_COLOR }}
            />
            {t.chart.donutGas}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={({ cx, cy }) => <CenterLabel cx={cx} cy={cy} />}
          >
            <Cell key="strom" fill={STROM_COLOR} />
            <Cell key="gas" fill={GAS_COLOR} />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
