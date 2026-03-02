"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Clock,
  Loader2,
  MessageSquare,
  ExternalLink,
  Square,
  CheckSquare,
  UserCheck,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { StatusChip } from "@/components/shared/StatusChip";
import type { ReviewItem, ReviewCategory } from "@/lib/types";

interface ReviewItemCardProps {
  item: ReviewItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onAction: (
    id: string,
    action: "approve" | "reject" | "defer",
    note?: string
  ) => Promise<void>;
  actionLoading: boolean;
}

const categoryColors: Record<
  ReviewCategory,
  { bg: string; text: string }
> = {
  anomaly: { bg: "#FEE2E2", text: "#991B1B" },
  missing_data: { bg: "#DBEAFE", text: "#1E40AF" },
  estimation: { bg: "#FEF9C3", text: "#854D0E" },
  measure: { bg: "#D1FAE5", text: "#065F46" },
  compliance_field: { bg: "#EDE9FE", text: "#6D28D9" },
};

export function ReviewItemCard({
  item,
  selected,
  onToggleSelect,
  onAction,
  actionLoading,
}: ReviewItemCardProps) {
  const { t } = useT();
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [activeAction, setActiveAction] = useState<
    "approve" | "reject" | "defer" | "expert" | null
  >(null);

  const catColor = categoryColors[item.category];
  const catLabel =
    (t.review.categories as Record<string, string>)[item.category] ??
    item.category;

  const handleAction = async (action: "approve" | "reject" | "defer") => {
    setActiveAction(action);
    try {
      await onAction(item.id, action, comment || undefined);
    } finally {
      setActiveAction(null);
    }
  };

  const handleExpertReview = async () => {
    setActiveAction("expert");
    try {
      await onAction(item.id, "defer", "Zur Expertenprüfung markiert");
    } finally {
      setActiveAction(null);
    }
  };

  const isPending = item.status === "pending";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg overflow-hidden"
      style={{
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        border: selected ? "2px solid #D97706" : "1px solid #F3F4F6",
        opacity: isPending ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        {isPending && (
          <button
            onClick={() => onToggleSelect(item.id)}
            className="mt-0.5 shrink-0 transition-colors"
            style={{
              color: selected ? "#D97706" : "#D1D5DB",
            }}
          >
            {selected ? (
              <CheckSquare size={18} />
            ) : (
              <Square size={18} />
            )}
          </button>
        )}
        {!isPending && <div style={{ width: 18 }} />}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: category badge + status */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: catColor.bg,
                color: catColor.text,
              }}
            >
              {catLabel}
            </span>
            {!isPending && (
              <StatusChip status={item.status} variant="review" size="sm" />
            )}
          </div>

          {/* Title */}
          <h3
            className="text-sm font-semibold leading-snug mb-1"
            style={{ color: "#0F1117" }}
          >
            {item.title}
          </h3>

          {/* Description (max 2 lines) */}
          {item.description && (
            <p
              className="text-xs leading-relaxed mb-1.5"
              style={{
                color: "#6B7280",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.description}
            </p>
          )}

          {/* Meta row: entity ref + date */}
          <div className="flex items-center gap-3 flex-wrap">
            {item.related_entity_id && (
              <span
                className="inline-flex items-center gap-1 text-[11px]"
                style={{ color: "#6B7280" }}
              >
                <ExternalLink size={11} />
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 11,
                  }}
                >
                  Verweis: {item.related_entity_id}
                </span>
              </span>
            )}
            <span
              className="text-[11px]"
              style={{ color: "#9CA3AF" }}
            >
              {new Date(item.created_at).toLocaleDateString("de-AT")}
            </span>
            {item.resolved_at && (
              <span
                className="text-[11px]"
                style={{ color: "#9CA3AF" }}
              >
                {new Date(item.resolved_at).toLocaleDateString("de-AT")}
              </span>
            )}
          </div>

          {/* Reviewer note (if already has one) */}
          {item.reviewer_note && (
            <div
              className="mt-2 px-3 py-2 rounded-md text-xs"
              style={{
                backgroundColor: "#F9FAFB",
                color: "#6B7280",
                borderLeft: "3px solid #D1D5DB",
              }}
            >
              {item.reviewer_note}
            </div>
          )}

          {/* Action buttons (only for pending items) */}
          {isPending && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {/* Approve */}
              <button
                onClick={() => handleAction("approve")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: "#D1FAE5",
                  color: "#065F46",
                  opacity: actionLoading ? 0.6 : 1,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {activeAction === "approve" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                {t.review.approve}
              </button>

              {/* Reject */}
              <button
                onClick={() => handleAction("reject")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "#991B1B",
                  opacity: actionLoading ? 0.6 : 1,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {activeAction === "reject" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <X size={13} />
                )}
                {t.review.reject}
              </button>

              {/* Defer */}
              <button
                onClick={() => handleAction("defer")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: "#F3F4F6",
                  color: "#6B7280",
                  opacity: actionLoading ? 0.6 : 1,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {activeAction === "defer" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Clock size={13} />
                )}
                {t.review.defer}
              </button>

              {/* Review by Expert */}
              <button
                onClick={handleExpertReview}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: "#E0E7FF",
                  color: "#3730A3",
                  opacity: actionLoading ? 0.6 : 1,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {activeAction === "expert" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <UserCheck size={13} />
                )}
                Expertenprüfung
              </button>

              {/* Comment toggle */}
              <button
                onClick={() => setCommentOpen(!commentOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: commentOpen ? "#FEF3C7" : "transparent",
                  color: commentOpen ? "#92400E" : "#9CA3AF",
                }}
              >
                <MessageSquare size={13} />
                {t.review.addComment}
              </button>
            </div>
          )}

          {/* Comment input (expandable) */}
          {commentOpen && isPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2"
            >
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.review.addComment}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-xs resize-none focus:outline-none"
                style={{
                  border: "1px solid #D1D5DB",
                  backgroundColor: "#FAFAFA",
                  color: "#0F1117",
                }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
