"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Download,
  FileSpreadsheet,
  FileText,
  ScrollText,
  Loader2,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchLedger, fetchCaseCompliancePrefill, fetchAuditLog } from "@/lib/api";
import type { LedgerEntry, AuditLogEntry } from "@/lib/types";

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;
  const { t, locale } = useT();

  const [loadingEnergy, setLoadingEnergy] = useState(false);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [doneEnergy, setDoneEnergy] = useState(false);
  const [doneCompliance, setDoneCompliance] = useState(false);
  const [doneReport, setDoneReport] = useState(false);
  const [doneAudit, setDoneAudit] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Export: Energy Data CSV
  const exportEnergyCSV = async () => {
    setLoadingEnergy(true);
    setError(null);
    try {
      const entries = await fetchLedger(caseId);
      const header = "Monat,Energieträger,Wert (kWh),Status,Konfidenz,Quelldokument";
      const rows = entries.map(
        (e) =>
          `"${e.month}","${e.carrier}","${e.value_kwh ?? ""}","${e.status}","${e.confidence ?? ""}","${e.source_doc_id ?? ""}"`
      );
      const csv = [header, ...rows].join("\n");
      downloadCSV(csv, `AuditOS-Energiedaten-${caseId}.csv`);
      setDoneEnergy(true);
      setTimeout(() => setDoneEnergy(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoadingEnergy(false);
    }
  };

  // Export: Template Compliance CSV
  const exportComplianceCSV = async () => {
    setLoadingCompliance(true);
    setError(null);
    try {
      const data = await fetchCaseCompliancePrefill(caseId);
      const header = "Abschnitt,Schlüssel,Bezeichnung,Wert,Einheit,Status";
      const rows = data.fields.map(
        (f) =>
          `"${f.section}","${f.key}","${f.label}","${Array.isArray(f.value) ? JSON.stringify(f.value) : f.value ?? ""}","${f.unit ?? ""}","${f.status}"`
      );
      const csv = [header, ...rows].join("\n");
      downloadCSV(csv, `AuditOS-Template-${caseId}.csv`);
      setDoneCompliance(true);
      setTimeout(() => setDoneCompliance(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoadingCompliance(false);
    }
  };

  // Export: Report Markdown
  const exportReportMD = async () => {
    setLoadingReport(true);
    setError(null);
    try {
      // Try to get report from sessionStorage
      const stored = sessionStorage.getItem(`auditOS-report-${caseId}`);
      if (stored) {
        // Clean evidence blocks from the markdown
        const clean = stored.replace(/\[EVIDENCE_START\][\s\S]*?\[EVIDENCE_END\]/g, "");
        downloadMarkdown(clean, `AuditOS-Bericht-${caseId}.md`);
        setDoneReport(true);
        setTimeout(() => setDoneReport(false), 3000);
      } else {
        setError(
          locale === "de"
            ? "Kein Bericht vorhanden. Bitte zuerst den Bericht im Tab \"Bericht\" generieren."
            : "No report available. Please generate the report in the Report tab first."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoadingReport(false);
    }
  };

  // Export: Audit Log CSV
  const exportAuditCSV = async () => {
    setLoadingAudit(true);
    setError(null);
    try {
      const events = await fetchAuditLog({ case_id: caseId, limit: 200 });
      const header = "Zeitstempel,Aktion,Akteur,Details,Entitätstyp,Entitäts-ID";
      const rows = events.map(
        (e) =>
          `"${e.timestamp}","${e.action}","${e.actor}","${(e.detail ?? "").replace(/"/g, '""')}","${e.entity_type ?? ""}","${e.entity_id ?? ""}"`
      );
      const csv = [header, ...rows].join("\n");
      downloadCSV(csv, `AuditOS-Protokoll-${caseId}.csv`);
      setDoneAudit(true);
      setTimeout(() => setDoneAudit(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoadingAudit(false);
    }
  };

  const exports = [
    {
      id: "energy",
      icon: FileSpreadsheet,
      iconColor: "#22C55E",
      iconBg: "#DCFCE7",
      title: locale === "de" ? "Energiedaten CSV" : "Energy Data CSV",
      description:
        locale === "de"
          ? "Alle Energieverbrauchsdaten aus dem Nachweisbuch als CSV-Datei exportieren. Enthält Monat, Energieträger, Verbrauch, Status und Quelldokument."
          : "Export all energy consumption data from the evidence ledger as CSV. Includes month, carrier, consumption, status, and source document.",
      format: "CSV",
      loading: loadingEnergy,
      done: doneEnergy,
      onExport: exportEnergyCSV,
    },
    {
      id: "compliance",
      icon: FileSpreadsheet,
      iconColor: "#3B82F6",
      iconBg: "#DBEAFE",
      title: locale === "de" ? "Vorlage Vorbefüllung CSV" : "Template Prefill CSV",
      description:
        locale === "de"
          ? "Vorbefüllte Felder gemäß BGBl. II Nr. 242/2023 als CSV exportieren. Zur manuellen Eingabe in die E-Control Meldeplattform."
          : "Export prefilled fields per BGBl. II Nr. 242/2023 as CSV. For manual entry into the E-Control filing platform.",
      format: "CSV",
      loading: loadingCompliance,
      done: doneCompliance,
      onExport: exportComplianceCSV,
    },
    {
      id: "report",
      icon: FileText,
      iconColor: "#D97706",
      iconBg: "#FEF3C7",
      title: locale === "de" ? "Auditbericht Markdown" : "Audit Report Markdown",
      description:
        locale === "de"
          ? "Den generierten EN 16247-1 Auditbericht als Markdown-Datei herunterladen. Hinweis: Der Bericht muss zuerst im Bericht-Tab generiert werden."
          : "Download the generated EN 16247-1 audit report as a Markdown file. Note: The report must be generated first in the Report tab.",
      format: "MD",
      loading: loadingReport,
      done: doneReport,
      onExport: exportReportMD,
    },
    {
      id: "audit",
      icon: ScrollText,
      iconColor: "#8B5CF6",
      iconBg: "#F5F3FF",
      title: locale === "de" ? "Aktivitätsprotokoll CSV" : "Activity Log CSV",
      description:
        locale === "de"
          ? "Vollständiges Aktivitätsprotokoll des Falls als CSV-Datei exportieren. Enthält alle Aktionen, Akteure, Zeitstempel und Entitätsreferenzen."
          : "Export the complete case activity log as CSV. Includes all actions, actors, timestamps, and entity references.",
      format: "CSV",
      loading: loadingAudit,
      done: doneAudit,
      onExport: exportAuditCSV,
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-6"
      >
        <Download size={22} style={{ color: "#D97706" }} />
        <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
          {t.nav.exports}
        </h1>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg px-4 py-3 text-sm mb-6"
          style={{
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            borderLeft: "4px solid #EF4444",
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Export Cards */}
      <div className="grid grid-cols-2 gap-4">
        {exports.map((exp, idx) => {
          const Icon = exp.icon;
          return (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.06, duration: 0.4 }}
              className="bg-white rounded-xl overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
            >
              <div className="p-6">
                {/* Icon + Format badge */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: exp.iconBg }}
                  >
                    <Icon size={22} style={{ color: exp.iconColor }} />
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                  >
                    {exp.format}
                  </span>
                </div>

                {/* Title + Description */}
                <h3 className="text-sm font-semibold mb-1.5" style={{ color: "#0F1117" }}>
                  {exp.title}
                </h3>
                <p className="text-xs leading-relaxed mb-5" style={{ color: "#6B7280" }}>
                  {exp.description}
                </p>

                {/* Download Button */}
                <button
                  onClick={exp.onExport}
                  disabled={exp.loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    backgroundColor: exp.done ? "#DCFCE7" : exp.loading ? "#F3F4F6" : "#D97706",
                    color: exp.done ? "#15803D" : exp.loading ? "#9CA3AF" : "white",
                    cursor: exp.loading ? "not-allowed" : "pointer",
                  }}
                >
                  {exp.loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      {locale === "de" ? "Exportiert..." : "Exporting..."}
                    </>
                  ) : exp.done ? (
                    <>
                      <CheckCircle size={15} />
                      {locale === "de" ? "Heruntergeladen" : "Downloaded"}
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      {locale === "de" ? "Herunterladen" : "Download"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* E-Control Portal Link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-6 bg-white rounded-xl p-5 flex items-center gap-4"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: "4px solid #D97706" }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#FEF3C7" }}
        >
          <ExternalLink size={18} style={{ color: "#D97706" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "#0F1117" }}>
            {locale === "de" ? "E-Control Meldeplattform" : "E-Control Filing Platform"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
            {locale === "de"
              ? "CSV-Dateien können direkt in die E-Control Meldeplattform hochgeladen werden."
              : "CSV files can be uploaded directly to the E-Control filing platform."}
          </p>
        </div>
        <a
          href="https://www.usp.gv.at/services/mein-usp/EEGxP.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#D97706", color: "white" }}
        >
          <ExternalLink size={13} />
          {locale === "de" ? "Zur Plattform" : "Open Platform"}
        </a>
      </motion.div>
    </div>
  );
}
