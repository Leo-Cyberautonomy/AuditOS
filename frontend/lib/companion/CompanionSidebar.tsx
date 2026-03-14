"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  X,
  Wrench,
  Gauge,
  AlertTriangle,
  ImageIcon,
  Radio,
  Send,
  Zap,
  Volume2,
} from "lucide-react";
import { useCompanion } from "./CompanionProvider";
import type { Finding } from "./types";

/* ── Status helpers ──────────────────────────────────────────────────── */

function statusColor(
  status: "idle" | "connecting" | "connected" | "error",
): string {
  switch (status) {
    case "connected":
      return "#22C55E";
    case "connecting":
      return "#F59E0B";
    case "error":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

function statusLabel(
  status: "idle" | "connecting" | "connected" | "error",
): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "connecting":
      return "Connecting...";
    case "connected":
      return "Connected";
    case "error":
      return "Error";
  }
}

function findingIcon(type: string): React.ReactNode {
  switch (type) {
    case "equipment":
      return <Wrench size={14} className="text-blue-400" />;
    case "meter_reading":
      return <Gauge size={14} className="text-green-400" />;
    case "issue":
      return <AlertTriangle size={14} className="text-amber-400" />;
    case "evidence":
      return <ImageIcon size={14} className="text-purple-400" />;
    default:
      return <Radio size={14} className="text-gray-400" />;
  }
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function CompanionSidebar() {
  const {
    status,
    mode,
    isMuted,
    transcript,
    findings,
    sidebarOpen,
    connect,
    disconnect,
    sendText,
    toggleMute,
    setSidebarOpen,
  } = useCompanion();

  const [textInput, setTextInput] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript on new entries
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  /* ── When sidebar is closed, render nothing ─────────────────────── */
  if (!sidebarOpen) {
    // Minimal floating "Activate AI" button when idle and sidebar hidden
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setSidebarOpen(true);
            if (status === "idle") {
              connect();
            }
          }}
          className="flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: "#D97706" }}
        >
          <Zap size={18} />
          Activate AI
        </button>
      </div>
    );
  }

  /* ── Full sidebar ──────────────────────────────────────────────────── */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed || status !== "connected") return;
    sendText(trimmed);
    setTextInput("");
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-30 flex flex-col"
      style={{
        width: 320,
        backgroundColor: "#111827",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: "#FCD34D" }} />
          <span className="text-white text-sm font-semibold">AuditAI</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor:
                mode === "field"
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(59,130,246,0.15)",
              color: mode === "field" ? "#F87171" : "#60A5FA",
            }}
          >
            {mode.toUpperCase()}
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded transition-colors hover:bg-white/10"
          style={{ color: "#6B7280" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Status indicator ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: statusColor(status),
            boxShadow:
              status === "connected"
                ? `0 0 6px ${statusColor(status)}`
                : "none",
          }}
        />
        <span className="text-xs" style={{ color: statusColor(status) }}>
          {statusLabel(status)}
        </span>
        {status === "connected" && (
          <Volume2
            size={12}
            className="ml-auto animate-pulse"
            style={{ color: "#22C55E" }}
          />
        )}
      </div>

      {/* ── Idle state: show connect button ───────────────────────────── */}
      {status === "idle" && (
        <div className="flex-1 flex items-center justify-center px-6">
          <button
            onClick={connect}
            className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ backgroundColor: "#D97706" }}
          >
            <Zap size={18} />
            Activate AI Companion
          </button>
        </div>
      )}

      {/* ── Active state: transcript + findings + controls ────────────── */}
      {status !== "idle" && (
        <>
          {/* Transcript feed */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {transcript.length === 0 && status === "connected" && (
              <div className="flex items-center justify-center h-20 text-gray-500 text-xs">
                Start speaking or type a message...
              </div>
            )}
            {transcript.length === 0 && status === "connecting" && (
              <div className="flex items-center justify-center h-20 text-gray-500 text-xs">
                Connecting to AI...
              </div>
            )}
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                    entry.role === "user"
                      ? "bg-blue-600/20 text-blue-100 rounded-br-none"
                      : entry.role === "system"
                        ? "bg-gray-800/50 text-gray-500 rounded-bl-none italic"
                        : "bg-gray-700/50 text-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-[9px] font-semibold mb-0.5 opacity-50">
                    {entry.role === "user"
                      ? "You"
                      : entry.role === "system"
                        ? "System"
                        : "AuditAI"}
                  </p>
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Findings section (only shown when there are findings) */}
          {findings.length > 0 && (
            <div className="border-t border-white/10">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Findings
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400">
                  {findings.length}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto px-3 pb-2 space-y-1.5">
                {findings.map((f: Finding) => (
                  <div
                    key={f.id}
                    id={`finding-${f.id}`}
                    className="flex items-start gap-2 p-2 rounded-md bg-gray-800/40 border border-gray-700/40 transition-all"
                  >
                    <div className="mt-0.5">{findingIcon(f.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">
                        {f.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {f.type.replace("_", " ")} &middot;{" "}
                        {f.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls: mic toggle + text input */}
          <div className="px-3 py-3 border-t border-white/10">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleMute}
                disabled={status !== "connected"}
                className="p-2 rounded-lg transition-colors disabled:opacity-30 flex-shrink-0"
                style={{
                  backgroundColor: isMuted ? "#EF4444" : "#374151",
                }}
              >
                {isMuted ? (
                  <MicOff size={16} className="text-white" />
                ) : (
                  <Mic size={16} className="text-white" />
                )}
              </button>
              <input
                type="text"
                placeholder={
                  status === "connected"
                    ? "Type a message..."
                    : "Connecting..."
                }
                disabled={status !== "connected"}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-white text-xs border border-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-30"
              />
              <button
                type="submit"
                disabled={status !== "connected" || !textInput.trim()}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-30 flex-shrink-0"
              >
                <Send size={14} className="text-white" />
              </button>
            </form>

            {/* Disconnect button */}
            {status === "connected" && (
              <button
                onClick={disconnect}
                className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
