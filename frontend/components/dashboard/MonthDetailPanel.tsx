"use client";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { EnergyRow, DEMO_ENERGY_DATA } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface MonthDetailPanelProps {
  row: EnergyRow;
  allData?: EnergyRow[];
  onClose: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: { de: string; en: string } }> = {
  confirmed: { bg: "#DCFCE7", text: "#15803D", label: { de: "Bestätigt", en: "Confirmed" } },
  anomaly:   { bg: "#FEE2E2", text: "#991B1B", label: { de: "Anomalie", en: "Anomaly" } },
  estimated: { bg: "#FEF3C7", text: "#92400E", label: { de: "Schätzwert", en: "Estimated" } },
  missing:   { bg: "#F3F4F6", text: "#6B7280", label: { de: "Fehlend", en: "Missing" } },
};

export function MonthDetailPanel({ row, allData, onClose }: MonthDetailPanelProps) {
  const { t, locale } = useT();

  // Calculate MoM change
  const dataSource = allData ?? DEMO_ENERGY_DATA;
  const idx = dataSource.findIndex((r) => r.month === row.month);
  const prev = idx > 0 ? dataSource[idx - 1] : null;
  const prevTotal = prev ? (prev.strom_kwh ?? 0) + (prev.gas_kwh ?? 0) : null;
  const thisTotal = (row.strom_kwh ?? 0) + (row.gas_kwh ?? 0);
  const momPct = prevTotal && prevTotal > 0 ? ((thisTotal - prevTotal) / prevTotal * 100).toFixed(1) : null;

  // Cost estimates
  const costStrom = row.strom_kwh ? (row.strom_kwh * 0.18).toFixed(0) : null;
  const costGas = row.gas_kwh ? (row.gas_kwh * 0.085).toFixed(0) : null;
  const totalCost = costStrom && costGas ? (parseFloat(costStrom) + parseFloat(costGas)).toLocaleString("de-AT") : "—";

  const statusInfo = STATUS_COLORS[row.status];
  const statusLabel = locale === "en" ? statusInfo.label.en : statusInfo.label.de;

  const note = row.anomaly_note ?? row.missing_note ?? row.estimated_note;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-gray-100 z-10 overflow-y-auto"
      style={{ boxShadow: "-4px 0 16px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{t.dashboard.monthDetail.title}</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{row.month}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
          >
            {statusLabel}
          </span>
          {momPct && (
            <span className={`text-xs font-semibold ${parseFloat(momPct) > 0 ? "text-red-600" : "text-green-600"}`}>
              {parseFloat(momPct) > 0 ? "▲" : "▼"} {Math.abs(parseFloat(momPct))}% {t.dashboard.monthDetail.momChange}
            </span>
          )}
        </div>

        {/* Energy rows */}
        {[
          { label: t.dashboard.monthDetail.electricity, kwh: row.strom_kwh, cost: costStrom, color: "#3B82F6" },
          { label: t.dashboard.monthDetail.gas, kwh: row.gas_kwh, cost: costGas, color: "#F97316" },
        ].map(({ label, kwh, cost, color }) => (
          <div key={label} className="p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <p className="text-xs font-semibold text-gray-600">{label}</p>
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {kwh ? kwh.toLocaleString("de-AT") : "—"} <span className="text-xs font-normal text-gray-400">kWh</span>
            </p>
            {cost && (
              <p className="text-xs text-gray-400 mt-0.5">
                {t.dashboard.monthDetail.cost}: ~€{parseInt(cost).toLocaleString("de-AT")}
              </p>
            )}
          </div>
        ))}

        {/* Total cost */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-600">{t.dashboard.monthDetail.total}</p>
          <p className="text-sm font-bold text-gray-900 tabular-nums">~€{totalCost}</p>
        </div>

        {/* Note */}
        {note && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800 leading-relaxed">{note}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
