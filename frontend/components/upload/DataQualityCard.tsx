"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { DEMO_TOTALS } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface DataQualityCardProps {
  visible: boolean;
  totals?: {
    readiness_score: number;
    complete_months: number;
    estimated_months: number;
    missing_months: number;
  };
}

function CircleProgress({ value, size = 72 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference * (1 - value / 100));
    }, 200);
    return () => clearTimeout(timer);
  }, [value, circumference]);

  const color = value >= 80 ? "#22C55E" : value >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E4E7EE" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
    </svg>
  );
}

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <>{value}</>;
}

export function DataQualityCard({ visible, totals }: DataQualityCardProps) {
  const { t } = useT();
  const data = totals ?? DEMO_TOTALS;
  const score = data.readiness_score;
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white rounded-xl border border-gray-100 p-5"
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
        {t.quality.title}
      </p>

      <div className="flex items-center gap-4">
        <div className="relative">
          <CircleProgress value={score} />
          <div
            className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums"
            style={{ color }}
          >
            <AnimatedNumber target={score} />%
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-700">{t.quality.completeMonths(data.complete_months)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
            <span className="text-gray-700">{t.quality.estimatedMonth(data.estimated_months)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-gray-700">{t.quality.missingMonth(data.missing_months)}</span>
          </div>
        </div>
      </div>

      <div
        className="mt-4 rounded-lg px-3 py-2.5 text-xs leading-snug"
        style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
      >
        {t.quality.recommendation}
      </div>
    </motion.div>
  );
}
