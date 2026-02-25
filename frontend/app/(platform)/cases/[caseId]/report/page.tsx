"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, FileText } from "lucide-react";
import { FindingCard } from "@/components/report/FindingCard";
import { EvidencePanel } from "@/components/report/EvidencePanel";
import { useT } from "@/lib/i18n";
import { streamCaseReport } from "@/lib/api";
import type { Measure as DemoMeasure } from "@/lib/demo-data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Custom markdown components matching StreamingText styling
const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ node: _n, ...props }) => (
    <h1 className="text-lg font-bold text-gray-900 mt-7 mb-3 first:mt-0" {...props} />
  ),
  h2: ({ node: _n, ...props }) => (
    <h2 className="text-sm font-bold text-gray-800 mt-6 mb-2 pb-1.5 border-b border-gray-100" {...props} />
  ),
  h3: ({ node: _n, ...props }) => (
    <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-1.5" {...props} />
  ),
  p: ({ node: _n, ...props }) => (
    <p className="text-sm text-gray-700 leading-relaxed mb-3" {...props} />
  ),
  ul: ({ node: _n, ...props }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />
  ),
  ol: ({ node: _n, ...props }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />
  ),
  li: ({ node: _n, ...props }) => (
    <li className="text-sm text-gray-700 leading-relaxed" {...props} />
  ),
  strong: ({ node: _n, ...props }) => (
    <strong className="font-semibold text-gray-900" {...props} />
  ),
  em: ({ node: _n, ...props }) => (
    <em className="italic text-gray-600" {...props} />
  ),
  hr: ({ node: _n, ...props }) => (
    <hr className="my-4 border-gray-200" {...props} />
  ),
  blockquote: ({ node: _n, ...props }) => (
    <blockquote className="border-l-4 border-amber-300 pl-4 py-1 my-3 bg-amber-50 rounded-r-lg" {...props} />
  ),
  code: ({ node: _n, inline, ...props }: any) =>
    inline ? (
      <code className="bg-gray-100 text-amber-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
    ) : (
      <code className="block bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto my-3" {...props} />
    ),
  table: ({ node: _n, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-xs border-collapse" {...props} />
    </div>
  ),
  th: ({ node: _n, ...props }) => (
    <th className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-left font-semibold text-gray-700" {...props} />
  ),
  td: ({ node: _n, ...props }) => (
    <td className="border border-gray-200 px-3 py-1.5 text-gray-600" {...props} />
  ),
};

export default function ReportPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;
  const { t, locale } = useT();

  const [fullText, setFullText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const [measures, setMeasures] = useState<DemoMeasure[]>([]);
  const [selectedMeasure, setSelectedMeasure] = useState<DemoMeasure | null>(null);
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullTextRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resize state for bottom panel
  const [bottomHeight, setBottomHeight] = useState(260);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Global mouse handlers for resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const next = Math.max(140, Math.min(520, startHeight.current + delta));
      setBottomHeight(next);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = bottomHeight;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [bottomHeight]
  );

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [fullText, isStreaming]);

  const handleGenerate = async () => {
    setIsStreaming(true);
    setStreamDone(false);
    setFullText("");
    setMeasures([]);
    setSelectedMeasure(null);
    setEvidencePanelOpen(false);
    setError(null);
    fullTextRef.current = "";

    try {
      for await (const payload of streamCaseReport(caseId, locale)) {
        const data = JSON.parse(payload);
        if (data.done) {
          setStreamDone(true);
          setIsStreaming(false);
          // Extract measures from evidence blocks
          const regex = /\[EVIDENCE_START\]([\s\S]*?)\[EVIDENCE_END\]/g;
          let match;
          const extracted: DemoMeasure[] = [];
          while ((match = regex.exec(fullTextRef.current)) !== null) {
            try {
              extracted.push(JSON.parse(match[1].trim()));
            } catch {}
          }
          if (extracted.length > 0) setMeasures(extracted);
          // Save report text for potential export
          try {
            sessionStorage.setItem(`auditOS-report-${caseId}`, fullTextRef.current);
          } catch {}
        } else if (data.text) {
          setFullText((prev) => {
            const next = prev + data.text;
            fullTextRef.current = next;
            return next;
          });
        } else if (data.error) {
          setError(data.error);
          setIsStreaming(false);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIsStreaming(false);
    }
  };

  const handleSelectMeasure = (m: DemoMeasure) => {
    if (selectedMeasure?.measure_id === m.measure_id && evidencePanelOpen) {
      setEvidencePanelOpen(false);
      setTimeout(() => setSelectedMeasure(null), 300);
    } else {
      setSelectedMeasure(m);
      setEvidencePanelOpen(true);
    }
  };

  // Filter out evidence blocks from display text
  const displayText = fullText.replace(/\[EVIDENCE_START\][\s\S]*?\[EVIDENCE_END\]/g, "");
  const showMeasures = isStreaming || streamDone;

  return (
    <div className="h-full flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Report + measures */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Report area */}
          {!isStreaming && !streamDone ? (
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 max-w-sm"
              >
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ backgroundColor: "#FEF3C7" }}
                >
                  <Play size={28} style={{ color: "#D97706" }} />
                </div>
                <div>
                  <p className="text-base font-semibold" style={{ color: "#0F1117" }}>
                    {t.report.readyTitle}
                  </p>
                  <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                    Ada AI {t.report.readyDesc}
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#D97706" }}
                >
                  {t.report.generateCta}
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Streaming header bar */}
              <div className="flex-shrink-0 px-8 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: "#0F1117" }}>
                    {t.streaming.reportTitle}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                    {t.streaming.reportSubtitle}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isStreaming && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "#6B7280" }}>
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#D97706" }} />
                      {t.report.generating}
                    </div>
                  )}
                  {!isStreaming && !streamDone && (
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "#D97706" }}
                    >
                      <Play size={15} />
                      {t.report.generateBtn}
                    </button>
                  )}
                </div>
              </div>

              {/* Markdown content */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
                <div className="max-w-3xl mx-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {displayText}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 animate-pulse ml-1" style={{ backgroundColor: "#D97706" }} />
                  )}
                  {streamDone && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-xl border text-sm"
                      style={{ borderColor: "#86EFAC", backgroundColor: "#DCFCE7" }}
                    >
                      <p className="text-green-800 font-semibold">{t.streaming.doneTitle}</p>
                      <p className="text-green-700 mt-1">{t.streaming.doneNote}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Error display */}
          {error && (
            <div
              className="mx-8 mb-4 rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: "#FEF2F2", color: "#991B1B", borderLeft: "4px solid #EF4444" }}
            >
              {error}
            </div>
          )}

          {/* Drag handle */}
          {showMeasures && (
            <div
              className="flex-shrink-0 h-2.5 flex items-center justify-center cursor-ns-resize group bg-transparent hover:bg-amber-50 transition-colors select-none"
              onMouseDown={handleDragStart}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 group-hover:bg-amber-300 transition-colors" />
            </div>
          )}

          {/* Measures panel */}
          <AnimatePresence>
            {showMeasures && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ delay: 0.3 }}
                className="flex-shrink-0 border-t border-gray-100 bg-gray-50/50 px-6 py-4 overflow-hidden"
                style={{ height: bottomHeight }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                    {t.report.measuresLabel}
                  </p>
                  {streamDone && measures.length > 0 && (
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      {t.report.totalSavings}{" "}
                      <strong style={{ color: "#0F1117" }}>
                        {"\u20AC"}
                        {measures.reduce((s, m) => s + m.annual_saving_eur, 0).toLocaleString("de-AT")}/Jahr
                      </strong>
                    </p>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {measures.map((m) => (
                    <div key={m.measure_id} className="flex-shrink-0 w-72">
                      <FindingCard
                        measure={m}
                        isSelected={selectedMeasure?.measure_id === m.measure_id && evidencePanelOpen}
                        onClick={() => handleSelectMeasure(m)}
                      />
                    </div>
                  ))}
                  {isStreaming && measures.length === 0 && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#6B7280" }}>
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#D97706" }} />
                      {locale === "de" ? "Maßnahmen werden extrahiert..." : "Extracting measures..."}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Evidence panel */}
        <AnimatePresence>
          {evidencePanelOpen && selectedMeasure && (
            <EvidencePanel
              measure={selectedMeasure}
              onClose={() => {
                setEvidencePanelOpen(false);
                setTimeout(() => setSelectedMeasure(null), 300);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
