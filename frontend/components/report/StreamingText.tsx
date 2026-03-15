"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Measure } from "@/lib/demo-data";
import { useT } from "@/lib/i18n";

interface StreamingTextProps {
  isStreaming: boolean;
  onComplete: (measures: Measure[]) => void;
  locale: string;
}

function parseEvidenceBlocks(text: string): { cleanText: string; measures: any[] } {
  const measures: any[] = [];
  const cleanText = text.replace(
    /\[EVIDENCE_START\]([\s\S]*?)\[EVIDENCE_END\]/g,
    (_, json) => {
      try {
        measures.push(JSON.parse(json.trim()));
      } catch {}
      return "";
    }
  );
  return { cleanText, measures };
}

// Custom markdown components with Tailwind styling
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

export function StreamingText({ isStreaming, onComplete, locale }: StreamingTextProps) {
  const [text, setText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { t } = useT();

  useEffect(() => {
    if (!isStreaming) return;

    setText("");
    setIsDone(false);
    abortRef.current = new AbortController();

    (async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const res = await fetch(`${apiBase}/report/stream?lang=${locale}`, {
          method: "POST",
          headers: { "Content-Length": "0" },
          signal: abortRef.current!.signal,
        });

        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.done) {
                setIsDone(true);
                const { measures } = parseEvidenceBlocks(fullText);
                onComplete(measures);
                return;
              }
              if (parsed.text) {
                fullText += parsed.text;
                setText(fullText);
                if (containerRef.current) {
                  containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
              }
            } catch {}
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Stream error:", e);
        }
      }
    })();

    return () => {
      abortRef.current?.abort();
    };
  }, [isStreaming]);

  if (!text && !isStreaming) return null;

  const { cleanText } = parseEvidenceBlocks(text);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-none">
        {/* Report header */}
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900 mb-1">
            {t.streaming.reportTitle}
          </h1>
          <p className="text-sm text-gray-500">
            {t.streaming.reportSubtitle}
          </p>
        </div>

        {/* Streamed markdown content */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={mdComponents}
        >
          {cleanText}
        </ReactMarkdown>

        {/* Streaming cursor */}
        {isStreaming && !isDone && (
          <span className="inline-block w-0.5 h-4 bg-amber-400 animate-pulse ml-0.5 align-middle" />
        )}

        {isDone && (
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
  );
}
