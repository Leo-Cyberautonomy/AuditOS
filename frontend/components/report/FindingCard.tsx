"use client";

import { ChevronRight, TrendingDown } from "lucide-react";
import { Measure } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface FindingCardProps {
  measure: Measure;
  isSelected: boolean;
  onClick: () => void;
}

export function FindingCard({ measure, isSelected, onClick }: FindingCardProps) {
  const { t } = useT();

  const priorityColor = {
    "sehr hoch": { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
    "hoch":      { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
    "mittel":    { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
    "niedrig":   { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  }[measure.priority] ?? { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };

  const priorityLabel = t.finding.priorities[measure.priority] ?? measure.priority;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border transition-all duration-150 group"
      style={{
        borderColor: isSelected ? "#D97706" : "#E4E7EE",
        backgroundColor: isSelected ? "#FFFBEB" : "white",
        boxShadow: isSelected ? "0 0 0 3px rgba(217, 119, 6, 0.12)" : "none",
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: isSelected ? "#D97706" : "#F3F4F6", color: isSelected ? "white" : "#6B7280" }}
              >
                {measure.measure_id}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}
              >
                {priorityLabel}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 leading-snug">{measure.title}</p>
          </div>
          <ChevronRight
            size={16}
            className="flex-shrink-0 mt-0.5 transition-all duration-150"
            style={{
              color: isSelected ? "#D97706" : "#9CA3AF",
              transform: isSelected ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
        </div>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingDown size={12} className="text-green-500" />
            <span className="font-semibold text-gray-900 tabular-nums">
              €{measure.annual_saving_eur.toLocaleString("de-AT")}{t.finding.perYear}
            </span>
          </div>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500 tabular-nums">
            {measure.annual_saving_kwh.toLocaleString("de-AT")} kWh{t.finding.perYear}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500 tabular-nums">
            {t.finding.investment} €{measure.investment_eur.toLocaleString("de-AT")}
          </span>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>{t.finding.payback}</span>
            <span className="font-semibold tabular-nums">{t.finding.paybackYears(measure.payback_years)}</span>
          </div>
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((1 / measure.payback_years) * 50, 100)}%`,
                backgroundColor: measure.payback_years <= 2 ? "#22C55E" : measure.payback_years <= 4 ? "#F59E0B" : "#9CA3AF",
              }}
            />
          </div>
        </div>
      </div>

      {isSelected && (
        <div
          className="px-4 py-2 border-t text-xs font-medium flex items-center gap-1.5"
          style={{ borderColor: "#FDE68A", color: "#D97706", backgroundColor: "#FFFBEB" }}
        >
          <ChevronRight size={12} />
          {t.finding.evidenceOpened}
        </div>
      )}
    </button>
  );
}
