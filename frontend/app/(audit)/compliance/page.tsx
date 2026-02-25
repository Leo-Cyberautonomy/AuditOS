"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusField, FieldStatus } from "@/components/compliance/StatusField";
import { useT } from "@/lib/i18n";
import { loadSessionData, loadMeasures, markWorkflowStep } from "@/lib/workflow-state";
import { DEMO_COMPANY, DEMO_AUDITOR, DEMO_TOTALS } from "@/lib/demo-data";

interface Field {
  section: string;
  key: string;
  label: string;
  value: any;
  unit?: string;
  status: FieldStatus;
  review_note?: string;
}

const SECTIONS = ["§3", "§4", "§5", "§6", "§9", "§10"];

// Raw data only — labels and review notes come from translations
function buildFieldData(
  totals: typeof DEMO_TOTALS,
  measuresCount: number
) {
  const area = DEMO_COMPANY.building_area_m2;
  const co2_strom = Math.round((totals.strom_kwh * 0.132) / 1000 * 10) / 10;
  const co2_gas = Math.round((totals.gas_kwh * 0.201) / 1000 * 10) / 10;
  const specific = Math.round((totals.total_kwh / area) * 10) / 10;

  return [
    { section: "§3",  key: "company_name",          value: DEMO_COMPANY.name,                    unit: undefined, status: "green"  as FieldStatus },
    { section: "§3",  key: "company_address",        value: DEMO_COMPANY.address,                 unit: undefined, status: "green"  as FieldStatus },
    { section: "§3",  key: "nace_code",              value: DEMO_COMPANY.nace_code,               unit: undefined, status: "green"  as FieldStatus },
    { section: "§3",  key: "employees",              value: DEMO_COMPANY.employees,               unit: undefined, status: "green"  as FieldStatus },
    { section: "§4",  key: "electricity_kwh",        value: totals.strom_kwh,                     unit: "kWh/Jahr", status: "green" as FieldStatus },
    { section: "§4",  key: "gas_kwh",                value: totals.gas_kwh,                       unit: "kWh/Jahr", status: "green" as FieldStatus },
    { section: "§4",  key: "fernwaerme_kwh",         value: totals.fernwaerme_kwh,                unit: "kWh/Jahr", status: "green" as FieldStatus },
    { section: "§4",  key: "total_kwh",              value: totals.total_kwh,                     unit: "kWh/Jahr", status: "green" as FieldStatus },
    { section: "§5",  key: "waste_heat_lt40",        value: 18500,                                unit: "kWh/Jahr", status: "yellow" as FieldStatus },
    { section: "§5",  key: "waste_heat_40_100",      value: null,                                 unit: "kWh/Jahr", status: "red"   as FieldStatus },
    { section: "§6",  key: "building_area_m2",       value: area,                                 unit: "m²",       status: "green" as FieldStatus },
    { section: "§6",  key: "specific_energy_kwh_m2", value: specific,                             unit: "kWh/m²·Jahr", status: "green" as FieldStatus },
    { section: "§8",  key: "measures_summary",       value: `${measuresCount} Maßnahmen`,         unit: undefined, status: "yellow" as FieldStatus },
    { section: "§9",  key: "co2_electricity_kg",     value: co2_strom,                            unit: "t CO₂/Jahr", status: "yellow" as FieldStatus },
    { section: "§9",  key: "co2_gas_kg",             value: co2_gas,                              unit: "t CO₂/Jahr", status: "green" as FieldStatus },
    { section: "§10", key: "auditor_name",            value: DEMO_AUDITOR.name,                   unit: undefined, status: "green" as FieldStatus },
    { section: "§10", key: "auditor_reg_number",      value: DEMO_AUDITOR.e_control_id,           unit: undefined, status: "green" as FieldStatus },
    { section: "§10", key: "audit_date",              value: "14.11.2024",                        unit: undefined, status: "green" as FieldStatus },
  ];
}

function SectionNav({ fields, activeSection, onSelect, t }: {
  fields: Field[];
  activeSection: string;
  onSelect: (s: string) => void;
  t: any;
}) {
  const greenCount = fields.filter((f) => f.status === "green").length;
  const total = fields.length;
  const pct = Math.round((greenCount / total) * 100);
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="w-52 flex-shrink-0 border-r border-gray-100 bg-white px-4 py-5 space-y-4">
      <div className="flex flex-col items-center gap-2 pb-4 border-b border-gray-100">
        <div className="relative">
          <svg width={64} height={64} className="-rotate-90">
            <circle cx={32} cy={32} r={26} fill="none" stroke="#E4E7EE" strokeWidth={5} />
            <circle
              cx={32} cy={32} r={26} fill="none"
              stroke={pct === 100 ? "#22C55E" : "#F59E0B"}
              strokeWidth={5} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-900">{pct}%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center">
          {greenCount}/{total} {t.compliance.fieldsConfirmed}
        </p>
      </div>

      <div className="space-y-1 text-xs text-gray-500">
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
              {s} — {sFields.length} {t.compliance.fields}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("§3");
  const [animating, setAnimating] = useState(true);
  const [exportReady, setExportReady] = useState(false);
  const router = useRouter();
  const { t } = useT();

  // Load stored energy data (fall back to DEMO_TOTALS if not available)
  useEffect(() => {
    const session = loadSessionData();
    const storedMeasures = loadMeasures();
    const totals = session?.totals ?? DEMO_TOTALS;
    const measuresCount = storedMeasures?.length ?? 5;
    const rawData = buildFieldData(totals, measuresCount);
    // Re-use the same animate logic as before but with dynamic data
    const greenFields = rawData.filter((f) => f.status === "green");
    const otherFields = rawData.filter((f) => f.status !== "green");
    setFields([]);
    const animate = async () => {
      for (const f of greenFields) {
        await new Promise((r) => setTimeout(r, 150));
        setFields((prev) => [...prev, {
          ...f,
          label: t.complianceFields[f.key] ?? f.key,
          review_note: t.complianceReviewNotes[f.key],
        }]);
      }
      for (const f of otherFields) {
        await new Promise((r) => setTimeout(r, 100));
        setFields((prev) => [...prev, {
          ...f,
          label: t.complianceFields[f.key] ?? f.key,
          review_note: t.complianceReviewNotes[f.key],
        }]);
      }
      setAnimating(false);
    };
    animate();
  }, []);

  // Re-apply translated labels when language changes (without re-animating)
  useEffect(() => {
    if (animating) return;
    setFields((prev) =>
      prev.map((f) => ({
        ...f,
        label: t.complianceFields[f.key] ?? f.key,
        review_note: t.complianceReviewNotes[f.key],
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
    if (allGreen) markWorkflowStep("step3Done");
  }, [fields]);

  const handleExportCSV = useCallback(() => {
    const rows = [
      ["Abschnitt", "Schlüssel", "Bezeichnung", "Wert", "Einheit", "Status"],
      ...fields.map(f => [
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
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "EEff-SKV-Vorbefuellung.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [fields]);

  const sectionFields = fields.filter((f) => f.section === activeSection);
  const yellowCount = fields.filter((f) => f.status === "yellow").length;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
            <span className="text-gray-300">1 {t.steps.upload} ── 2 {t.steps.report} ──</span>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: "#D97706" }}>3</span>
            <span className="font-medium text-gray-700">{t.steps.compliance}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t.compliance.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t.compliance.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/report")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft size={13} />
            {t.compliance.back}
          </button>
          <a
            href="https://www.usp.gv.at/services/mein-usp/EEGxP.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-500"
          >
            <ExternalLink size={13} />
            {t.compliance.openPortal}
          </a>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-600"
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
              <h2 className="text-sm font-bold text-gray-900">{activeSection} {t.compliance.fields}</h2>
              <span className="text-xs text-gray-400">{sectionFields.length} {t.compliance.fields}</span>
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
              <div className="text-center py-12 text-sm text-gray-400">
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
              <strong>{t.compliance.allConfirmed}</strong>{" "}
              {t.compliance.exportNote}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
