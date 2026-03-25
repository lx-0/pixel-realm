/**
 * Companion pet system tests.
 *
 * Covers:
 *   - computePetBonus() — pure bonus calculations for all pet types
 *   - scaledPetBonus()  — level scaling
 *   - petXpForLevel()   — XP requirements
 *   - DB operations:    addPet, equipPet, feedPet, dismissPet, awardPetXp
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getDb } from "../db/client";
import {
  computePetBonus,
  scaledPetBonus,
  petXpForLevel,
  MAX_PET_LEVEL,
  PET_DEFINITIONS,
  ALL_PET_TYPES,
  addPet,
  equipPet,
  feedPet,
  dismissPet,
  awardPetXp,
  savePetHappiness,
} from "../db/pets";

// ── Mock chain factories ──────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(res, rej ?? undefined),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(rows).catch(fn),
    finally: (fn: () => void) => Promise.resolve(rows).finally(fn),
  };
  chain.from  = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeInsertChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    values:    vi.fn(),
    returning: vi.fn().mockResolvedValue(rows),
  };
  chain.values = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeUpdateChain(rows: unknown[] = []) {
  const whereResult = {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(res, rej ?? undefined),
    returning: vi.fn().mockResolvedValue(rows),
  };
  const setResult = {
    where: vi.fn().mockReturnValue({ ...whereResult }),
  };
  return { set: vi.fn().mockReturnValue(setResult) };
}

function buildMockDb(opts: {
  selectRows?: unknown[];
  insertRows?: unknown[];
  updateRows?: unknown[];
} = {}) {
  const { selectRows = [], insertRows = [], updateRows = [] } = opts;
  return {
    select: vi.fn().mockReturnValue(makeSelectChain(selectRows)),
    insert: vi.fn().mockReturnValue(makeInsertChain(insertRows)),
    update: vi.fn().mockReturnValue(makeUpdateChain(updateRows)),
  };
}

// ── Test data ─────────────────────────────────────────────────────────────────

const BASE_PET = {
  id:         "pet-1",
  playerId:   "player-1",
  petType:    "wolf",
  level:      1,
  xp:         0,
  happiness:  100,
  lastFedAt:  new Date(),
  isEquipped: false,
  acquiredAt: new Date(),
};

// ── computePetBonus() ─────────────────────────────────────────────────────────

describe("computePetBonus", () => {
  it("returns zeroes for unknown pet type", () => {
    const b = computePetBonus("unknown_pet", 1, 100);
    expect(b.damagePct).toBe(0);
    expect(b.critPct).toBe(0);
    expect(b.maxHpPct).toBe(0);
  });

  it("returns zeroes when happiness is 0", () => {
    const b = computePetBonus("wolf", 5, 0);
    expect(b.damagePct).toBe(0);
  });

  it("wolf gives damagePct bonus at level 1", () => {
    const b = computePetBonus("wolf", 1, 100);
    expect(b.damagePct).toBeCloseTo(0.05);
    expect(b.critPct).toBe(0);
  });

  it("hawk gives critPct bonus", () => {
    const b = computePetBonus("hawk", 1, 100);
    expect(b.critPct).toBeCloseTo(0.05);
    expect(b.damagePct).toBe(0);
  });

  it("cat gives dodgePct bonus", () => {
    const b = computePetBonus("cat", 1, 100);
    expect(b.dodgePct).toBeCloseTo(0.05);
  });

  it("dragon_whelp gives allStatPct — applies to dmg, crit, dodge, maxHp", () => {
    const b = computePetBonus("dragon_whelp", 1, 100);
    expect(b.damagePct).toBeCloseTo(0.03);
    expect(b.critPct).toBeCloseTo(0.03);
    expect(b.dodgePct).toBeCloseTo(0.03);
    expect(b.maxHpPct).toBeCloseTo(0.03);
  });

  it("wisp gives xpPct bonus", () => {
    const b = computePetBonus("wisp", 1, 100);
    expect(b.xpPct).toBeCloseTo(0.10);
  });

  it("golem gives maxHpPct bonus", () => {
    const b = computePetBonus("golem", 1, 100);
    expect(b.maxHpPct).toBeCloseTo(0.10);
  });

  it("bonus scales with level (+1% per level above 1)", () => {
    const b1  = computePetBonus("wolf", 1,  100);
    const b10 = computePetBonus("wolf", 10, 100);
    expect(b10.damagePct).toBeCloseTo(0.05 * (1 + 9 * 0.01));
    expect(b10.damagePct).toBeGreaterThan(b1.damagePct);
  });

  it("level caps at MAX_PET_LEVEL for scaling", () => {
    const bMax    = computePetBonus("wolf", MAX_PET_LEVEL,     100);
    const bCapped = computePetBonus("wolf", MAX_PET_LEVEL + 5, 100);
    expect(bMax.damagePct).toBeCloseTo(bCapped.damagePct);
  });
});

// ── scaledPetBonus() ──────────────────────────────────────────────────────────

describe("scaledPetBonus", () => {
  it("returns base value at level 1", () => {
    expect(scaledPetBonus(0.05, 1)).toBeCloseTo(0.05);
  });

  it("scales by +1% per level above 1", () => {
    expect(scaledPetBonus(0.05, 11)).toBeCloseTo(0.05 * 1.10);
  });
});

// ── petXpForLevel() ───────────────────────────────────────────────────────────

describe("petXpForLevel", () => {
  it("level 1 requires 100 XP", () => {
    expect(petXpForLevel(1)).toBe(100);
  });

  it("XP scales linearly with level", () => {
    expect(petXpForLevel(5)).toBe(500);
    expect(petXpForLevel(10)).toBe(1000);
    expect(petXpForLevel(20)).toBe(2000);
  });
});

// ── PET_DEFINITIONS sanity ────────────────────────────────────────────────────

describe("PET_DEFINITIONS", () => {
  it("all expected types are defined", () => {
    const types = ["wolf", "hawk", "cat", "dragon_whelp", "wisp", "golem"];
    types.forEach(t => expect(PET_DEFINITIONS[t as keyof typeof PET_DEFINITIONS]).toBeDefined());
  });

  it("ALL_PET_TYPES contains all 6 types", () => {
    expect(ALL_PET_TYPES).toHaveLength(6);
  });

  it("all definitions have positive vendorCost", () => {
    ALL_PET_TYPES.forEach(t => {
      expect(PET_DEFINITIONS[t].vendorCost).toBeGreaterThan(0);
    });
  });
});

// ── addPet() ──────────────────────────────────────────────────────────────────

describe("addPet", () => {
  beforeEach(() => vi.mocked(getDb).mockReset());

  it("inserts a new pet and returns it", async () => {
    const newPet = { ...BASE_PET, isEquipped: false };
    vi.mocked(getDb).mockReturnValue(buildMockDb({ insertRows: [newPet] }) as any);

    const result = await addPet("player-1", "wolf");
    expect(result.petType).toBe("wolf");
    expect(result.level).toBe(1);
    expect(result.happiness).toBe(100);
    expect(result.isEquipped).toBe(false);
  });
});

// ── feedPet() ─────────────────────────────────────────────────────────────────

describe("feedPet", () => {
  beforeEach(() => vi.mocked(getDb).mockReset());

  it("restores +30 happiness (capped at 100)", async () => {
    const petWith70 = { ...BASE_PET, happiness: 70 };
    const db = buildMockDb({ selectRows: [petWith70] });

    vi.mocked(getDb).mockReturnValue(db as any);

    const result = await feedPet("player-1", "pet-1");
    expect(result.happiness).toBe(100);
  });

  it("caps happiness at 100", async () => {
    const petWith90 = { ...BASE_PET, happiness: 90 };
    const db = buildMockDb({ selectRows: [petWith90] });
    vi.mocked(getDb).mockReturnValue(db as any);

    const result = await feedPet("player-1", "pet-1");
    expect(result.happiness).toBe(100);
  });

  it("throws PET_NOT_FOUND when pet doesn't belong to player", async () => {
    const db = buildMockDb({ selectRows: [] }); // empty = not found
    vi.mocked(getDb).mockReturnValue(db as any);

    await expect(feedPet("player-1", "pet-999")).rejects.toThrow("PET_NOT_FOUND");
  });
});

// ── awardPetXp() ──────────────────────────────────────────────────────────────

describe("awardPetXp", () => {
  beforeEach(() => vi.mocked(getDb).mockReset());

  it("accumulates XP without level-up when below threshold", async () => {
    const pet = { ...BASE_PET, level: 1, xp: 0 };
    const db  = buildMockDb({ selectRows: [pet] });
    vi.mocked(getDb).mockReturnValue(db as any);

    const res = await awardPetXp("player-1", "pet-1", 50);
    expect(res.xp).toBe(50);
    expect(res.level).toBe(1);
    expect(res.leveledUp).toBe(false);
  });

  it("levels up when XP crosses threshold", async () => {
    const pet = { ...BASE_PET, level: 1, xp: 90 };
    const db  = buildMockDb({ selectRows: [pet] });
    vi.mocked(getDb).mockReturnValue(db as any);

    // 90 + 20 = 110, threshold at level 1 = 100; 10 XP remainder
    const res = await awardPetXp("player-1", "pet-1", 20);
    expect(res.level).toBe(2);
    expect(res.xp).toBe(10);
    expect(res.leveledUp).toBe(true);
  });

  it("does not level beyond MAX_PET_LEVEL", async () => {
    const pet = { ...BASE_PET, level: MAX_PET_LEVEL, xp: 0 };
    const db  = buildMockDb({ selectRows: [pet] });
    vi.mocked(getDb).mockReturnValue(db as any);

    const res = await awardPetXp("player-1", "pet-1", 9999);
    expect(res.level).toBe(MAX_PET_LEVEL);
    expect(res.leveledUp).toBe(false);
  });

  it("throws PET_NOT_FOUND for unknown pet", async () => {
    const db = buildMockDb({ selectRows: [] });
    vi.mocked(getDb).mockReturnValue(db as any);

    await expect(awardPetXp("player-1", "pet-999", 10)).rejects.toThrow("PET_NOT_FOUND");
  });
});

// ── dismissPet() / equipPet() ─────────────────────────────────────────────────

describe("dismissPet", () => {
  beforeEach(() => vi.mocked(getDb).mockReset());

  it("calls db.update to unequip all pets", async () => {
    const db = buildMockDb();
    vi.mocked(getDb).mockReturnValue(db as any);

    await dismissPet("player-1");
    expect(db.update).toHaveBeenCalled();
  });
});

describe("equipPet", () => {
  beforeEach(() => vi.mocked(getDb).mockReset());

  it("throws PET_NOT_FOUND when pet id is not found after equip", async () => {
    // update().set().where().returning() returns empty array
    const db = buildMockDb({ updateRows: [] });
    vi.mocked(getDb).mockReturnValue(db as any);

    await expect(equipPet("player-1", "nonexistent")).rejects.toThrow("PET_NOT_FOUND");
  });
});
