"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Ruler, Calculator, DollarSign, AlertTriangle } from "lucide-react";
import { Measure } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface EvidencePanelProps {
  measure: Measure | null;
  onClose: () => void;
}

function ConfidenceBar({ value, label, confidence }: { value: number; label: string; confidence: string }) {
  const color = value >= 85 ? "#22C55E" : value >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{value}% — {confidence}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

const TREE_SECTION_KEYS = [
  { key: "measurement", icon: Ruler, color: "#3B82F6" },
  { key: "nameplate",   icon: Ruler, color: "#8B5CF6" },
  { key: "method",      icon: Calculator, color: "#10B981" },
  { key: "price_basis", icon: DollarSign, color: "#F59E0B" },
] as const;

export function EvidencePanel({ measure, onClose }: EvidencePanelProps) {
  const { t } = useT();

  return (
    <AnimatePresence>
      {measure && (
        <motion.div
          key={measure.measure_id}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-[380px] flex-shrink-0 h-full overflow-y-auto border-l border-gray-100 bg-white"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
                  >
                    {measure.measure_id}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">{t.evidence.evidenceTree}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{measure.title}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
              >
                <X size={16} />
              </button>
            </div>

            {/* Key numbers */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: t.evidence.savingsPerYear, value: `€${measure.annual_saving_eur.toLocaleString("de-AT")}` },
                { label: t.evidence.investment,     value: `€${measure.investment_eur.toLocaleString("de-AT")}` },
                { label: t.evidence.payback,        value: t.evidence.paybackYears(measure.payback_years) },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-2 text-center" style={{ backgroundColor: "#F9FAFB" }}>
                  <p className="text-xs font-bold text-gray-900 tabular-nums">{item.value}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence tree */}
          <div className="px-5 py-4 space-y-4">
            {TREE_SECTION_KEYS.map((section, i) => {
              const value = measure.evidence[section.key as keyof typeof measure.evidence];
              if (!value) return null;
              const Icon = section.icon;
              const sectionLabel = t.evidence.sections[section.key];
              return (
                <motion.div
                  key={section.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 + 0.1 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${section.color}15` }}
                    >
                      <Icon size={11} style={{ color: section.color }} />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      {sectionLabel}
                    </p>
                  </div>
                  <div
                    className="ml-7 rounded-lg px-3 py-2 text-xs text-gray-700 leading-snug font-mono"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #F3F4F6" }}
                  >
                    {String(value)}
                  </div>
                </motion.div>
              );
            })}

            {/* Confidence */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="pt-2"
            >
              <ConfidenceBar
                value={measure.evidence.confidence}
                label={t.evidence.confidence}
                confidence={t.evidence.confidenceLevel(measure.evidence.confidence)}
              />
              {measure.evidence.confidence_note && (
                <div
                  className="mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{measure.evidence.confidence_note}</span>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
