"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle, ExternalLink } from "lucide-react";
import { StatusField, FieldStatus } from "@/components/compliance/StatusField";
import { useT } from "@/lib/i18n";
import { fetchCaseCompliancePrefill } from "@/lib/api";

interface Field {
  section: string;
  key: string;
  label: string;
  value: any;
  unit?: string;
  status: FieldStatus;
  review_note?: string;
}

const SECTIONS = ["§3", "§4", "§5", "§6", "§8", "§9", "§10"];

function SectionNav({
  fields,
  activeSection,
  onSelect,
  t,
}: {
  fields: Field[];
  activeSection: string;
  onSelect: (s: string) => void;
  t: any;
}) {
  const greenCount = fields.filter((f) => f.status === "green").length;
  const total = fields.length;
  const pct = total > 0 ? Math.round((greenCount / total) * 100) : 0;
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="w-52 flex-shrink-0 border-r border-gray-100 bg-white px-4 py-5 space-y-4">
      <div className="flex flex-col items-center gap-2 pb-4 border-b border-gray-100">
        <div className="relative">
          <svg width={64} height={64} className="-rotate-90">
            <circle cx={32} cy={32} r={26} fill="none" stroke="#E4E7EE" strokeWidth={5} />
            <circle
              cx={32}
              cy={32}
              r={26}
              fill="none"
              stroke={pct === 100 ? "#22C55E" : "#F59E0B"}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: "#0F1117" }}>
              {pct}%
            </span>
          </div>
        </div>
        <p className="text-xs text-center" style={{ color: "#6B7280" }}>
          {greenCount}/{total} {t.compliance.fieldsConfirmed}
        </p>
      </div>

      <div className="space-y-1 text-xs" style={{ color: "#6B7280" }}>
        {[
          { color: "#22C55E", label: t.compliance.legend.green },
          { color: "#F59E0B", label: t.compliance.legend.yellow },
          { color: "#EF4444", label: t.compliance.legend.red },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="space-y-0.5 pt-2 border-t border-gray-100">
        {SECTIONS.map((s) => {
          const sFields = fields.filter((f) => f.section === s);
          if (sFields.length === 0) return null;
          const hasYellow = sFields.some((f) => f.status === "yellow");
          const hasRed = sFields.some((f) => f.status === "red");
          const dotColor = hasRed ? "#EF4444" : hasYellow ? "#F59E0B" : "#22C55E";
          return (
            <button
              key={s}
              onClick={() => onSelect(s)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left"
              style={{
                backgroundColor: activeSection === s ? "#FEF3C7" : "transparent",
                color: activeSection === s ? "#92400E" : "#6B7280",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
              {(t.compliance as any).sectionLabels?.[s] ?? s} ({sFields.length})
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;
  const { t } = useT();

  const [fields, setFields] = useState<Field[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("§3");
  const [animating, setAnimating] = useState(true);
  const [exportReady, setExportReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch compliance data from API
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;

    fetchCaseCompliancePrefill(caseId)
      .then((data) => {
        if (cancelled) return;
        const mapped: Field[] = data.fields.map((f) => ({
          section: f.section,
          key: f.key,
          label: (t.complianceFields as Record<string, string>)[f.key] ?? f.label,
          value: f.value,
          unit: f.unit,
          status: f.status as FieldStatus,
          review_note: (t.complianceReviewNotes as Record<string, string>)[f.key] ?? f.review_note,
        }));

        // Animate fields appearing
        const greenFields = mapped.filter((f) => f.status === "green");
        const otherFields = mapped.filter((f) => f.status !== "green");
        setFields([]);
        setLoading(false);

        const animate = async () => {
          for (const f of greenFields) {
            await new Promise((r) => setTimeout(r, 120));
            if (cancelled) return;
            setFields((prev) => [...prev, f]);
          }
          for (const f of otherFields) {
            await new Promise((r) => setTimeout(r, 80));
            if (cancelled) return;
            setFields((prev) => [...prev, f]);
          }
          setAnimating(false);
        };
        animate();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load compliance data");
          setLoading(false);
          setAnimating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // Re-apply translated labels when language changes
  useEffect(() => {
    if (animating) return;
    setFields((prev) =>
      prev.map((f) => ({
        ...f,
        label: (t.complianceFields as Record<string, string>)[f.key] ?? f.key,
        review_note: (t.complianceReviewNotes as Record<string, string>)[f.key] ?? f.review_note,
      }))
    );
  }, [t, animating]);

  const handleConfirm = useCallback((key: string) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, status: "green" as FieldStatus } : f))
    );
    setExpandedKey(null);
  }, []);

  useEffect(() => {
    const allGreen = fields.length > 0 && fields.every((f) => f.status === "green");
    setExportReady(allGreen);
  }, [fields]);

  const handleExportCSV = useCallback(() => {
    const rows = [
      ["Abschnitt", "Schlüssel", "Bezeichnung", "Wert", "Einheit", "Status"],
      ...fields.map((f) => [
        f.section,
        f.key,
        f.label,
        Array.isArray(f.value)
          ? `${(f.value as any[]).length} Maßnahmen`
          : f.value === null || f.value === undefined
            ? ""
            : String(f.value),
        f.unit ?? "",
        f.status,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Template-${caseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fields, caseId]);

  const sectionFields = fields.filter((f) => f.section === activeSection);
  const yellowCount = fields.filter((f) => f.status === "yellow").length;

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-8 py-5 border-b border-gray-100 bg-white">
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 flex">
          <div className="w-52 border-r border-gray-100 p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex-1 p-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div
          className="max-w-md rounded-xl p-6 text-center"
          style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "#0F1117" }}>
            {t.compliance.title}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
            {t.compliance.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://www.usp.gv.at/services/mein-usp/EEGxP.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50"
            style={{ color: "#6B7280" }}
          >
            <ExternalLink size={13} />
            {t.compliance.openPortal}
          </a>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50"
            style={{ color: "#0F1117" }}
          >
            <Download size={13} />
            {t.compliance.exportCSV}
          </button>
          <motion.button
            animate={{
              backgroundColor: exportReady ? "#D97706" : "#E5E7EB",
              color: exportReady ? "white" : "#9CA3AF",
            }}
            transition={{ duration: 0.4 }}
            disabled={!exportReady}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ cursor: exportReady ? "pointer" : "not-allowed" }}
          >
            <Download size={15} />
            {exportReady ? t.compliance.exportReady : t.compliance.exportPending(yellowCount)}
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <SectionNav fields={fields} activeSection={activeSection} onSelect={setActiveSection} t={t} />

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "#0F1117" }}>
                {(t.compliance as any).sectionLabels?.[activeSection] ?? activeSection}
              </h2>
              <span className="text-xs" style={{ color: "#6B7280" }}>
                {sectionFields.length} {t.compliance.fields}
              </span>
            </div>

            <AnimatePresence>
              {sectionFields.map((field, i) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: animating ? 0 : i * 0.04 }}
                >
                  <StatusField
                    label={field.label}
                    value={field.value}
                    unit={field.unit}
                    status={field.status}
                    section={field.section}
                    reviewNote={field.review_note}
                    isExpanded={expandedKey === field.key}
                    onExpand={() => setExpandedKey(expandedKey === field.key ? null : field.key)}
                    onConfirm={() => handleConfirm(field.key)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {sectionFields.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: "#6B7280" }}>
                {t.compliance.fields}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export success bar */}
      <AnimatePresence>
        {exportReady && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 border-t border-green-200 bg-green-50 px-8 py-3 flex items-center gap-3"
          >
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm text-green-800">
              <strong>{t.compliance.allConfirmed}</strong> {t.compliance.exportNote}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
