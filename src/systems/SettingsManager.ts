/**
 * SettingsManager — singleton that persists game settings to localStorage.
 * Holds master/sfx/music volumes, display options, accessibility settings,
 * and applies them to live systems.
 */

import { SoundManager } from './SoundManager';
import type { ColorblindMode } from '../config/accessibilityPalette';
import { COLORBLIND_MATRICES } from '../config/accessibilityPalette';

export type { ColorblindMode };

const LS_KEY = 'pixelrealm_settings';

/** UI scale options: 1×, 1.5×, 2× */
export type UiScale = 1 | 1.5 | 2;

export interface GameSettings {
  masterVolume:   number; // 0–1
  sfxVolume:      number; // 0–1
  musicVolume:    number; // 0–1
  ambientVolume:  number; // 0–1
  muted:          boolean;
  fullscreen:     boolean;
  smoothScale:    boolean; // false = pixel-perfect (default), true = bilinear
  showFPS:        boolean;
  // Accessibility
  colorblindMode: ColorblindMode;
  uiScale:        UiScale;
  reducedMotion:  boolean;
}

const DEFAULTS: GameSettings = {
  masterVolume:   1.0,
  sfxVolume:      0.8,
  musicVolume:    0.5,
  ambientVolume:  0.3,
  muted:          false,
  fullscreen:     false,
  smoothScale:    false,
  showFPS:        false,
  colorblindMode: 'none',
  uiScale:        1,
  reducedMotion:  false,
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

  get ambientVolume(): number { return this._s.ambientVolume; }
  set ambientVolume(v: number) { this._s.ambientVolume = Math.max(0, Math.min(1, v)); this.applyAudio(); }

  get muted(): boolean { return this._s.muted; }
  set muted(v: boolean) { this._s.muted = v; }

  get fullscreen(): boolean { return this._s.fullscreen; }
  set fullscreen(v: boolean) { this._s.fullscreen = v; }

  get smoothScale(): boolean { return this._s.smoothScale; }
  set smoothScale(v: boolean) { this._s.smoothScale = v; this.applySmoothScale(); }

  get showFPS(): boolean { return this._s.showFPS; }
  set showFPS(v: boolean) { this._s.showFPS = v; }

  get colorblindMode(): ColorblindMode { return this._s.colorblindMode; }
  set colorblindMode(v: ColorblindMode) { this._s.colorblindMode = v; this.applyColorblindFilter(); }

  get uiScale(): UiScale { return this._s.uiScale; }
  set uiScale(v: UiScale) { this._s.uiScale = v; this.applyUiScale(); }

  get reducedMotion(): boolean { return this._s.reducedMotion; }
  set reducedMotion(v: boolean) { this._s.reducedMotion = v; }

  // ── Apply helpers ──────────────────────────────────────────────────────────

  /** Push current volume settings to SoundManager. */
  applyAudio(): void {
    const sm = SoundManager.getInstance();
    sm.sfxVolume     = this._s.masterVolume * this._s.sfxVolume;
    sm.musicVolume   = this._s.masterVolume * this._s.musicVolume;
    sm.ambientVolume = this._s.masterVolume * this._s.ambientVolume;
    // Restore mute state
    if (this._s.muted && !sm.isMuted) sm.toggleMute();
    if (!this._s.muted && sm.isMuted) sm.toggleMute();
  }

  /** Toggle canvas smoothing based on smoothScale setting. */
  applySmoothScale(): void {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    canvas.style.imageRendering = this._s.smoothScale ? 'auto' : 'pixelated';
  }

  /**
   * Apply colorblind CSS filter to the game canvas.
   * Uses an SVG feColorMatrix filter injected into the document.
   */
  applyColorblindFilter(): void {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;

    const mode = this._s.colorblindMode;

    if (mode === 'none') {
      canvas.style.filter = '';
      return;
    }

    const matrix = COLORBLIND_MATRICES[mode];

    // Ensure the inline SVG filter exists in the document
    const svgId = 'pixelrealm-colorblind-filter';
    let svgEl = document.getElementById(svgId) as SVGSVGElement | null;
    if (!svgEl) {
      const created = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
      created.setAttribute('id', svgId);
      created.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      created.setAttribute('aria-hidden', 'true');
      created.innerHTML = `<defs>
        <filter id="cb-protanopia">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
        </filter>
        <filter id="cb-deuteranopia">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
        </filter>
        <filter id="cb-tritanopia">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
        </filter>
      </defs>`;
      document.body.appendChild(created);
      svgEl = created;
    }

    // Update the specific filter's matrix values
    const filterId = `cb-${mode}`;
    const filterEl = svgEl.querySelector(`#${filterId} feColorMatrix`);
    if (filterEl) {
      // Reformat the 4×5 matrix into SVG feColorMatrix `values` string (rows separated by spaces)
      const rows = [0, 1, 2, 3].map(r => matrix.slice(r * 5, r * 5 + 5).join(' ')).join('  ');
      filterEl.setAttribute('values', rows);
    }

    canvas.style.filter = `url(#${filterId})`;
  }

  /**
   * Apply CSS transform scale to the game container for UI scaling.
   * Scales at 1×, 1.5×, or 2× while keeping the canvas centered.
   */
  applyUiScale(): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    const scale = this._s.uiScale;
    container.style.transform = scale === 1 ? '' : `scale(${scale})`;
    container.style.transformOrigin = 'center center';
  }

  /** Apply all display + audio + accessibility settings at startup. */
  applyAll(): void {
    this.applyAudio();
    this.applySmoothScale();
    this.applyColorblindFilter();
    this.applyUiScale();
  }
}
