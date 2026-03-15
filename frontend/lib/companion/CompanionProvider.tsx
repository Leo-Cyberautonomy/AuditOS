"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AudioManager } from "./audio-manager";
import { dispatchUICommand } from "./UICommandDispatcher";
import type {
  CompanionMode,
  CompanionStatus,
  Finding,
  ScreenContext,
  TranscriptEntry,
  UICommand,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ── Context value shape ──────────────────────────────────────────────────── */

interface CompanionContextValue {
  status: CompanionStatus;
  sessionId: string | null;
  mode: CompanionMode;
  isMuted: boolean;
  transcript: TranscriptEntry[];
  findings: Finding[];
  sidebarOpen: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendText: (text: string) => void;
  sendImage: (blob: Blob) => void;
  toggleMute: () => void;
  setMode: (mode: CompanionMode, caseId?: string, domain?: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

/* ── Provider ─────────────────────────────────────────────────────────────── */

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  /* ── State ────────────────────────────────────────────────────────────── */
  const [status, setStatus] = useState<CompanionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setModeState] = useState<CompanionMode>("desk");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Refs ──────────────────────────────────────────────────────────── */
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const activeCaseIdRef = useRef<string | null>(null);

  /* ── Helpers ──────────────────────────────────────────────────────── */

  const addTranscript = useCallback(
    (role: "user" | "assistant" | "system", text: string) => {
      setTranscript((prev) => {
        // Merge consecutive same-role entries (streaming text chunks)
        if (prev.length > 0 && prev[prev.length - 1].role === role) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: updated[updated.length - 1].text + text,
          };
          return updated;
        }
        return [...prev, { role, text, timestamp: new Date() }];
      });
    },
    [],
  );

  const addFinding = useCallback(
    (name: string, args: Record<string, unknown>) => {
      const finding: Finding = {
        id: crypto.randomUUID(),
        type:
          name === "record_equipment"
            ? "equipment"
            : name === "record_meter_reading"
              ? "meter_reading"
              : name === "flag_issue"
                ? "issue"
                : "evidence",
        name: (args.name || args.title || args.description || name) as string,
        data: args,
        timestamp: new Date(),
      };
      setFindings((prev) => [...prev, finding]);
    },
    [],
  );

  /* ── WebSocket message handler ────────────────────────────────────── */

  const handleMessage = useCallback(
    (raw: string) => {
      try {
        const msg = JSON.parse(raw);

        switch (msg.type) {
          case "audio": {
            const binaryStr = atob(msg.data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            audioRef.current?.playAudio(bytes.buffer);
            break;
          }

          case "transcript":
            addTranscript(msg.role, msg.text);
            break;

          case "text":
            addTranscript("assistant", msg.text);
            break;

          case "tool_call": {
            const fieldTools = [
              "record_equipment",
              "record_meter_reading",
              "flag_issue",
              "capture_evidence",
            ];
            if (fieldTools.includes(msg.name)) {
              addFinding(msg.name, msg.args || {});
            }
            console.log("[Companion] tool_call:", msg.name, msg.args);
            break;
          }

          case "tool_result":
            console.log("[Companion] tool_result:", msg.name, msg.result);
            break;

          case "ui_command": {
            const uiCmd: UICommand = {
              command: msg.action ?? msg.command ?? "",
              args: msg.args ?? msg,
            };
            dispatchUICommand(uiCmd, router, activeCaseIdRef.current);
            break;
          }

          case "turn_complete":
            break;

          case "interrupted":
            // User interrupted — clear queued audio so old speech stops
            audioRef.current?.clearPlaybackQueue();
            break;

          case "error":
            console.error("[Companion] error:", msg.message);
            setStatus("error");
            break;
        }
      } catch (e) {
        console.error("Failed to parse companion message:", e);
      }
    },
    [addTranscript, addFinding, router],
  );

  /* ── Outbound helpers ─────────────────────────────────────────────── */

  const sendAudio = useCallback((data: ArrayBuffer) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const bytes = new Uint8Array(data);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    ws.send(JSON.stringify({ type: "audio", data: b64 }));
  }, []);

  const sendImage = useCallback((blob: Blob) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      ws.send(JSON.stringify({ type: "image", data: b64 }));
    });
  }, []);

  const sendText = useCallback(
    (text: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "text", text }));
      addTranscript("user", text);
    },
    [addTranscript],
  );

  const sendScreenContext = useCallback((ctx: ScreenContext) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "screen_context",
        page: ctx.page,
        case_id: ctx.case_id,
        domain: ctx.domain,
        data: ctx.visible_data ?? {},
      }),
    );
  }, []);

  const setMode = useCallback(
    (newMode: CompanionMode, caseId?: string, domain?: string) => {
      setModeState(newMode);
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: "set_mode",
          mode: newMode,
          case_id: caseId,
          domain,
        }),
      );
    },
    [],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  /* ── Connect ──────────────────────────────────────────────────────── */

  const connect = useCallback(async () => {
    setStatus("connecting");

    try {
      // 1. Create session via REST
      const res = await fetch(`${API_BASE}/live/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: "global" }),
      });
      if (!res.ok) {
        throw new Error("Failed to create companion session");
      }
      const data = await res.json();
      const newSessionId = data.id as string;
      setSessionId(newSessionId);

      // 2. Connect WebSocket
      const wsBase = API_BASE.replace(/^http:/, "ws:").replace(
        /^https:/,
        "wss:",
      );
      const ws = new WebSocket(`${wsBase}/ws/companion/${newSessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        setSidebarOpen(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        handleMessage(event.data);
      };

      ws.onerror = () => {
        console.error("[Companion] WebSocket error");
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus("idle");
      };

      // 3. Start audio capture, forwarding PCM chunks to WebSocket
      const am = new AudioManager();
      audioRef.current = am;
      await am.startCapture(sendAudio);
    } catch (e) {
      console.error("[Companion] connect error:", e);
      setStatus("error");
    }
  }, [handleMessage, sendAudio]);

  /* ── Disconnect ────────────────────────────────────────────────────── */

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.stopCapture();
    }
    setStatus("idle");
    setSessionId(null);
  }, []);

  /* ── Screen context auto-send on pathname change ───────────────────── */

  useEffect(() => {
    // Extract page name and caseId from pathname
    const caseMatch = pathname.match(/^\/cases\/([^/]+)(?:\/(.+))?/);
    const caseId = caseMatch ? caseMatch[1] : null;
    const subPage = caseMatch ? caseMatch[2] ?? "overview" : null;
    activeCaseIdRef.current = caseId;

    const pageName = caseId ? subPage! : pathname.replace(/^\//, "") || "dashboard";

    // Auto-switch mode: live-audit page -> field, everything else -> desk
    if (pageName === "live-audit" && status === "connected") {
      setMode("field", caseId ?? undefined);
    } else if (status === "connected") {
      setMode("desk", caseId ?? undefined);
    }

    // Send screen context to backend
    if (status === "connected") {
      sendScreenContext({
        page: pageName,
        case_id: caseId,
        domain: null,
      });
    }
    // We intentionally only react to pathname changes (and status for gating),
    // not to setMode/sendScreenContext identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, status]);

  /* ── Cleanup on unmount ────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      audioRef.current?.destroy();
    };
  }, []);

  /* ── Context value ─────────────────────────────────────────────────── */

  const value: CompanionContextValue = {
    status,
    sessionId,
    mode,
    isMuted,
    transcript,
    findings,
    sidebarOpen,
    connect,
    disconnect,
    sendText,
    sendImage,
    toggleMute,
    setMode,
    setSidebarOpen,
  };

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) {
    throw new Error("useCompanion must be used within a CompanionProvider");
  }
  return ctx;
}
