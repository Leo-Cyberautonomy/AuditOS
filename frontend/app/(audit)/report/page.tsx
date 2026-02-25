"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronRight } from "lucide-react";
import { StreamingText } from "@/components/report/StreamingText";
import { FindingCard } from "@/components/report/FindingCard";
import { EvidencePanel } from "@/components/report/EvidencePanel";
import { DEMO_MEASURES, Measure } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";
import { markWorkflowStep, saveMeasures, loadMeasures } from "@/lib/workflow-state";

export default function ReportPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<Measure | null>(null);
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);
  const [measures, setMeasures] = useState<Measure[]>(DEMO_MEASURES);

  // Resize state: controls bottom panel (measures) height in px
  const [bottomHeight, setBottomHeight] = useState(260);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const router = useRouter();
  const { t, locale } = useT();

  useEffect(() => {
    const stored = loadMeasures();
    if (stored && stored.length > 0) setMeasures(stored);
  }, []);

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

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = bottomHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [bottomHeight]);

  const handleGenerate = () => {
    setIsStreaming(true);
    setStreamDone(false);
    setSelectedMeasure(null);
    setEvidencePanelOpen(false);
  };

  const handleStreamComplete = (parsedMeasures: any[]) => {
    if (parsedMeasures.length > 0) {
      saveMeasures(parsedMeasures as Measure[]);
      setMeasures(parsedMeasures as Measure[]);
    }
    markWorkflowStep("step2Done");
    setStreamDone(true);
    setIsStreaming(false);
  };

  const handleSelectMeasure = (m: Measure) => {
    if (selectedMeasure?.measure_id === m.measure_id && evidencePanelOpen) {
      setEvidencePanelOpen(false);
      setTimeout(() => setSelectedMeasure(null), 300);
    } else {
      setSelectedMeasure(m);
      setEvidencePanelOpen(true);
    }
  };

  const showMeasures = isStreaming || streamDone;

  return (
    <div className="h-screen flex flex-col">
      {/* Page header */}
      <div className="flex-shrink-0 px-8 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="text-gray-300">1 {t.steps.upload} ──</span>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: "#D97706" }}>2</span>
              <span className="font-medium text-gray-700">{t.steps.report}</span>
              <span className="text-gray-300">──</span>
              <span>3 {t.steps.compliance}</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t.report.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t.report.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {streamDone && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => router.push("/compliance")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "#D97706" }}
            >
              {t.report.continueBtn} <ChevronRight size={15} />
            </motion.button>
          )}
          {!isStreaming && !streamDone && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: "#D97706" }}
            >
              <Play size={15} />
              {t.report.generateBtn}
            </button>
          )}
          {isStreaming && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {t.report.generating}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
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
                  <p className="text-base font-semibold text-gray-800">{t.report.readyTitle}</p>
                  <p className="text-sm text-gray-400 mt-1">{t.report.readyDesc}</p>
                </div>
                <button
                  onClick={handleGenerate}
                  className="px-8 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: "#D97706" }}
                >
                  {t.report.generateCta}
                </button>
              </motion.div>
            </div>
          ) : (
            <StreamingText
              isStreaming={isStreaming}
              onComplete={handleStreamComplete}
              locale={locale}
            />
          )}

          {/* Drag handle — visible when measures panel is shown */}
          {showMeasures && (
            <div
              className="flex-shrink-0 h-2.5 flex items-center justify-center cursor-ns-resize group bg-transparent hover:bg-amber-50 transition-colors select-none"
              onMouseDown={handleDragStart}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 group-hover:bg-amber-300 transition-colors" />
            </div>
          )}

          {/* Measures panel — fixed height, draggable */}
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
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {t.report.measuresLabel}
                  </p>
                  {streamDone && (
                    <p className="text-xs text-gray-400">
                      {t.report.totalSavings} <strong className="text-gray-700">
                        €{measures.reduce((s, m) => s + m.annual_saving_eur, 0).toLocaleString("de-AT")}/Jahr
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
