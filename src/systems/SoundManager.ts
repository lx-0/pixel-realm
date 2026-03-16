/**
 * SoundManager — Web Audio API procedural sound synthesis.
 * Generates all SFX in-engine with no external audio files.
 * AudioContext is created lazily on first use (requires prior user interaction).
 */
export class SoundManager {
  private ctx?: AudioContext;

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Play a single oscillator tone with optional frequency sweep. */
  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    vol = 0.22,
    freqEnd?: number,
    startOffset = 0,
  ): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
      }
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch {
      // ignore audio errors silently
    }
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  /** Player swings weapon. */
  playAttack(): void {
    this.tone(380, 0.07, 'square', 0.2);
  }

  /** Attack lands on an enemy. */
  playHit(): void {
    this.tone(260, 0.1, 'sawtooth', 0.3, 180);
  }

  /** Player takes damage. */
  playPlayerHit(): void {
    this.tone(140, 0.22, 'square', 0.38, 90);
  }

  /** Enemy dies. */
  playKill(): void {
    this.tone(480, 0.07, 'square', 0.25, 280);
  }

  /** Player picks up an XP orb. */
  playPickup(): void {
    this.tone(880, 0.08, 'sine', 0.18);
    this.tone(1100, 0.1, 'sine', 0.14, undefined, 0.08);
  }

  /** All enemies in wave cleared. */
  playWaveClear(): void {
    const notes = [440, 550, 660, 880];
    notes.forEach((freq, i) => {
      this.tone(freq, 0.18, 'square', 0.2, undefined, i * 0.12);
    });
  }

  /** Player gains a level. */
  playLevelUp(): void {
    const notes = [330, 440, 550, 660, 880];
    notes.forEach((freq, i) => {
      this.tone(freq, 0.22, 'sine', 0.28, undefined, i * 0.1);
    });
  }

  /** Player dies. */
  playDeath(): void {
    this.tone(300, 0.28, 'square', 0.38, 80);
    this.tone(160, 0.45, 'sawtooth', 0.28, 60, 0.22);
  }

  /** Menu button click. */
  playMenuClick(): void {
    this.tone(600, 0.06, 'square', 0.15);
  }
}
