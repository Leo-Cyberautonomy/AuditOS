"use client";

import { useEffect, useState } from "react";
import { Upload, Play } from "lucide-react";
import { fetchCase } from "@/lib/api";
import { StatusChip } from "@/components/shared/StatusChip";
import { useT } from "@/lib/i18n";
import type { Case } from "@/lib/types";

interface CaseHeaderProps {
  caseId: string;
}

export function CaseHeader({ caseId }: CaseHeaderProps) {
  const { t, locale } = useT();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCase(caseId)
      .then((data) => {
        if (!cancelled) {
          setCaseData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  /* ─── Loading state ────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      >
        <div className="h-6 w-48 rounded animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
        <div className="h-5 w-24 rounded animate-pulse" style={{ backgroundColor: "#F3F4F6" }} />
      </div>
    );
  }

  /* ─── Error state ──────────────────────────────────────────────────── */

  if (error || !caseData) {
    return (
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      >
        <p className="text-sm" style={{ color: "#0F1117" }}>
          <span className="font-bold">{caseId}</span>
        </p>
        {error && (
          <span className="text-xs" style={{ color: "#DC2626" }}>
            {error}
          </span>
        )}
      </div>
    );
  }

  /* ─── Data loaded ──────────────────────────────────────────────────── */

  const completeness = caseData.progress?.data_completeness_pct ?? 0;

  return (
    <div
      className="px-6 py-4 border-b"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Company name + case ID + status */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: "#0F1117" }}>
              {caseData.company.name}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
              {caseData.id} &middot; {caseData.company.industry}
            </p>
          </div>
          <StatusChip status={caseData.status} variant="case" />
        </div>

        {/* Right: Data completeness + quick actions */}
        <div className="flex items-center gap-4">
          {/* Completeness bar */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: "#6B7280" }}>
              {t.caseOverview?.dataCompleteness ?? "Datenbereitschaft"}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E5E7EB" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${completeness}%`,
                  backgroundColor: completeness >= 80 ? "#22C55E" : completeness >= 50 ? "#D97706" : "#EF4444",
                }}
              />
            </div>
            <span className="text-[11px] font-bold" style={{ color: "#0F1117" }}>
              {completeness}%
            </span>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                backgroundColor: "#FFFFFF",
              }}
            >
              <Upload size={14} />
              {t.documents?.uploadArea ?? "Dokumente hochladen"}
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: "#D97706",
                color: "#FFFFFF",
              }}
            >
              <Play size={14} />
              {locale === "de" ? "Prufung starten" : "Start review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
