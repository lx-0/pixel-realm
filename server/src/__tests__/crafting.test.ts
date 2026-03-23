/**
 * Crafting system tests.
 *
 * Covers:
 *   - RECIPES array validity (all recipes have required fields)
 *   - craftItem() — unknown recipe, missing ingredients, successful craft
 *   - craftItem() — high-tier failure rate (materials consumed, item NOT created)
 *   - craftItem() — ingredient stacking (FIFO consumption across rows)
 *   - getCraftingProgress() — returns progress rows
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Top-level mock for DB ─────────────────────────────────────────────────────

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

vi.mock("../db/inventory", () => ({
  addItem: vi.fn().mockResolvedValue({ id: "new-inv-id", playerId: "p1", itemId: "potion_health_small", quantity: 1 }),
}));

import { getDb } from "../db/client";
import { addItem } from "../db/inventory";
import { craftItem, getCraftingProgress, RECIPES } from "../db/crafting";

// ── Mock chain factories (matching pattern from db.test.ts) ──────────────────

function makeSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(res, rej ?? undefined),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(rows).catch(fn),
    finally: (fn: () => void) => Promise.resolve(rows).finally(fn),
    limit: vi.fn().mockResolvedValue(rows),
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeInsertChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  chain.onConflictDoUpdate = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(rows);
  // make chain thenable for the onConflictDoUpdate case
  chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(rows).then(res, rej ?? undefined);
  return chain;
}

function makeUpdateChain() {
  const whereResult = {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve([]).then(res, rej ?? undefined),
    returning: vi.fn().mockResolvedValue([]),
  };
  return {
    set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(whereResult) }),
  };
}

function makeDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function buildMockDb(opts: {
  selectRows?: unknown[];
  insertRows?: unknown[];
}) {
  const { selectRows = [], insertRows = [] } = opts;
  const mockInsert = vi.fn().mockReturnValue(makeInsertChain(insertRows));
  const mockUpdate = vi.fn().mockReturnValue(makeUpdateChain());
  const mockDelete = vi.fn().mockReturnValue(makeDeleteChain());
  const mockSelect = vi.fn().mockReturnValue(makeSelectChain(selectRows));
  return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, _mockInsert: mockInsert, _mockDelete: mockDelete };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLAYER_ID = "player-crafting-01";

// A single inventory row for mat_slime_gel (quantity 2)
const SLIME_GEL_ROW = {
  id: "inv-slime-1",
  playerId: PLAYER_ID,
  itemId: "mat_slime_gel",
  quantity: 2,
  acquiredAt: new Date("2024-01-01"),
};

// ── RECIPES array integrity ───────────────────────────────────────────────────

describe("RECIPES array integrity", () => {
  it("contains at least 10 recipes", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(10);
  });

  it("every recipe has a unique id", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every recipe has a non-empty name", () => {
    for (const r of RECIPES) {
      expect(r.name, `recipe ${r.id} missing name`).toBeTruthy();
    }
  });

  it("every recipe specifies at least one ingredient", () => {
    for (const r of RECIPES) {
      expect(r.ingredients, `recipe ${r.id} has no ingredients`).not.toHaveLength(0);
    }
  });

  it("every ingredient has a positive quantity", () => {
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        expect(ing.quantity, `ingredient ${ing.itemId} in ${r.id} has invalid qty`).toBeGreaterThan(0);
      }
    }
  });

  it("every recipe outputs at least 1 item", () => {
    for (const r of RECIPES) {
      expect(r.outputQuantity, `recipe ${r.id} outputs 0`).toBeGreaterThan(0);
    }
  });

  it("high-tier recipes have failureRate of 0.15", () => {
    const highTier = RECIPES.filter((r) => (r.failureRate ?? 0) > 0);
    expect(highTier.length).toBeGreaterThan(0); // at least some high-tier exist
    for (const r of highTier) {
      expect(r.failureRate).toBe(0.15);
    }
  });

  it("regular recipes have no failureRate (undefined or 0)", () => {
    const regular = RECIPES.filter((r) => !r.failureRate);
    expect(regular.length).toBeGreaterThan(0);
    for (const r of regular) {
      expect(r.failureRate ?? 0).toBe(0);
    }
  });

  it("recipe_health_potion_small requires 2× mat_slime_gel", () => {
    const recipe = RECIPES.find((r) => r.id === "recipe_health_potion_small")!;
    expect(recipe).toBeDefined();
    const ing = recipe.ingredients.find((i) => i.itemId === "mat_slime_gel");
    expect(ing?.quantity).toBe(2);
  });
});

// ── craftItem() ───────────────────────────────────────────────────────────────

describe("craftItem()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns failure for an unknown recipe id", async () => {
    const mockDb = buildMockDb({});
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await craftItem(PLAYER_ID, "recipe_does_not_exist");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unknown recipe/i);
  });

  it("returns failure when player lacks required ingredients", async () => {
    // Player has 0 slime gel — select returns empty
    const mockDb = buildMockDb({ selectRows: [] });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await craftItem(PLAYER_ID, "recipe_health_potion_small");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/need/i);
  });

  it("returns failure when player has insufficient quantity", async () => {
    // Player has 1 slime gel but recipe needs 2
    const mockDb = buildMockDb({
      selectRows: [{ ...SLIME_GEL_ROW, quantity: 1 }],
    });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await craftItem(PLAYER_ID, "recipe_health_potion_small");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/need 2/i);
  });

  it("succeeds and consumes ingredients when player has enough materials", async () => {
    // For recipe_health_potion_small: needs 2× mat_slime_gel
    // select (verify) → [row qty 2], select (consume FIFO) → [row qty 2]
    // then delete because 2 consumed out of 2
    const mockDb = buildMockDb({
      selectRows: [SLIME_GEL_ROW], // quantity: 2 — enough
    });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await craftItem(PLAYER_ID, "recipe_health_potion_small");

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/crafted/i);
    expect(result.outputItemId).toBe("potion_health_small");
    expect(addItem).toHaveBeenCalledWith(PLAYER_ID, "potion_health_small", 1);
  });

  it("deletes inventory row when all of its quantity is consumed", async () => {
    const mockDb = buildMockDb({ selectRows: [SLIME_GEL_ROW] });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    await craftItem(PLAYER_ID, "recipe_health_potion_small");

    // delete should be called because qty(2) === consumed(2)
    expect(mockDb._mockDelete).toHaveBeenCalled();
  });

  it("updates (decrements) inventory row when only partial quantity is consumed", async () => {
    // Player has 5 slime gel but recipe only needs 2 → update, not delete
    const mockDb = buildMockDb({
      selectRows: [{ ...SLIME_GEL_ROW, quantity: 5 }],
    });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    await craftItem(PLAYER_ID, "recipe_health_potion_small");

    expect(mockDb._mockDelete).not.toHaveBeenCalled();
    // update should be called instead
    const { update } = mockDb;
    expect(update).toHaveBeenCalled();
  });

  it("does NOT add output item on high-tier craft failure (Math.random forced low)", async () => {
    // Force Math.random to return 0.01 < 0.15 (failure)
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.01);

    // recipe_enchanted_sword needs: 1× sword_steel + 3× mat_magic_crystal
    // craftItem() calls select() 4 times: verify×2, then consume×2 (FIFO)
    const swordRow = { id: "inv-sword", playerId: PLAYER_ID, itemId: "sword_steel", quantity: 1, acquiredAt: new Date() };
    const crystalRow = { id: "inv-crystal", playerId: PLAYER_ID, itemId: "mat_magic_crystal", quantity: 3, acquiredAt: new Date() };

    const responses = [
      [swordRow],   // verify: sword_steel → qty 1 ≥ needed 1 ✓
      [crystalRow], // verify: mat_magic_crystal → qty 3 ≥ needed 3 ✓
      [swordRow],   // consume: sword_steel FIFO
      [crystalRow], // consume: mat_magic_crystal FIFO
    ];
    let callIdx = 0;
    const mockDb = buildMockDb({});
    vi.mocked(getDb).mockReturnValue({
      ...mockDb,
      select: vi.fn().mockImplementation(() => makeSelectChain(responses[callIdx++] ?? [])),
    } as ReturnType<typeof getDb>);

    const result = await craftItem(PLAYER_ID, "recipe_enchanted_sword");

    expect(result.craftFailed).toBe(true);
    expect(result.success).toBe(false);
    expect(addItem).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("succeeds on high-tier craft when Math.random is above failureRate", async () => {
    // Force Math.random to 0.9 > 0.15 → craft succeeds
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.9);

    const swordRow = { id: "inv-sword", playerId: PLAYER_ID, itemId: "sword_steel", quantity: 1, acquiredAt: new Date() };
    const crystalRow = { id: "inv-crystal", playerId: PLAYER_ID, itemId: "mat_magic_crystal", quantity: 3, acquiredAt: new Date() };

    const responses = [
      [swordRow],   // verify sword_steel
      [crystalRow], // verify mat_magic_crystal
      [swordRow],   // consume sword_steel (FIFO)
      [crystalRow], // consume mat_magic_crystal (FIFO)
    ];
    let callIdx = 0;
    const mockDb = buildMockDb({});
    vi.mocked(getDb).mockReturnValue({
      ...mockDb,
      select: vi.fn().mockImplementation(() => makeSelectChain(responses[callIdx++] ?? [])),
    } as ReturnType<typeof getDb>);

    const result = await craftItem(PLAYER_ID, "recipe_enchanted_sword");

    expect(result.success).toBe(true);
    expect(result.outputItemId).toBe("sword_enchanted");
    expect(addItem).toHaveBeenCalledWith(PLAYER_ID, "sword_enchanted", 1);

    spy.mockRestore();
  });
});

// ── getCraftingProgress() ─────────────────────────────────────────────────────

describe("getCraftingProgress()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all crafting progress rows for a player", async () => {
    const rows = [
      { recipeId: "recipe_health_potion_small", craftCount: 3, firstCraftedAt: new Date(), lastCraftedAt: new Date() },
      { recipeId: "recipe_leather_armor",       craftCount: 1, firstCraftedAt: new Date(), lastCraftedAt: new Date() },
    ];
    const mockDb = buildMockDb({ selectRows: rows });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await getCraftingProgress(PLAYER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].recipeId).toBe("recipe_health_potion_small");
    expect(result[0].craftCount).toBe(3);
  });

  it("returns an empty array when player has crafted nothing", async () => {
    const mockDb = buildMockDb({ selectRows: [] });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await getCraftingProgress(PLAYER_ID);
    expect(result).toEqual([]);
  });
});
