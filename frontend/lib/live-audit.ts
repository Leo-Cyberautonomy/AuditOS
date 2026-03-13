import { GoogleGenAI, Modality, Type, type LiveServerMessage } from "@google/genai";

const LIVE_MODEL = "gemini-live-2.5-flash-preview";

// System instruction for the live audit agent
const SYSTEM_INSTRUCTION = `You are AuditAI, an expert energy auditor assistant working alongside the auditor during a live field inspection.

YOUR ROLE:
- You can see through the auditor's camera and hear their voice
- Proactively identify equipment, read nameplates, and spot potential energy efficiency issues
- When you see equipment, use the record_equipment function to log it
- When you see a meter, use the record_meter_reading function to capture the reading
- When you spot an issue (leaks, inefficiency, damage), use the flag_issue function
- When asked about standards or benchmarks, use the query_standard function
- Use capture_evidence to save important visual evidence

BEHAVIOR:
- Be concise in voice responses (2-3 sentences max)
- Proactively point out things you notice in the camera feed
- Use technical but accessible language
- Always cite the basis for your recommendations
- Support multiple audit standards: ISO 50001, EN 16247-1, ASHRAE Level I/II/III
- Adapt to the auditor's language (respond in the language they speak)

SAFETY:
- Never fabricate data - only report what you can see or what the auditor tells you
- Flag uncertainty: "I can see what appears to be..." not "This is definitely..."
- Distinguish between measured data (Class A) and estimated values (Class B)`;

// Tool declarations for function calling during live session
const LIVE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "record_equipment",
        description:
          "Record an equipment finding from the field inspection. Call when the auditor identifies or discusses a piece of equipment.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Equipment name/model",
            },
            equipment_type: {
              type: Type.STRING,
              description:
                "Equipment type (boiler, compressor, HVAC, lighting, motor, pump, etc.)",
            },
            rated_power_kw: {
              type: Type.NUMBER,
              description: "Rated power in kW if visible on nameplate",
            },
            location: {
              type: Type.STRING,
              description: "Location in the building",
            },
            condition: {
              type: Type.STRING,
              description:
                "Observed condition (good, fair, poor, critical)",
            },
            notes: {
              type: Type.STRING,
              description: "Additional observations",
            },
          },
          required: ["name", "equipment_type"],
        },
      },
      {
        name: "record_meter_reading",
        description:
          "Record an energy meter reading seen in the camera or mentioned by the auditor.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            meter_type: {
              type: Type.STRING,
              description: "electricity, gas, heat, water",
            },
            reading_kwh: {
              type: Type.NUMBER,
              description: "Meter reading value in kWh",
            },
            meter_id: {
              type: Type.STRING,
              description: "Meter ID if visible",
            },
          },
          required: ["meter_type", "reading_kwh"],
        },
      },
      {
        name: "flag_issue",
        description:
          "Flag an energy efficiency issue or anomaly observed during inspection.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Short title for the issue",
            },
            severity: {
              type: Type.STRING,
              description: "critical, high, medium, or low",
            },
            description: {
              type: Type.STRING,
              description: "Detailed description of the issue",
            },
            recommended_measure: {
              type: Type.STRING,
              description: "Recommended action",
            },
            estimated_saving_kwh: {
              type: Type.NUMBER,
              description: "Estimated annual energy saving in kWh",
            },
          },
          required: ["title", "severity", "description"],
        },
      },
      {
        name: "capture_evidence",
        description:
          "Save the current observation as evidence linked to the audit case.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "What this evidence shows",
            },
            category: {
              type: Type.STRING,
              description:
                "equipment, meter, defect, environment, or document",
            },
          },
          required: ["description", "category"],
        },
      },
    ],
  },
];

export interface LiveAuditCallbacks {
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onAudioOutput: (audioData: ArrayBuffer) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => void;
  onStatusChange: (
    status: "connecting" | "connected" | "disconnected" | "error"
  ) => void;
  onError: (error: string) => void;
}

export class LiveAuditSession {
  private session: any = null; // Gemini Live session
  private ai: GoogleGenAI;
  private callbacks: LiveAuditCallbacks;
  private isActive = false;

  constructor(apiKey: string, callbacks: LiveAuditCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    this.callbacks.onStatusChange("connecting");

    try {
      this.session = await this.ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: LIVE_TOOLS as any,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            this.isActive = true;
            this.callbacks.onStatusChange("connected");
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            this.callbacks.onError(e.message || "Connection error");
            this.callbacks.onStatusChange("error");
          },
          onclose: () => {
            this.isActive = false;
            this.callbacks.onStatusChange("disconnected");
          },
        },
      });
    } catch (error) {
      this.callbacks.onError(String(error));
      this.callbacks.onStatusChange("error");
      throw error;
    }
  }

  private handleMessage(message: LiveServerMessage): void {
    // Handle audio output
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          // Audio data from Gemini
          const binaryStr = atob(part.inlineData.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          this.callbacks.onAudioOutput(bytes.buffer);
        }
      }
    }

    // Handle transcription
    if (message.serverContent?.inputTranscription?.text) {
      this.callbacks.onTranscript(
        "user",
        message.serverContent.inputTranscription.text
      );
    }
    if (message.serverContent?.outputTranscription?.text) {
      this.callbacks.onTranscript(
        "assistant",
        message.serverContent.outputTranscription.text
      );
    }

    // Handle tool calls
    if (message.toolCall?.functionCalls) {
      for (const fc of message.toolCall.functionCalls) {
        const fnName = fc.name ?? "unknown";
        this.callbacks.onToolCall(
          fnName,
          (fc.args ?? {}) as Record<string, unknown>
        );

        // Auto-respond to tool calls with success
        // In a production app, we'd call the backend API and return the result
        this.session?.sendToolResponse({
          functionResponses: [
            {
              name: fnName,
              response: {
                success: true,
                message: `${fnName} recorded successfully`,
              },
              id: fc.id,
            },
          ],
        });
      }
    }
  }

  sendAudio(audioData: Blob): void {
    if (!this.session || !this.isActive) return;
    this.session.sendRealtimeInput({ audio: audioData });
  }

  sendImage(imageBlob: Blob): void {
    if (!this.session || !this.isActive) return;
    this.session.sendRealtimeInput({ video: imageBlob });
  }

  sendText(text: string): void {
    if (!this.session || !this.isActive) return;
    this.session.sendClientContent({
      turns: { parts: [{ text }] },
      turnComplete: true,
    });
  }

  disconnect(): void {
    this.isActive = false;
    this.session?.close();
    this.session = null;
  }

  get active(): boolean {
    return this.isActive;
  }
}
