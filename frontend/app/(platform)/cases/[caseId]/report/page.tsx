"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Lock,
  Unlock,
  Flag,
  BookOpen,
  Loader2,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { FindingCard } from "@/components/report/FindingCard";
import { EvidencePanel } from "@/components/report/EvidencePanel";
import { useT } from "@/lib/i18n";
import { streamCaseReport } from "@/lib/api";
import type { Measure as DemoMeasure } from "@/lib/demo-data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ─── Section-level state types ─── */
interface SectionState {
  locked: boolean;
  editedContent: string | null; // null = not edited, use original
  scopeDrift: boolean;
}

/* ─── Scope Drift keywords (broad coverage, DE + EN) ─── */
const SCOPE_DRIFT_KEYWORDS = [
  "zusätzlich", "optional", "außerplanmäßig", "nicht im auftrag",
  "eigeninitiative", "ergänzend", "erweitert", "über den auftrag hinaus",
  "nicht vereinbart", "nicht beauftragt", "freiwillig", "auf eigene",
  "darüber hinaus", "abweichend vom", "nicht teil des", "sonderuntersuchung",
  "zusatzleistung", "empfehlung des auditors", "exkurs",
  "furthermore", "additionally", "beyond scope", "out of scope",
  "not in scope", "supplementary", "additional scope", "optional recommendation",
  "voluntary", "not commissioned", "digression", "supplemental",
];

/** Check if section body contains scope drift indicators */
function detectScopeDrift(body: string): boolean {
  const text = body.toLowerCase();
  return SCOPE_DRIFT_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

/* ─── Evidence reference pattern (broad: catches most parenthesized refs) ─── */
// Marker words that signal a parenthesized reference (case-insensitive)
const _EV_MARKERS = [
  "Quelle", "Source", "Ref", "Referenz",
  "vgl\\.", "siehe", "s\\.", "gem\\.", "lt\\.", "laut", "gemäß", "nach",
  "cf\\.", "see", "per", "acc\\.",
  "Messung", "Measurement", "Foto", "Photo",
  "Klasse A", "Klasse B", "Class A", "Class B",
  "Zähler", "Meter", "Sensor",
  "DIN", "EN\\s", "ISO", "OSHA", "HACCP", "NFPA", "ASHRAE", "ASTM", "FDA", "VDI",
  "Anlage", "Anhang", "Appendix", "Annex",
  "Tabelle", "Table", "Tab\\.", "Abb\\.", "Abbildung", "Figure", "Fig\\.",
  "Abschnitt", "Section", "Kapitel", "Chapter",
  "Rechnung", "Invoice", "Stromrechnung", "Gasrechnung",
].join("|");

const EVIDENCE_REF_PATTERN = new RegExp(
  "(" +
    "\\[REF:[^\\]]+\\]" +                           // [REF:xxx]
    "|\\[\\d+\\]" +                                  // [1], [2]
    "|\\[Anhang[^\\]]*\\]|\\[Anlage[^\\]]*\\]" +    // [Anhang A]
    "|\\((?=[^)]*(?:" + _EV_MARKERS + "))[^)]{3,}\\)" + // (... marker word ...)
    "|§\\s*\\d+[\\w.]*" +                            // §3.2, § 12
  ")",
  "i"
);

/* ─── Recursively highlight evidence references in React children ─── */
function highlightEvidence(
  children: React.ReactNode,
  handleClick: (ref: string, e: React.MouseEvent<HTMLSpanElement>) => void,
  title: string
): React.ReactNode {
  if (typeof children === "string") {
    const parts = children.split(EVIDENCE_REF_PATTERN);
    if (parts.length <= 1) return children;
    return parts.map((part, i) => {
      if (!part) return null;
      if (EVIDENCE_REF_PATTERN.test(part)) {
        return (
          <span
            key={i}
            className="bg-blue-50 text-blue-700 underline decoration-blue-300 decoration-1 underline-offset-2 cursor-pointer rounded px-0.5 hover:bg-blue-100 transition-colors inline-flex items-center gap-0.5"
            onClick={(e) => handleClick(part, e)}
            title={title}
          >
            <BookOpen size={10} className="inline-block opacity-60" />
            {part}
          </span>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") {
        const result = highlightEvidence(child, handleClick, title);
        return Array.isArray(result)
          ? <React.Fragment key={i}>{result}</React.Fragment>
          : result;
      }
      if (React.isValidElement(child)) {
        return React.cloneElement(
          child as React.ReactElement<Record<string, unknown>>,
          { key: (child as React.ReactElement).key ?? i },
          highlightEvidence(
            (child.props as Record<string, unknown>).children as React.ReactNode,
            handleClick,
            title
          )
        );
      }
      return child;
    });
  }
  if (React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      {},
      highlightEvidence(
        (children.props as Record<string, unknown>).children as React.ReactNode,
        handleClick,
        title
      )
    );
  }
  return children;
}

/* ─── Split markdown into sections by headings ─── */
// Matches #, ##, or ### headings that start with a section number (e.g. "## 3. Ist-Zustand")
// Also matches any ##-level heading as fallback. This handles AI using #/##/### inconsistently.
const SECTION_HEADING_RE = /^(#{1,3})\s+(.+)$/;

function splitIntoSections(md: string): { heading: string; body: string }[] {
  const lines = md.split("\n");
  const sections: { heading: string; body: string }[] = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const m = line.match(SECTION_HEADING_RE);
    // Accept any markdown heading that either: (a) starts with a number like "3. ...",
    // or (b) is an h2 heading (##). This catches #/##/### with numbered sections.
    if (m && (/^\d+\./.test(m[2].trim()) || m[1] === "##")) {
      if (currentHeading || currentBody.length > 0) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join("\n"),
        });
      }
      currentHeading = m[2].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentHeading || currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join("\n") });
  }
  return sections;
}

/* ─── Count how many section headings exist in text so far ─── */
function countHeadings(text: string): number {
  // Count lines matching #{1,3} followed by a numbered section (e.g. "## 3. ...")
  return (text.match(/^#{1,3}\s+\d+\./gm) || []).length;
}

/* ─── Map chart IDs to EN 16247-1 section NUMBERS (from heading text) ─── */
// Matches by the leading number in "## 3. Ist-Zustand", not by array index.
// This avoids index-shift when AI generates preamble before the first heading.
const CHART_SECTION_NUMBER: Record<string, number> = {
  energy: 3,    // "3. Ist-Zustand und Energiedatenanalyse"
  donut: 3,     // same section — energy structure breakdown
  benchmark: 5, // "5. Bewertung und Priorisierung"
  co2: 5,       // same section — emissions assessment
  roi: 6,       // "6. Wirtschaftlichkeitsberechnung"
  savings: 4,   // "4. Maßnahmenvorschläge"
};

/** Extract leading number from heading text, e.g. "3. Ist-Zustand" → 3 */
function extractSectionNumber(heading: string): number | null {
  const m = heading.match(/^(\d+)\./);
  return m ? parseInt(m[1], 10) : null;
}

function findChartsForSection(heading: string, charts: { id: string; dataUrl: string; title: string }[]): { id: string; dataUrl: string; title: string }[] {
  const num = extractSectionNumber(heading);
  if (num === null) return [];
  return charts.filter(c => CHART_SECTION_NUMBER[c.id] === num);
}

export default function ReportPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;
  const router = useRouter();
  const { t, locale } = useT();

  const [fullText, setFullText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const [measures, setMeasures] = useState<DemoMeasure[]>([]);
  const [selectedMeasure, setSelectedMeasure] = useState<DemoMeasure | null>(
    null
  );
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Task 2: Draft lock state
  const [draftLocked, setDraftLocked] = useState(false);

  // Task 3+4: Per-section lock & edit states
  const [sectionStates, setSectionStates] = useState<
    Record<number, SectionState>
  >({});
  const [editingSection, setEditingSection] = useState<number | null>(null);

  // Task 5: Scope drift detected
  const [scopeDriftDetected, setScopeDriftDetected] = useState(false);

  // Embedded charts from Analytics "Export to Report"
  const [embeddedCharts, setEmbeddedCharts] = useState<
    { id: string; dataUrl: string; title: string }[]
  >([]);

  // Two-step verification states
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyStepIndex, setVerifyStepIndex] = useState(-1);
  const [genPhase, setGenPhase] = useState(0);

  const fullTextRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Task 1: streaming section progress
  const [streamingSectionCount, setStreamingSectionCount] = useState(0);
  const estimatedTotalSections = 8; // EN 16247-1 typically has ~8 main sections

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

  // Task 1: Track section count during streaming
  useEffect(() => {
    if (isStreaming) {
      setStreamingSectionCount(countHeadings(fullText));
    }
  }, [fullText, isStreaming]);

  // Generation phase cycling (progress messages)
  useEffect(() => {
    if (!isStreaming) { setGenPhase(0); return; }
    setGenPhase(0);
    const id = setInterval(() => setGenPhase(p => Math.min(p + 1, 4)), 3500);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Task 5: Detect scope drift after generation completes
  useEffect(() => {
    if (streamDone && fullText) {
      const sections = splitIntoSections(displayText);
      const newStates: Record<number, SectionState> = {};
      let driftFound = false;

      sections.forEach((sec, idx) => {
        const hasDrift = detectScopeDrift(sec.body);
        if (hasDrift) driftFound = true;
        newStates[idx] = {
          locked: sectionStates[idx]?.locked ?? false,
          editedContent: sectionStates[idx]?.editedContent ?? null,
          scopeDrift: hasDrift,
        };
      });

      setSectionStates(newStates);
      setScopeDriftDetected(driftFound);
    }
  }, [streamDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load embedded charts from sessionStorage (set by Analytics "Export to Report")
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`auditOS-report-charts-${caseId}`);
      if (stored) {
        setEmbeddedCharts(JSON.parse(stored));
      }
    } catch {}
  }, [caseId, streamDone]);

  // Restore report from sessionStorage on mount (persists across tab switches)
  useEffect(() => {
    if (fullText || isStreaming) return; // Don't overwrite active state
    try {
      const savedReport = sessionStorage.getItem(`auditOS-report-${caseId}`);
      if (savedReport) {
        const cleaned = savedReport.replace(
          /\[EVIDENCE_START\][\s\S]*?\[EVIDENCE_END\]/g,
          ""
        );
        // Only restore if there's actual content
        if (cleaned.trim()) {
          setFullText(savedReport);
          fullTextRef.current = savedReport;
          setStreamDone(true);
          setVerified(true); // Restored reports are pre-verified
          // Extract measures from evidence blocks
          const regex = /\[EVIDENCE_START\]([\s\S]*?)\[EVIDENCE_END\]/g;
          let match;
          const extracted: DemoMeasure[] = [];
          while ((match = regex.exec(savedReport)) !== null) {
            try {
              extracted.push(JSON.parse(match[1].trim()));
            } catch {}
          }
          if (extracted.length > 0) setMeasures(extracted);
        }
      }
    } catch {}
  }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setIsStreaming(true);
    setStreamDone(false);
    setFullText("");
    setMeasures([]);
    setSelectedMeasure(null);
    setEvidencePanelOpen(false);
    setError(null);
    setDraftLocked(false);
    setSectionStates({});
    setEditingSection(null);
    setScopeDriftDetected(false);
    setStreamingSectionCount(0);
    setVerified(false);
    setVerifying(false);
    setVerifyStepIndex(-1);
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
            sessionStorage.setItem(
              `auditOS-report-${caseId}`,
              fullTextRef.current
            );
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

  // Two-step verification handler
  const handleVerify = async () => {
    setVerifying(true);
    const steps = (t.report as any).verifySteps as string[];
    const delays = [900, 1100, 900, 900];
    for (let i = 0; i < steps.length; i++) {
      setVerifyStepIndex(i);
      await new Promise(r => setTimeout(r, delays[i]));
    }
    setVerifyStepIndex(steps.length);
    await new Promise(r => setTimeout(r, 500));
    setVerified(true);
    setVerifying(false);
    setVerifyStepIndex(-1);
  };

  // Filter out evidence blocks from display text
  const displayText = fullText.replace(
    /\[EVIDENCE_START\][\s\S]*?\[EVIDENCE_END\]/g,
    ""
  );
  const showMeasures = isStreaming || streamDone;

  // Split into sections for per-section features (Tasks 3,4,5)
  const sections = useMemo(
    () => (streamDone ? splitIntoSections(displayText) : []),
    [streamDone, displayText]
  );

  // Task 3: Toggle section lock
  const toggleSectionLock = (idx: number) => {
    if (draftLocked) return; // Can't change section locks when whole draft is locked
    setSectionStates((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        locked: !prev[idx]?.locked,
        editedContent: prev[idx]?.editedContent ?? null,
        scopeDrift: prev[idx]?.scopeDrift ?? false,
      },
    }));
    // If unlocking, also stop editing
    if (sectionStates[idx]?.locked === false) {
      setEditingSection(null);
    }
  };

  // Task 4: Handle section edit
  const handleSectionEdit = (idx: number, newContent: string) => {
    setSectionStates((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        editedContent: newContent,
        locked: prev[idx]?.locked ?? false,
        scopeDrift: prev[idx]?.scopeDrift ?? false,
      },
    }));
  };

  // Task 6: Handle evidence ref click — navigate to Evidence Ledger
  const handleEvidenceClick = (
    refText: string,
    e: React.MouseEvent<HTMLSpanElement>
  ) => {
    e.stopPropagation();
    // Navigate to Evidence Ledger with search pre-filled
    router.push(`/cases/${caseId}/evidence?search=${encodeURIComponent(refText)}`);
  };

  // Custom markdown components with evidence highlighting (Task 6)
  const createMdComponents = (
    _sectionIdx?: number
  ): React.ComponentProps<typeof ReactMarkdown>["components"] => ({
    h1: ({ node: _n, ...props }) => (
      <h1
        className="text-lg font-bold text-gray-900 mt-7 mb-3 first:mt-0"
        {...props}
      />
    ),
    h2: ({ node: _n, ...props }) => (
      <h2
        className="text-sm font-bold text-gray-800 mt-6 mb-2 pb-1.5 border-b border-gray-100"
        {...props}
      />
    ),
    h3: ({ node: _n, ...props }) => (
      <h3
        className="text-sm font-semibold text-gray-700 mt-4 mb-1.5"
        {...props}
      />
    ),
    p: ({ node: _n, children, ...props }) => (
      <p className="text-sm text-gray-700 leading-relaxed mb-3" {...props}>
        {verified ? highlightEvidence(children, handleEvidenceClick, t.report.evidenceRef) : children}
      </p>
    ),
    ul: ({ node: _n, ...props }) => (
      <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />
    ),
    ol: ({ node: _n, ...props }) => (
      <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />
    ),
    li: ({ node: _n, children, ...props }) => (
      <li className="text-sm text-gray-700 leading-relaxed" {...props}>
        {verified ? highlightEvidence(children, handleEvidenceClick, t.report.evidenceRef) : children}
      </li>
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
      <blockquote
        className="border-l-4 border-amber-300 pl-4 py-1 my-3 bg-amber-50 rounded-r-lg"
        {...props}
      />
    ),
    code: ({ node: _n, inline, ...props }: any) =>
      inline ? (
        <code
          className="bg-gray-100 text-amber-700 px-1 py-0.5 rounded text-xs font-mono"
          {...props}
        />
      ) : (
        <code
          className="block bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto my-3"
          {...props}
        />
      ),
    table: ({ node: _n, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full text-xs border-collapse" {...props} />
      </div>
    ),
    th: ({ node: _n, ...props }) => (
      <th
        className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-left font-semibold text-gray-700"
        {...props}
      />
    ),
    td: ({ node: _n, ...props }) => (
      <td className="border border-gray-200 px-3 py-1.5 text-gray-600" {...props} />
    ),
  });

  // Memoize the non-section md components (used during streaming)
  const streamingMdComponents = useMemo(() => createMdComponents(), []);

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
                  <p
                    className="text-base font-semibold"
                    style={{ color: "#0F1117" }}
                  >
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
                  <h2
                    className="text-sm font-bold"
                    style={{ color: "#0F1117" }}
                  >
                    {t.streaming.reportTitle}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                    {t.streaming.reportSubtitle}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Task 1: Streaming progress indicator */}
                  {isStreaming && (
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center gap-2 text-sm"
                        style={{ color: "#6B7280" }}
                      >
                        <Loader2
                          size={14}
                          className="animate-spin"
                          style={{ color: "#D97706" }}
                        />
                        <span className="font-medium">{((t.report as any).genSteps as string[])[genPhase] ?? t.report.generating}</span>
                      </div>
                      {streamingSectionCount > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full animate-pulse"
                          style={{
                            backgroundColor: "#FEF3C7",
                            color: "#D97706",
                          }}
                        >
                          {t.report.generatingSection(
                            streamingSectionCount,
                            estimatedTotalSections
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Verification progress */}
                  {verifying && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#1D4ED8" }}>
                      <Loader2 size={13} className="animate-spin" style={{ color: "#3B82F6" }} />
                      <span className="font-medium">{((t.report as any).verifySteps as string[])[verifyStepIndex] ?? ""}</span>
                    </div>
                  )}

                  {/* Verify Evidence button */}
                  {streamDone && !verified && !verifying && (
                    <button
                      onClick={handleVerify}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: "#3B82F6" }}
                    >
                      <ShieldCheck size={14} />
                      {(t.report as any).verifyBtn}
                    </button>
                  )}

                  {/* Verified badge */}
                  {verified && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
                      <CheckCircle2 size={13} />
                      {(t.report as any).verifiedLabel}
                    </span>
                  )}

                  {/* Task 2: Lock Draft toggle - show only when done */}
                  {streamDone && (
                    <button
                      onClick={() => setDraftLocked((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                      style={{
                        backgroundColor: draftLocked ? "#FEF3C7" : "white",
                        borderColor: draftLocked ? "#D97706" : "#E5E7EB",
                        color: draftLocked ? "#D97706" : "#6B7280",
                      }}
                      title={
                        draftLocked
                          ? t.report.draftLocked
                          : t.report.draftUnlocked
                      }
                    >
                      {draftLocked ? (
                        <Lock size={13} />
                      ) : (
                        <Unlock size={13} />
                      )}
                      {draftLocked ? t.report.lockDraft : t.report.unlockDraft}
                    </button>
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

              {/* Task 5: Scope Drift banner */}
              <AnimatePresence>
                {scopeDriftDetected && verified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex-shrink-0 px-8 py-2.5 flex items-center gap-2 text-xs font-semibold"
                    style={{
                      backgroundColor: "#FEF2F2",
                      color: "#991B1B",
                      borderBottom: "1px solid #FECACA",
                    }}
                  >
                    <Flag size={13} className="text-red-500 flex-shrink-0" />
                    {t.report.scopeDriftBanner}
                    <span
                      className="ml-auto text-[10px] font-normal px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "#FEE2E2",
                        color: "#DC2626",
                      }}
                    >
                      {
                        Object.values(sectionStates).filter((s) => s.scopeDrift)
                          .length
                      }{" "}
                      {t.report.scopeDriftSections}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task 2: Draft locked overlay indicator */}
              {draftLocked && (
                <div
                  className="flex-shrink-0 px-8 py-1.5 flex items-center gap-2 text-xs"
                  style={{
                    backgroundColor: "#FEF3C7",
                    color: "#92400E",
                    borderBottom: "1px solid #FDE68A",
                  }}
                >
                  <Lock size={11} />
                  {t.report.draftLocked}
                </div>
              )}

              {/* Markdown content */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-8 py-6"
                style={{
                  opacity: draftLocked ? 0.85 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div className="max-w-3xl mx-auto">
                  {/* During streaming: render as one block */}
                  {isStreaming && (
                    <>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={streamingMdComponents}
                      >
                        {displayText}
                      </ReactMarkdown>
                      <span
                        className="inline-block w-2 h-4 animate-pulse ml-1"
                        style={{ backgroundColor: "#D97706" }}
                      />
                    </>
                  )}

                  {/* After streaming done: render section-by-section with controls */}
                  {streamDone &&
                    sections.map((sec, idx) => {
                      const state = sectionStates[idx] ?? {
                        locked: false,
                        editedContent: null,
                        scopeDrift: false,
                      };
                      const isLocked = draftLocked || state.locked;
                      const isEditing =
                        editingSection === idx && !isLocked;
                      const sectionContent =
                        state.editedContent ?? sec.body;
                      const sectionMdComponents = createMdComponents(idx);

                      return (
                        <div
                          key={idx}
                          className="relative group mb-2"
                          style={{
                            borderLeft: state.scopeDrift && verified
                              ? "3px solid #EF4444"
                              : state.locked
                              ? "3px solid #D97706"
                              : "3px solid transparent",
                            paddingLeft: "12px",
                            borderRadius: "4px",
                            backgroundColor: state.scopeDrift && verified
                              ? "#FEF2F220"
                              : state.locked
                              ? "#FEF3C710"
                              : "transparent",
                            transition: "all 0.2s",
                          }}
                        >
                          {/* Section header with controls */}
                          {sec.heading && (
                            <div className="flex items-center gap-2 mt-6 mb-2 pb-1.5 border-b border-gray-100">
                              <h2 className="text-sm font-bold text-gray-800 flex-1">
                                {sec.heading}
                              </h2>

                              {/* Task 5: Scope drift flag */}
                              {state.scopeDrift && verified && (
                                <span
                                  className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: "#FEE2E2",
                                    color: "#DC2626",
                                  }}
                                >
                                  <Flag size={9} />
                                  {t.report.scopeDriftFlag}
                                </span>
                              )}

                              {/* Task 3: Section lock toggle */}
                              {!draftLocked && (
                                <button
                                  onClick={() => toggleSectionLock(idx)}
                                  className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
                                  title={
                                    state.locked
                                      ? t.report.unlockDraft
                                      : t.report.lockDraft
                                  }
                                >
                                  {state.locked ? (
                                    <Lock
                                      size={12}
                                      style={{ color: "#D97706" }}
                                    />
                                  ) : (
                                    <Unlock
                                      size={12}
                                      style={{ color: "#9CA3AF" }}
                                    />
                                  )}
                                </button>
                              )}
                              {draftLocked && (
                                <Lock
                                  size={12}
                                  style={{ color: "#D97706" }}
                                  className="opacity-50"
                                />
                              )}
                            </div>
                          )}

                          {/* Section body */}
                          {isEditing ? (
                            /* Task 4: Editable textarea */
                            <div className="relative">
                              <textarea
                                className="w-full text-sm text-gray-700 leading-relaxed p-3 rounded-lg border resize-y min-h-[100px] font-mono"
                                style={{
                                  borderColor: "#D97706",
                                  backgroundColor: "#FFFBEB",
                                  outline: "none",
                                  minHeight: "120px",
                                }}
                                value={sectionContent}
                                onChange={(e) =>
                                  handleSectionEdit(idx, e.target.value)
                                }
                                onBlur={() => setEditingSection(null)}
                                autoFocus
                              />
                              <span
                                className="absolute top-1 right-2 text-[10px] px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: "#FEF3C7",
                                  color: "#D97706",
                                }}
                              >
                                Markdown
                              </span>
                            </div>
                          ) : (
                            <div
                              className={`relative ${
                                !isLocked
                                  ? "cursor-text hover:bg-amber-50/30 rounded transition-colors"
                                  : ""
                              }`}
                              onClick={() => {
                                if (!isLocked && !draftLocked) {
                                  // Initialize editedContent if first time editing
                                  if (state.editedContent === null) {
                                    handleSectionEdit(idx, sec.body);
                                  }
                                  setEditingSection(idx);
                                }
                              }}
                              title={
                                isLocked
                                  ? t.report.sectionLocked
                                  : t.report.clickToEdit
                              }
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={sectionMdComponents}
                              >
                                {sectionContent}
                              </ReactMarkdown>

                              {/* Task 5: Scope drift underline on flagged sections */}
                              {state.scopeDrift && verified && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-0.5"
                                  style={{
                                    background:
                                      "repeating-linear-gradient(90deg, #EF4444 0px, #EF4444 4px, transparent 4px, transparent 8px)",
                                  }}
                                />
                              )}

                              {/* Task 4: Edit hint on hover */}
                              {!isLocked && !draftLocked && (
                                <span
                                  className="absolute top-1 right-1 text-[10px] text-gray-400 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none"
                                >
                                  {t.report.clickToEdit}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Embedded chart for this section */}
                          {streamDone && embeddedCharts.length > 0 && (() => {
                            const matched = findChartsForSection(sec.heading, embeddedCharts);
                            if (matched.length === 0) return null;
                            return (
                              <div className={`my-3 ${matched.length > 1 ? "grid grid-cols-2 gap-3" : ""}`}>
                                {matched.map(chart => (
                                  <div key={chart.id} className="rounded-lg border border-blue-100 overflow-hidden bg-white">
                                    <img
                                      src={chart.dataUrl}
                                      alt={chart.title}
                                      className="w-full h-auto"
                                    />
                                    <p className="px-3 py-1.5 text-[10px] font-medium text-blue-500 bg-blue-50 border-t border-blue-100">
                                      {chart.title}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}

                  {/* Unmatched embedded charts (section index out of range) */}
                  {streamDone && embeddedCharts.length > 0 && (() => {
                    const matchedIds = new Set<string>();
                    sections.forEach((sec) => {
                      findChartsForSection(sec.heading, embeddedCharts).forEach(c => matchedIds.add(c.id));
                    });
                    const unmatched = embeddedCharts.filter(c => !matchedIds.has(c.id));
                    if (unmatched.length === 0) return null;
                    return (
                      <div className="mt-4 mb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 size={12} style={{ color: "#3B82F6" }} />
                          <span className="text-xs font-semibold text-gray-500">
                            {t.report.embeddedCharts}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {unmatched.map(chart => (
                            <div key={chart.id} className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                              <img src={chart.dataUrl} alt={chart.title} className="w-full h-auto" />
                              <p className="px-3 py-1.5 text-[10px] font-medium text-gray-500 bg-gray-50 border-t border-gray-100">
                                {chart.title}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pre-verify: report generated, prompt to verify */}
                  {streamDone && !verified && !verifying && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-5 rounded-xl border text-sm"
                      style={{ borderColor: "#FDE68A", backgroundColor: "#FFFBEB" }}
                    >
                      <p className="text-amber-800 font-semibold">
                        {(t.report as any).reportGenerated}
                      </p>
                      <p className="text-amber-700 mt-1 text-xs">
                        {(t.report as any).reportGeneratedNote}
                      </p>
                      <button
                        onClick={handleVerify}
                        className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#3B82F6" }}
                      >
                        <ShieldCheck size={15} />
                        {(t.report as any).verifyBtn}
                      </button>
                    </motion.div>
                  )}

                  {/* Verification in progress: stepper */}
                  {streamDone && verifying && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-5 rounded-xl border"
                      style={{ borderColor: "#93C5FD", backgroundColor: "#EFF6FF" }}
                    >
                      <div className="space-y-2.5">
                        {((t.report as any).verifySteps as string[]).map((step: string, i: number) => (
                          <div key={i} className="flex items-center gap-2.5 text-sm">
                            {i < verifyStepIndex ? (
                              <CheckCircle2 size={15} style={{ color: "#3B82F6" }} />
                            ) : i === verifyStepIndex ? (
                              <Loader2 size={15} className="animate-spin" style={{ color: "#3B82F6" }} />
                            ) : (
                              <div className="w-[15px] h-[15px] rounded-full border-2" style={{ borderColor: "#CBD5E1" }} />
                            )}
                            <span style={{ color: i <= verifyStepIndex ? "#1E40AF" : "#94A3B8", fontWeight: i <= verifyStepIndex ? 500 : 400 }}>
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#BFDBFE" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: "#3B82F6" }}
                          initial={{ width: "0%" }}
                          animate={{ width: `${Math.min(((verifyStepIndex + 1) / ((t.report as any).verifySteps as string[]).length) * 100, 100)}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Post-verify: verification complete */}
                  {streamDone && verified && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-xl border text-sm"
                      style={{ borderColor: "#86EFAC", backgroundColor: "#DCFCE7" }}
                    >
                      <p className="text-green-800 font-semibold">
                        {t.streaming.doneTitle}
                      </p>
                      <p className="text-green-700 mt-1">
                        {t.streaming.doneNote}
                      </p>
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
              style={{
                backgroundColor: "#FEF2F2",
                color: "#991B1B",
                borderLeft: "4px solid #EF4444",
              }}
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
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#6B7280" }}
                  >
                    {t.report.measuresLabel}
                  </p>
                  {streamDone && measures.length > 0 && (
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      {t.report.totalSavings}{" "}
                      <strong style={{ color: "#0F1117" }}>
                        {"\u20AC"}
                        {measures
                          .reduce((s, m) => s + m.annual_saving_eur, 0)
                          .toLocaleString(locale === "de" ? "de-DE" : "en-US")}
                        {t.finding.perYear}
                      </strong>
                    </p>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {measures.map((m) => (
                    <div key={m.measure_id} className="flex-shrink-0 w-72">
                      <FindingCard
                        measure={m}
                        isSelected={
                          selectedMeasure?.measure_id === m.measure_id &&
                          evidencePanelOpen
                        }
                        onClick={() => handleSelectMeasure(m)}
                      />
                    </div>
                  ))}
                  {isStreaming && measures.length === 0 && (
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: "#6B7280" }}
                    >
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: "#D97706" }}
                      />
                      {t.report.extractingMeasures}
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
