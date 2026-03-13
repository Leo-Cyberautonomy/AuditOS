"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Phone,
  PhoneOff,
  Radio,
  AlertTriangle,
  Gauge,
  Wrench,
  ImageIcon,
} from "lucide-react";
import { LiveAuditSession, type LiveAuditCallbacks } from "@/lib/live-audit";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface Finding {
  id: string;
  type: "equipment" | "meter_reading" | "issue" | "evidence";
  name: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export default function LiveAuditPage() {
  const params = useParams();
  const caseId = params.caseId as string;

  // State
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected" | "error"
  >("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs
  const sessionRef = useRef<LiveAuditSession | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTranscript = useCallback(
    (role: "user" | "assistant", text: string) => {
      setTranscript((prev) => {
        // Merge with last entry if same role (streaming text)
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

      // Also send to backend for persistence
      if (sessionId) {
        fetch(`${API_BASE}/live/sessions/${sessionId}/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, text }),
        }).catch(() => {}); // fire and forget
      }
    },
    [sessionId]
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

      // Also send to backend
      if (sessionId) {
        fetch(`${API_BASE}/live/sessions/${sessionId}/findings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            type: finding.type,
            data: args,
          }),
        }).catch(() => {});
      }
    },
    [sessionId]
  );

  const playAudio = useCallback((audioData: ArrayBuffer) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = playbackContextRef.current;
      // Gemini outputs PCM 16-bit 24kHz mono
      const int16Array = new Int16Array(audioData);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, []);

  const startSession = async () => {
    if (!GEMINI_API_KEY) {
      setError("NEXT_PUBLIC_GEMINI_API_KEY is not set");
      return;
    }

    setError(null);
    setStatus("connecting");

    try {
      // Create backend session first
      const res = await fetch(`${API_BASE}/live/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
      }

      // Set up audio/video capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: { width: 640, height: 480, facingMode: "environment" },
      });
      streamRef.current = stream;

      // Show camera preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);
      }

      // Create Gemini Live session
      const callbacks: LiveAuditCallbacks = {
        onTranscript: addTranscript,
        onAudioOutput: playAudio,
        onToolCall: addFinding,
        onStatusChange: (s) =>
          setStatus(s as typeof status),
        onError: (e) => setError(e),
      };

      const liveSession = new LiveAuditSession(GEMINI_API_KEY, callbacks);
      sessionRef.current = liveSession;
      await liveSession.connect();

      // Start sending audio
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted || !liveSession.active) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(
            -32768,
            Math.min(32767, inputData[i] * 32768)
          );
        }
        liveSession.sendAudio(
          new Blob([int16Data.buffer], { type: "audio/pcm" })
        );
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Start sending video frames every 2 seconds
      const sendFrame = () => {
        if (!videoRef.current || !liveSession.active) return;
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        canvas.toBlob(
          (blob) => {
            if (blob && liveSession.active) {
              liveSession.sendImage(blob);
            }
          },
          "image/jpeg",
          0.7
        );
      };
      frameIntervalRef.current = setInterval(sendFrame, 2000);
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  const stopSession = () => {
    // Stop frame sending
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Disconnect Gemini session
    sessionRef.current?.disconnect();
    sessionRef.current = null;

    // End backend session
    if (sessionId) {
      fetch(`${API_BASE}/live/sessions/${sessionId}/end`, {
        method: "POST",
      }).catch(() => {});
    }

    setIsCameraOn(false);
    setStatus("disconnected");
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    canvas.toBlob(
      (blob) => {
        if (blob && sessionRef.current?.active) {
          sessionRef.current.sendImage(blob);
          addTranscript("user", "[Snapshot captured and sent for analysis]");
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const getStatusColor = () => {
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
  };

  const getStatusText = () => {
    switch (status) {
      case "idle":
        return "Ready to start";
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Live -- AI Listening";
      case "disconnected":
        return "Session ended";
      case "error":
        return "Connection error";
    }
  };

  const getFindingIcon = (type: string) => {
    switch (type) {
      case "equipment":
        return <Wrench size={16} className="text-blue-400" />;
      case "meter_reading":
        return <Gauge size={16} className="text-green-400" />;
      case "issue":
        return <AlertTriangle size={16} className="text-amber-400" />;
      case "evidence":
        return <ImageIcon size={16} className="text-purple-400" />;
      default:
        return <Radio size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Live Field Audit</h1>
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${getStatusColor()}20`,
              color: getStatusColor(),
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: getStatusColor() }}
            />
            {getStatusText()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "idle" ||
          status === "disconnected" ||
          status === "error" ? (
            <button
              onClick={startSession}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              <Phone size={16} /> Start Live Audit
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              <PhoneOff size={16} /> End Session
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="flex-1 grid grid-cols-[320px_1fr_320px] gap-4 min-h-0">
        {/* Left: Camera */}
        <div className="flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <CameraOff size={48} className="text-gray-600" />
              </div>
            )}
            {status === "connected" && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-600/80 text-white text-[10px] font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                REC
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleMute}
              disabled={status !== "connected"}
              className="p-3 rounded-full transition-colors disabled:opacity-30"
              style={{ backgroundColor: isMuted ? "#EF4444" : "#374151" }}
            >
              {isMuted ? (
                <MicOff size={20} className="text-white" />
              ) : (
                <Mic size={20} className="text-white" />
              )}
            </button>
            <button
              onClick={captureSnapshot}
              disabled={status !== "connected"}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-30"
            >
              <Camera size={20} className="text-white" />
            </button>
          </div>

          {/* Quick Tips */}
          <div
            className="rounded-lg p-3 text-xs text-gray-400"
            style={{ backgroundColor: "#1a1a2e" }}
          >
            <p className="font-semibold text-gray-300 mb-1">Tips:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Point camera at equipment nameplates</li>
              <li>Say &quot;read this meter&quot; near energy meters</li>
              <li>Ask &quot;what&apos;s the benchmark for this?&quot;</li>
              <li>Tap the camera button to send a high-res snapshot</li>
            </ul>
          </div>
        </div>

        {/* Center: Transcript */}
        <div
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ backgroundColor: "#111827" }}
        >
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-gray-300">
              Conversation
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {transcript.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {status === "connected"
                  ? "Start speaking to begin the audit..."
                  : "Start a live audit session to begin"}
              </div>
            )}
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    entry.role === "user"
                      ? "bg-blue-600/20 text-blue-100 rounded-br-none"
                      : "bg-gray-700/50 text-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-[10px] font-semibold mb-0.5 opacity-60">
                    {entry.role === "user" ? "You" : "AuditAI"}
                  </p>
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Text input */}
          <div className="px-4 py-3 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector(
                  "input"
                ) as HTMLInputElement;
                if (input.value.trim() && sessionRef.current?.active) {
                  sessionRef.current.sendText(input.value.trim());
                  addTranscript("user", input.value.trim());
                  input.value = "";
                }
              }}
            >
              <input
                type="text"
                placeholder={
                  status === "connected"
                    ? "Type a message..."
                    : "Start session to chat"
                }
                disabled={status !== "connected"}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white text-sm border border-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-30"
              />
            </form>
          </div>
        </div>

        {/* Right: Findings */}
        <div
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ backgroundColor: "#111827" }}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Findings</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400">
              {findings.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {findings.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-500 text-xs">
                AI will record findings here as you inspect...
              </div>
            )}
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {getFindingIcon(finding.type)}
                  <span className="text-xs font-semibold text-white">
                    {finding.name}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 space-y-0.5">
                  {finding.type === "equipment" &&
                    finding.data.rated_power_kw ? (
                      <p>Power: {String(finding.data.rated_power_kw)} kW</p>
                    ) : null}
                  {finding.type === "equipment" && finding.data.location ? (
                    <p>Location: {String(finding.data.location)}</p>
                  ) : null}
                  {finding.type === "equipment" && finding.data.condition ? (
                    <p>Condition: {String(finding.data.condition)}</p>
                  ) : null}
                  {finding.type === "meter_reading" ? (
                    <p>
                      {String(finding.data.meter_type)}:{" "}
                      {String(finding.data.reading_kwh)} kWh
                    </p>
                  ) : null}
                  {finding.type === "issue" ? (
                    <>
                      <p
                        className={`font-medium ${
                          finding.data.severity === "critical"
                            ? "text-red-400"
                            : finding.data.severity === "high"
                              ? "text-amber-400"
                              : "text-yellow-400"
                        }`}
                      >
                        Severity: {String(finding.data.severity)}
                      </p>
                      <p>{String(finding.data.description)}</p>
                      {finding.data.estimated_saving_kwh ? (
                        <p className="text-green-400">
                          Est. saving:{" "}
                          {String(finding.data.estimated_saving_kwh)} kWh/yr
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {finding.type === "evidence" ? (
                    <p>{String(finding.data.description)}</p>
                  ) : null}
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  {finding.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
