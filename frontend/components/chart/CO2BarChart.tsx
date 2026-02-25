"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { EnergyRow, DEMO_ENERGY_DATA } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface CO2BarChartProps {
  data?: EnergyRow[];
}

export function CO2BarChart({ data }: CO2BarChartProps) {
  const { t } = useT();

  const rows = data ?? DEMO_ENERGY_DATA;

  const chartData = rows.map((r) => ({
    month: r.month,
    co2_strom: r.strom_kwh ? parseFloat((r.strom_kwh * 0.132 / 1000).toFixed(2)) : 0,
    co2_gas: r.gas_kwh ? parseFloat((r.gas_kwh * 0.201 / 1000).toFixed(2)) : 0,
    isMissing: r.status === "missing",
  }));

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const strom = payload.find((p: any) => p.dataKey === "co2_strom")?.value ?? 0;
    const gas = payload.find((p: any) => p.dataKey === "co2_gas")?.value ?? 0;
    const total = (strom + gas).toFixed(2);
    return (
      <div
        className="rounded-lg px-3 py-2.5 text-xs shadow-xl min-w-[160px]"
        style={{ background: "#1F2937" }}
      >
        <p className="text-white font-semibold mb-1">{label}</p>
        <p className="text-blue-300 tabular-nums">
          {t.chart.co2Strom}: {strom} t CO₂
        </p>
        <p className="text-orange-300 tabular-nums">
          {t.chart.co2Gas}: {gas} t CO₂
        </p>
        <p className="text-gray-300 font-medium tabular-nums mt-1">
          Gesamt: {total} t CO₂
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t.chart.co2Title}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: "#93C5FD" }}
            />
            {t.chart.co2Strom}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: "#FDBA74" }}
            />
            {t.chart.co2Gas}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E4E7EE" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
          />
          <YAxis
            unit=" t"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="co2_strom" stackId="co2" fill="#93C5FD">
            {chartData.map((entry, index) => (
              <Cell
                key={`strom-${index}`}
                fill="#93C5FD"
                opacity={entry.isMissing ? 0.3 : 1}
              />
            ))}
          </Bar>
          <Bar dataKey="co2_gas" stackId="co2" fill="#FDBA74" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`gas-${index}`}
                fill="#FDBA74"
                opacity={entry.isMissing ? 0.3 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
