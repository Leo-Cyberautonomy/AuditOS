"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Building2,
  Upload,
  BarChart3,
  Wrench,
  ClipboardCheck,
  FileStack,
  BookOpen,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchCase, fetchReviews, fetchLedgerSummary } from "@/lib/api";
import { WarningBanner } from "@/components/shared/WarningBanner";
import type { Case, ReviewItem, LedgerTotals, CaseStatus } from "@/lib/types";

const STAGE_ORDER: CaseStatus[] = [
  "intake",
  "data_preparation",
  "analysis",
  "report_draft",
  "review",
  "approved",
  "submitted",
  "archived",
];

export default function OverviewPage() {
  const { t, locale } = useT();
  const fmt = locale === "de" ? "de-DE" : "en-US";
  const params = useParams();
  const caseId = params.caseId as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [criticalItems, setCriticalItems] = useState<ReviewItem[]>([]);
  const [ledgerTotals, setLedgerTotals] = useState<LedgerTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    async function load() {
      try {
        const [cData, reviews, ledger] = await Promise.all([
          fetchCase(caseId),
          fetchReviews({ case_id: caseId, priority: "critical", status: "pending" }),
          fetchLedgerSummary(caseId),
        ]);
        if (!cancelled) {
          setCaseData(cData);
          setCriticalItems(reviews);
          setLedgerTotals(ledger);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load case");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [caseId]);

  // Skeleton block helper
  const Skeleton = ({ w = "100%", h = 16 }: { w?: string | number; h?: number }) => (
    <div
      className="rounded"
      style={{
        backgroundColor: "#E5E7EB",
        width: w,
        height: h,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );

  if (error) {
    return (
      <div className="p-0">
        <div className="flex items-center gap-3 mb-4">
          <FileText size={22} style={{ color: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
            {t.caseOverview.title}
          </h1>
        </div>
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            borderLeft: "4px solid #EF4444",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const currentStageIndex = caseData
    ? STAGE_ORDER.indexOf(caseData.status)
    : -1;

  return (
    <div>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-6"
      >
        <FileText size={22} style={{ color: "#D97706" }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
            {loading ? <Skeleton w={200} h={24} /> : caseData?.company.name}
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            {t.caseOverview.title}
          </p>
        </div>
      </motion.div>

      {/* Company Metadata Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="bg-white rounded-xl p-6 mb-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} style={{ color: "#D97706" }} />
          <h2 className="text-sm font-semibold" style={{ color: "#0F1117" }}>
            {t.caseOverview.companyInfo}
          </h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton w={80} h={12} />
                <Skeleton w={160} h={16} />
              </div>
            ))}
          </div>
        ) : caseData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: t.cases.company, value: caseData.company.name },
              { label: t.caseOverview.address, value: caseData.company.address },
              { label: t.caseOverview.naceCode, value: caseData.company.nace_code },
              { label: t.cases.industry, value: caseData.company.industry },
              {
                label: t.caseOverview.employees,
                value: caseData.company.employees.toLocaleString(fmt),
              },
              {
                label: t.caseOverview.buildingArea,
                value: `${caseData.company.building_area_m2.toLocaleString(fmt)} m\u00B2`,
              },
              {
                label: t.caseOverview.turnover,
                value: caseData.company.annual_turnover_eur
                  ? `\u20AC ${caseData.company.annual_turnover_eur.toLocaleString(fmt)}`
                  : "\u2014",
              },
              {
                label: t.caseOverview.auditYear,
                value: String(caseData.company.audit_year),
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col">
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  {item.label}
                </span>
                <span className="text-sm font-medium" style={{ color: "#0F1117" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </motion.div>

      {/* Status Workflow Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-white rounded-xl p-6 mb-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#0F1117" }}>
          {t.caseOverview.caseStatus}
        </h2>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGE_ORDER.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isFuture = idx > currentStageIndex;

            let bgColor = "#F3F4F6";
            let textColor = "#9CA3AF";
            if (isCompleted) {
              bgColor = "#D1FAE5";
              textColor = "#065F46";
            } else if (isCurrent) {
              bgColor = "#FEF3C7";
              textColor = "#92400E";
            }

            return (
              <div key={stage} className="flex items-center">
                <div
                  className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap"
                  style={{ backgroundColor: bgColor, color: textColor }}
                >
                  {(t.shared.caseStatuses as Record<string, string>)[stage]}
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div
                    className="w-4 h-0.5 mx-0.5"
                    style={{
                      backgroundColor: isCompleted ? "#22C55E" : "#E5E7EB",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Progress Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              >
                <Skeleton w={100} h={12} />
                <div className="mt-2">
                  <Skeleton w={50} h={24} />
                </div>
              </div>
            ))
          : caseData && (
              <>
                <MiniStat
                  icon={Upload}
                  label={t.caseOverview.documentsUploaded}
                  value={caseData.progress.documents_uploaded.toLocaleString(fmt)}
                  color="#3B82F6"
                  delay={0.17}
                />
                <MiniStat
                  icon={BarChart3}
                  label={t.caseOverview.dataCompleteness}
                  value={`${caseData.progress.data_completeness_pct}%`}
                  color="#22C55E"
                  delay={0.19}
                />
                <MiniStat
                  icon={Wrench}
                  label={t.caseOverview.measuresIdentified}
                  value={caseData.progress.measures_identified.toLocaleString(fmt)}
                  color="#8B5CF6"
                  delay={0.21}
                />
                <MiniStat
                  icon={ClipboardCheck}
                  label={t.caseOverview.pendingReviews}
                  value={caseData.progress.review_items_pending.toLocaleString(fmt)}
                  color="#EF4444"
                  delay={0.23}
                />
              </>
            )}
      </motion.div>

      {/* Critical Blockers Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="bg-white rounded-xl p-6 mb-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#0F1117" }}>
          {t.caseOverview.blockers}
        </h2>
        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton w="100%" h={40} />
            <Skeleton w="80%" h={40} />
          </div>
        ) : criticalItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            <WarningBanner variant="error">
              {t.review.blockerWarning}
            </WarningBanner>
            {criticalItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg px-4 py-3"
                style={{
                  backgroundColor: "#FEF2F2",
                  borderLeft: "3px solid #EF4444",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "#991B1B" }}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs mt-1" style={{ color: "#B91C1C" }}>
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "#22C55E" }}>
            {t.caseOverview.noBlockers}
          </p>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#0F1117" }}>
          {t.caseOverview.quickLinks}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: FileStack,
              label: t.nav.documents,
              href: `/cases/${caseId}/documents`,
              color: "#3B82F6",
            },
            {
              icon: BookOpen,
              label: t.nav.evidenceLedger,
              href: `/cases/${caseId}/ledger`,
              color: "#8B5CF6",
            },
            {
              icon: CheckSquare,
              label: t.nav.reviewQueue,
              href: `/cases/${caseId}/reviews`,
              color: "#EF4444",
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-xl p-4 flex items-center gap-3 group transition-all hover:shadow-md"
              style={{
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                borderLeft: `3px solid ${link.color}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: link.color + "14" }}
              >
                <link.icon size={18} style={{ color: link.color }} />
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: "#0F1117" }}>
                {link.label}
              </span>
              <ArrowRight
                size={16}
                style={{ color: "#9CA3AF" }}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Pulse animation for skeletons */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

/* Mini stat box component (used within this page) */
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white rounded-xl p-4"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + "14" }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "#6B7280" }}
        >
          {label}
        </span>
      </div>
      <p className="text-xl font-bold tabular-nums" style={{ color: "#0F1117" }}>
        {value}
      </p>
    </motion.div>
  );
}
