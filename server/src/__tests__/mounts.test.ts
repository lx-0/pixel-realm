/**
 * Mount system integration tests.
 *
 * Covers:
 *   - MOUNTS data integrity — all fields present, valid rarity/source values
 *   - Speed multipliers — correct ordering by tier, all > 1.0
 *   - Cast times — positive values, within expected range
 *   - Gold costs — only common/purchasable mounts have a nonzero cost
 *   - MOUNT config constants — stable range, toggle key, cast time
 *   - Mount rarity distribution — all four rarities represented
 *   - Unique id and sprite key per mount
 */

import { describe, it, expect } from "vitest";
import { MOUNTS, MOUNT } from "../../../src/config/constants";

const VALID_RARITIES = ["common", "rare", "epic", "legendary"] as const;

// ── MOUNTS data integrity ─────────────────────────────────────────────────────

describe("MOUNTS data integrity", () => {
  it("has at least one mount defined", () => {
    expect(MOUNTS.length).toBeGreaterThanOrEqual(1);
  });

  it("every mount has a non-empty id, name, and source", () => {
    for (const m of MOUNTS) {
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.source.length).toBeGreaterThan(0);
    }
  });

  it("every mount has a valid rarity", () => {
    for (const m of MOUNTS) {
      expect(VALID_RARITIES).toContain(m.rarity);
    }
  });

  it("all mount ids are unique", () => {
    const ids = MOUNTS.map(m => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all sprite keys are unique (no two mounts share a sprite)", () => {
    const keys = MOUNTS.map(m => m.spriteKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("all icon keys are unique", () => {
    const keys = MOUNTS.map(m => m.iconKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("every mount has a positive dust color (nonzero hex)", () => {
    for (const m of MOUNTS) {
      expect(typeof m.dustColor).toBe("number");
      expect(m.dustColor).toBeGreaterThan(0);
    }
  });
});

// ── Speed multipliers ─────────────────────────────────────────────────────────

describe("Mount speed multipliers", () => {
  it("all speed multipliers are greater than 1.0 (mounts always speed up the player)", () => {
    for (const m of MOUNTS) {
      expect(m.speedMult).toBeGreaterThan(1.0);
    }
  });

  it("legendary mount has the highest speed multiplier", () => {
    const legendary = MOUNTS.filter(m => m.rarity === "legendary");
    const epic       = MOUNTS.filter(m => m.rarity === "epic");
    expect(legendary.length).toBeGreaterThan(0);
    expect(epic.length).toBeGreaterThan(0);
    const maxLegendarySpeed = Math.max(...legendary.map(m => m.speedMult));
    const maxEpicSpeed      = Math.max(...epic.map(m => m.speedMult));
    expect(maxLegendarySpeed).toBeGreaterThanOrEqual(maxEpicSpeed);
  });

  it("common mount has the lowest speed multiplier", () => {
    const common = MOUNTS.filter(m => m.rarity === "common");
    const rare   = MOUNTS.filter(m => m.rarity === "rare");
    expect(common.length).toBeGreaterThan(0);
    const maxCommon = Math.max(...common.map(m => m.speedMult));
    const minRare   = Math.min(...rare.map(m => m.speedMult));
    expect(maxCommon).toBeLessThan(minRare);
  });

  it("no mount has a speed multiplier above 3.0 (balance cap)", () => {
    for (const m of MOUNTS) {
      expect(m.speedMult).toBeLessThanOrEqual(3.0);
    }
  });
});

// ── Cast times ────────────────────────────────────────────────────────────────

describe("Mount cast times", () => {
  it("all cast times are positive millisecond values", () => {
    for (const m of MOUNTS) {
      expect(m.castTimeMs).toBeGreaterThan(0);
    }
  });

  it("all cast times are between 500 ms and 5000 ms", () => {
    for (const m of MOUNTS) {
      expect(m.castTimeMs).toBeGreaterThanOrEqual(500);
      expect(m.castTimeMs).toBeLessThanOrEqual(5000);
    }
  });
});

// ── Gold costs ────────────────────────────────────────────────────────────────

describe("Mount gold costs", () => {
  it("at least one mount is purchasable (goldCost > 0)", () => {
    const purchasable = MOUNTS.filter(m => m.goldCost > 0);
    expect(purchasable.length).toBeGreaterThan(0);
  });

  it("common mounts are the only purchasable ones (goldCost > 0)", () => {
    const nonCommonPurchasable = MOUNTS.filter(
      m => m.rarity !== "common" && m.goldCost > 0,
    );
    expect(nonCommonPurchasable).toHaveLength(0);
  });

  it("all gold costs are non-negative", () => {
    for (const m of MOUNTS) {
      expect(m.goldCost).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Rarity distribution ───────────────────────────────────────────────────────

describe("Mount rarity distribution", () => {
  it("all four rarities are represented", () => {
    const rarities = new Set(MOUNTS.map(m => m.rarity));
    expect(rarities.has("common")).toBe(true);
    expect(rarities.has("rare")).toBe(true);
    expect(rarities.has("epic")).toBe(true);
    expect(rarities.has("legendary")).toBe(true);
  });

  it("legendary mounts are the rarest (fewest entries)", () => {
    const counts: Record<string, number> = {};
    for (const m of MOUNTS) {
      counts[m.rarity] = (counts[m.rarity] ?? 0) + 1;
    }
    const legendaryCount = counts["legendary"] ?? 0;
    const commonCount    = counts["common"] ?? 0;
    expect(legendaryCount).toBeLessThanOrEqual(commonCount);
  });
});

// ── MOUNT config constants ────────────────────────────────────────────────────

describe("MOUNT config constants", () => {
  it("CAST_TIME_MS is a positive number", () => {
    expect(MOUNT.CAST_TIME_MS).toBeGreaterThan(0);
  });

  it("STABLE_RANGE_PX is a positive number (NPC interaction range)", () => {
    expect(MOUNT.STABLE_RANGE_PX).toBeGreaterThan(0);
  });

  it("TOGGLE_KEY is a non-empty string", () => {
    expect(typeof MOUNT.TOGGLE_KEY).toBe("string");
    expect(MOUNT.TOGGLE_KEY.length).toBeGreaterThan(0);
  });

  it("DISMOUNT_ON_HIT is true (mounts cancelled by damage)", () => {
    expect(MOUNT.DISMOUNT_ON_HIT).toBe(true);
  });
});

// ── War Horse specific (purchasable starter mount) ────────────────────────────

describe("War Horse — purchasable starter mount", () => {
  const warHorse = MOUNTS.find(m => m.id === "war_horse");

  it("war_horse is defined", () => {
    expect(warHorse).toBeDefined();
  });

  it("war_horse is common rarity", () => {
    expect(warHorse!.rarity).toBe("common");
  });

  it("war_horse is purchasable (goldCost = 500)", () => {
    expect(warHorse!.goldCost).toBe(500);
  });

  it("war_horse speed multiplier is 1.6", () => {
    expect(warHorse!.speedMult).toBe(1.6);
  });
});
