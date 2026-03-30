/**
 * World map and fast-travel system integration tests.
 *
 * Covers:
 *   - ZONES data integrity — required fields, valid biomes, wave counts
 *   - Zone unlock chain — every zone (except zone1) has an unlockRequirement
 *   - Zone progression — minPlayerLevel increases with zone index
 *   - Fast-travel cost calculation — ECONOMY.FAST_TRAVEL_COST_PER_ZONE
 *   - Boss coverage — every zone has a defined bossType
 *   - Enemy coverage — every zone has at least one enemy type
 *   - Zone count — 19 zones from zone1 to zone19
 *   - Difficulty scaling — difficultyMult increases across zone tiers
 *   - XP rewards — later zones award more XP than earlier zones
 *   - Waystone / zone position coverage — all 19 zones have map positions
 */

import { describe, it, expect } from "vitest";
import { ZONES, ENEMY_TYPES, BOSS_TYPES, ECONOMY, type ZoneConfig } from "../../../src/config/constants";

// ── Local zone position map (mirrors WorldMapOverlay.ts ZONE_POS) ─────────────
// Used to validate that every zone has a defined map position for rendering.

const ZONE_POS: Record<string, { x: number; y: number }> = {
  zone1:  { x: 44,  y: 50  },
  zone2:  { x: 100, y: 50  },
  zone3:  { x: 156, y: 50  },
  zone4:  { x: 212, y: 50  },
  zone5:  { x: 268, y: 50  },
  zone6:  { x: 268, y: 90  },
  zone7:  { x: 212, y: 90  },
  zone8:  { x: 156, y: 90  },
  zone9:  { x: 100, y: 90  },
  zone10: { x: 44,  y: 90  },
  zone11: { x: 44,  y: 128 },
  zone12: { x: 100, y: 128 },
  zone13: { x: 156, y: 128 },
  zone14: { x: 212, y: 128 },
  zone15: { x: 268, y: 128 },
  zone16: { x: 268, y: 160 },
  zone17: { x: 212, y: 160 },
  zone18: { x: 156, y: 160 },
  zone19: { x: 100, y: 160 },
};

// Snake-path zone traversal order (mirrors WorldMapOverlay.ts ZONE_PATH)
const ZONE_PATH: string[] = [
  'zone1','zone2','zone3','zone4','zone5',
  'zone6','zone7','zone8','zone9','zone10',
  'zone11','zone12','zone13','zone14','zone15',
  'zone16','zone17','zone18','zone19',
];

// ── ZONES data integrity ──────────────────────────────────────────────────────

describe("ZONES data integrity", () => {
  it("has exactly 19 zones (zone1 through zone19)", () => {
    expect(ZONES).toHaveLength(19);
  });

  it("zone IDs follow the 'zoneN' pattern", () => {
    for (const z of ZONES) {
      expect(z.id).toMatch(/^zone\d+$/);
    }
  });

  it("all zone ids are unique", () => {
    const ids = ZONES.map(z => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every zone has a non-empty name, biome, and description", () => {
    for (const z of ZONES) {
      expect(z.name.length).toBeGreaterThan(0);
      expect(z.biome.length).toBeGreaterThan(0);
      expect(z.description.length).toBeGreaterThan(0);
    }
  });

  it("every zone has positive wave count", () => {
    for (const z of ZONES) {
      expect(z.waves).toBeGreaterThan(0);
    }
  });

  it("every zone has at least one enemy type", () => {
    for (const z of ZONES) {
      expect(z.enemyTypes.length).toBeGreaterThan(0);
    }
  });

  it("every zone has a valid boss type defined in BOSS_TYPES", () => {
    for (const z of ZONES) {
      expect(BOSS_TYPES).toHaveProperty(z.bossType);
    }
  });

  it("every enemy type in each zone is defined in ENEMY_TYPES", () => {
    for (const z of ZONES) {
      for (const enemyType of z.enemyTypes) {
        expect(ENEMY_TYPES).toHaveProperty(enemyType);
      }
    }
  });

  it("every zone has a positive difficultyMult (scales enemy stats)", () => {
    for (const z of ZONES) {
      expect(z.difficultyMult).toBeGreaterThan(0);
    }
  });

  it("every zone has a positive xpReward", () => {
    for (const z of ZONES) {
      expect(z.xpReward).toBeGreaterThan(0);
    }
  });

  it("every zone has a positive minPlayerLevel", () => {
    for (const z of ZONES) {
      expect(z.minPlayerLevel).toBeGreaterThan(0);
    }
  });

  it("every zone has valid color values (nonzero hex numbers)", () => {
    for (const z of ZONES) {
      expect(z.bgColor).toBeGreaterThan(0);
      expect(z.groundColor).toBeGreaterThan(0);
    }
  });
});

// ── Zone unlock chain ─────────────────────────────────────────────────────────

describe("Zone unlock chain", () => {
  it("zone1 has no unlock requirement (starter zone)", () => {
    const zone1 = ZONES.find(z => z.id === "zone1");
    expect(zone1).toBeDefined();
    expect(zone1!.unlockRequirement).toBeNull();
  });

  it("every zone after zone1 has an unlock requirement", () => {
    const laterZones = ZONES.filter(z => z.id !== "zone1");
    for (const z of laterZones) {
      expect(z.unlockRequirement).toBeTruthy();
    }
  });

  it("every unlock requirement references a valid zone id", () => {
    const zoneIds = new Set(ZONES.map(z => z.id));
    const laterZones = ZONES.filter(z => z.unlockRequirement !== null);
    for (const z of laterZones) {
      expect(zoneIds.has(z.unlockRequirement!)).toBe(true);
    }
  });

  it("unlock chain forms a linear progression (each zone unlocks the next)", () => {
    // zone2 requires zone1, zone3 requires zone2, etc.
    for (let i = 1; i < ZONES.length; i++) {
      const prevZone = ZONES[i - 1];
      const thisZone = ZONES[i];
      expect(thisZone.unlockRequirement).toBe(prevZone.id);
    }
  });

  it("zone19 is the final zone (no zone requires zone19 to unlock)", () => {
    const requiresZone19 = ZONES.filter(z => z.unlockRequirement === "zone19");
    expect(requiresZone19).toHaveLength(0);
  });
});

// ── Zone progression ─────────────────────────────────────────────────────────

describe("Zone progression", () => {
  it("minPlayerLevel increases monotonically across zones", () => {
    for (let i = 1; i < ZONES.length; i++) {
      expect(ZONES[i].minPlayerLevel).toBeGreaterThanOrEqual(ZONES[i - 1].minPlayerLevel);
    }
  });

  it("xpReward increases monotonically across zones", () => {
    for (let i = 1; i < ZONES.length; i++) {
      expect(ZONES[i].xpReward).toBeGreaterThan(ZONES[i - 1].xpReward);
    }
  });

  it("difficultyMult increases monotonically across zones", () => {
    for (let i = 1; i < ZONES.length; i++) {
      expect(ZONES[i].difficultyMult).toBeGreaterThanOrEqual(ZONES[i - 1].difficultyMult);
    }
  });

  it("zone19 (Astral Pinnacle) has the highest xpReward", () => {
    const maxXp = Math.max(...ZONES.map(z => z.xpReward));
    const zone19 = ZONES.find(z => z.id === "zone19");
    expect(zone19!.xpReward).toBe(maxXp);
  });

  it("zone1 (Verdant Hollow) has minPlayerLevel of 1", () => {
    const zone1 = ZONES.find(z => z.id === "zone1");
    expect(zone1!.minPlayerLevel).toBe(1);
  });
});

// ── Fast-travel cost calculation ──────────────────────────────────────────────

describe("Fast-travel cost calculation", () => {
  it("FAST_TRAVEL_COST_PER_ZONE is a positive gold amount", () => {
    expect(ECONOMY.FAST_TRAVEL_COST_PER_ZONE).toBeGreaterThan(0);
  });

  it("FAST_TRAVEL_COST_PER_ZONE is 10 gold", () => {
    expect(ECONOMY.FAST_TRAVEL_COST_PER_ZONE).toBe(10);
  });

  it("fast-travel cost scales with zone distance", () => {
    function travelCost(fromIndex: number, toIndex: number): number {
      return Math.abs(toIndex - fromIndex) * ECONOMY.FAST_TRAVEL_COST_PER_ZONE;
    }

    expect(travelCost(0, 0)).toBe(0);   // same zone — free
    expect(travelCost(0, 1)).toBe(10);  // 1 zone apart — 10g
    expect(travelCost(0, 4)).toBe(40);  // 4 zones — 40g
    expect(travelCost(0, 18)).toBe(180); // zone1 → zone19 — 180g
  });

  it("fast-travel from zone1 to zone19 costs 180g (18 zone steps × 10g)", () => {
    const distance = 18; // indices 0..18
    expect(distance * ECONOMY.FAST_TRAVEL_COST_PER_ZONE).toBe(180);
  });
});

// ── Waystone / map position coverage ─────────────────────────────────────────

describe("Waystone map position coverage", () => {
  it("all 19 zones have a defined map position", () => {
    for (const z of ZONES) {
      expect(ZONE_POS).toHaveProperty(z.id);
    }
  });

  it("every zone map position has numeric x and y coordinates", () => {
    for (const [, pos] of Object.entries(ZONE_POS)) {
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.y).toBeGreaterThan(0);
    }
  });

  it("zone positions are not duplicated (each zone has a unique position)", () => {
    const posKeys = Object.values(ZONE_POS).map(p => `${p.x},${p.y}`);
    expect(new Set(posKeys).size).toBe(posKeys.length);
  });

  it("ZONE_PATH contains all 19 zones in order", () => {
    expect(ZONE_PATH).toHaveLength(19);
    expect(ZONE_PATH[0]).toBe("zone1");
    expect(ZONE_PATH[18]).toBe("zone19");
  });

  it("ZONE_PATH order matches ZONES array order", () => {
    for (let i = 0; i < ZONES.length; i++) {
      expect(ZONE_PATH[i]).toBe(ZONES[i].id);
    }
  });
});

// ── Biome diversity ───────────────────────────────────────────────────────────

describe("Biome diversity", () => {
  it("has at least 5 distinct biome types across all zones", () => {
    const biomes = new Set(ZONES.map(z => z.biome));
    expect(biomes.size).toBeGreaterThanOrEqual(5);
  });

  it("includes Forest, Desert, and Ice biome regions", () => {
    const biomes = ZONES.map(z => z.biome.toLowerCase());
    const hasForest = biomes.some(b => b.includes("forest"));
    const hasDesert = biomes.some(b => b.includes("desert") || b.includes("plain") || b.includes("sand"));
    const hasIce    = biomes.some(b => b.includes("ice") || b.includes("frost") || b.includes("snow"));
    expect(hasForest).toBe(true);
    expect(hasDesert).toBe(true);
    expect(hasIce).toBe(true);
  });

  it("later zones (zone15+) include void/ethereal/astral biomes", () => {
    const lateZones = ZONES.filter((_, i) => i >= 14); // zone15..zone19
    const hasEndgameBiome = lateZones.some(z => {
      const b = z.biome.toLowerCase();
      return b.includes("void") || b.includes("ethereal") || b.includes("astral") || b.includes("twilight");
    });
    expect(hasEndgameBiome).toBe(true);
  });
});

// ── WorldMapState shape ───────────────────────────────────────────────────────
//
// The WorldMapState interface (from WorldMapOverlay.ts) defines what callers
// pass when opening the world map.  We validate the expected shape here.

describe("WorldMapState shape requirements", () => {
  it("a valid WorldMapState has currentZoneId, unlockedZoneIds, and hasActiveQuest", () => {
    const state = {
      currentZoneId:   "zone1",
      unlockedZoneIds: ["zone1"],
      hasActiveQuest:  false,
    };

    expect(typeof state.currentZoneId).toBe("string");
    expect(Array.isArray(state.unlockedZoneIds)).toBe(true);
    expect(typeof state.hasActiveQuest).toBe("boolean");
  });

  it("currentZoneId must be a valid zone id", () => {
    const validIds = new Set(ZONES.map(z => z.id));
    expect(validIds.has("zone1")).toBe(true);
    expect(validIds.has("zone19")).toBe(true);
    expect(validIds.has("zone0")).toBe(false);
    expect(validIds.has("zone20")).toBe(false);
  });
});
