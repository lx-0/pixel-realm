/**
 * AdaptiveMusicSystem
 *
 * Layered music orchestration built on top of SoundManager.
 * Adds:
 *  - Combat intensity percussion layers (scales with enemy count)
 *  - Time-of-day transitional melody overlays (dawn/day/dusk/night)
 *  - Event music overrides (guild wars, arena, seasonal events)
 *  - Boss phase-2 music intensification
 *
 * Volume ducking for SFX priority moments is handled directly by
 * SoundManager.duckMusic().
 */

import { SoundManager } from './SoundManager';
import { getTimePeriod, TimePeriod } from '../config/dayNightPalette';

/** [frequency_hz, duration_sec] — frequency 0 = rest */
type Note = [number, number];

// ── Time-of-day transitional stings ─────────────────────────────────────────
// Short melodic phrases that play when the time period changes.
const TIME_MELODIES: Record<TimePeriod, Note[]> = {
  dawn: [ // Hopeful ascending — G major
    [261.63, 0.25], [329.63, 0.25], [392.00, 0.25], [440.00, 0.40],
    [523.25, 0.25], [659.25, 0.50], [0, 0.30],
  ],
  day: [ // Bright and open — C major
    [523.25, 0.22], [659.25, 0.22], [783.99, 0.35],
    [880.00, 0.22], [783.99, 0.22], [659.25, 0.55],
    [0, 0.25],
  ],
  dusk: [ // Melancholic descent — A minor
    [440.00, 0.40], [392.00, 0.30], [349.23, 0.40],
    [329.63, 0.25], [293.66, 0.25], [261.63, 0.65],
    [0, 0.30],
  ],
  night: [ // Sparse and mysterious — low register
    [220.00, 0.55], [0, 0.15], [196.00, 0.35], [0, 0.15],
    [174.61, 0.70], [0, 0.40],
  ],
};

// ── Event music overlay loops ────────────────────────────────────────────────
const EVENT_MELODIES: Record<string, Note[]> = {
  guild_wars: [ // March-like, militaristic — D minor
    [196.00, 0.18], [196.00, 0.09], [261.63, 0.18], [329.63, 0.27],
    [293.66, 0.18], [261.63, 0.18], [196.00, 0.27], [0, 0.09],
    [174.61, 0.18], [196.00, 0.18], [220.00, 0.18], [261.63, 0.36],
    [220.00, 0.18], [196.00, 0.45], [0, 0.18],
  ],
  arena: [ // Intense, crowd-roaring — E minor
    [329.63, 0.13], [0, 0.05], [329.63, 0.13], [0, 0.05], [392.00, 0.22],
    [440.00, 0.13], [392.00, 0.13], [329.63, 0.27], [0, 0.09],
    [293.66, 0.13], [329.63, 0.13], [369.99, 0.13], [440.00, 0.32],
    [369.99, 0.18], [329.63, 0.45], [0, 0.18],
  ],
  seasonal: [ // Festive, celebratory — C major
    [523.25, 0.18], [587.33, 0.18], [659.25, 0.18], [698.46, 0.27],
    [659.25, 0.18], [587.33, 0.18], [523.25, 0.36],
    [440.00, 0.18], [493.88, 0.18], [523.25, 0.55], [0, 0.27],
  ],
};

// ── Percussion patterns ───────────────────────────────────────────────────────
// 8-step patterns at 0.25s/step = 2s loop ≈ 120 BPM
// Each step: { freq Hz, dur seconds, vol, oscillator type }
interface DrumStep { freq: number; dur: number; vol: number; type: OscillatorType }

const STEP_DUR = 0.25; // seconds per step

/** Kick drum synthesized from a low sine with quick decay */
const kick  = (vol: number): DrumStep => ({ freq: 68,   dur: 0.14, vol, type: 'sine' });
/** Snare: mid-frequency sawtooth blip */
const snare = (vol: number): DrumStep => ({ freq: 175,  dur: 0.06, vol, type: 'sawtooth' });
/** Hi-hat: high square blip */
const hihat = (vol: number): DrumStep => ({ freq: 1400, dur: 0.03, vol, type: 'square' });
/** Rest */
const rest: DrumStep = { freq: 0, dur: 0, vol: 0, type: 'sine' };

const PERC_PATTERNS: Record<'light' | 'medium' | 'heavy', DrumStep[]> = {
  // Light: simple 4-on-the-floor with snares on 3 and 7
  light: [
    kick(0.16),  rest,         rest,          snare(0.10),
    kick(0.14),  rest,         kick(0.10),    snare(0.10),
  ],
  // Medium: added hi-hats on the off-beats
  medium: [
    kick(0.20),  hihat(0.07),  rest,          snare(0.14),
    kick(0.20),  hihat(0.07),  kick(0.12),    snare(0.14),
  ],
  // Heavy: full eighth-note hi-hats, double kick, heavy snare
  heavy: [
    kick(0.26),  hihat(0.10),  kick(0.14),    snare(0.20),
    kick(0.26),  hihat(0.10),  kick(0.16),    snare(0.22),
  ],
};

// ── AdaptiveMusicSystem ───────────────────────────────────────────────────────

export class AdaptiveMusicSystem {
  private readonly sfx: SoundManager;

  // Percussion
  private _combatIntensity  = 0;
  private _percussionGen    = 0;
  private _percussionGain?: GainNode;
  private _percussionActive = false;

  // Time-of-day
  private _currentPeriod: TimePeriod | null = null;
  private _timeMelodyGen = 0;

  // Event music
  private _eventStack: string[]  = [];
  private _eventMelodyGen        = 0;
  private _eventGain?: GainNode;

  // Boss phase tracking
  private _bossPhase = 1;

  constructor(sfx: SoundManager) {
    this.sfx = sfx;
  }

  // ── Combat Intensity ───────────────────────────────────────────────────────

  /**
   * Set the current combat intensity (0 = peaceful, 1 = max chaos).
   * Drives the percussion layer gain and pattern selection.
   * Call from GameScene.update() based on alive enemy ratio.
   */
  setCombatIntensity(intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    const prev    = this._combatIntensity;
    this._combatIntensity = clamped;

    const ctx = this.sfx.getAudioContext();
    if (!ctx) return;

    if (clamped > 0 && !this._percussionActive) {
      this._startPercussion(ctx);
    } else if (clamped === 0 && this._percussionActive) {
      this._stopPercussion(ctx);
    }

    // Smoothly adjust percussion gain
    if (this._percussionGain && this._percussionActive) {
      const t = ctx.currentTime;
      // Scale: low intensity → quiet, high → louder
      const targetGain = clamped * 0.75;
      this._percussionGain.gain.cancelScheduledValues(t);
      this._percussionGain.gain.setValueAtTime(this._percussionGain.gain.value, t);
      this._percussionGain.gain.linearRampToValueAtTime(targetGain, t + (prev === 0 ? 0.8 : 0.4));
    }
  }

  // ── Time-of-Day ────────────────────────────────────────────────────────────

  /**
   * Call from GameScene.update() with the current game hour.
   * Fires a short transitional melody when the time period changes.
   */
  updateTimeOfDay(gameHour: number): void {
    const period = getTimePeriod(gameHour);
    if (period === this._currentPeriod) return;
    const prev = this._currentPeriod;
    this._currentPeriod = period;
    // Skip on first call — no transition needed yet
    if (prev !== null) this._playTimeMelody(period);
  }

  // ── Boss Phase ─────────────────────────────────────────────────────────────

  /**
   * Notify a boss phase change. Call when boss HP crosses 50%.
   * Phase 2 intensifies the percussion layer to maximum.
   */
  notifyBossPhase(phase: 1 | 2): void {
    if (phase === this._bossPhase) return;
    this._bossPhase = phase;
    if (phase === 2) {
      // Force max intensity percussion for phase 2
      const ctx = this.sfx.getAudioContext();
      if (ctx && this._percussionGain && this._percussionActive) {
        const t = ctx.currentTime;
        this._percussionGain.gain.cancelScheduledValues(t);
        this._percussionGain.gain.setValueAtTime(this._percussionGain.gain.value, t);
        this._percussionGain.gain.linearRampToValueAtTime(0.9, t + 0.3);
      } else if (ctx) {
        this._combatIntensity = 1.0;
        this._startPercussion(ctx);
        if (this._percussionGain) {
          const t = ctx.currentTime;
          this._percussionGain.gain.setValueAtTime(0, t);
          this._percussionGain.gain.linearRampToValueAtTime(0.9, t + 0.5);
        }
      }
    }
  }

  /** Reset boss phase tracking (call when boss dies or wave ends). */
  resetBossPhase(): void {
    this._bossPhase = 1;
  }

  // ── Event Music ────────────────────────────────────────────────────────────

  /**
   * Start a looping event music overlay.
   * Supported types: 'guild_wars', 'arena', 'seasonal'
   */
  startEventMusic(type: string): void {
    if (this._eventStack.includes(type)) return;
    this._eventStack.push(type);
    this._playEventOverlay(type);
  }

  /**
   * Remove an event music overlay and resume the previous one (if any).
   * Pass a type to remove a specific event; omit to pop the top of the stack.
   */
  stopEventMusic(type?: string): void {
    if (type) {
      const idx = this._eventStack.indexOf(type);
      if (idx >= 0) this._eventStack.splice(idx, 1);
    } else {
      this._eventStack.pop();
    }
    this._stopEventOverlay();
    if (this._eventStack.length > 0) {
      this._playEventOverlay(this._eventStack[this._eventStack.length - 1]);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  /** Stop all adaptive layers (call when leaving a zone). */
  destroy(): void {
    const ctx = this.sfx.getAudioContext();
    if (ctx) {
      this._stopPercussion(ctx);
      this._stopEventOverlay();
    }
    this._timeMelodyGen++;
    this._currentPeriod = null;
    this._bossPhase = 1;
    this._eventStack = [];
  }

  // ── Private: Percussion ───────────────────────────────────────────────────

  private _startPercussion(ctx: AudioContext): void {
    if (this._percussionActive) return;
    this._percussionActive = true;
    this._percussionGen++;

    this._percussionGain = ctx.createGain();
    this._percussionGain.gain.setValueAtTime(0, ctx.currentTime);
    this.sfx.connectToMusicBus(this._percussionGain);

    this._schedulePercussion(ctx, this._percussionGen, 0);
  }

  private _stopPercussion(ctx: AudioContext): void {
    if (!this._percussionActive) return;
    this._percussionActive = false;
    this._percussionGen++;

    if (this._percussionGain) {
      const t = ctx.currentTime;
      this._percussionGain.gain.cancelScheduledValues(t);
      this._percussionGain.gain.setValueAtTime(this._percussionGain.gain.value, t);
      this._percussionGain.gain.linearRampToValueAtTime(0, t + 0.6);
      this._percussionGain = undefined;
    }
  }

  private _schedulePercussion(ctx: AudioContext, gen: number, delay: number): void {
    if (gen !== this._percussionGen || !this._percussionGain) return;

    const intensity = this._combatIntensity;
    const pattern   = intensity > 0.7
      ? PERC_PATTERNS.heavy
      : intensity > 0.35
      ? PERC_PATTERNS.medium
      : PERC_PATTERNS.light;

    const dest = this._percussionGain;
    let t = ctx.currentTime + delay;

    for (const step of pattern) {
      if (step.freq > 0 && step.vol > 0) {
        const at = t;
        try {
          const osc = ctx.createOscillator();
          const gn  = ctx.createGain();
          osc.connect(gn);
          gn.connect(dest);
          osc.type = step.type;
          osc.frequency.setValueAtTime(step.freq, at);
          gn.gain.setValueAtTime(step.vol, at);
          gn.gain.exponentialRampToValueAtTime(0.0001, at + step.dur);
          osc.start(at);
          osc.stop(at + step.dur + 0.01);
        } catch { /* ignore audio errors */ }
      }
      t += STEP_DUR;
    }

    const loopMs = Math.max(0, (pattern.length * STEP_DUR - 0.04) * 1000);
    window.setTimeout(() => {
      if (gen === this._percussionGen) this._schedulePercussion(ctx, gen, 0);
    }, loopMs);
  }

  // ── Private: Time-of-day melody ───────────────────────────────────────────

  private _playTimeMelody(period: TimePeriod): void {
    const ctx = this.sfx.getAudioContext();
    if (!ctx) return;

    const melody = TIME_MELODIES[period];
    if (!melody) return;

    this._timeMelodyGen++;
    const gen = this._timeMelodyGen;

    // Ephemeral gain — no long-running node, just schedule notes once
    const overlayGain = ctx.createGain();
    overlayGain.gain.setValueAtTime(0, ctx.currentTime);
    overlayGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);
    this.sfx.connectToMusicBus(overlayGain);

    let t = 0;
    let totalDur = 0;
    for (const [freq, dur] of melody) {
      if (freq > 0) {
        const at = ctx.currentTime + t;
        try {
          const osc = ctx.createOscillator();
          const gn  = ctx.createGain();
          osc.connect(gn);
          gn.connect(overlayGain);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, at);
          gn.gain.setValueAtTime(0.18, at);
          gn.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.85);
          osc.start(at);
          osc.stop(at + dur);
        } catch { /* ignore */ }
      }
      t += dur;
      totalDur = t;
    }

    // Fade overlay gain out after melody ends (even if a newer gen took over)
    window.setTimeout(() => {
      if (gen === this._timeMelodyGen) {
        const fadeT = ctx.currentTime;
        overlayGain.gain.cancelScheduledValues(fadeT);
        overlayGain.gain.setValueAtTime(overlayGain.gain.value, fadeT);
        overlayGain.gain.linearRampToValueAtTime(0, fadeT + 0.5);
      }
    }, totalDur * 1000);
  }

  // ── Private: Event music ──────────────────────────────────────────────────

  private _playEventOverlay(type: string): void {
    const ctx = this.sfx.getAudioContext();
    if (!ctx) return;

    const melody = EVENT_MELODIES[type];
    if (!melody) return;

    this._stopEventOverlay();
    this._eventMelodyGen++;
    const gen = this._eventMelodyGen;

    this._eventGain = ctx.createGain();
    this._eventGain.gain.setValueAtTime(0, ctx.currentTime);
    this._eventGain.gain.linearRampToValueAtTime(0.20, ctx.currentTime + 0.5);
    this.sfx.connectToMusicBus(this._eventGain);

    const dest = this._eventGain;
    const scheduleLoop = () => {
      if (gen !== this._eventMelodyGen || !dest) return;
      let t = 0;
      for (const [freq, dur] of melody) {
        if (freq > 0) {
          const at = ctx.currentTime + t;
          try {
            const osc = ctx.createOscillator();
            const gn  = ctx.createGain();
            osc.connect(gn);
            gn.connect(dest);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, at);
            gn.gain.setValueAtTime(0.20, at);
            gn.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.88);
            osc.start(at);
            osc.stop(at + dur);
          } catch { /* ignore */ }
        }
        t += dur;
      }
      window.setTimeout(scheduleLoop, Math.max(0, (t - 0.04) * 1000));
    };
    scheduleLoop();
  }

  private _stopEventOverlay(): void {
    const ctx = this.sfx.getAudioContext();
    if (!ctx || !this._eventGain) return;
    this._eventMelodyGen++;
    const t = ctx.currentTime;
    this._eventGain.gain.cancelScheduledValues(t);
    this._eventGain.gain.setValueAtTime(this._eventGain.gain.value, t);
    this._eventGain.gain.linearRampToValueAtTime(0, t + 0.5);
    this._eventGain = undefined;
  }
}
