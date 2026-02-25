"use client";

import { motion } from "framer-motion";

interface ConfidenceBarProps {
  value: number | null;
  showLabel?: boolean;
}

function getColor(value: number | null): string {
  if (value === null || value === 0) return "#D1D5DB";
  if (value >= 80) return "#22C55E";
  if (value >= 50) return "#D97706";
  return "#EF4444";
}

export function ConfidenceBar({ value, showLabel = false }: ConfidenceBarProps) {
  const color = getColor(value);
  const pct = value ?? 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 48,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#F3F4F6",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: value === null ? "#9CA3AF" : color,
            fontVariantNumeric: "tabular-nums",
            minWidth: 28,
          }}
        >
          {value !== null ? `${value}%` : "\u2013"}
        </span>
      )}
    </div>
  );
}
