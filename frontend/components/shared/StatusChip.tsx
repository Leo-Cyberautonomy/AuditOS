"use client";

import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";

interface StatusChipProps {
  status: string;
  variant?: "case" | "entry" | "review" | "priority";
  size?: "sm" | "md";
}

const colorMap: Record<string, Record<string, { bg: string; text: string }>> = {
  case: {
    intake: { bg: "#F3F4F6", text: "#374151" },
    data_preparation: { bg: "#DBEAFE", text: "#1E40AF" },
    analysis: { bg: "#FEF3C7", text: "#92400E" },
    report_draft: { bg: "#EDE9FE", text: "#6D28D9" },
    review: { bg: "#FFEDD5", text: "#C2410C" },
    approved: { bg: "#D1FAE5", text: "#065F46" },
    submitted: { bg: "#CCFBF1", text: "#0F766E" },
    archived: { bg: "#F3F4F6", text: "#6B7280" },
  },
  entry: {
    confirmed: { bg: "#D1FAE5", text: "#065F46" },
    anomaly: { bg: "#FEE2E2", text: "#991B1B" },
    estimated: { bg: "#FEF9C3", text: "#854D0E" },
    missing: { bg: "#F3F4F6", text: "#6B7280" },
  },
  review: {
    pending: { bg: "#FEF9C3", text: "#854D0E" },
    approved: { bg: "#D1FAE5", text: "#065F46" },
    rejected: { bg: "#FEE2E2", text: "#991B1B" },
    deferred: { bg: "#F3F4F6", text: "#6B7280" },
  },
  priority: {
    critical: { bg: "#FEE2E2", text: "#991B1B" },
    high: { bg: "#FFEDD5", text: "#C2410C" },
    medium: { bg: "#FEF9C3", text: "#854D0E" },
    low: { bg: "#D1FAE5", text: "#065F46" },
  },
};

function getTranslatedLabel(
  t: ReturnType<typeof useT>["t"],
  variant: string,
  status: string,
): string {
  if (variant === "case") {
    return (t.shared.caseStatuses as Record<string, string>)[status] ?? status;
  }
  if (variant === "entry") {
    return (t.evidence.statuses as Record<string, string>)[status] ?? status;
  }
  if (variant === "review") {
    return (t.evidence.reviewStatuses as Record<string, string>)[status] ?? status;
  }
  if (variant === "priority") {
    return (t.review.priorities as Record<string, string>)[status] ?? status;
  }
  return status;
}

export function StatusChip({ status, variant = "case", size = "md" }: StatusChipProps) {
  const { t } = useT();
  const colors = colorMap[variant]?.[status] ?? { bg: "#F3F4F6", text: "#374151" };
  const label = getTranslatedLabel(t, variant, status);

  const sizeClasses =
    size === "sm"
      ? "px-2 py-px text-[10px]"
      : "px-2.5 py-0.5 text-xs";

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {label}
    </motion.span>
  );
}
