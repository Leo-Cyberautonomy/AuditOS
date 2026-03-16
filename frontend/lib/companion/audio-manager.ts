/**
 * AudioManager — handles microphone capture (16kHz PCM int16) and
 * playback of incoming audio (24kHz PCM int16).
 *
 * Playback uses a single persistent AudioContext with sequential
 * scheduling. All active BufferSource nodes are tracked so they can
 * be stopped instantly on interrupt (clearPlaybackQueue).
 */

export class AudioManager {
  /* ── Capture state ─────────────────────────────────────────────────── */
  private captureCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;

  /* ── Playback state ────────────────────────────────────────────────── */
  private playbackCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  /* ── Mute & speaking gate ──────────────────────────────────────────── */
  private _muted = false;
  private _speaking = false;
  private _turnComplete = false;

  /** Called when all queued audio has finished playing AND a turn_complete
   *  was received. This is the safe moment to re-enable the microphone. */
  onPlaybackIdle: (() => void) | null = null;

  get muted(): boolean {
    return this._muted;
  }

  set muted(val: boolean) {
    this._muted = val;
  }

  /** Suppress mic capture while AI is speaking so speaker output
   *  doesn't feed back into Gemini's VAD via the microphone. */
  set speaking(val: boolean) {
    this._speaking = val;
  }

  get isPlaying(): boolean {
    return this.activeSources.length > 0;
  }

  /**
   * Signal that the server has sent turn_complete. If audio is still
   * playing, the mic stays suppressed until playback actually finishes.
   * If no audio is queued, fire the idle callback immediately.
   */
  markTurnComplete(): void {
    this._turnComplete = true;
    if (this.activeSources.length === 0) {
      this._firePlackbackIdle();
    }
    // else: onended of the last source will call _firePlaybackIdle
  }

  private _firePlackbackIdle(): void {
    if (this._turnComplete) {
      this._turnComplete = false;
      this._speaking = false;
      this.onPlaybackIdle?.();
    }
  }

  /* ── Capture ────────────────────────────────────────────────────────── */

  async startCapture(onAudioData: (data: ArrayBuffer) => void): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    this.mediaStream = stream;

    const ctx = new AudioContext({ sampleRate: 16000 });
    this.captureCtx = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor = processor;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (this._muted || this._speaking) return;
      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
      }
      onAudioData(int16.buffer);
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  }

  /* ── Playback ───────────────────────────────────────────────────────── */

  /**
   * Play a PCM int16 chunk at 24 kHz. Chunks are scheduled sequentially
   * on a single AudioContext so they play gaplessly one after another.
   */
  playAudio(audioData: ArrayBuffer): void {
    try {
      if (!this.playbackCtx || this.playbackCtx.state === "closed") {
        this.playbackCtx = new AudioContext({ sampleRate: 24000 });
        this.nextPlayTime = 0;
        this.activeSources = [];
      }
      const ctx = this.playbackCtx;
      const int16 = new Int16Array(audioData);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Clean up finished sources; fire idle callback when queue drains
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx >= 0) this.activeSources.splice(idx, 1);
        if (this.activeSources.length === 0) {
          this._firePlackbackIdle();
        }
      };

      const now = ctx.currentTime;
      // If nextPlayTime is in the past (e.g. after a long pause between
      // responses), snap forward to `now` so we don't schedule into the past.
      // Do NOT reset when nextPlayTime is far in the future — that's expected
      // for long audio streams where chunks arrive faster than real-time.
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now;
      }

      const startAt = this.nextPlayTime;
      source.start(startAt);
      this.activeSources.push(source);
      this.nextPlayTime = startAt + buffer.duration;
    } catch (e) {
      console.error("AudioManager playback error:", e);
    }
  }

  /**
   * Immediately stop all queued and playing audio.
   * Uses source.stop() on every tracked BufferSource for instant silence.
   */
  clearPlaybackQueue(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    this.activeSources = [];
    this.nextPlayTime = 0;
    this._turnComplete = false;
  }

  /* ── Teardown ───────────────────────────────────────────────────────── */

  stopCapture(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.captureCtx) {
      this.captureCtx.close();
      this.captureCtx = null;
    }
  }

  destroy(): void {
    this.stopCapture();
    this.clearPlaybackQueue();
    if (this.playbackCtx) {
      this.playbackCtx.close();
      this.playbackCtx = null;
    }
  }
}
