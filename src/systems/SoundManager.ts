/**
 * SoundManager — singleton Web Audio API procedural synthesizer.
 * All SFX and background music are generated in-engine with no external files.
 * Starts muted; call unlock() on first user interaction to satisfy autoplay policy.
 */

/** [frequency_hz, duration_sec] — frequency 0 = rest */
type Note = [number, number];

const ZONE_MELODIES: Record<string, Note[]> = {
  menu: [
    [392.00, 0.25], [440.00, 0.25], [493.88, 0.25], [523.25, 0.40],
    [493.88, 0.25], [440.00, 0.25], [392.00, 0.40],
    [329.63, 0.25], [293.66, 0.25], [329.63, 0.25], [392.00, 0.50],
    [440.00, 0.25], [392.00, 0.50], [293.66, 0.25], [392.00, 0.80],
    [0, 0.30],
  ],
  zone1: [ // Verdant Hollow — C major, bright & adventurous
    [261.63, 0.30], [329.63, 0.30], [392.00, 0.30], [523.25, 0.50],
    [493.88, 0.30], [392.00, 0.30], [329.63, 0.30], [261.63, 0.50],
    [329.63, 0.30], [392.00, 0.30], [440.00, 0.30], [392.00, 0.50],
    [329.63, 0.30], [293.66, 0.30], [261.63, 0.80], [0, 0.30],
  ],
  zone2: [ // Dusty Trail — A minor pentatonic, tense & driving
    [220.00, 0.40], [261.63, 0.30], [293.66, 0.30], [329.63, 0.50],
    [293.66, 0.30], [261.63, 0.30], [220.00, 0.50],
    [196.00, 0.30], [220.00, 0.30], [261.63, 0.30], [329.63, 0.70],
    [293.66, 0.30], [261.63, 0.30], [220.00, 0.90], [0, 0.30],
  ],
  zone3: [ // Ironveil Ruins — D natural minor, dark & ominous
    [146.83, 0.60], [0, 0.15], [174.61, 0.50],
    [220.00, 0.40], [196.00, 0.30], [174.61, 0.30], [146.83, 0.70],
    [0, 0.20], [164.81, 0.50], [130.81, 0.50],
    [146.83, 1.00], [0, 0.40],
  ],
  zone4: [ // Saltmarsh Harbor — E dorian, flowing & oceanic
    [164.81, 0.30], [196.00, 0.30], [220.00, 0.30], [246.94, 0.50],
    [220.00, 0.30], [196.00, 0.30], [164.81, 0.40],
    [196.00, 0.30], [246.94, 0.30], [293.66, 0.50],
    [246.94, 0.30], [220.00, 0.30], [196.00, 0.30], [164.81, 0.80],
    [0, 0.30],
  ],
};

export class SoundManager {
  private static _instance: SoundManager | null = null;

  static getInstance(): SoundManager {
    if (!SoundManager._instance) SoundManager._instance = new SoundManager();
    return SoundManager._instance;
  }

  private ctx?: AudioContext;
  private sfxGain?: GainNode;
  private musicGain?: GainNode;

  private _sfxVolume    = 0.8;
  private _musicVolume  = 0.5;
  private _unlocked     = false;
  private _musicGen     = 0;
  private _pendingZone: string | null = null;
  private _currentZone: string | null = null;

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this._sfxVolume;
        this.sfxGain.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this._musicVolume;
        this.musicGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  // ── Volume ─────────────────────────────────────────────────────────────────

  get sfxVolume(): number { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this._sfxVolume;
  }

  get musicVolume(): number { return this._musicVolume; }
  set musicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this._musicVolume;
  }

  // ── Autoplay unlock ────────────────────────────────────────────────────────

  /** Call once on first user interaction to satisfy browser autoplay policy. */
  unlock(): void {
    if (this._unlocked) return;
    this._unlocked = true;
    this.getCtx();
    if (this._pendingZone) {
      const zone = this._pendingZone;
      this._pendingZone = null;
      this.startZoneMusic(zone);
    }
  }

  // ── Internal tone helper ───────────────────────────────────────────────────

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    vol = 0.22,
    freqEnd?: number,
    startOffset = 0,
    dest?: AudioNode,
  ): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const target = dest ?? this.sfxGain ?? ctx.destination;
      const t = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(target);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
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
  playAttack(): void { this.tone(380, 0.07, 'square', 0.2); }

  /** Attack lands on an enemy. */
  playHit(): void { this.tone(260, 0.1, 'sawtooth', 0.3, 180); }

  /** Player takes damage. */
  playPlayerHit(): void { this.tone(140, 0.22, 'square', 0.38, 90); }

  /** Enemy dies. */
  playKill(): void { this.tone(480, 0.07, 'square', 0.25, 280); }

  /** Player picks up an XP orb. */
  playPickup(): void {
    this.tone(880, 0.08, 'sine', 0.18);
    this.tone(1100, 0.1, 'sine', 0.14, undefined, 0.08);
  }

  /** All enemies in wave cleared. */
  playWaveClear(): void {
    [440, 550, 660, 880].forEach((f, i) => this.tone(f, 0.18, 'square', 0.2, undefined, i * 0.12));
  }

  /** Player gains a level. */
  playLevelUp(): void {
    [330, 440, 550, 660, 880].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.28, undefined, i * 0.1));
  }

  /** Player dies. */
  playDeath(): void {
    this.tone(300, 0.28, 'square', 0.38, 80);
    this.tone(160, 0.45, 'sawtooth', 0.28, 60, 0.22);
  }

  /** Menu button click. */
  playMenuClick(): void { this.tone(600, 0.06, 'square', 0.15); }

  /** Quest accepted. */
  playQuestAccept(): void {
    [392, 440, 523.25].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.2, undefined, i * 0.15));
  }

  /** Quest completed. */
  playQuestComplete(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.25, undefined, i * 0.12));
  }

  /** Item successfully crafted at a crafting station. */
  playCraft(): void {
    // Metallic clang + rising magical shimmer
    this.tone(220, 0.08, 'square', 0.28, 180);
    this.tone(440, 0.12, 'triangle', 0.20, 660, 0.08);
    this.tone(880, 0.18, 'sine', 0.15, 1320, 0.18);
  }

  // ── Background music ───────────────────────────────────────────────────────

  /**
   * Start looping background music for a zone (or 'menu').
   * Deferred automatically until unlock() is called if autoplay hasn't fired.
   */
  startZoneMusic(zoneId: string): void {
    if (this._currentZone === zoneId) return;
    if (!this._unlocked) {
      this._pendingZone = zoneId;
      return;
    }
    this.stopMusic();
    this._currentZone = zoneId;
    const gen = ++this._musicGen;
    this._scheduleLoop(zoneId, gen, 0);
  }

  /** Stop background music immediately. */
  stopMusic(): void {
    this._musicGen++;
    this._currentZone = null;
    this._pendingZone = null;
  }

  private _scheduleLoop(zoneId: string, gen: number, startDelay: number): void {
    const ctx = this.getCtx();
    if (!ctx || gen !== this._musicGen) return;

    const melody = ZONE_MELODIES[zoneId] ?? ZONE_MELODIES['menu'];
    const dest = this.musicGain ?? ctx.destination;

    let t = startDelay;
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
          gn.gain.setValueAtTime(0.35, at);
          gn.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.88);
          osc.start(at);
          osc.stop(at + dur);
        } catch {
          // ignore
        }
      }
      t += dur;
    }

    // Re-schedule next loop ~50ms before the current one ends to avoid gaps
    window.setTimeout(() => {
      if (gen === this._musicGen) this._scheduleLoop(zoneId, gen, 0);
    }, Math.max(0, (t - 0.05) * 1000));
  }
}
