import { describe, it, expect, beforeEach } from "vitest";
import type { TranscriptEntry } from "../types";

/* ── Replicate the addTranscript logic from CompanionProvider ───────────── */

/**
 * This mirrors the addTranscript callback in CompanionProvider.tsx:
 *   setTranscript((prev) => [...prev, { role, text, timestamp: new Date() }]);
 *
 * Each call always appends a new entry — no merging of consecutive
 * same-role messages. This is the intentional behavior after the
 * audio/text duplication fix.
 */
function addTranscriptToArray(
  prev: TranscriptEntry[],
  role: TranscriptEntry["role"],
  text: string,
): TranscriptEntry[] {
  return [...prev, { role, text, timestamp: new Date() }];
}

/* ── Tests ───────────────────────────────────────────────────────────────── */

describe("addTranscript logic", () => {
  let transcript: TranscriptEntry[];

  beforeEach(() => {
    transcript = [];
  });

  it("should add an entry to an empty array", () => {
    const result = addTranscriptToArray(transcript, "user", "Hello");

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("user");
    expect(result[0].text).toBe("Hello");
  });

  it("should NOT merge consecutive same-role messages (each creates new entry)", () => {
    let t = addTranscriptToArray(transcript, "assistant", "First response");
    t = addTranscriptToArray(t, "assistant", "Second response");

    expect(t).toHaveLength(2);
    expect(t[0].text).toBe("First response");
    expect(t[1].text).toBe("Second response");
  });

  it("should create separate entries for different roles", () => {
    let t = addTranscriptToArray(transcript, "user", "Question");
    t = addTranscriptToArray(t, "assistant", "Answer");

    expect(t).toHaveLength(2);
    expect(t[0].role).toBe("user");
    expect(t[1].role).toBe("assistant");
  });

  it("should keep all three entries for three consecutive assistant messages", () => {
    let t = addTranscriptToArray(transcript, "assistant", "Part 1");
    t = addTranscriptToArray(t, "assistant", "Part 2");
    t = addTranscriptToArray(t, "assistant", "Part 3");

    expect(t).toHaveLength(3);
    expect(t[0].text).toBe("Part 1");
    expect(t[1].text).toBe("Part 2");
    expect(t[2].text).toBe("Part 3");
  });

  it("should set a timestamp on each entry", () => {
    const before = new Date();
    let t = addTranscriptToArray(transcript, "user", "Hello");
    t = addTranscriptToArray(t, "assistant", "Hi");
    const after = new Date();

    for (const entry of t) {
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });

  it("should not mutate the original array", () => {
    const original: TranscriptEntry[] = [];
    const result = addTranscriptToArray(original, "system", "Session started");

    expect(original).toHaveLength(0);
    expect(result).toHaveLength(1);
  });
});
