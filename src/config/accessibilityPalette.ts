/**
 * Accessibility — Visual Configuration & Colorblind Filter Matrices
 *
 * Provides colorblind simulation/correction matrices, shape indicator
 * definitions, and focus ring specs for the accessibility settings tab.
 *
 * Art direction:
 *  - Shape indicators supplement color to distinguish entity types
 *  - Health bar border styles provide secondary visual cue
 *  - Focus ring uses player-blue palette with 4-phase pulse animation
 *  - All icons follow 16×16 pixel-art conventions at 4× display zoom
 *
 * All hex colors sourced from the 32-color master palette.
 */

// ── Colorblind Modes ────────────────────────────────────────────────────────

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

/**
 * 4×5 color matrices for WebGL feColorMatrix / Phaser PostFX pipeline.
 * Based on Machado et al. (2009), severity 1.0.
 *
 * Apply via CSS:  filter: url('assets/ui/accessibility/filter_colorblind.svg#protanopia')
 * Apply via WebGL: use the matrix arrays below in a custom PostFX pipeline.
 */
export const COLORBLIND_MATRICES: Record<Exclude<ColorblindMode, 'none'>, number[]> = {
  protanopia: [
    0.152,  1.053, -0.205, 0, 0,
    0.115,  0.786,  0.099, 0, 0,
   -0.004, -0.048,  1.052, 0, 0,
    0,      0,      0,     1, 0,
  ],
  deuteranopia: [
    0.367,  0.861, -0.228, 0, 0,
    0.280,  0.673,  0.047, 0, 0,
   -0.012,  0.043,  0.969, 0, 0,
    0,      0,      0,     1, 0,
  ],
  tritanopia: [
    1.256, -0.077, -0.179, 0, 0,
   -0.078,  0.931,  0.148, 0, 0,
    0.005,  0.691,  0.304, 0, 0,
    0,      0,      0,     1, 0,
  ],
};

// ── Shape Indicators ────────────────────────────────────────────────────────
// Spritesheet: assets/ui/accessibility/ui_indicator_shapes.png (64×16, 4 frames)
// Used alongside color to distinguish entity types for colorblind players.

export type EntityIndicator = 'friendly' | 'enemy' | 'neutral' | 'interactive';

export const SHAPE_INDICATOR_FRAMES: Record<EntityIndicator, number> = {
  friendly:    0,  // Circle (player blue)
  enemy:       1,  // Diamond (bright red)
  neutral:     2,  // Triangle (gold)
  interactive: 3,  // Square (leaf green)
};

export const SHAPE_INDICATOR_SHEET = {
  key:        'ui_indicator_shapes',
  path:       'assets/ui/accessibility/ui_indicator_shapes.png',
  frameWidth:  16,
  frameHeight: 16,
  totalFrames: 4,
} as const;

// ── Health Bar Border Styles ────────────────────────────────────────────────
// Spritesheet: assets/ui/accessibility/ui_healthbar_borders.png (64×8, 4 frames)
// Different border patterns provide secondary colorblind-safe cue.

export type HealthBarStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export const HEALTHBAR_BORDER_FRAMES: Record<HealthBarStyle, number> = {
  solid:  0,  // Friendly — smooth blue border
  dashed: 1,  // Enemy — dashed red border
  dotted: 2,  // Neutral — dotted gold border
  double: 3,  // Boss — double purple border
};

export const HEALTHBAR_BORDER_SHEET = {
  key:        'ui_healthbar_borders',
  path:       'assets/ui/accessibility/ui_healthbar_borders.png',
  frameWidth:  16,
  frameHeight: 8,
  totalFrames: 4,
} as const;

// ── Focus Ring ──────────────────────────────────────────────────────────────
// Spritesheet: assets/ui/accessibility/ui_focus_ring.png (64×16, 4 frames)
// Pulsing outline for keyboard-focused UI elements.

export const FOCUS_RING_SHEET = {
  key:        'ui_focus_ring',
  path:       'assets/ui/accessibility/ui_focus_ring.png',
  frameWidth:  16,
  frameHeight: 16,
  totalFrames: 4,
  animFrameRate: 6,  // 6 fps pulse
} as const;

// ── Settings Icons ──────────────────────────────────────────────────────────
// All 16×16 PNG + SVG source in assets/ui/accessibility/

export const A11Y_ICONS = {
  tabIcon:       'assets/ui/accessibility/icon_setting_a11y.png',
  colorblind:    'assets/ui/accessibility/icon_setting_colorblind.png',
  fontScale:     'assets/ui/accessibility/icon_setting_font_scale.png',
  reducedMotion: 'assets/ui/accessibility/icon_setting_reduced_motion.png',
  keyboard:      'assets/ui/accessibility/icon_setting_keyboard.png',
} as const;

// ── Font Scale Options ──────────────────────────────────────────────────────

export const FONT_SCALE_OPTIONS = [0.75, 1.0, 1.25, 1.5] as const;
export type FontScale = typeof FONT_SCALE_OPTIONS[number];

// ── Accessibility Settings Defaults ─────────────────────────────────────────

export interface AccessibilitySettings {
  colorblindMode: ColorblindMode;
  fontScale:      FontScale;
  reducedMotion:  boolean;
  keyboardNav:    boolean;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  colorblindMode: 'none',
  fontScale:      1.0,
  reducedMotion:  false,
  keyboardNav:    false,
};
