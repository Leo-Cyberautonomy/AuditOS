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
import { useCompanion } from "@/lib/companion/CompanionProvider";
import type { Finding } from "@/lib/companion/types";

export default function LiveAuditPage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const companion = useCompanion();
  const {
    status,
    isMuted,
    transcript,
    findings,
    connect,
    disconnect,
    sendText,
    sendImage,
    toggleMute,
    setMode,
  } = companion;

  // Local camera state
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Cleanup on unmount: stop camera and switch back to desk mode
  useEffect(() => {
    return () => {
      stopCamera();
      // Switch back to desk mode but keep companion connected
      if (companion.status === "connected") {
        companion.setMode("desk", caseId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    // Stop frame sending
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setIsCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    // Request camera access (video only; audio is handled by CompanionProvider)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "environment" },
    });
    streamRef.current = stream;

    // Show camera preview
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setIsCameraOn(true);
    }

    // Start sending video frames every 2 seconds
    const sendFrame = () => {
      if (!videoRef.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            sendImage(blob);
          }
        },
        "image/jpeg",
        0.7,
      );
    };
    frameIntervalRef.current = setInterval(sendFrame, 2000);
  }, [sendImage]);

  const startSession = async () => {
    setError(null);

    try {
      // Connect companion if not already connected
      if (status !== "connected") {
        await connect();
      }

      // Switch to field mode
      setMode("field", caseId);

      // Start camera and frame capture
      await startCamera();
    } catch (e) {
      setError(String(e));
    }
  };

  const stopSession = () => {
    stopCamera();

    // Switch back to desk mode (companion stays connected for sidebar use)
    if (status === "connected") {
      setMode("desk", caseId);
    }
  };

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
        if (blob && status === "connected") {
          sendImage(blob);
          sendText("[Snapshot captured and sent for analysis]");
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  // Derived: session is active when companion is connected AND camera is on
  const isActive = status === "connected" && isCameraOn;

  const getStatusColor = () => {
    if (isActive) return "#22C55E";
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
    if (isActive) return "Live -- AI Listening";
    switch (status) {
      case "idle":
        return "Ready to start";
      case "connecting":
        return "Connecting to AI...";
      case "connected":
        return "Connected (camera off)";
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

  // Determine whether the "Start" button should show
  const canStart = !isActive;
  const canStop = isActive;

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
          {canStart && !canStop ? (
            <button
              onClick={startSession}
              disabled={status === "connecting"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
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
            {isActive && (
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
              disabled={!isActive}
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
              disabled={!isActive}
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
                {isActive
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
                      : entry.role === "system"
                        ? "bg-gray-600/30 text-gray-400 rounded-bl-none italic"
                        : "bg-gray-700/50 text-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-[10px] font-semibold mb-0.5 opacity-60">
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

          {/* Text input */}
          <div className="px-4 py-3 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector(
                  "input",
                ) as HTMLInputElement;
                if (input.value.trim() && status === "connected") {
                  sendText(input.value.trim());
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
            {findings.map((finding: Finding) => (
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
