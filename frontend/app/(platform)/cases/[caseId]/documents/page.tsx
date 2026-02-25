"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Trash2,
  FileSpreadsheet,
  Image,
  FileBarChart,
  File,
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  fetchDocuments,
  uploadDocuments,
  deleteDocument,
  fetchLedgerSummary,
  streamDocumentProcessing,
} from "@/lib/api";
import { DropZone } from "@/components/upload/DropZone";
import { ProcessingLog } from "@/components/upload/ProcessingLog";
import { EmptyState } from "@/components/shared/EmptyState";
import type { CaseDocument, DocCategory, LedgerTotals } from "@/lib/types";
import type { LogType } from "@/lib/demo-data";

// Color mapping for document category badges
const categoryColors: Record<string, { bg: string; text: string }> = {
  electricity_bill: { bg: "#DBEAFE", text: "#1E40AF" },
  gas_bill: { bg: "#FFEDD5", text: "#C2410C" },
  heat_bill: { bg: "#FEE2E2", text: "#991B1B" },
  excel_data: { bg: "#D1FAE5", text: "#065F46" },
  floor_plan: { bg: "#EDE9FE", text: "#6D28D9" },
  equipment_list: { bg: "#FEF9C3", text: "#854D0E" },
  measurement_protocol: { bg: "#CCFBF1", text: "#0F766E" },
  photo: { bg: "#FCE7F3", text: "#9D174D" },
  other: { bg: "#F3F4F6", text: "#374151" },
};

// Status color mapping for document processing status
const docStatusMap: Record<string, { bg: string; text: string; pulse?: boolean }> = {
  uploaded: { bg: "#F3F4F6", text: "#6B7280" },
  processing: { bg: "#DBEAFE", text: "#1E40AF", pulse: true },
  extracted: { bg: "#D1FAE5", text: "#065F46" },
  error: { bg: "#FEE2E2", text: "#991B1B" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { t } = useT();
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;

  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [totals, setTotals] = useState<LedgerTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [logEntries, setLogEntries] = useState<{ delay_ms: number; type: LogType; text: string }[]>([]);

  // Initial data load
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    async function load() {
      try {
        const [docs, summary] = await Promise.all([
          fetchDocuments(caseId),
          fetchLedgerSummary(caseId).catch(() => null),
        ]);
        if (!cancelled) {
          setDocuments(docs);
          setTotals(summary);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load documents");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const handleDelete = async (docId: string) => {
    setDeleting(docId);
    try {
      await deleteDocument(caseId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      // Silently fail
    } finally {
      setDeleting(null);
    }
  };

  // Handle upload + processing
  const handleProcess = async (files: File[]) => {
    setProcessing(true);
    setLogEntries([]);

    try {
      // Upload files if real files provided
      if (files.length > 0) {
        setLogEntries((prev) => [
          ...prev,
          { delay_ms: 0, type: "info" as LogType, text: `Lade ${files.length} Dateien hoch...` },
        ]);
        await uploadDocuments(caseId, files);
        setLogEntries((prev) => [
          ...prev,
          { delay_ms: 0, type: "ok" as LogType, text: `${files.length} Dateien erfolgreich hochgeladen` },
        ]);
      }

      // Start SSE processing stream
      for await (const event of streamDocumentProcessing(caseId)) {
        if (event.type === "done") {
          setProcessing(false);
          // Refresh documents and totals
          const [docs, summary] = await Promise.all([
            fetchDocuments(caseId),
            fetchLedgerSummary(caseId).catch(() => null),
          ]);
          setDocuments(docs);
          setTotals(summary);
        } else {
          setLogEntries((prev) => [...prev, { delay_ms: 0, type: event.type as LogType, text: event.text }]);
        }
      }
    } catch (e) {
      setLogEntries((prev) => [...prev, { delay_ms: 0, type: "error" as LogType, text: String(e) }]);
      setProcessing(false);
    }
  };

  const sortedDocs = [...documents].sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );

  const Skeleton = ({ w = "100%", h = 16 }: { w?: string | number; h?: number }) => (
    <div
      className="rounded animate-pulse"
      style={{ backgroundColor: "#E5E7EB", width: w, height: h }}
    />
  );

  const SkeletonRow = () => (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton w={`${50 + Math.random() * 50}%`} h={16} />
        </td>
      ))}
    </tr>
  );

  return (
    <div>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-6"
      >
        <Upload size={22} style={{ color: "#D97706" }} />
        <h1 className="text-xl font-bold" style={{ color: "#0F1117" }}>
          {t.documents.title}
        </h1>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="bg-white rounded-xl p-6 mb-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#0F1117" }}>
          {t.documents.uploadArea}
        </h2>
        <DropZone onProcess={handleProcess} isProcessing={processing} />
      </motion.div>

      {/* Processing Log */}
      <AnimatePresence>
        {(processing || logEntries.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <ProcessingLog entries={logEntries} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-6"
          style={{
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            borderLeft: "4px solid #EF4444",
          }}
        >
          {error}
        </div>
      )}

      {/* Data Quality Card */}
      {totals && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white rounded-xl p-5 mb-6"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} style={{ color: "#D97706" }} />
            <h2 className="text-sm font-semibold" style={{ color: "#0F1117" }}>
              {t.quality.title}
            </h2>
            <span
              className="ml-auto text-lg font-bold tabular-nums"
              style={{ color: totals.readiness_score >= 80 ? "#22C55E" : totals.readiness_score >= 50 ? "#F59E0B" : "#EF4444" }}
            >
              {totals.readiness_score}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: "#F3F4F6" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totals.readiness_score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                backgroundColor: totals.readiness_score >= 80 ? "#22C55E" : totals.readiness_score >= 50 ? "#F59E0B" : "#EF4444",
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} style={{ color: "#22C55E" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>
                {t.quality.completeMonths(totals.complete_months)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: "#F59E0B" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>
                {t.quality.estimatedMonth(totals.estimated_months)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={14} style={{ color: "#EF4444" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>
                {t.quality.missingMonth(totals.missing_months)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Document List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="bg-white rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#0F1117" }}>
            {t.documents.documentList}
          </h2>
        </div>

        {!loading && sortedDocs.length === 0 && !error ? (
          <EmptyState icon={FileText} title={t.documents.noDocuments} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                  {[
                    t.documents.filename,
                    t.documents.type,
                    t.documents.uploadedAt,
                    t.documents.extractionStatus,
                    t.documents.extractedFields,
                    t.documents.delete,
                  ].map((header) => (
                    <th
                      key={header}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#6B7280" }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                  : sortedDocs.map((doc, idx) => {
                      const catKey = doc.category ?? "other";
                      const catColors = categoryColors[catKey] ?? categoryColors.other;
                      const statusColors = docStatusMap[doc.status] ?? docStatusMap.uploaded;
                      const catLabel =
                        (t.documents.categories as Record<string, string>)[catKey] ?? catKey;

                      return (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 + idx * 0.025, duration: 0.3 }}
                          style={{ borderBottom: "1px solid #F3F4F6" }}
                        >
                          {/* Filename */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <DocIcon mime={doc.mime_type} />
                              <div>
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: "#0F1117", maxWidth: 240 }}
                                >
                                  {doc.filename}
                                </p>
                                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                                  {formatFileSize(doc.file_size)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: catColors.bg,
                                color: catColors.text,
                              }}
                            >
                              {catLabel}
                            </span>
                          </td>

                          {/* Upload Date */}
                          <td className="px-4 py-3 text-sm" style={{ color: "#6B7280" }}>
                            {new Date(doc.uploaded_at).toLocaleDateString("de-AT")}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                animation: statusColors.pulse
                                  ? "pulse 1.5s ease-in-out infinite"
                                  : undefined,
                              }}
                            >
                              {doc.status === "uploaded" && "Hochgeladen"}
                              {doc.status === "processing" && "Verarbeitung..."}
                              {doc.status === "extracted" && "Extrahiert"}
                              {doc.status === "error" && "Fehler"}
                            </span>
                          </td>

                          {/* Extracted Fields Count */}
                          <td className="px-4 py-3">
                            <span
                              className="text-sm font-medium tabular-nums"
                              style={{
                                color: doc.extracted_fields_count > 0 ? "#065F46" : "#9CA3AF",
                              }}
                            >
                              {doc.extracted_fields_count}
                            </span>
                          </td>

                          {/* Delete */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleting === doc.id}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                              style={{
                                color: "#EF4444",
                                opacity: deleting === doc.id ? 0.5 : 1,
                              }}
                              title={t.documents.delete}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}

/** Icon helper based on MIME type */
function DocIcon({ mime }: { mime: string }) {
  const size = 18;
  const style: React.CSSProperties = { color: "#6B7280" };

  if (mime.startsWith("image/"))
    return <Image size={size} style={{ ...style, color: "#EC4899" }} />;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv"))
    return <FileSpreadsheet size={size} style={{ ...style, color: "#22C55E" }} />;
  if (mime.includes("pdf"))
    return <FileBarChart size={size} style={{ ...style, color: "#EF4444" }} />;
  return <File size={size} style={style} />;
}
