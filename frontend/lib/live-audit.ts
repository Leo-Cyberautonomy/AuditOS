/**
 * LiveAuditSession — connects to the backend WebSocket which bridges to ADK/Gemini Live API.
 *
 * Architecture: Frontend → WebSocket → Backend (FastAPI) → ADK Runner.run_live() → Gemini Live API
 * API key stays server-side. ADK handles function calling automatically.
 *
 * Protocol (client → server):
 *   {"type": "audio", "data": "<base64 PCM 16-bit 16kHz mono>"}
 *   {"type": "image", "data": "<base64 JPEG>"}
 *   {"type": "text",  "text": "..."}
 *
 * Protocol (server → client):
 *   {"type": "audio",       "data": "<base64 PCM 24kHz>"}
 *   {"type": "transcript",  "role": "user"|"assistant", "text": "..."}
 *   {"type": "tool_call",   "name": "...", "args": {...}}
 *   {"type": "tool_result", "name": "...", "result": {...}}
 *   {"type": "turn_complete"}
 *   {"type": "interrupted"}
 *   {"type": "error",       "message": "..."}
 */

export interface LiveAuditCallbacks {
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onAudioOutput: (audioData: ArrayBuffer) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => void;
  onToolResult: (name: string, result: Record<string, unknown>) => void;
  onTurnComplete: () => void;
  onStatusChange: (
    status: "connecting" | "connected" | "disconnected" | "error"
  ) => void;
  onError: (error: string) => void;
}

export class LiveAuditSession {
  private ws: WebSocket | null = null;
  private callbacks: LiveAuditCallbacks;
  private wsUrl: string;
  private _isActive = false;

  constructor(
    backendUrl: string,
    caseId: string,
    sessionId: string,
    callbacks: LiveAuditCallbacks
  ) {
    // Convert http(s) to ws(s)
    const wsBase = backendUrl
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:");
    this.wsUrl = `${wsBase}/ws/live/${caseId}/${sessionId}`;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    this.callbacks.onStatusChange("connecting");

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this._isActive = true;
          this.callbacks.onStatusChange("connected");
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (event: Event) => {
          this.callbacks.onError("WebSocket connection error");
          this.callbacks.onStatusChange("error");
          reject(new Error("WebSocket connection error"));
        };

        this.ws.onclose = () => {
          this._isActive = false;
          this.callbacks.onStatusChange("disconnected");
        };
      } catch (error) {
        this.callbacks.onError(String(error));
        this.callbacks.onStatusChange("error");
        reject(error);
      }
    });
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case "audio": {
          // Decode base64 PCM audio
          const binaryStr = atob(msg.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          this.callbacks.onAudioOutput(bytes.buffer);
          break;
        }

        case "transcript":
          this.callbacks.onTranscript(msg.role, msg.text);
          break;

        case "text":
          this.callbacks.onTranscript("assistant", msg.text);
          break;

        case "tool_call":
          this.callbacks.onToolCall(msg.name, msg.args || {});
          break;

        case "tool_result":
          this.callbacks.onToolResult(msg.name, msg.result || {});
          break;

        case "turn_complete":
          this.callbacks.onTurnComplete();
          break;

        case "interrupted":
          // Model was interrupted by user input
          break;

        case "error":
          this.callbacks.onError(msg.message);
          break;
      }
    } catch (e) {
      console.error("Failed to parse WebSocket message:", e);
    }
  }

  /**
   * Send PCM 16-bit 16kHz mono audio to the backend.
   * Accepts Int16Array buffer — will be base64-encoded for transmission.
   */
  sendAudio(pcmData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const bytes = new Uint8Array(pcmData);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    this.ws.send(JSON.stringify({ type: "audio", data: b64 }));
  }

  /**
   * Send a JPEG image frame to the backend.
   * Accepts a Blob — will be base64-encoded for transmission.
   */
  async sendImage(imageBlob: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const buffer = await imageBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    this.ws.send(JSON.stringify({ type: "image", data: b64 }));
  }

  /**
   * Send a text message to the backend.
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "text", text }));
  }

  disconnect(): void {
    this._isActive = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get active(): boolean {
    return this._isActive;
  }
}
