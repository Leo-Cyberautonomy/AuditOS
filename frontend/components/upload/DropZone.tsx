"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Table2, Image } from "lucide-react";
import { STAGED_FILES_DEMO } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface DisplayFile {
  name: string;
  size: string;
  type: string;
  icon: string;
  real?: File; // undefined = demo placeholder
}

interface DropZoneProps {
  onProcess: (files: File[]) => void; // empty = demo mode
  isProcessing: boolean;
}

function FileIcon({ type }: { type: string }) {
  if (type === "JPEG" || type === "PNG") return <Image size={14} className="text-blue-400" />;
  if (type === "XLSX" || type === "CSV") return <Table2 size={14} className="text-green-400" />;
  return <FileText size={14} className="text-orange-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  if (ext === "JPG") return "JPEG";
  return ext || "FILE";
}

function guessIcon(type: string): string {
  if (type === "JPEG" || type === "PNG") return "📄";
  if (type === "XLSX" || type === "CSV") return "📊";
  return "📑";
}

export function DropZone({ onProcess, isProcessing }: DropZoneProps) {
  const [displayFiles, setDisplayFiles] = useState<DisplayFile[]>(
    STAGED_FILES_DEMO.map((f) => ({ ...f }))
  );
  const [isDragActive, setIsDragActive] = useState(false);
  const { t } = useT();

  const onDrop = useCallback((accepted: File[]) => {
    setIsDragActive(false);
    if (accepted.length === 0) return;
    const newFiles: DisplayFile[] = accepted.map((f) => {
      const type = guessType(f.name);
      return {
        name: f.name,
        size: formatBytes(f.size),
        type,
        icon: guessIcon(type),
        real: f,
      };
    });
    // Replace demo files with real ones
    setDisplayFiles(newFiles);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setDisplayFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    const realFiles = displayFiles.map((f) => f.real).filter(Boolean) as File[];
    onProcess(realFiles); // empty array = demo mode
  };

  const hasRealFiles = displayFiles.some((f) => f.real);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className="relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          borderColor: isDragActive ? "#D97706" : "#E4E7EE",
          backgroundColor: isDragActive ? "#FEF3C7" : "#FFFFFF",
          boxShadow: isDragActive ? "0 0 0 4px rgba(217, 119, 6, 0.15)" : "none",
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: isDragActive ? "#D97706" : "#FEF3C7" }}
          >
            <Upload size={22} style={{ color: isDragActive ? "white" : "#D97706" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {isDragActive ? t.dropzone.dragActive : t.dropzone.dragIdle}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG · PDF · XLSX · CSV · PNG</p>
          </div>
          <button
            type="button"
            className="text-xs font-medium px-4 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: "#D97706", color: "#D97706" }}
            onClick={(e) => e.stopPropagation()}
          >
            {t.dropzone.selectFiles}
          </button>
        </div>
      </div>

      {/* Staged files */}
      <AnimatePresence>
        {displayFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-100 overflow-hidden bg-white"
          >
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t.dropzone.filesReady(displayFiles.length)}
              </span>
              <span className="text-xs text-gray-400">
                {hasRealFiles ? t.dropzone.realFilesLoaded : t.dropzone.demoLoaded}
              </span>
            </div>
            {displayFiles.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 border-gray-50 hover:bg-gray-50/60 transition-colors"
              >
                <FileIcon type={file.type} />
                <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-gray-400">{file.size}</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                >
                  {file.type}
                </span>
                {file.real && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
                  >
                    ECHT
                  </span>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="text-gray-300 hover:text-gray-500 transition-colors ml-1"
                >
                  <X size={13} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Process button */}
      <button
        onClick={handleProcess}
        disabled={isProcessing || displayFiles.length === 0}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200"
        style={{
          backgroundColor: isProcessing || displayFiles.length === 0 ? "#E5E7EB" : "#D97706",
          color: isProcessing || displayFiles.length === 0 ? "#9CA3AF" : "white",
          cursor: isProcessing || displayFiles.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        {isProcessing ? t.dropzone.processing : t.dropzone.processBtn}
      </button>
    </div>
  );
}
