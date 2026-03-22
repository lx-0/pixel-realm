/**
 * SettingsManager — singleton that persists game settings to localStorage.
 * Holds master/sfx/music volumes, display options, and applies them to live systems.
 */

import { SoundManager } from './SoundManager';

const LS_KEY = 'pixelrealm_settings';

export interface GameSettings {
  masterVolume: number; // 0–1
  sfxVolume:    number; // 0–1
  musicVolume:  number; // 0–1
  fullscreen:   boolean;
  smoothScale:  boolean; // false = pixel-perfect (default), true = bilinear
  showFPS:      boolean;
}

const DEFAULTS: GameSettings = {
  masterVolume: 1.0,
  sfxVolume:    0.8,
  musicVolume:  0.5,
  fullscreen:   false,
  smoothScale:  false,
  showFPS:      false,
};

export class SettingsManager {
  private static _instance: SettingsManager | null = null;

  static getInstance(): SettingsManager {
    if (!SettingsManager._instance) SettingsManager._instance = new SettingsManager();
    return SettingsManager._instance;
  }

  private _s: GameSettings;

  private constructor() {
    this._s = this.load();
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      // ignore parse errors
    }
    return { ...DEFAULTS };
  }

  save(): void {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this._s)); } catch { /* ignore */ }
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  get masterVolume(): number { return this._s.masterVolume; }
  set masterVolume(v: number) { this._s.masterVolume = Math.max(0, Math.min(1, v)); this.applyAudio(); }

  get sfxVolume(): number { return this._s.sfxVolume; }
  set sfxVolume(v: number) { this._s.sfxVolume = Math.max(0, Math.min(1, v)); this.applyAudio(); }

  get musicVolume(): number { return this._s.musicVolume; }
  set musicVolume(v: number) { this._s.musicVolume = Math.max(0, Math.min(1, v)); this.applyAudio(); }

  get fullscreen(): boolean { return this._s.fullscreen; }
  set fullscreen(v: boolean) { this._s.fullscreen = v; }

  get smoothScale(): boolean { return this._s.smoothScale; }
  set smoothScale(v: boolean) { this._s.smoothScale = v; this.applySmoothScale(); }

  get showFPS(): boolean { return this._s.showFPS; }
  set showFPS(v: boolean) { this._s.showFPS = v; }

  // ── Apply helpers ──────────────────────────────────────────────────────────

  /** Push current volume settings to SoundManager. */
  applyAudio(): void {
    const sfx = SoundManager.getInstance();
    sfx.sfxVolume   = this._s.masterVolume * this._s.sfxVolume;
    sfx.musicVolume = this._s.masterVolume * this._s.musicVolume;
  }

  /** Toggle canvas smoothing based on smoothScale setting. */
  applySmoothScale(): void {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    canvas.style.imageRendering = this._s.smoothScale ? 'auto' : 'pixelated';
  }

  /** Apply all display + audio settings at startup. */
  applyAll(): void {
    this.applyAudio();
    this.applySmoothScale();
  }
}
