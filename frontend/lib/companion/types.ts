export interface TranscriptEntry {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: Date;
  turnId?: number; // groups streaming deltas into one bubble
}

export interface Finding {
  id: string;
  type: "equipment" | "meter_reading" | "issue" | "evidence";
  name: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface ScreenContext {
  page: string;
  case_id: string | null;
  domain: string | null;
  visible_data?: Record<string, unknown>;
}

export type CompanionStatus = "idle" | "connecting" | "connected" | "error";
export type CompanionMode = "field" | "desk";

export interface UICommand {
  command: string;
  args: Record<string, unknown>;
}
