"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DropZone } from "@/components/upload/DropZone";
import { ProcessingLog } from "@/components/upload/ProcessingLog";
import { DataQualityCard } from "@/components/upload/DataQualityCard";
import {
  DEMO_ENERGY_DATA,
  DEMO_TOTALS,
  DEMO_PROCESSING_LOG,
  EnergyRow,
  LogEntry,
} from "@/lib/demo-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n";
import { markWorkflowStep, saveSessionData } from "@/lib/workflow-state";

type PageState = "idle" | "processing" | "done";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function UploadPage() {
  const [state, setState] = useState<PageState>("idle");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [energyData, setEnergyData] = useState<EnergyRow[]>(DEMO_ENERGY_DATA);
  const [totals, setTotals] = useState(DEMO_TOTALS);
  const router = useRouter();
  const { t, locale } = useT();
  const fmt = locale === "de" ? "de-DE" : "en-US";

  const STATUS_BADGE: Record<string, { label: string; style: React.CSSProperties }> = {
    confirmed: { label: t.upload.badges.confirmed, style: { backgroundColor: "#DCFCE7", color: "#15803D" } },
    anomaly:   { label: t.upload.badges.anomaly,   style: { backgroundColor: "#FEE2E2", color: "#991B1B" } },
    estimated: { label: t.upload.badges.estimated, style: { backgroundColor: "#FEF3C7", color: "#92400E" } },
    missing:   { label: t.upload.badges.missing,   style: { backgroundColor: "#F3F4F6", color: "#6B7280" } },
  };

  // ─── Demo mode: replay hardcoded log ───────────────────────────────────────
  const runDemoMode = async () => {
    for (const entry of DEMO_PROCESSING_LOG) {
      await new Promise((r) => setTimeout(r, entry.delay_ms));
      setLogEntries((prev) => [...prev, entry]);
    }
    await new Promise((r) => setTimeout(r, 400));
    // Keep DEMO_ENERGY_DATA / DEMO_TOTALS (already defaults)
    saveSessionData(DEMO_ENERGY_DATA, DEMO_TOTALS);
    markWorkflowStep("step1Done");
    setState("done");
  };

  // ─── Real mode: upload files, parse SSE stream ─────────────────────────────
  const runRealMode = async (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/upload/process`, {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      setLogEntries((prev) => [
        ...prev,
        { delay_ms: 0, type: "error", text: `Verbindung zum Backend fehlgeschlagen: ${err}` },
      ]);
      setState("done");
      return;
    }

    if (!response.body) {
      setLogEntries((prev) => [
        ...prev,
        { delay_ms: 0, type: "error", text: "Keine Antwort vom Backend." },
      ]);
      setState("done");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const payload = JSON.parse(line.slice(6));

          if (payload.type === "done") {
            if (payload.result) {
              const r = payload.result;
              const newEnergy = Array.isArray(r.energy_data) && r.energy_data.length > 0
                ? r.energy_data as EnergyRow[]
                : DEMO_ENERGY_DATA;
              const newTotals = r.totals ? { ...DEMO_TOTALS, ...r.totals } : DEMO_TOTALS;
              setEnergyData(newEnergy);
              setTotals(newTotals);
              saveSessionData(newEnergy, newTotals);
            }
            markWorkflowStep("step1Done");
            setState("done");
            return;
          }

          if (payload.type && payload.text) {
            setLogEntries((prev) => [
              ...prev,
              { delay_ms: 0, type: payload.type, text: payload.text },
            ]);
          }
        } catch {
          // malformed SSE line — skip
        }
      }
    }

    setState("done");
  };

  const handleProcess = async (realFiles: File[]) => {
    setState("processing");
    setLogEntries([]);

    if (realFiles.length > 0) {
      await runRealMode(realFiles);
    } else {
      await runDemoMode();
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: "#D97706" }}>1</span>
            <span className="font-medium text-gray-700">{t.steps.upload}</span>
            <span className="text-gray-300">──</span>
            <span>2 {t.steps.report}</span>
            <span className="text-gray-300">──</span>
            <span>3 {t.steps.compliance}</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t.upload.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.upload.subtitle}</p>
      </div>

      {/* Drop zone */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <DropZone onProcess={handleProcess} isProcessing={state === "processing"} />
      </div>

      {/* Processing split view */}
      <AnimatePresence>
        {(state === "processing" || state === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-2 gap-5"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {t.upload.processingLog}
              </p>
              <ProcessingLog entries={logEntries} />
            </div>
            <div className="space-y-5">
              <DataQualityCard visible={state === "done"} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results table */}
      <AnimatePresence>
        {state === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{t.upload.structuredData}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{t.upload.electricityLabel}: <strong className="text-gray-900">
                      {totals.strom_kwh.toLocaleString(fmt)} kWh
                    </strong></span>
                    <span className="text-gray-200">|</span>
                    <span>{t.upload.gasLabel}: <strong className="text-gray-900">
                      {totals.gas_kwh.toLocaleString(fmt)} kWh
                    </strong></span>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/60">
                    <TableHead className="text-xs font-semibold text-gray-500">{t.upload.table.month}</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-right">{t.upload.table.electricity}</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-right">{t.upload.table.gas}</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-right">{t.upload.table.districtHeat}</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">{t.upload.table.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {energyData.map((row, i) => {
                    const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.confirmed;
                    return (
                      <motion.tr
                        key={`${row.month}-${i}`}
                        initial={{ opacity: 0, backgroundColor: "#FEF3C7" }}
                        animate={{ opacity: 1, backgroundColor: "transparent" }}
                        transition={{ delay: i * 0.06, duration: 0.4 }}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <TableCell className="text-sm font-medium text-gray-700">{row.month}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-mono text-gray-700">
                          {row.strom_kwh ? row.strom_kwh.toLocaleString(fmt) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-mono text-gray-700">
                          {row.gas_kwh ? row.gas_kwh.toLocaleString(fmt) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-mono text-gray-400">
                          {row.fernwaerme_kwh ? row.fernwaerme_kwh.toLocaleString(fmt) : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={badge.style}
                          >
                            {badge.label}
                          </span>
                          {(row.anomaly_note || row.missing_note || row.estimated_note) && (
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight max-w-[200px] truncate">
                              {row.anomaly_note || row.missing_note || row.estimated_note}
                            </p>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <motion.button
              onClick={() => router.push("/report")}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all"
              style={{ backgroundColor: "#D97706" }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {t.upload.continueBtn}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
