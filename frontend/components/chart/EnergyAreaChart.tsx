"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Label,
} from "recharts";
import { DEMO_ENERGY_DATA, EnergyRow } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

const avgStrom = Math.round(
  DEMO_ENERGY_DATA.filter((r) => r.strom_kwh).reduce((s, r) => s + (r.strom_kwh ?? 0), 0) /
    DEMO_ENERGY_DATA.filter((r) => r.strom_kwh).length
);

function AnomalyDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload.isAnomaly) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill="#EF4444" fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#FAFAFA" strokeWidth={2} />
    </g>
  );
}

interface EnergyAreaChartProps {
  data?: EnergyRow[];
  onMonthClick?: (row: EnergyRow) => void;
}

export function EnergyAreaChart({ data: dataProp, onMonthClick }: EnergyAreaChartProps = {}) {
  const { t } = useT();
  const sourceData = dataProp ?? DEMO_ENERGY_DATA;

  const chartData = sourceData.map((row) => ({
    month: row.month,
    [t.chart.electricity]: row.strom_kwh,
    [t.chart.gas]: row.gas_kwh,
    isAnomaly: row.status === "anomaly",
  }));

  const missingRows = sourceData.filter((r) => r.status === "missing");

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-lg px-3 py-2.5 text-xs shadow-xl"
        style={{ background: "#1F2937", border: "none" }}
      >
        <p className="text-gray-300 font-medium mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="tabular-nums">
            {p.name}: {p.value ? p.value.toLocaleString("de-AT") : "—"} kWh
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t.chart.energyTitle}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: "#3B82F6" }} />
            {t.chart.electricity}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: "#F97316" }} />
            {t.chart.gas}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          style={{ cursor: onMonthClick ? "pointer" : undefined }}
          onClick={(chartPayload) => {
            if (onMonthClick && chartPayload?.activeLabel) {
              const row = (dataProp ?? DEMO_ENERGY_DATA).find(r => r.month === chartPayload.activeLabel);
              if (row) onMonthClick(row);
            }
          }}
        >
          <defs>
            <linearGradient id="gradStrom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradGas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EE" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: "inherit" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: "inherit" }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={avgStrom}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "Ø", position: "right", fontSize: 10, fill: "#9CA3AF" }}
          />

          <Area
            type="monotone"
            dataKey={t.chart.electricity}
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#gradStrom)"
            dot={<AnomalyDot />}
            activeDot={{ r: 4, fill: "#3B82F6", stroke: "white", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey={t.chart.gas}
            stroke="#F97316"
            strokeWidth={2}
            fill="url(#gradGas)"
            dot={false}
            activeDot={{ r: 4, fill: "#F97316", stroke: "white", strokeWidth: 2 }}
          />

          {/* Missing month markers — red dashed vertical line + label */}
          {missingRows.map((row) => (
            <ReferenceLine
              key={row.month}
              x={row.month}
              stroke="#EF4444"
              strokeDasharray="4 2"
              strokeWidth={1.5}
            >
              <Label
                value="✗ Fehlt"
                position="insideTopLeft"
                fill="#EF4444"
                fontSize={10}
                fontWeight={700}
                dy={6}
                dx={4}
              />
            </ReferenceLine>
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Anomaly callout */}
      <div
        className="mt-3 rounded-lg px-3 py-2 text-xs flex items-start gap-2"
        style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
      >
        <span className="font-bold flex-shrink-0">⚠</span>
        <span>
          <span className="font-semibold">{t.chart.anomalyMonth}:</span>{" "}
          {t.chart.anomaly.replace(/^[^:]+:\s*/, "")}
        </span>
      </div>

      {/* Missing data callouts */}
      {missingRows.map((row) => (
        <div
          key={row.month}
          className="mt-2 rounded-lg px-3 py-2 text-xs flex items-start gap-2"
          style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
        >
          <span className="font-bold flex-shrink-0">✗</span>
          <span>
            <span className="font-semibold">{row.month}:</span>{" "}
            {row.missing_note ?? "Verbrauchsdaten fehlen"}
          </span>
        </div>
      ))}
    </div>
  );
}
