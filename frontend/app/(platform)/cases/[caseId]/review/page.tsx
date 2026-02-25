"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Archive,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  fetchReviews,
  fetchReviewStats,
  updateReview,
  batchReviewAction,
} from "@/lib/api";
import { ReviewSummaryBar } from "@/components/review/ReviewSummaryBar";
import { ReviewItemCard } from "@/components/review/ReviewItemCard";
import { WarningBanner } from "@/components/shared/WarningBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import type {
  ReviewItem,
  ReviewStats,
  ReviewPriority,
} from "@/lib/types";

// Priority order for grouping
const PRIORITY_ORDER: ReviewPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

// Left-border colors per priority
const priorityBorderColors: Record<ReviewPriority, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#22C55E",
};

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div
      className="bg-white rounded-lg p-4"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-[18px] h-[18px] rounded shrink-0 mt-0.5"
          style={{
            backgroundColor: "#E5E7EB",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="rounded-full"
              style={{
                width: 64,
                height: 18,
                backgroundColor: "#E5E7EB",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <div
            className="rounded mb-2"
            style={{
              width: "70%",
              height: 14,
              backgroundColor: "#E5E7EB",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            className="rounded mb-2"
            style={{
              width: "90%",
              height: 12,
              backgroundColor: "#E5E7EB",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            className="rounded"
            style={{
              width: "50%",
              height: 12,
              backgroundColor: "#E5E7EB",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div className="flex gap-2 mt-3">
            {[72, 64, 80].map((w, i) => (
              <div
                key={i}
                className="rounded-lg"
                style={{
                  width: w,
                  height: 28,
                  backgroundColor: "#E5E7EB",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { t } = useT();
  const params = useParams();
  const caseId = params.caseId as string;

  // --- State ---
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [batchLoading, setBatchLoading] = useState(false);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(
    new Set()
  );
  const [resolvedCollapsed, setResolvedCollapsed] = useState(true);

  // --- Data loading ---
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;

    async function load() {
      try {
        const [reviewItems, reviewStats] = await Promise.all([
          fetchReviews({ case_id: caseId }),
          fetchReviewStats(caseId),
        ]);
        if (!cancelled) {
          setItems(reviewItems);
          setStats(reviewStats);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load review data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // --- Refresh helper ---
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await fetchReviewStats(caseId);
      setStats(newStats);
    } catch {
      // silently fail for stats refresh
    }
  }, [caseId]);

  // --- Derived data ---
  const pendingItems = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items]
  );

  const resolvedItems = useMemo(
    () => items.filter((i) => i.status !== "pending"),
    [items]
  );

  const groupedByPriority = useMemo(() => {
    const groups: Record<ReviewPriority, ReviewItem[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    for (const item of pendingItems) {
      groups[item.priority].push(item);
    }
    return groups;
  }, [pendingItems]);

  const hasCriticalPending = useMemo(
    () => groupedByPriority.critical.length > 0,
    [groupedByPriority]
  );

  const allPendingIds = useMemo(
    () => new Set(pendingItems.map((i) => i.id)),
    [pendingItems]
  );

  const allPendingSelected =
    pendingItems.length > 0 &&
    pendingItems.every((i) => selectedIds.has(i.id));

  // --- Handlers ---
  const toggleSelectAll = useCallback(() => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPendingIds));
    }
  }, [allPendingSelected, allPendingIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAction = useCallback(
    async (
      itemId: string,
      action: "approve" | "reject" | "defer",
      note?: string
    ) => {
      setActionLoading((prev) => ({ ...prev, [itemId]: true }));
      try {
        const statusMap = {
          approve: "approved",
          reject: "rejected",
          defer: "deferred",
        } as const;

        await updateReview(itemId, {
          status: statusMap[action],
          reviewer_note: note,
        });

        // Optimistically update UI: move item to resolved state
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: statusMap[action],
                  reviewer_note: note ?? item.reviewer_note,
                  resolved_at: new Date().toISOString(),
                }
              : item
          )
        );

        // Remove from selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });

        // Refresh stats
        refreshStats();
      } catch {
        // Could show error toast
      } finally {
        setActionLoading((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [refreshStats]
  );

  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await batchReviewAction({
        item_ids: Array.from(selectedIds),
        action: "approve",
      });

      // Optimistically update
      setItems((prev) =>
        prev.map((item) =>
          selectedIds.has(item.id)
            ? {
                ...item,
                status: "approved" as const,
                resolved_at: new Date().toISOString(),
              }
            : item
        )
      );
      setSelectedIds(new Set());

      // Refresh stats
      refreshStats();
    } catch {
      // Could show error toast
    } finally {
      setBatchLoading(false);
    }
  }, [selectedIds, refreshStats]);

  const toggleBucket = useCallback((priority: string) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) next.delete(priority);
      else next.add(priority);
      return next;
    });
  }, []);

  // --- Render ---

  // Loading state
  if (loading) {
    return (
      <div>
        {/* Skeleton summary bar */}
        <div
          className="bg-white rounded-xl px-6 py-5 mb-4"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-6">
            <div
              className="rounded"
              style={{
                width: 200,
                height: 24,
                backgroundColor: "#E5E7EB",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <div className="flex gap-3">
              <div
                className="rounded-full"
                style={{
                  width: 80,
                  height: 26,
                  backgroundColor: "#E5E7EB",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                className="rounded-full"
                style={{
                  width: 80,
                  height: 26,
                  backgroundColor: "#E5E7EB",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Skeleton cards */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <SkeletonCard />
            </motion.div>
          ))}
        </div>

        <style jsx global>{`
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.4;
            }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle size={22} style={{ color: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
            {t.review.title}
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

  // Empty state
  if (items.length === 0) {
    return (
      <div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <CheckCircle size={22} style={{ color: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
            {t.review.title}
          </h1>
        </motion.div>
        <div
          className="bg-white rounded-xl"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
        >
          <EmptyState
            icon={CheckCircle}
            title={t.review.noItems}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Bar */}
      {stats && (
        <div className="mb-4">
          <ReviewSummaryBar
            stats={stats}
            selectedCount={selectedIds.size}
            allPendingSelected={allPendingSelected}
            onToggleSelectAll={toggleSelectAll}
            onBatchApprove={handleBatchApprove}
            batchLoading={batchLoading}
          />
        </div>
      )}

      {/* Warning Banner for critical items */}
      {hasCriticalPending && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-4"
        >
          <WarningBanner variant="error">
            {t.review.blockerWarning}
          </WarningBanner>
        </motion.div>
      )}

      {/* Priority Buckets */}
      <div className="flex flex-col gap-4">
        {PRIORITY_ORDER.map((priority) => {
          const bucketItems = groupedByPriority[priority];
          if (bucketItems.length === 0) return null;

          const isCollapsed = collapsedBuckets.has(priority);
          const borderColor = priorityBorderColors[priority];
          const priorityLabel =
            (t.review.priorities as Record<string, string>)[priority] ??
            priority;

          return (
            <motion.div
              key={priority}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay:
                  0.15 + PRIORITY_ORDER.indexOf(priority) * 0.06,
                duration: 0.4,
              }}
              className="rounded-xl overflow-hidden"
              style={{
                borderLeft: `4px solid ${borderColor}`,
                backgroundColor: "#FFFFFF",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              {/* Bucket Header */}
              <button
                onClick={() => toggleBucket(priority)}
                className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? (
                    <ChevronRight
                      size={16}
                      style={{ color: "#6B7280" }}
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      style={{ color: "#6B7280" }}
                    />
                  )}
                  <span
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ color: "#0F1117" }}
                  >
                    {priorityLabel}
                  </span>
                  <span
                    className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums"
                    style={{
                      backgroundColor: borderColor + "18",
                      color: borderColor,
                      minWidth: 22,
                    }}
                  >
                    {bucketItems.length}
                  </span>
                </div>
              </button>

              {/* Bucket Body */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 pb-4 flex flex-col gap-3"
                      style={{ borderTop: "1px solid #F3F4F6" }}
                    >
                      <div className="pt-3" />
                      <AnimatePresence mode="popLayout">
                        {bucketItems.map((item) => (
                          <ReviewItemCard
                            key={item.id}
                            item={item}
                            selected={selectedIds.has(item.id)}
                            onToggleSelect={toggleSelect}
                            onAction={handleAction}
                            actionLoading={
                              actionLoading[item.id] ?? false
                            }
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Already resolved items */}
      {resolvedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-6 rounded-xl overflow-hidden"
          style={{
            borderLeft: "4px solid #D1D5DB",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {/* Resolved Header */}
          <button
            onClick={() => setResolvedCollapsed((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              {resolvedCollapsed ? (
                <ChevronRight
                  size={16}
                  style={{ color: "#6B7280" }}
                />
              ) : (
                <ChevronDown
                  size={16}
                  style={{ color: "#6B7280" }}
                />
              )}
              <Archive size={15} style={{ color: "#9CA3AF" }} />
              <span
                className="text-sm font-bold uppercase tracking-wide"
                style={{ color: "#6B7280" }}
              >
                {"Bereits gepr\u00FCft"}
              </span>
              <span
                className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums"
                style={{
                  backgroundColor: "#F3F4F6",
                  color: "#6B7280",
                  minWidth: 22,
                }}
              >
                {resolvedItems.length}
              </span>
            </div>
          </button>

          {/* Resolved Body */}
          <AnimatePresence initial={false}>
            {!resolvedCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div
                  className="px-4 pb-4 flex flex-col gap-3"
                  style={{ borderTop: "1px solid #F3F4F6" }}
                >
                  <div className="pt-3" />
                  {resolvedItems.map((item) => (
                    <ReviewItemCard
                      key={item.id}
                      item={item}
                      selected={false}
                      onToggleSelect={() => {}}
                      onAction={handleAction}
                      actionLoading={false}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Global pulse animation for skeletons */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
