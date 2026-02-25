"use client";

import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";

export type FieldStatus = "green" | "yellow" | "red";

interface StatusFieldProps {
  label: string;
  value: string | number | null;
  unit?: string;
  status: FieldStatus;
  section: string;
  reviewNote?: string;
  isExpanded?: boolean;
  onExpand?: () => void;
  onConfirm?: () => void;
  animationDelay?: number;
}

const STATUS_STYLES: Record<FieldStatus, { bg: string; border: string; text: string; icon: typeof CheckCircle }> = {
  green:  { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D", icon: CheckCircle },
  yellow: { bg: "#FFFBEB", border: "#FCD34D", text: "#92400E", icon: AlertCircle },
  red:    { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B", icon: XCircle },
};

function formatValue(value: string | number | null, unit?: string, measuresLabel = "Maßnahmen"): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value.toLocaleString("de-AT") + (unit ? ` ${unit}` : "");
  }
  if (Array.isArray(value)) {
    return `${(value as any[]).length} ${measuresLabel}`;
  }
  return String(value);
}

export function StatusField({
  label, value, unit, status, section,
  reviewNote, isExpanded, onExpand, onConfirm,
  animationDelay = 0,
}: StatusFieldProps) {
  const { t } = useT();
  const styles = STATUS_STYLES[status];
  const Icon = styles.icon;
  const isClickable = status === "yellow" && !!onExpand;

  return (
    <div className="space-y-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: animationDelay }}
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: styles.border }}
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 ${isClickable ? "cursor-pointer" : ""}`}
          style={{ backgroundColor: styles.bg }}
          onClick={isClickable ? onExpand : undefined}
        >
          <Icon size={15} style={{ color: styles.text, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{section} — {label}</p>
            <motion.p
              className="text-sm font-semibold tabular-nums mt-0.5"
              style={{ color: styles.text }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animationDelay + 0.1 }}
            >
              {formatValue(value, unit, t.measures.title)}
            </motion.p>
          </div>
          {status === "yellow" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#FCD34D", color: "#92400E" }}>
              {isExpanded ? t.statusField.reviewOpen : t.statusField.reviewClosed}
            </span>
          )}
          {status === "green" && (
            <span className="text-[10px] text-green-600">✓</span>
          )}
        </div>

        {status === "yellow" && isExpanded && reviewNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t px-4 py-3"
            style={{ borderColor: "#FCD34D", backgroundColor: "#FFFDE7" }}
          >
            <p className="text-xs text-amber-800 leading-snug mb-3">{reviewNote}</p>
            <div className="flex gap-2">
              <button
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                style={{ borderColor: "#FCD34D", color: "#92400E", backgroundColor: "white" }}
              >
                {t.statusField.changeValue}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: "#D97706" }}
              >
                {t.statusField.confirm}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
