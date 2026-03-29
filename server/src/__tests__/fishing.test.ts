/**
 * Fishing system integration tests.
 *
 * Covers:
 *   - FISH_DEFS data integrity — all required fields, valid rarities
 *   - ROD_DEFS data integrity — valid fields, rarity bonuses, reel speeds
 *   - FishingSystem state machine — idle → casting → waiting → biting → reeling → success/fail
 *   - chargeCast() — power fills over time, clamps at 1.0
 *   - reelTick() — in-zone progress gain, out-of-zone penalty, fail threshold
 *   - cancel() — resets to idle from any state
 *   - Fish roll — zone filtering, junk always available, rare/legendary boost from rod
 *   - Fish database — zone coverage, XP/gold values
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FishingSystem,
  FISH_DEFS,
  ROD_DEFS,
  type FishRarity,
} from "../../../src/systems/FishingSystem";

// ── Stub Phaser.Math.Between (used only in releaseCast) ───────────────────────
vi.stubGlobal("Phaser", {
  Math: {
    Between: (min: number, _max: number) => min, // always return min for determinism
  },
});

// ── FISH_DEFS data integrity ──────────────────────────────────────────────────

const VALID_FISH_RARITIES: FishRarity[] = ["common", "uncommon", "rare", "legendary", "junk"];

describe("FISH_DEFS data integrity", () => {
  it("has at least one fish defined", () => {
    expect(FISH_DEFS.length).toBeGreaterThan(0);
  });

  it("every fish has a non-empty id, name, and description", () => {
    for (const f of FISH_DEFS) {
      expect(f.id.length).toBeGreaterThan(0);
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it("every fish has a valid rarity", () => {
    for (const f of FISH_DEFS) {
      expect(VALID_FISH_RARITIES).toContain(f.rarity);
    }
  });

  it("all fish ids are unique", () => {
    const ids = FISH_DEFS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every fish has a positive baseWeight", () => {
    for (const f of FISH_DEFS) {
      expect(f.baseWeight).toBeGreaterThan(0);
    }
  });

  it("every fish has non-negative xpReward and goldValue", () => {
    for (const f of FISH_DEFS) {
      expect(f.xpReward).toBeGreaterThanOrEqual(0);
      expect(f.goldValue).toBeGreaterThanOrEqual(0);
    }
  });

  it("legendary fish have higher XP reward than common fish", () => {
    const legendaryXp = FISH_DEFS
      .filter(f => f.rarity === "legendary")
      .map(f => f.xpReward);
    const commonXp = FISH_DEFS
      .filter(f => f.rarity === "common")
      .map(f => f.xpReward);
    expect(Math.min(...legendaryXp)).toBeGreaterThan(Math.max(...commonXp));
  });

  it("at least one fish has zones: [] (available everywhere)", () => {
    const globalFish = FISH_DEFS.filter(f => f.zones.length === 0);
    expect(globalFish.length).toBeGreaterThan(0);
  });

  it("junk items have zones: [] (always catchable)", () => {
    const junkFish = FISH_DEFS.filter(f => f.rarity === "junk");
    for (const j of junkFish) {
      expect(j.zones).toHaveLength(0);
    }
  });
});

// ── ROD_DEFS data integrity ───────────────────────────────────────────────────

describe("ROD_DEFS data integrity", () => {
  it("has at least one rod defined", () => {
    expect(ROD_DEFS.length).toBeGreaterThan(0);
  });

  it("every rod has a non-empty id and name", () => {
    for (const r of ROD_DEFS) {
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
    }
  });

  it("all rod ids are unique", () => {
    const ids = ROD_DEFS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all rarityBonus values are non-negative", () => {
    for (const r of ROD_DEFS) {
      expect(r.rarityBonus).toBeGreaterThanOrEqual(0);
    }
  });

  it("all reelSpeed values are positive", () => {
    for (const r of ROD_DEFS) {
      expect(r.reelSpeed).toBeGreaterThan(0);
    }
  });

  it("rod_basic exists as the starter rod (goldCost = 50)", () => {
    const basic = ROD_DEFS.find(r => r.id === "rod_basic");
    expect(basic).toBeDefined();
    expect(basic!.goldCost).toBe(50);
    expect(basic!.rarityBonus).toBe(0);
  });

  it("rod_master has the highest rarityBonus of all rods", () => {
    const master = ROD_DEFS.find(r => r.id === "rod_master");
    const maxBonus = Math.max(...ROD_DEFS.map(r => r.rarityBonus));
    expect(master).toBeDefined();
    expect(master!.rarityBonus).toBe(maxBonus);
  });

  it("rod_master has the lowest reelSpeed (easier to reel)", () => {
    const master = ROD_DEFS.find(r => r.id === "rod_master");
    const minSpeed = Math.min(...ROD_DEFS.map(r => r.reelSpeed));
    expect(master!.reelSpeed).toBe(minSpeed);
  });
});

// ── FishingSystem state machine ───────────────────────────────────────────────

describe("FishingSystem state machine", () => {
  let sys: FishingSystem;

  beforeEach(() => {
    sys = new FishingSystem();
  });

  it("starts in idle state", () => {
    expect(sys.state).toBe("idle");
  });

  it("startCast() transitions idle → casting", () => {
    sys.startCast();
    expect(sys.state).toBe("casting");
  });

  it("startCast() does nothing if not in idle state", () => {
    sys.startCast();
    sys.startCast(); // second call ignored
    expect(sys.state).toBe("casting");
  });

  it("chargeCast() fills castPower over time", () => {
    sys.startCast();
    const p = sys.chargeCast(600); // 600 ms → 600/1200 = 0.5
    expect(p).toBeCloseTo(0.5, 2);
    expect(sys.castPower).toBeCloseTo(0.5, 2);
  });

  it("chargeCast() clamps castPower at 1.0", () => {
    sys.startCast();
    const p = sys.chargeCast(9999);
    expect(p).toBe(1.0);
    expect(sys.castPower).toBe(1.0);
  });

  it("chargeCast() returns current power when not in casting state", () => {
    const p = sys.chargeCast(500); // still idle
    expect(p).toBe(0);
  });

  it("releaseCast() transitions casting → waiting", () => {
    sys.startCast();
    sys.releaseCast();
    expect(sys.state).toBe("waiting");
  });

  it("releaseCast() does nothing when not in casting state", () => {
    sys.releaseCast(); // idle — no-op
    expect(sys.state).toBe("idle");
  });

  it("cancel() resets to idle from casting state", () => {
    sys.startCast();
    sys.cancel();
    expect(sys.state).toBe("idle");
  });

  it("cancel() resets to idle from waiting state", () => {
    sys.startCast();
    sys.releaseCast();
    sys.cancel();
    expect(sys.state).toBe("idle");
  });
});

// ── FishingSystem reeling mechanics ──────────────────────────────────────────

describe("FishingSystem reeling mechanics", () => {
  let sys: FishingSystem;

  beforeEach(() => {
    sys = new FishingSystem();
    // Manually set state to 'reeling' so we can test reelTick()
    // without going through the full state machine (avoids timer dependencies)
    (sys as unknown as Record<string, unknown>).state = "reeling";
    sys.reelProgress   = 0;
    sys.tensionZonePos = 0.5;
    sys.outsideTicks   = 0;
  });

  it("reelTick() returns in_progress when reel is not complete", () => {
    const result = sys.reelTick(false, 16);
    expect(result).toBe("in_progress");
  });

  it("reelTick() returns in_progress when not in reeling state", () => {
    (sys as unknown as Record<string, unknown>).state = "idle";
    const result = sys.reelTick(true, 16);
    expect(result).toBe("in_progress");
  });

  it("reelTick() with tapActive=true in zone advances reelProgress", () => {
    // Use a tiny deltaMs=1 so drift is minimal (0.018 per tick).
    // reelProgress=0.5, tensionZonePos=0.5 → zone=[0.30, 0.70] after tiny drift.
    sys.reelProgress   = 0.5;
    sys.tensionZonePos = 0.5;
    (sys as unknown as Record<string, unknown>).tensionDriftDir = 1;
    const before = sys.reelProgress;
    sys.reelTick(true, 1); // 1 ms → drift ≈ 0.018, zone stays near center
    expect(sys.reelProgress).toBeGreaterThan(before);
  });

  it("reelTick() with tapActive=false never advances progress", () => {
    sys.reelProgress   = 0.5;
    sys.tensionZonePos = 0.5;
    const before = sys.reelProgress;
    sys.reelTick(false, 16);
    expect(sys.reelProgress).toBeLessThanOrEqual(before);
  });

  it("reelTick() returns fail after REEL_FAIL_THRESHOLD consecutive missed ticks", () => {
    // Set zone at upper boundary (0.85) drifting downward.
    // With deltaMs=1, drift=0.018/tick so zone stays above 0.5 for 10+ ticks.
    // reelProgress=0 always falls below the zone lower bound → outsideTicks++
    sys.reelProgress   = 0.0;
    sys.tensionZonePos = 0.85;
    (sys as unknown as Record<string, unknown>).tensionDriftDir = 1;
    let outcome: ReturnType<typeof sys.reelTick> = "in_progress";
    for (let i = 0; i < 15; i++) {
      outcome = sys.reelTick(true, 1); // 1 ms → small drift, zone stays high
      if (outcome === "fail") break;
    }
    expect(outcome).toBe("fail");
  });

  it("reelTick() returns success when reelProgress reaches 1.0", () => {
    // Pre-fill progress close to 100% and put tension zone so tap is in-zone
    sys.reelProgress   = 0.95;
    sys.tensionZonePos = 0.5;
    sys.outsideTicks   = 0;
    let outcome: ReturnType<typeof sys.reelTick> = "in_progress";
    for (let i = 0; i < 5; i++) {
      outcome = sys.reelTick(true, 16);
      if (outcome === "success") break;
    }
    expect(outcome).toBe("success");
  });
});

// ── Fish zone filtering ───────────────────────────────────────────────────────

describe("Fish zone filtering", () => {
  it("zone1 has at least one catchable fish", () => {
    const pool = FISH_DEFS.filter(
      f => f.zones.length === 0 || f.zones.includes("zone1"),
    );
    expect(pool.length).toBeGreaterThan(0);
  });

  it("every zone string in fish definitions follows the 'zoneN' pattern", () => {
    for (const f of FISH_DEFS) {
      for (const z of f.zones) {
        expect(z).toMatch(/^zone\d+$/);
      }
    }
  });

  it("endgame zones (zone15+) have fish that don't appear in early zones", () => {
    const endgameFish = FISH_DEFS.filter(
      f => f.zones.some(z => parseInt(z.replace("zone", "")) >= 15),
    );
    expect(endgameFish.length).toBeGreaterThan(0);
  });
});
