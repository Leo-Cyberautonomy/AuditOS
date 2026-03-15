/**
 * AudioManager — handles microphone capture (16kHz PCM int16) and
 * playback of incoming audio (24kHz PCM int16).
 *
 * Extracted from the live-audit page audio logic and adapted for
 * the global companion provider.
 */

export class AudioManager {
  /* ── Capture state ─────────────────────────────────────────────────── */
  private captureCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;

  /* ── Playback state ────────────────────────────────────────────────── */
  private playbackCtx: AudioContext | null = null;
  private nextPlayTime = 0; // scheduled time for the next audio chunk

  /* ── Mute ───────────────────────────────────────────────────────────── */
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  set muted(val: boolean) {
    this._muted = val;
  }

  /* ── Capture ────────────────────────────────────────────────────────── */

  /**
   * Request the microphone and start streaming PCM int16 chunks at 16 kHz.
   * Every ScriptProcessor buffer (4096 frames) is converted from float32
   * to int16 and forwarded to the provided callback.
   */
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
      if (this._muted) return;
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
   * Play a PCM int16 chunk at 24 kHz (Gemini output format).
   * Chunks are queued sequentially so they play one after another
   * instead of overlapping (which causes the "many voices" effect).
   */
  playAudio(audioData: ArrayBuffer): void {
    try {
      if (!this.playbackCtx) {
        this.playbackCtx = new AudioContext({ sampleRate: 24000 });
        this.nextPlayTime = 0;
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

      // Schedule this chunk to play after the previous one finishes.
      // If we've fallen behind (nextPlayTime < currentTime), start now.
      const now = ctx.currentTime;
      const startAt = Math.max(now, this.nextPlayTime);
      source.start(startAt);
      this.nextPlayTime = startAt + buffer.duration;
    } catch (e) {
      console.error("AudioManager playback error:", e);
    }
  }

  /**
   * Stop all queued audio playback (e.g., when user interrupts).
   */
  clearPlaybackQueue(): void {
    this.nextPlayTime = 0;
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
    if (this.playbackCtx) {
      this.playbackCtx.close();
      this.playbackCtx = null;
    }
  }
}
