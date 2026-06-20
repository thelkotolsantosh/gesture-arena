// ============================================================================
// Gesture Arena — Procedural Audio Engine (Web Audio API)
// ============================================================================

/**
 * Entirely procedural audio — no external sound files required.
 *
 * Signal chain:
 *   SFX bus (GainNode) ──┐
 *                        ├──▶ Master gain ──▶ destination
 *   Music bus (GainNode) ┘
 *
 * Every sound is synthesized on-the-fly using OscillatorNodes, white-noise
 * AudioBufferSourceNodes, BiquadFilterNodes, and gain envelopes.
 *
 * Background music uses a lookahead scheduler pattern driven by
 * requestAnimationFrame + audioContext.currentTime comparison.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  /** Pre-generated white noise buffer (2 seconds @ sample rate). */
  private noiseBuffer: AudioBuffer | null = null;

  // Music scheduler state
  private musicPlaying = false;
  private musicSchedulerHandle = 0;
  private musicNextNoteTime = 0;
  private musicBassIndex = 0;
  private musicArpIndex = 0;
  private musicTempo = 128; // BPM
  private musicActiveOscillators: OscillatorNode[] = [];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Create the AudioContext and build the gain graph.
   */
  initialize(): void {
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.4; // music sits lower by default
    this.musicGain.connect(this.masterGain);

    // Pre-generate noise buffer
    this.noiseBuffer = this.createNoiseBuffer();
  }

  /**
   * Resume a suspended audio context (call on first user interaction).
   */
  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // -------------------------------------------------------------------------
  // Volume controls (0–1)
  // -------------------------------------------------------------------------

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = clamp01(v);
  }

  setSFXVolume(v: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = clamp01(v);
  }

  setSfxVolume(v: number): void {
    this.setSFXVolume(v);
  }

  setMusicVolume(v: number): void {
    if (this.musicGain) this.musicGain.gain.value = clamp01(v);
  }

  startMusic(): void {
    this.playMusic();
  }

  playDamage(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain).connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playBossAppear(): void {
    this.playBossWarning();
  }

  playBossDefeat(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain).connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.65);

    this.playExplosion();
  }

  playBonus(): void {
    this.playPowerUp();
  }

  playMenuSelect(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain).connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // -------------------------------------------------------------------------
  // SFX methods — all procedural
  // -------------------------------------------------------------------------

  /** Short square-wave hit — pitch drops 150→60 Hz in 0.1 s. */
  playHit(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Rising arpeggio — pitch based on combo level. */
  playCombo(level: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseFreq = 400 + level * 50;

    // 3-note arpeggio: root, major third, fifth
    const intervals = [1, 1.25, 1.5];
    intervals.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * ratio;

      const gain = ctx.createGain();
      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /** Rising sine sweep 200→800 Hz with harmonics. */
  playPowerUp(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.4;

    // Fundamental
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + duration);

    // Harmonic (octave above)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, now);
    osc2.frequency.exponentialRampToValueAtTime(1600, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.3, now + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(gain).connect(this.sfxGain!);
    osc2.connect(gain);
    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
  }

  /** White noise explosion — lowpass sweep 1000→100 Hz. */
  playExplosion(): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const duration = 0.4;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);
    filter.Q.value = 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter).connect(gain).connect(this.sfxGain!);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** Metallic sci-fi sweep for Time Freeze ability */
  playTimeFreeze(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.8;

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.linearRampToValueAtTime(110, now + duration);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(55, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.linearRampToValueAtTime(200, now + duration);
    filter.Q.value = 10;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(this.sfxGain!);

    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
  }

  /** Sawtooth siren — 3 sweeps 400→800→400 Hz. */
  playBossWarning(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const sweepDuration = 0.3;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';

    // 3 sweeps: up-down-up
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + sweepDuration);
    osc.frequency.linearRampToValueAtTime(400, now + sweepDuration * 2);
    osc.frequency.linearRampToValueAtTime(800, now + sweepDuration * 3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0.2, now + sweepDuration * 3 - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + sweepDuration * 3);

    osc.connect(gain).connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + sweepDuration * 3);
  }

  /** Filtered noise pad — 0.2 s duration. */
  playShield(): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const duration = 0.2;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter).connect(gain).connect(this.sfxGain!);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** Sawtooth falling pitch 800→100 Hz in 0.15 s. */
  playProjectile(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Two-tone sine blip — 800 Hz then 1200 Hz. */
  playCoin(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    // First tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 800;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.25, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(g1).connect(this.sfxGain!);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Second tone (delayed)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1200;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.25, now + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc2.connect(g2).connect(this.sfxGain!);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.16);
  }

  /** Short sine beep at 440 Hz (countdown tick). */
  playCountdown(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Descending notes — game over jingle. */
  playGameOver(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523, 466, 392, 349, 262]; // C5 → C4 descending
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const t = now + i * 0.2;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // -------------------------------------------------------------------------
  // Background music — procedural loop with lookahead scheduler
  // -------------------------------------------------------------------------

  /**
   * Start the procedural background music loop.
   * Uses a lookahead scheduler to schedule notes ahead of time for
   * glitch-free timing.
   */
  playMusic(): void {
    if (this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;
    this.musicNextNoteTime = this.ctx.currentTime;
    this.musicBassIndex = 0;
    this.musicArpIndex = 0;
    this.musicSchedulerLoop();
  }

  /** Stop the background music. */
  stopMusic(): void {
    this.musicPlaying = false;
    cancelAnimationFrame(this.musicSchedulerHandle);

    // Kill any active music oscillators
    for (const osc of this.musicActiveOscillators) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    this.musicActiveOscillators = [];
  }

  // -------------------------------------------------------------------------
  // Music internals
  // -------------------------------------------------------------------------

  /** Lookahead scheduler driven by rAF. */
  private musicSchedulerLoop = (): void => {
    if (!this.musicPlaying || !this.ctx) return;

    const lookAhead = 0.1; // schedule 100ms ahead
    const sixteenthDuration = 60 / this.musicTempo / 4; // duration of a 16th note

    while (this.musicNextNoteTime < this.ctx.currentTime + lookAhead) {
      this.scheduleMusicNotes(this.musicNextNoteTime, sixteenthDuration);
      this.musicNextNoteTime += sixteenthDuration;
    }

    this.musicSchedulerHandle = requestAnimationFrame(this.musicSchedulerLoop);
  };

  /**
   * Schedule one "tick" of the music at the given time.
   * Bass plays on every 4th sixteenth, arp plays every sixteenth.
   */
  private scheduleMusicNotes(time: number, duration: number): void {
    const ctx = this.ctx!;

    // --- Bass line: sawtooth, plays every 4 sixteenths (quarter notes)
    // Notes: A1 (55), A1 (55), D2 (73.4), C2 (65.4)
    const bassNotes = [55, 55, 73.42, 65.41];
    if (this.musicArpIndex % 4 === 0) {
      const bassFreq = bassNotes[this.musicBassIndex % bassNotes.length];
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = bassFreq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 3.5);

      osc.connect(gain).connect(this.musicGain!);
      osc.start(time);
      osc.stop(time + duration * 4);

      this.trackMusicOsc(osc);
      this.musicBassIndex++;
    }

    // --- Arp: square wave through 8-note pattern with lowpass filter
    // A minor pentatonic: A3, C4, D4, E4, G4, A4, G4, E4
    const arpNotes = [220, 261.63, 293.66, 329.63, 392, 440, 392, 329.63];
    const arpFreq = arpNotes[this.musicArpIndex % arpNotes.length];

    const arpOsc = ctx.createOscillator();
    arpOsc.type = 'square';
    arpOsc.frequency.value = arpFreq;

    const arpFilter = ctx.createBiquadFilter();
    arpFilter.type = 'lowpass';
    arpFilter.frequency.value = 1200;
    arpFilter.Q.value = 3;

    const arpGain = ctx.createGain();
    arpGain.gain.setValueAtTime(0.08, time);
    arpGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.9);

    arpOsc.connect(arpFilter).connect(arpGain).connect(this.musicGain!);
    arpOsc.start(time);
    arpOsc.stop(time + duration);

    this.trackMusicOsc(arpOsc);
    this.musicArpIndex++;
  }

  /** Track oscillators so we can kill them when music stops. */
  private trackMusicOsc(osc: OscillatorNode): void {
    this.musicActiveOscillators.push(osc);

    // Clean up finished oscillators periodically
    if (this.musicActiveOscillators.length > 64) {
      this.musicActiveOscillators = this.musicActiveOscillators.slice(-32);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Generate 2 seconds of white noise as an AudioBuffer. */
  private createNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}

// ---------------------------------------------------------------------------
// Tiny utility (no need to import from math for one function)
// ---------------------------------------------------------------------------
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
