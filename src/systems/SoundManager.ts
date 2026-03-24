/**
 * SoundManager — singleton Web Audio API procedural synthesizer.
 * All SFX and background music are generated in-engine with no external files.
 * Starts muted; call unlock() on first user interaction to satisfy autoplay policy.
 *
 * Features: zone melodies, boss themes, ambient soundscapes, crossfade transitions,
 * combat hit variations (critical/miss/dodge), UI sounds (panel/equip).
 */

import type { EffectKey } from '../config/constants';

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
  zone5: [ // Ice Caverns — B flat minor, sparse & crystalline
    [233.08, 0.60], [0, 0.20], [277.18, 0.40], [0, 0.15],
    [311.13, 0.50], [293.66, 0.30], [261.63, 0.30], [233.08, 0.70],
    [0, 0.30], [174.61, 0.50], [0, 0.20],
    [220.00, 0.40], [233.08, 0.30], [277.18, 0.60], [0, 0.20],
    [233.08, 1.00], [0, 0.50],
  ],
  zone11: [ // Dragonbone Wastes — B minor, dark & smoldering with heavy steps
    [123.47, 0.50], [0, 0.10], [146.83, 0.30], [0, 0.10],
    [185.00, 0.40], [174.61, 0.25], [155.56, 0.25], [123.47, 0.60],
    [0, 0.15], [110.00, 0.35], [123.47, 0.20], [138.59, 0.20],
    [185.00, 0.50], [0, 0.10], [174.61, 0.25], [155.56, 0.20],
    [138.59, 0.20], [123.47, 1.00], [0, 0.40],
  ],
  combat: [ // Combat — D minor, driving & urgent
    [146.83, 0.15], [174.61, 0.15], [196.00, 0.15], [220.00, 0.20],
    [196.00, 0.15], [174.61, 0.15], [146.83, 0.25], [0, 0.10],
    [130.81, 0.15], [146.83, 0.15], [174.61, 0.15], [196.00, 0.20],
    [220.00, 0.15], [246.94, 0.15], [261.63, 0.30], [0, 0.10],
    [220.00, 0.15], [196.00, 0.15], [174.61, 0.15], [146.83, 0.20],
    [130.81, 0.15], [116.54, 0.15], [130.81, 0.40], [0, 0.15],
  ],
};

/** Boss-specific battle themes — heavier, more intense than zone melodies. */
const BOSS_MELODIES: Record<string, Note[]> = {
  slime_king: [ // Bouncy menace — C minor, staccato & rhythmic
    [261.63, 0.12], [0, 0.05], [311.13, 0.12], [0, 0.05], [392.00, 0.20],
    [349.23, 0.12], [311.13, 0.12], [261.63, 0.20], [0, 0.08],
    [196.00, 0.12], [233.08, 0.12], [261.63, 0.15], [311.13, 0.25],
    [261.63, 0.12], [233.08, 0.12], [196.00, 0.30], [0, 0.10],
    [261.63, 0.10], [311.13, 0.10], [349.23, 0.10], [392.00, 0.15],
    [349.23, 0.10], [311.13, 0.10], [261.63, 0.25], [0, 0.12],
  ],
  bandit_chief: [ // Outlaw showdown — E minor, aggressive & driving
    [164.81, 0.10], [196.00, 0.10], [246.94, 0.15], [329.63, 0.20],
    [293.66, 0.10], [246.94, 0.10], [196.00, 0.20], [0, 0.08],
    [164.81, 0.10], [0, 0.05], [164.81, 0.10], [196.00, 0.10],
    [246.94, 0.10], [329.63, 0.10], [392.00, 0.25], [0, 0.08],
    [329.63, 0.10], [293.66, 0.10], [246.94, 0.15], [196.00, 0.20],
    [164.81, 0.10], [130.81, 0.10], [164.81, 0.30], [0, 0.12],
  ],
  archon: [ // Dark sorcery — D# minor, dissonant & foreboding
    [155.56, 0.40], [0, 0.10], [185.00, 0.30], [207.65, 0.20],
    [0, 0.15], [155.56, 0.15], [185.00, 0.15], [233.08, 0.35],
    [207.65, 0.20], [185.00, 0.20], [155.56, 0.50], [0, 0.15],
    [116.54, 0.30], [138.59, 0.20], [155.56, 0.25], [0, 0.10],
    [185.00, 0.15], [207.65, 0.15], [233.08, 0.20], [311.13, 0.35],
    [233.08, 0.20], [155.56, 0.40], [0, 0.20],
  ],
  kraken: [ // Abyssal dread — low register, heavy & ominous
    [82.41, 0.30], [98.00, 0.20], [110.00, 0.25], [0, 0.10],
    [130.81, 0.15], [110.00, 0.15], [98.00, 0.20], [82.41, 0.35],
    [0, 0.12], [73.42, 0.25], [82.41, 0.15], [98.00, 0.15],
    [130.81, 0.30], [0, 0.10], [110.00, 0.15], [98.00, 0.15],
    [82.41, 0.20], [73.42, 0.15], [65.41, 0.40], [0, 0.15],
    [82.41, 0.10], [98.00, 0.10], [110.00, 0.10], [130.81, 0.30], [0, 0.15],
  ],
  ancient_dracolich: [ // Undying terror — B minor low register, crushing & relentless
    [61.74, 0.40], [0, 0.10], [73.42, 0.30], [82.41, 0.20],
    [98.00, 0.15], [92.50, 0.15], [82.41, 0.30], [0, 0.10],
    [61.74, 0.20], [69.30, 0.20], [77.78, 0.20], [92.50, 0.35],
    [0, 0.12], [82.41, 0.15], [73.42, 0.15], [61.74, 0.25],
    [55.00, 0.15], [61.74, 0.10], [73.42, 0.10], [82.41, 0.40],
    [0, 0.15], [92.50, 0.12], [98.00, 0.12], [123.47, 0.35], [0, 0.20],
  ],
  glacial_wyrm: [ // Frozen fury — high crystalline + low rumble
    [233.08, 0.20], [277.18, 0.15], [311.13, 0.20], [0, 0.10],
    [466.16, 0.12], [415.30, 0.12], [349.23, 0.20], [311.13, 0.25],
    [0, 0.10], [233.08, 0.15], [174.61, 0.20], [146.83, 0.30],
    [0, 0.12], [233.08, 0.10], [277.18, 0.10], [311.13, 0.10],
    [349.23, 0.15], [311.13, 0.15], [277.18, 0.15], [233.08, 0.25],
    [174.61, 0.20], [233.08, 0.35], [0, 0.18],
  ],
};

/** Ambient layer config: oscillator type, frequency, gain, optional modulation. */
interface AmbientVoice {
  type: OscillatorType;
  freq: number;
  gain: number;
  freqLFO?: number;  // LFO speed (Hz) for frequency modulation
  lfoDepth?: number; // LFO depth in Hz
  pan?: number;      // -1 to 1
}

/** Zone ambient definitions — layered voices that create environmental texture. */
const ZONE_AMBIENTS: Record<string, AmbientVoice[]> = {
  zone1: [ // Forest: wind, bird chirps, rustling
    { type: 'sine',     freq: 120,  gain: 0.04, freqLFO: 0.15, lfoDepth: 8 },   // low wind hum
    { type: 'sine',     freq: 240,  gain: 0.02, freqLFO: 0.08, lfoDepth: 12 },  // upper wind
    { type: 'triangle', freq: 1800, gain: 0.008, freqLFO: 2.5, lfoDepth: 200, pan: 0.6 }, // bird chirp L
    { type: 'triangle', freq: 2200, gain: 0.006, freqLFO: 3.2, lfoDepth: 300, pan: -0.5 }, // bird chirp R
  ],
  zone2: [ // Desert: dry wind, sparse rattling
    { type: 'sine',     freq: 90,   gain: 0.05, freqLFO: 0.12, lfoDepth: 15 },  // deep wind
    { type: 'sawtooth', freq: 55,   gain: 0.015, freqLFO: 0.06, lfoDepth: 5 },  // sand rumble
    { type: 'square',   freq: 3200, gain: 0.003, freqLFO: 4.0, lfoDepth: 800 }, // rattlesnake-like
  ],
  zone3: [ // Dungeon: drips, echoes, low rumble
    { type: 'sine',     freq: 65,   gain: 0.05, freqLFO: 0.04, lfoDepth: 3 },   // deep cave drone
    { type: 'sine',     freq: 130,  gain: 0.02, freqLFO: 0.07, lfoDepth: 6 },   // harmonic
    { type: 'triangle', freq: 1400, gain: 0.005, freqLFO: 5.0, lfoDepth: 600, pan: 0.4 }, // drip L
    { type: 'triangle', freq: 1600, gain: 0.004, freqLFO: 3.8, lfoDepth: 500, pan: -0.3 }, // drip R
  ],
  zone4: [ // Coastal: waves, seagulls, wind
    { type: 'sine',     freq: 100,  gain: 0.05, freqLFO: 0.18, lfoDepth: 20 },  // wave surge
    { type: 'sine',     freq: 200,  gain: 0.025, freqLFO: 0.18, lfoDepth: 40 }, // wave harmonic
    { type: 'triangle', freq: 2600, gain: 0.007, freqLFO: 1.8, lfoDepth: 400, pan: 0.7 }, // seagull
    { type: 'sine',     freq: 150,  gain: 0.015, freqLFO: 0.25, lfoDepth: 25 }, // wind gusts
  ],
  zone5: [ // Ice: crystalline tinkle, cave wind, deep resonance
    { type: 'sine',     freq: 80,   gain: 0.04, freqLFO: 0.05, lfoDepth: 4 },   // cave resonance
    { type: 'sine',     freq: 160,  gain: 0.02, freqLFO: 0.03, lfoDepth: 3 },   // harmonic drone
    { type: 'triangle', freq: 3400, gain: 0.005, freqLFO: 6.0, lfoDepth: 900, pan: 0.5 }, // crystal tinkle
    { type: 'sine',     freq: 4200, gain: 0.003, freqLFO: 4.5, lfoDepth: 700, pan: -0.4 }, // ice shimmer
  ],
  zone11: [ // Dragonbone Wastes: hot ash wind, low bone creak, distant roar
    { type: 'sawtooth', freq: 55,   gain: 0.035, freqLFO: 0.08, lfoDepth: 6 },   // deep smoldering rumble
    { type: 'sine',     freq: 110,  gain: 0.025, freqLFO: 0.12, lfoDepth: 10 },  // ash wind harmonic
    { type: 'square',   freq: 2800, gain: 0.003, freqLFO: 3.5, lfoDepth: 600, pan: 0.4 }, // bone creak R
    { type: 'square',   freq: 2400, gain: 0.003, freqLFO: 2.8, lfoDepth: 500, pan: -0.5 }, // bone creak L
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
  private ambientGain?: GainNode;

  private _sfxVolume    = 0.8;
  private _musicVolume  = 0.5;
  private _ambientVolume = 0.3;
  private _unlocked     = false;
  private _muted        = false;
  private _musicGen     = 0;
  private _pendingZone: string | null = null;
  private _currentZone: string | null = null;
  private _preCombatZone: string | null = null;
  private _currentBoss: string | null = null;
  private _preBossZone: string | null = null;

  // Ambient state
  private _ambientNodes: { osc: OscillatorNode; lfo?: OscillatorNode; gain: GainNode }[] = [];
  private _currentAmbientZone: string | null = null;

  // Crossfade state
  private _crossfadeTimer: ReturnType<typeof setTimeout> | null = null;

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
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = this._ambientVolume;
        this.ambientGain.connect(this.ctx.destination);
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
    if (this.sfxGain && !this._muted) this.sfxGain.gain.value = this._sfxVolume;
  }

  get musicVolume(): number { return this._musicVolume; }
  set musicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain && !this._muted) this.musicGain.gain.value = this._musicVolume;
  }

  get ambientVolume(): number { return this._ambientVolume; }
  set ambientVolume(v: number) {
    this._ambientVolume = Math.max(0, Math.min(1, v));
    if (this.ambientGain && !this._muted) this.ambientGain.gain.value = this._ambientVolume;
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

  /** Critical hit — punchy impact with harmonic ring. */
  playCriticalHit(): void {
    this.tone(520, 0.06, 'sawtooth', 0.4, 260);
    this.tone(780, 0.12, 'sine', 0.25, 1200, 0.04);
    this.tone(1040, 0.08, 'triangle', 0.15, undefined, 0.08);
  }

  /** Attack misses / enemy dodges. */
  playMiss(): void {
    this.tone(400, 0.08, 'sine', 0.12, 200);
  }

  /** Player dodges an attack. */
  playDodge(): void {
    this.tone(600, 0.06, 'sine', 0.15, 900);
    this.tone(800, 0.04, 'sine', 0.10, 1200, 0.05);
  }

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

  /** UI panel opens (inventory, map, etc.). */
  playPanelOpen(): void {
    this.tone(440, 0.05, 'sine', 0.12, 660);
    this.tone(660, 0.06, 'sine', 0.08, undefined, 0.04);
  }

  /** UI panel closes. */
  playPanelClose(): void {
    this.tone(550, 0.05, 'sine', 0.10, 350);
  }

  /** Item equipped from inventory. */
  playItemEquip(): void {
    this.tone(330, 0.04, 'square', 0.15, 440);
    this.tone(550, 0.06, 'triangle', 0.12, undefined, 0.04);
    this.tone(660, 0.08, 'sine', 0.08, undefined, 0.08);
  }

  /** Quest accepted. */
  playQuestAccept(): void {
    [392, 440, 523.25].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.2, undefined, i * 0.15));
  }

  /** Quest completed. */
  playQuestComplete(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.25, undefined, i * 0.12));
  }

  /** Status effect applied to an entity (poison/burn/freeze/stun). */
  playStatusApply(type: EffectKey): void {
    switch (type) {
      case 'poison': this.tone(140, 0.15, 'sawtooth', 0.18, 90);  break;
      case 'burn':   this.tone(600, 0.08, 'square',   0.22, 900); break;
      case 'freeze': this.tone(880, 0.14, 'sine',     0.20, 440); break;
      case 'stun':
        this.tone(200, 0.18, 'square', 0.30, 80);
        this.tone(600, 0.10, 'sine',   0.15, undefined, 0.12);
        break;
    }
  }

  /** Status effect expires. */
  playStatusExpire(): void { this.tone(660, 0.08, 'sine', 0.12); }

  /** Item successfully crafted at a crafting station. */
  playCraft(): void {
    // Metallic clang + rising magical shimmer
    this.tone(220, 0.08, 'square', 0.28, 180);
    this.tone(440, 0.12, 'triangle', 0.20, 660, 0.08);
    this.tone(880, 0.18, 'sine', 0.15, 1320, 0.18);
  }

  // ── Ambient soundscapes ──────────────────────────────────────────────────

  /** Start ambient soundscape for a zone. Fades in over 1 second. */
  startAmbient(zoneId: string): void {
    if (this._currentAmbientZone === zoneId) return;
    this.stopAmbient();
    const voices = ZONE_AMBIENTS[zoneId];
    if (!voices) return;

    const ctx = this.getCtx();
    if (!ctx || !this.ambientGain) return;

    this._currentAmbientZone = zoneId;
    const now = ctx.currentTime;

    for (const voice of voices) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = voice.type;
        osc.frequency.setValueAtTime(voice.freq, now);

        // Fade in over 1 second
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(voice.gain, now + 1.0);

        // Optional stereo panning
        let dest: AudioNode = this.ambientGain;
        if (voice.pan !== undefined && voice.pan !== 0) {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(voice.pan, now);
          panner.connect(this.ambientGain);
          dest = panner;
        }

        osc.connect(gain);
        gain.connect(dest);

        // Optional LFO for frequency modulation (creates movement)
        let lfo: OscillatorNode | undefined;
        if (voice.freqLFO && voice.lfoDepth) {
          lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(voice.freqLFO, now);
          lfoGain.gain.setValueAtTime(voice.lfoDepth, now);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(now);
        }

        osc.start(now);
        this._ambientNodes.push({ osc, lfo, gain });
      } catch {
        // ignore
      }
    }
  }

  /** Stop ambient soundscape with 1-second fade out. */
  stopAmbient(): void {
    const ctx = this.getCtx();
    const now = ctx?.currentTime ?? 0;

    for (const node of this._ambientNodes) {
      try {
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.linearRampToValueAtTime(0, now + 1.0);
        node.osc.stop(now + 1.1);
        node.lfo?.stop(now + 1.1);
      } catch {
        // ignore
      }
    }
    this._ambientNodes = [];
    this._currentAmbientZone = null;
  }

  // ── Background music (with crossfade) ────────────────────────────────────

  /**
   * Start looping background music for a zone (or 'menu').
   * Crossfades over ~2 seconds: 1s fade out + 1s fade in.
   * Deferred automatically until unlock() is called if autoplay hasn't fired.
   */
  startZoneMusic(zoneId: string): void {
    if (this._currentZone === zoneId) return;
    if (!this._unlocked) {
      this._pendingZone = zoneId;
      return;
    }

    // Cancel any pending crossfade
    if (this._crossfadeTimer) {
      clearTimeout(this._crossfadeTimer);
      this._crossfadeTimer = null;
    }

    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) {
      this.stopMusic();
      this._currentZone = zoneId;
      const gen = ++this._musicGen;
      this._scheduleLoop(zoneId, gen, 0);
      return;
    }

    const wasPlaying = this._currentZone !== null;

    if (wasPlaying) {
      // Fade out current music over 1 second
      const now = ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.0001, now + 1.0);

      // After fade out, start new music with fade in
      const prevGen = this._musicGen;
      this._crossfadeTimer = setTimeout(() => {
        this._crossfadeTimer = null;
        // Stop old melody loop
        if (this._musicGen === prevGen) this._musicGen++;
        this._currentZone = zoneId;
        const gen = ++this._musicGen;

        // Fade in new music over 1 second
        if (this.musicGain && !this._muted) {
          const t = ctx.currentTime;
          this.musicGain.gain.cancelScheduledValues(t);
          this.musicGain.gain.setValueAtTime(0.0001, t);
          this.musicGain.gain.linearRampToValueAtTime(this._musicVolume, t + 1.0);
        }

        this._scheduleLoop(zoneId, gen, 0);
      }, 1000);
    } else {
      // No music was playing — start immediately with short fade in
      this.stopMusic();
      this._currentZone = zoneId;
      const gen = ++this._musicGen;

      const now = ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(0.0001, now);
      this.musicGain.gain.linearRampToValueAtTime(
        this._muted ? 0 : this._musicVolume, now + 0.5
      );

      this._scheduleLoop(zoneId, gen, 0);
    }
  }

  /** Stop background music with fade out. */
  stopMusic(): void {
    if (this._crossfadeTimer) {
      clearTimeout(this._crossfadeTimer);
      this._crossfadeTimer = null;
    }
    this._musicGen++;
    this._currentZone = null;
    this._pendingZone = null;
  }

  // ── Mute ───────────────────────────────────────────────────────────────────

  get isMuted(): boolean { return this._muted; }

  /** Toggle master mute. Preserves volume settings for when unmuted. */
  toggleMute(): boolean {
    this._muted = !this._muted;
    const ctx = this.getCtx();
    if (ctx) {
      if (this._muted) {
        if (this.sfxGain)     this.sfxGain.gain.value     = 0;
        if (this.musicGain)   this.musicGain.gain.value   = 0;
        if (this.ambientGain) this.ambientGain.gain.value = 0;
      } else {
        if (this.sfxGain)     this.sfxGain.gain.value     = this._sfxVolume;
        if (this.musicGain)   this.musicGain.gain.value   = this._musicVolume;
        if (this.ambientGain) this.ambientGain.gain.value = this._ambientVolume;
      }
    }
    return this._muted;
  }

  // ── Combat music ───────────────────────────────────────────────────────────

  /** Switch to combat music, saving the current zone to resume afterward. */
  startCombatMusic(): void {
    if (this._currentZone === 'combat') return;
    this._preCombatZone = this._currentZone;
    this.startZoneMusic('combat');
  }

  /** Return to the zone music that was playing before combat started. */
  stopCombatMusic(): void {
    if (this._currentZone !== 'combat') return;
    const zone = this._preCombatZone;
    this._preCombatZone = null;
    if (zone) this.startZoneMusic(zone);
  }

  // ── Boss music ─────────────────────────────────────────────────────────────

  /** Switch to boss-specific battle theme. Falls back to combat music if no boss melody. */
  startBossMusic(bossType: string): void {
    if (this._currentBoss === bossType) return;
    // Save current zone for restoration after boss dies
    if (!this._preBossZone && this._currentZone !== 'combat') {
      this._preBossZone = this._currentZone ?? this._preCombatZone;
    } else if (!this._preBossZone) {
      this._preBossZone = this._preCombatZone;
    }
    this._currentBoss = bossType;

    if (BOSS_MELODIES[bossType]) {
      // Use boss-specific melody through the same music pipeline
      this._currentZone = null; // force re-entry
      this.stopMusic();
      this._currentZone = `boss_${bossType}`;
      const gen = ++this._musicGen;
      this._scheduleBossLoop(bossType, gen, 0);
    } else {
      this.startCombatMusic();
    }
  }

  /** Return to zone music after boss dies. */
  stopBossMusic(): void {
    this._currentBoss = null;
    const zone = this._preBossZone ?? this._preCombatZone;
    this._preBossZone = null;
    this._preCombatZone = null;
    if (zone) {
      this.startZoneMusic(zone);
    } else {
      this.stopMusic();
    }
  }

  private _scheduleBossLoop(bossType: string, gen: number, startDelay: number): void {
    const ctx = this.getCtx();
    if (!ctx || gen !== this._musicGen) return;

    const melody = BOSS_MELODIES[bossType];
    if (!melody) return;
    const dest = this.musicGain ?? ctx.destination;

    let t = startDelay;
    for (const [freq, dur] of melody) {
      if (freq > 0) {
        const at = ctx.currentTime + t;
        try {
          // Boss themes use heavier sawtooth + layered octave for intensity
          const osc = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gn = ctx.createGain();
          const gn2 = ctx.createGain();
          osc.connect(gn);
          osc2.connect(gn2);
          gn.connect(dest);
          gn2.connect(dest);

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, at);
          gn.gain.setValueAtTime(0.28, at);
          gn.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.85);

          // Sub-octave layer for weight
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 0.5, at);
          gn2.gain.setValueAtTime(0.18, at);
          gn2.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.9);

          osc.start(at);
          osc.stop(at + dur);
          osc2.start(at);
          osc2.stop(at + dur);
        } catch {
          // ignore
        }
      }
      t += dur;
    }

    window.setTimeout(() => {
      if (gen === this._musicGen) this._scheduleBossLoop(bossType, gen, 0);
    }, Math.max(0, (t - 0.05) * 1000));
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
