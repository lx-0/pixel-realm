/**
 * Accessibility system tests (PIX-428).
 *
 * Covers:
 *   - COLORBLIND_MATRICES — shape and value sanity for all three presets
 *   - UI scale options — valid discrete values and round-trip persistence
 *   - Settings defaults — colorblindMode and uiScale field defaults
 *   - localStorage persistence simulation for accessibility preferences
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── Inline copies of frontend constants to avoid importing browser modules ───

type ColorblindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia";
type UiScale = 1 | 1.5 | 2;

const COLORBLIND_MATRICES: Record<Exclude<ColorblindMode, "none">, number[]> = {
  protanopia: [
    0.152, 1.053, -0.205, 0, 0,
    0.115, 0.786, 0.099, 0, 0,
    -0.004, -0.048, 1.052, 0, 0,
    0, 0, 0, 1, 0,
  ],
  deuteranopia: [
    0.367, 0.861, -0.228, 0, 0,
    0.28, 0.673, 0.047, 0, 0,
    -0.012, 0.043, 0.969, 0, 0,
    0, 0, 0, 1, 0,
  ],
  tritanopia: [
    1.256, -0.077, -0.179, 0, 0,
    -0.078, 0.931, 0.148, 0, 0,
    0.005, 0.691, 0.304, 0, 0,
    0, 0, 0, 1, 0,
  ],
};

const UI_SCALE_OPTIONS: UiScale[] = [1, 1.5, 2];

const DEFAULTS = {
  colorblindMode: "none" as ColorblindMode,
  uiScale: 1 as UiScale,
  reducedMotion: false,
};

// ── localStorage mock ────────────────────────────────────────────────────────

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// ── Simulated SettingsManager persistence ────────────────────────────────────

const LS_KEY = "pixelrealm_settings";

function loadSettings(storage: LocalStorageMock) {
  try {
    const raw = storage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

function saveSettings(
  storage: LocalStorageMock,
  s: typeof DEFAULTS & Record<string, unknown>
) {
  storage.setItem(LS_KEY, JSON.stringify(s));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Colorblind palette matrices", () => {
  const modes = ["protanopia", "deuteranopia", "tritanopia"] as const;

  it("has matrices for all three presets", () => {
    expect(Object.keys(COLORBLIND_MATRICES)).toEqual(modes);
  });

  it.each(modes)("%s matrix has 20 entries (4 rows × 5 cols)", (mode) => {
    expect(COLORBLIND_MATRICES[mode]).toHaveLength(20);
  });

  it.each(modes)("%s matrix values are finite numbers", (mode) => {
    for (const v of COLORBLIND_MATRICES[mode]) {
      expect(typeof v).toBe("number");
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it.each(modes)(
    "%s matrix last row preserves alpha (row 4 = 0 0 0 1 0)",
    (mode) => {
      const m = COLORBLIND_MATRICES[mode];
      // Row 3 (index 15-19) is the alpha row: [0, 0, 0, 1, 0]
      expect(m.slice(15)).toEqual([0, 0, 0, 1, 0]);
    }
  );

  it.each(modes)(
    "%s matrix RGB channel sums are close to 1.0 (color conserving)",
    (mode) => {
      const m = COLORBLIND_MATRICES[mode];
      // For rows 0-2, the first 3 columns should sum close to 1.0
      for (let row = 0; row < 3; row++) {
        const sum = m[row * 5] + m[row * 5 + 1] + m[row * 5 + 2];
        expect(sum).toBeCloseTo(1.0, 1);
      }
    }
  );
});

describe("UI scale options", () => {
  it("contains exactly three options: 1, 1.5, 2", () => {
    expect(UI_SCALE_OPTIONS).toEqual([1, 1.5, 2]);
  });

  it("all scale values are positive numbers", () => {
    for (const s of UI_SCALE_OPTIONS) {
      expect(s).toBeGreaterThan(0);
    }
  });

  it("max scale is 2x", () => {
    expect(Math.max(...UI_SCALE_OPTIONS)).toBe(2);
  });

  it("min scale is 1x (no shrink)", () => {
    expect(Math.min(...UI_SCALE_OPTIONS)).toBe(1);
  });
});

describe("Accessibility settings — defaults", () => {
  it("colorblindMode defaults to 'none'", () => {
    expect(DEFAULTS.colorblindMode).toBe("none");
  });

  it("uiScale defaults to 1", () => {
    expect(DEFAULTS.uiScale).toBe(1);
  });

  it("reducedMotion defaults to false", () => {
    expect(DEFAULTS.reducedMotion).toBe(false);
  });
});

describe("Accessibility settings — localStorage persistence", () => {
  let storage: LocalStorageMock;

  beforeEach(() => {
    storage = new LocalStorageMock();
  });

  it("returns defaults when nothing is stored", () => {
    const s = loadSettings(storage);
    expect(s.colorblindMode).toBe("none");
    expect(s.uiScale).toBe(1);
    expect(s.reducedMotion).toBe(false);
  });

  it("persists and reloads colorblindMode", () => {
    const s = { ...DEFAULTS, colorblindMode: "deuteranopia" as ColorblindMode };
    saveSettings(storage, s);
    const loaded = loadSettings(storage);
    expect(loaded.colorblindMode).toBe("deuteranopia");
  });

  it("persists and reloads all three colorblind presets", () => {
    const modes: ColorblindMode[] = [
      "protanopia",
      "deuteranopia",
      "tritanopia",
    ];
    for (const mode of modes) {
      const s = { ...DEFAULTS, colorblindMode: mode };
      saveSettings(storage, s);
      expect(loadSettings(storage).colorblindMode).toBe(mode);
    }
  });

  it("persists and reloads uiScale 1.5x", () => {
    const s = { ...DEFAULTS, uiScale: 1.5 as UiScale };
    saveSettings(storage, s);
    const loaded = loadSettings(storage);
    expect(loaded.uiScale).toBe(1.5);
  });

  it("persists and reloads uiScale 2x", () => {
    const s = { ...DEFAULTS, uiScale: 2 as UiScale };
    saveSettings(storage, s);
    const loaded = loadSettings(storage);
    expect(loaded.uiScale).toBe(2);
  });

  it("merges stored values with defaults (forward compatibility)", () => {
    // Simulate a settings blob missing the new fields
    storage.setItem(
      LS_KEY,
      JSON.stringify({
        masterVolume: 0.5,
        musicVolume: 0.3,
        // colorblindMode intentionally absent
      })
    );
    const loaded = loadSettings(storage);
    expect(loaded.colorblindMode).toBe("none"); // falls back to default
    expect(loaded.uiScale).toBe(1);             // falls back to default
    expect(loaded.masterVolume).toBe(0.5);       // retains stored value
  });

  it("handles corrupt JSON gracefully and returns defaults", () => {
    storage.setItem(LS_KEY, "{ this is not json }}}");
    const loaded = loadSettings(storage);
    expect(loaded.colorblindMode).toBe("none");
    expect(loaded.uiScale).toBe(1);
  });

  it("round-trips reducedMotion = true", () => {
    const s = { ...DEFAULTS, reducedMotion: true };
    saveSettings(storage, s);
    expect(loadSettings(storage).reducedMotion).toBe(true);
  });
});
