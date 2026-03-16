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
  const prevPathnameRef = useRef<string>(pathname);

  /* ── Helpers ──────────────────────────────────────────────────────── */

  /** Append a complete transcript entry (e.g. user-typed text). */
  const addTranscript = useCallback(
    (role: "user" | "assistant" | "system", text: string) => {
      setTranscript((prev) => [
        ...prev,
        { role, text, timestamp: new Date() },
      ]);
    },
    [],
  );

  /** Streaming update: upsert a transcript entry by turnId.
   *  Gemini sends cumulative text per turn, so we REPLACE the text
   *  of the matching entry (same turnId + role) rather than appending. */
  const upsertTranscriptDelta = useCallback(
    (role: "user" | "assistant", text: string, turnId: number) => {
      setTranscript((prev) => {
        const idx = prev.findIndex(
          (e) => e.turnId === turnId && e.role === role,
        );
        if (idx >= 0) {
          // Replace text in existing bubble
          const updated = [...prev];
          updated[idx] = { ...updated[idx], text };
          return updated;
        }
        // New bubble for this turn
        return [...prev, { role, text, timestamp: new Date(), turnId }];
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
        // DEBUG: log every message from server to trace duplication
        if (msg.type !== "audio") {
          console.log("[WS MSG]", msg.type, msg.role || "", (msg.text || msg.name || "").slice(0, 60));
        }

        switch (msg.type) {
          case "audio": {
            // Suppress mic while AI speaks to prevent echo → VAD → self-interrupt
            if (audioRef.current) audioRef.current.speaking = true;
            const binaryStr = atob(msg.data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            audioRef.current?.playAudio(bytes.buffer);
            break;
          }

          case "transcript_delta":
            // Streaming: update the same bubble in real-time
            upsertTranscriptDelta(msg.role, msg.text, msg.turn_id);
            break;

          case "transcript":
            // Legacy / fallback: complete transcript entry
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
            dispatchUICommand(
              uiCmd,
              router,
              activeCaseIdRef.current,
              sendImage,
              sendTextRaw,
            );
            break;
          }

          case "turn_complete":
            // AI turn ended — but audio may still be in the playback queue.
            // markTurnComplete() delays mic re-enable until all queued audio
            // has actually finished playing, preventing echo-feedback loops
            // caused by the Gemini Live API's premature turnComplete bug.
            if (audioRef.current) audioRef.current.markTurnComplete();
            break;

          case "interrupted":
            // User interrupted — clear queued audio so old speech stops
            audioRef.current?.clearPlaybackQueue();
            if (audioRef.current) audioRef.current.speaking = false;
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
    [addTranscript, upsertTranscriptDelta, addFinding, router],
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

  // Send text without adding to transcript (for system/tool responses)
  const sendTextRaw = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "text", text }));
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
    // Prevent duplicate connections: close any existing WebSocket first
    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.stopCapture();
      audioRef.current = null;
    }

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
      am.onPlaybackIdle = () => {
        console.log("[Companion] playback idle — mic re-enabled");
      };
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
    const newMode: CompanionMode = pageName === "live-audit" ? "field" : "desk";
    setModeState(newMode);

    // Only send screen_context on ACTUAL page navigation, not on initial connect.
    // send_content() forces turn_complete=true which makes Gemini respond immediately.
    // On initial connect this would cause an unsolicited greeting that overlaps
    // with the user's first speech → two audio responses.
    const isNavigation = prevPathnameRef.current !== pathname;
    prevPathnameRef.current = pathname;

    if (status === "connected" && isNavigation) {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "screen_context",
            page: pageName,
            case_id: caseId,
            domain: null,
            mode: newMode,
          }),
        );
      }
    }
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
