"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchCases, fetchReviewStats } from "@/lib/api";
import { useAppStore } from "@/lib/stores/app-store";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusChip } from "@/components/shared/StatusChip";
import type { Case, ReviewStats } from "@/lib/types";

export default function DashboardPage() {
  const { t } = useT();
  const setActiveCaseId = useAppStore((s: { setActiveCaseId: (id: string | null) => void }) => s.setActiveCaseId);

  const [cases, setCases] = useState<Case[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [casesData, statsData] = await Promise.all([
          fetchCases(),
          fetchReviewStats(),
        ]);
        if (!cancelled) {
          setCases(casesData);
          setReviewStats(statsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Derived KPI values
  const activeCasesCount = cases.filter(
    (c) => !["archived", "submitted"].includes(c.status)
  ).length;
  const pendingReviewsCount = reviewStats?.pending ?? 0;
  const anomalyCount = reviewStats?.by_category?.["anomaly"] ?? 0;
  const avgReadiness =
    cases.length > 0
      ? Math.round(
          cases.reduce((sum, c) => sum + c.progress.data_completeness_pct, 0) /
            cases.length
        )
      : 0;

  // Sort cases by updated_at desc for recent cases table
  const recentCases = [...cases]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 8);

  // Skeleton component
  const SkeletonRow = () => (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded"
            style={{
              backgroundColor: "#E5E7EB",
              width: i === 4 ? "100%" : `${[72, 85, 66, 78, 90, 68][i]}%`,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-4">
          <LayoutDashboard size={24} style={{ color: "#D97706" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#0F1117" }}>
            {t.globalDashboard.title}
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

  return (
    <div className="p-8" style={{ backgroundColor: "#FAFAFA", minHeight: "100%" }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <LayoutDashboard size={24} style={{ color: "#D97706" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#0F1117" }}>
            {t.globalDashboard.title}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          {t.globalDashboard.subtitle}
        </p>
      </motion.div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5"
              style={{
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                borderLeft: "4px solid #E5E7EB",
              }}
            >
              <div
                className="h-3 w-24 rounded mb-3"
                style={{
                  backgroundColor: "#E5E7EB",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                className="h-7 w-16 rounded"
                style={{
                  backgroundColor: "#E5E7EB",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          ))
        ) : (
          <>
            <KPICard
              title={t.globalDashboard.activeCases}
              value={activeCasesCount.toLocaleString("de-AT")}
              unit={t.cases.title}
              icon={FolderOpen}
              accentColor="#D97706"
              delay={0}
            />
            <KPICard
              title={t.globalDashboard.awaitingReview}
              value={pendingReviewsCount.toLocaleString("de-AT")}
              unit={t.review.pendingItems}
              icon={CheckCircle}
              accentColor="#EF4444"
              delay={0.05}
            />
            <KPICard
              title={t.globalDashboard.extractionConflicts}
              value={anomalyCount.toLocaleString("de-AT")}
              unit={t.review.categories.anomaly}
              icon={AlertTriangle}
              accentColor="#F59E0B"
              delay={0.1}
            />
            <KPICard
              title={t.globalDashboard.avgReadiness}
              value={`${avgReadiness}%`}
              unit={t.caseOverview.dataCompleteness}
              icon={BarChart3}
              accentColor="#22C55E"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Recent Cases Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="bg-white rounded-xl"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0F1117" }}>
            {t.globalDashboard.recentCases}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  {t.cases.caseNumber}
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  {t.cases.company}
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  Status
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  {t.cases.auditor}
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  {t.cases.progress}
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  {t.cases.updated}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : recentCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "#6B7280" }}>
                    {t.shared.noData}
                  </td>
                </tr>
              ) : (
                recentCases.map((c, idx) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + idx * 0.03, duration: 0.3 }}
                    className="group cursor-pointer"
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                    }}
                    onClick={() => setActiveCaseId(c.id)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}/overview`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: "#D97706" }}
                        onClick={() => setActiveCaseId(c.id)}
                      >
                        {c.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}/overview`}
                        className="text-sm font-medium"
                        style={{ color: "#0F1117" }}
                        onClick={() => setActiveCaseId(c.id)}
                      >
                        {c.company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={c.status} variant="case" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#6B7280" }}>
                      {c.auditor.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "#F3F4F6", maxWidth: 120 }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${c.progress.data_completeness_pct}%`,
                              backgroundColor:
                                c.progress.data_completeness_pct >= 80
                                  ? "#22C55E"
                                  : c.progress.data_completeness_pct >= 50
                                  ? "#F59E0B"
                                  : "#EF4444",
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums" style={{ color: "#6B7280" }}>
                          {c.progress.data_completeness_pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#6B7280" }}>
                      {new Date(c.updated_at).toLocaleDateString("de-AT")}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="flex items-center gap-3 mt-6"
      >
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "#D97706",
            color: "#FFFFFF",
          }}
        >
          <ArrowRight size={16} />
          {t.globalDashboard.viewAllCases}
        </Link>
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "#FFFFFF",
            color: "#0F1117",
            border: "1px solid #E5E7EB",
          }}
        >
          <Plus size={16} />
          {t.globalDashboard.newCase}
        </Link>
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
