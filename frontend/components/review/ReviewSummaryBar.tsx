"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, CheckSquare, Upload } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { ReviewStats } from "@/lib/types";

interface ReviewSummaryBarProps {
  stats: ReviewStats;
  selectedCount: number;
  allPendingSelected: boolean;
  onToggleSelectAll: () => void;
  onBatchApprove: () => void;
  batchLoading: boolean;
}

export function ReviewSummaryBar({
  stats,
  selectedCount,
  allPendingSelected,
  onToggleSelectAll,
  onBatchApprove,
  batchLoading,
}: ReviewSummaryBarProps) {
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLabel, setImportLabel] = useState("Importieren");

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLabel("\u2713 Importiert");
    setTimeout(() => setImportLabel("Importieren"), 2000);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const progressPct =
    stats.total > 0
      ? Math.round((stats.approved / stats.total) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl px-6 py-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left: Title + stats */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle size={22} style={{ color: "#D97706" }} />
            <h1
              className="text-xl font-bold"
              style={{ color: "#0F1117" }}
            >
              {t.review.title}
            </h1>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: "#F3F4F6", color: "#374151" }}
            >
              {stats.total} {t.review.totalItems}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: "#FEF9C3", color: "#854D0E" }}
            >
              {stats.pending} {t.review.pendingItems}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{
                width: 100,
                backgroundColor: "#E5E7EB",
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#D97706" }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: "#D97706" }}
            >
              {progressPct}%
            </span>
          </div>
        </div>

        {/* Right: Import + Select all + batch approve */}
        <div className="flex items-center gap-3">
          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: importLabel === "Importieren" ? "#1F2937" : "#065F46",
              color: "#FFFFFF",
            }}
          >
            <Upload size={14} />
            {importLabel}
          </button>

          {/* Master checkbox */}
          <button
            onClick={onToggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: allPendingSelected ? "#FEF3C7" : "#F3F4F6",
              color: allPendingSelected ? "#92400E" : "#6B7280",
            }}
          >
            <CheckSquare size={14} />
            {allPendingSelected ? "Alle abwahlen" : "Alle wahlen"}
          </button>

          {/* Batch approve */}
          <button
            onClick={onBatchApprove}
            disabled={selectedCount === 0 || batchLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor:
                selectedCount > 0 && !batchLoading ? "#D97706" : "#E5E7EB",
              color:
                selectedCount > 0 && !batchLoading ? "#FFFFFF" : "#9CA3AF",
              cursor:
                selectedCount === 0 || batchLoading
                  ? "not-allowed"
                  : "pointer",
              opacity: batchLoading ? 0.7 : 1,
            }}
          >
            {batchLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {t.review.batchApprove}
            {selectedCount > 0 && !batchLoading && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: "rgba(255,255,255,0.25)",
                  color: "#FFFFFF",
                }}
              >
                {selectedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
