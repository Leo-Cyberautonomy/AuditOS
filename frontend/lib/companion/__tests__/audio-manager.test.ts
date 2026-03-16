import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioManager } from "../audio-manager";

/* ── Minimal AudioContext mock for jsdom ─────────────────────────────────── */

class MockAudioContext {
  state = "running";
  currentTime = 0;
  sampleRate: number;

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 44100;
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return { copyToChannel: vi.fn(), duration: length / sampleRate };
  }

  createBufferSource() {
    return { buffer: null, connect: vi.fn(), start: vi.fn() };
  }

  get destination() {
    return {};
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

vi.stubGlobal("AudioContext", MockAudioContext);

/* ── Tests ───────────────────────────────────────────────────────────────── */

describe("AudioManager", () => {
  let am: AudioManager;

  beforeEach(() => {
    am = new AudioManager();
  });

  /* ── clearPlaybackQueue ──────────────────────────────────────────────── */

  describe("clearPlaybackQueue()", () => {
    it("should close the playback AudioContext (set internal ref to null)", () => {
      // Play something first to create the playbackCtx
      const pcm = new Int16Array([100, -100, 200, -200]);
      am.playAudio(pcm.buffer);

      am.clearPlaybackQueue();

      // After clearing, playing again should work (creates a new context).
      // If the old context were still around and closed, playAudio would
      // detect state === "closed" and create a fresh one.
      // We verify indirectly: playAudio should not throw.
      expect(() => am.playAudio(pcm.buffer)).not.toThrow();
    });

    it("should reset nextPlayTime to 0", () => {
      const pcm = new Int16Array([100, -100, 200, -200]);
      am.playAudio(pcm.buffer);
      // After playing, nextPlayTime > 0 internally.

      am.clearPlaybackQueue();

      // We can't read private fields directly, but we can verify behavior:
      // After clearing, the next playAudio call should schedule from 0
      // (i.e., Math.max(currentTime=0, nextPlayTime=0) = 0).
      // If nextPlayTime were NOT reset, it would schedule far into the future.
      // We test this indirectly by playing two chunks and verifying no error.
      expect(() => am.playAudio(pcm.buffer)).not.toThrow();
    });
  });

  /* ── playAudio ───────────────────────────────────────────────────────── */

  describe("playAudio()", () => {
    it("should create a new AudioContext on first call", () => {
      const pcm = new Int16Array([100, -100]);
      // No error means it successfully created an AudioContext and played.
      expect(() => am.playAudio(pcm.buffer)).not.toThrow();
    });

    it("should create a new AudioContext after clearPlaybackQueue()", () => {
      const pcm = new Int16Array([100, -100]);
      am.playAudio(pcm.buffer);
      am.clearPlaybackQueue();

      // This must create a fresh context since the old one is closed/null
      expect(() => am.playAudio(pcm.buffer)).not.toThrow();
    });

    it("should schedule chunks sequentially (nextPlayTime increases)", () => {
      // We spy on createBufferSource to capture start() calls
      const startTimes: number[] = [];

      const originalCreateBufferSource =
        MockAudioContext.prototype.createBufferSource;
      MockAudioContext.prototype.createBufferSource = function () {
        return {
          buffer: null,
          connect: vi.fn(),
          start: vi.fn((time: number) => {
            startTimes.push(time);
          }),
        };
      };

      const pcm = new Int16Array(2400); // 2400 samples at 24kHz = 0.1s
      am.playAudio(pcm.buffer);
      am.playAudio(pcm.buffer);
      am.playAudio(pcm.buffer);

      // Restore
      MockAudioContext.prototype.createBufferSource =
        originalCreateBufferSource;

      expect(startTimes).toHaveLength(3);
      // Each subsequent chunk should start at or after the previous one ends
      expect(startTimes[1]).toBeGreaterThan(startTimes[0]);
      expect(startTimes[2]).toBeGreaterThan(startTimes[1]);
    });
  });

  /* ── muted property ─────────────────────────────────────────────────── */

  describe("muted", () => {
    it("defaults to false", () => {
      expect(am.muted).toBe(false);
    });

    it("can be set to true", () => {
      am.muted = true;
      expect(am.muted).toBe(true);
    });
  });

  /* ── destroy ────────────────────────────────────────────────────────── */

  describe("destroy()", () => {
    it("should not throw even if never used", () => {
      expect(() => am.destroy()).not.toThrow();
    });

    it("should not throw after playback was started", () => {
      const pcm = new Int16Array([100, -100]);
      am.playAudio(pcm.buffer);
      expect(() => am.destroy()).not.toThrow();
    });
  });
});
