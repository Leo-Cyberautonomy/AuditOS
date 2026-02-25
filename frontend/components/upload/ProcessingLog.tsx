"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogEntry, LogType } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface ProcessingLogProps {
  entries: LogEntry[];
}

function getLogColor(type: LogType): string {
  switch (type) {
    case "ok":    return "#22C55E";
    case "warn":  return "#F59E0B";
    case "error": return "#EF4444";
    default:      return "#9CA3AF";
  }
}

function getLogPrefix(type: LogType): string {
  switch (type) {
    case "ok":    return "✓";
    case "warn":  return "⚠";
    case "error": return "✗";
    default:      return "›";
  }
}

export function ProcessingLog({ entries }: ProcessingLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useT();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div
      className="rounded-xl p-4 font-mono text-xs terminal-scroll overflow-y-auto"
      style={{ backgroundColor: "#0F1117", height: "220px", border: "1px solid #1F2937" }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-gray-600 text-[10px]">{t.processingLogTitle}</span>
      </div>

      <AnimatePresence>
        {entries.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 mb-1 leading-5"
          >
            <span style={{ color: getLogColor(entry.type), flexShrink: 0 }}>
              {getLogPrefix(entry.type)}
            </span>
            <span style={{ color: getLogColor(entry.type) === "#9CA3AF" ? "#6B7280" : getLogColor(entry.type) }}>
              {entry.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {entries.length > 0 && entries[entries.length - 1]?.type !== "ok" && (
        <span className="inline-block w-1.5 h-3 bg-amber-400 opacity-80 animate-pulse ml-1" />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
