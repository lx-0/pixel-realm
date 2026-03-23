/**
 * Player housing system integration tests.
 *
 * Covers:
 *   - getLandPlots() — query plots by zone
 *   - getPlotById() — single plot lookup
 *   - getPlayerHousing() — player housing state with join
 *   - getHousingByPlot() — house state for visiting
 *   - claimPlot() — purchase flow: success, error cases
 *   - saveLayout() — furniture persist, max-20 cap
 *   - setPermission() — visit permission update
 *   - upgradeHouse() — tier upgrade, cost deduction, error cases
 *   - Visiting system — permission model via getHousingByPlot()
 *   - Housing system constants — grid dimensions, furniture defs
 *   - Grid placement boundary logic — valid/invalid cell enforcement
 *   - Permission cycle order — public → friends → locked → public
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mockDb before vi.mock() is hoisted ──────────────────────────────────

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { mockDb };
});

vi.mock("../db/client", () => ({
  db:      mockDb,
  getDb:   vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import {
  getLandPlots,
  getPlotById,
  getPlayerHousing,
  getHousingByPlot,
  claimPlot,
  saveLayout,
  setPermission,
  upgradeHouse,
  type FurnitureItem,
} from "../db/housing";

// ── Chain helpers (mirrors db.test.ts) ────────────────────────────────────────

function thenable(rows: unknown[]) {
  return {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(res, rej ?? undefined),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(rows).catch(fn),
    finally: (fn: () => void) => Promise.resolve(rows).finally(fn),
  };
}

function makeSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    ...thenable(rows),
    limit: vi.fn().mockResolvedValue(rows),
  };
  chain.from      = vi.fn().mockReturnValue(chain);
  chain.where     = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockResolvedValue(undefined);
  return chain;
}

function makeUpdateChain() {
  const whereResult = {
    ...thenable([]),
    returning: vi.fn().mockResolvedValue([]),
  };
  const setResult = {
    where: vi.fn().mockReturnValue(whereResult),
  };
  return {
    set: vi.fn().mockReturnValue(setResult),
  };
}

/** Configure mockDb.select to return rows from a sequence for multi-select functions. */
function setupSelectSequence(sequence: unknown[][]) {
  let idx = 0;
  mockDb.select.mockImplementation(() => {
    const rows = sequence[idx] ?? [];
    idx++;
    return makeSelectChain(rows);
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLAYER_ID  = "00000000-0000-0000-0000-000000000001";
const PLAYER2_ID = "00000000-0000-0000-0000-000000000002";
const PLOT_ID    = "00000000-0000-0000-0000-000000000010";
const ZONE_ID    = "zone1";

/** Unowned plot priced at 500 gold. */
const PLOT_ROW = {
  id:          PLOT_ID,
  zoneId:      ZONE_ID,
  plotIndex:   0,
  ownerId:     null,
  purchasedAt: null,
  priceGold:   500,
};

/** Same plot but already owned by another player. */
const PLOT_ROW_OWNED = {
  ...PLOT_ROW,
  ownerId:     PLAYER2_ID,
  purchasedAt: new Date(),
};

/** Row returned by the playerHousing ⋈ landPlots join query. */
const HOUSING_JOIN_ROW = {
  plotId:          PLOT_ID,
  zoneId:          ZONE_ID,
  plotIndex:       0,
  houseTier:       1,
  furnitureLayout: [],
  permission:      "public",
  updatedAt:       new Date(),
};

const PLAYER_STATE_ROW = {
  playerId: PLAYER_ID,
  gold:     1000,
};

// ── getLandPlots() ─────────────────────────────────────────────────────────────

describe("getLandPlots()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all plots for a zone", async () => {
    mockDb.select.mockReturnValue(
      makeSelectChain([PLOT_ROW, { ...PLOT_ROW, plotIndex: 1 }]),
    );
    const result = await getLandPlots(ZONE_ID);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ zoneId: ZONE_ID });
  });

  it("returns an empty array when zone has no plots", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));
    const result = await getLandPlots("unknown_zone");
    expect(result).toEqual([]);
  });
});

// ── getPlotById() ─────────────────────────────────────────────────────────────

describe("getPlotById()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the plot when found", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([PLOT_ROW]));
    const result = await getPlotById(PLOT_ID);
    expect(result).toMatchObject({ id: PLOT_ID, zoneId: ZONE_ID, priceGold: 500 });
  });

  it("returns null when plot does not exist", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));
    const result = await getPlotById("nonexistent");
    expect(result).toBeNull();
  });
});

// ── getPlayerHousing() ────────────────────────────────────────────────────────

describe("getPlayerHousing()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when player has no plot", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));
    const result = await getPlayerHousing(PLAYER_ID);
    expect(result).toBeNull();
  });

  it("returns a fully-populated housing state when player owns a plot", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([HOUSING_JOIN_ROW]));
    const result = await getPlayerHousing(PLAYER_ID);
    expect(result).not.toBeNull();
    expect(result!.plotId).toBe(PLOT_ID);
    expect(result!.zoneId).toBe(ZONE_ID);
    expect(result!.plotIndex).toBe(0);
    expect(result!.houseTier).toBe(1);
    expect(result!.permission).toBe("public");
  });

  it("defaults furnitureLayout to [] when the DB column is null", async () => {
    const row = { ...HOUSING_JOIN_ROW, furnitureLayout: null };
    mockDb.select.mockReturnValue(makeSelectChain([row]));
    const result = await getPlayerHousing(PLAYER_ID);
    expect(result!.furnitureLayout).toEqual([]);
  });
});

// ── getHousingByPlot() ────────────────────────────────────────────────────────

describe("getHousingByPlot()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns housing state for the given plot", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([HOUSING_JOIN_ROW]));
    const result = await getHousingByPlot(PLOT_ID);
    expect(result).not.toBeNull();
    expect(result!.plotId).toBe(PLOT_ID);
    expect(result!.plotIndex).toBe(0);
  });

  it("returns null when no house is built on the plot", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));
    const result = await getHousingByPlot("empty_plot");
    expect(result).toBeNull();
  });

  it("defaults furnitureLayout to [] when the DB column is null", async () => {
    const row = { ...HOUSING_JOIN_ROW, furnitureLayout: null };
    mockDb.select.mockReturnValue(makeSelectChain([row]));
    const result = await getHousingByPlot(PLOT_ID);
    expect(result!.furnitureLayout).toEqual([]);
  });
});

// ── claimPlot() ───────────────────────────────────────────────────────────────

describe("claimPlot()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("claims an available plot and returns housing state", async () => {
    // 4 sequential selects: getPlotById, getPlayerHousing (existing check),
    // gold query, final getPlayerHousing
    setupSelectSequence([
      [PLOT_ROW],
      [],
      [PLAYER_STATE_ROW],
      [HOUSING_JOIN_ROW],
    ]);
    mockDb.update.mockReturnValue(makeUpdateChain());
    mockDb.insert.mockReturnValue(makeInsertChain());

    const result = await claimPlot(PLAYER_ID, PLOT_ID);
    expect(result).not.toBeNull();
    expect(result.plotId).toBe(PLOT_ID);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("throws 'Plot not found' when plotId does not exist", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));
    await expect(claimPlot(PLAYER_ID, "missing_plot")).rejects.toThrow("Plot not found");
  });

  it("throws 'Plot already owned' when another player owns the plot", async () => {
    setupSelectSequence([[PLOT_ROW_OWNED]]);
    await expect(claimPlot(PLAYER_ID, PLOT_ID)).rejects.toThrow("Plot already owned");
  });

  it("throws 'Player already owns a plot' when claimant already has housing", async () => {
    setupSelectSequence([
      [PLOT_ROW],
      [HOUSING_JOIN_ROW], // player already has a house
    ]);
    await expect(claimPlot(PLAYER_ID, PLOT_ID)).rejects.toThrow("Player already owns a plot");
  });

  it("throws 'Insufficient gold' when player cannot afford the plot", async () => {
    setupSelectSequence([
      [PLOT_ROW],                                        // unowned plot (500 gold)
      [],                                                // no existing housing
      [{ playerId: PLAYER_ID, gold: 100 }],             // gold < priceGold
    ]);
    await expect(claimPlot(PLAYER_ID, PLOT_ID)).rejects.toThrow("Insufficient gold");
  });

  it("deducts the exact plot price from player gold", async () => {
    setupSelectSequence([
      [PLOT_ROW],
      [],
      [{ playerId: PLAYER_ID, gold: 500 }], // exactly enough
      [HOUSING_JOIN_ROW],
    ]);
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);
    mockDb.insert.mockReturnValue(makeInsertChain());

    await claimPlot(PLAYER_ID, PLOT_ID);

    // First .set() call is the gold deduction
    const goldSetArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(goldSetArgs.gold).toBe(0); // 500 - 500 = 0
  });

  it("creates a tier-1 house on first claim", async () => {
    setupSelectSequence([
      [PLOT_ROW],
      [],
      [PLAYER_STATE_ROW],
      [HOUSING_JOIN_ROW],
    ]);
    mockDb.update.mockReturnValue(makeUpdateChain());
    const insertChain = makeInsertChain();
    mockDb.insert.mockReturnValue(insertChain);

    await claimPlot(PLAYER_ID, PLOT_ID);

    const insertedValues = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertedValues.houseTier).toBe(1);
    expect(insertedValues.permission).toBe("public");
    expect(insertedValues.furnitureLayout).toEqual([]);
  });
});

// ── saveLayout() ──────────────────────────────────────────────────────────────

describe("saveLayout()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the furniture layout for a player", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    const layout: FurnitureItem[] = [
      { furnitureId: "furn_bed", x: 2, y: 3, rotation: 0 },
    ];
    await saveLayout(PLAYER_ID, layout);

    expect(mockDb.update).toHaveBeenCalled();
    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.furnitureLayout).toEqual(layout);
  });

  it("clamps layout to 20 items when more are provided", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    const layout: FurnitureItem[] = Array.from({ length: 25 }, (_, i) => ({
      furnitureId: "furn_table",
      x: i,
      y: 0,
      rotation: 0,
    }));
    await saveLayout(PLAYER_ID, layout);

    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.furnitureLayout).toHaveLength(20);
  });

  it("saves an empty layout without error", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    await saveLayout(PLAYER_ID, []);

    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.furnitureLayout).toEqual([]);
  });

  it("preserves item order and all furniture fields (id, x, y, rotation)", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    const layout: FurnitureItem[] = [
      { furnitureId: "furn_bed",   x: 1, y: 1, rotation: 90  },
      { furnitureId: "furn_chair", x: 3, y: 5, rotation: 270 },
    ];
    await saveLayout(PLAYER_ID, layout);

    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.furnitureLayout[0]).toEqual({ furnitureId: "furn_bed",   x: 1, y: 1, rotation: 90  });
    expect(setArgs.furnitureLayout[1]).toEqual({ furnitureId: "furn_chair", x: 3, y: 5, rotation: 270 });
  });

  it("keeps exactly 20 items when given exactly 20", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    const layout: FurnitureItem[] = Array.from({ length: 20 }, (_, i) => ({
      furnitureId: "furn_lamp",
      x: i % 8 + 1,
      y: Math.floor(i / 8) + 1,
      rotation: 0,
    }));
    await saveLayout(PLAYER_ID, layout);

    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.furnitureLayout).toHaveLength(20);
  });
});

// ── setPermission() ───────────────────────────────────────────────────────────

describe("setPermission()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets permission to 'public'", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    await setPermission(PLAYER_ID, "public");

    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.permission).toBe("public");
  });

  it("sets permission to 'friends'", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    await setPermission(PLAYER_ID, "friends");

    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.permission).toBe("friends");
  });

  it("sets permission to 'locked'", async () => {
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    await setPermission(PLAYER_ID, "locked");

    const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArgs.permission).toBe("locked");
  });
});

// ── upgradeHouse() ────────────────────────────────────────────────────────────

describe("upgradeHouse()", () => {
  beforeEach(() => vi.clearAllMocks());

  const HOUSING_TIER1 = { ...HOUSING_JOIN_ROW, houseTier: 1 };
  const HOUSING_TIER2 = { ...HOUSING_JOIN_ROW, houseTier: 2 };

  it("upgrades a tier-1 house and returns tier 2", async () => {
    setupSelectSequence([
      [HOUSING_TIER1],
      [{ playerId: PLAYER_ID, gold: 2000 }],
    ]);
    mockDb.update.mockReturnValue(makeUpdateChain());

    const newTier = await upgradeHouse(PLAYER_ID);
    expect(newTier).toBe(2);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("deducts exactly 1500 gold on upgrade", async () => {
    setupSelectSequence([
      [HOUSING_TIER1],
      [{ playerId: PLAYER_ID, gold: 1500 }], // exactly the upgrade cost
    ]);
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain);

    await upgradeHouse(PLAYER_ID);

    // First .set() call is the gold deduction
    const goldSetArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(goldSetArgs.gold).toBe(0); // 1500 - 1500 = 0
  });

  it("throws 'Player has no house' when player owns no plot", async () => {
    setupSelectSequence([[]]); // getPlayerHousing returns nothing
    await expect(upgradeHouse(PLAYER_ID)).rejects.toThrow("Player has no house");
  });

  it("throws 'Already at max tier' when house is already tier 2", async () => {
    setupSelectSequence([[HOUSING_TIER2]]);
    await expect(upgradeHouse(PLAYER_ID)).rejects.toThrow("Already at max tier");
  });

  it("throws 'Insufficient gold' when player cannot cover the 1500g upgrade cost", async () => {
    setupSelectSequence([
      [HOUSING_TIER1],
      [{ playerId: PLAYER_ID, gold: 999 }], // 999 < 1500
    ]);
    await expect(upgradeHouse(PLAYER_ID)).rejects.toThrow("Insufficient gold");
  });
});

// ── Visiting system — permission model ────────────────────────────────────────

describe("Visiting system — permission model", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getHousingByPlot() exposes 'public' permission (anyone can enter)", async () => {
    mockDb.select.mockReturnValue(
      makeSelectChain([{ ...HOUSING_JOIN_ROW, permission: "public" }]),
    );
    const state = await getHousingByPlot(PLOT_ID);
    expect(state!.permission).toBe("public");
  });

  it("getHousingByPlot() exposes 'friends' permission (restricted access)", async () => {
    mockDb.select.mockReturnValue(
      makeSelectChain([{ ...HOUSING_JOIN_ROW, permission: "friends" }]),
    );
    const state = await getHousingByPlot(PLOT_ID);
    expect(state!.permission).toBe("friends");
  });

  it("getHousingByPlot() exposes 'locked' permission (owner only)", async () => {
    mockDb.select.mockReturnValue(
      makeSelectChain([{ ...HOUSING_JOIN_ROW, permission: "locked" }]),
    );
    const state = await getHousingByPlot(PLOT_ID);
    expect(state!.permission).toBe("locked");
  });

  it("returns null for an unclaimed plot (no house to visit)", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));
    const state = await getHousingByPlot("unclaimed_plot");
    expect(state).toBeNull();
  });

  it("visiting player can read furniture layout from housing state", async () => {
    const layout: FurnitureItem[] = [
      { furnitureId: "furn_bed", x: 2, y: 2, rotation: 0 },
      { furnitureId: "furn_chair", x: 4, y: 3, rotation: 90 },
    ];
    mockDb.select.mockReturnValue(
      makeSelectChain([{ ...HOUSING_JOIN_ROW, furnitureLayout: layout }]),
    );
    const state = await getHousingByPlot(PLOT_ID);
    expect(state!.furnitureLayout).toHaveLength(2);
    expect(state!.furnitureLayout[0].furnitureId).toBe("furn_bed");
  });
});

// ── Housing system constants ───────────────────────────────────────────────────
//
// These mirror the HOUSING constants in src/config/constants.ts and validate the
// game design values that drive housing logic (analogous to the ARENA constants
// tests in arena.test.ts).  We declare them locally to avoid importing Phaser.

describe("Housing system constants", () => {
  const HOUSING = {
    GRID_SIZE:       16,
    INTERIOR_WIDTH:  160,
    INTERIOR_HEIGHT: 128,
    MAX_FURNITURE:   20,
    FURNITURE: [
      { id: "furn_bed",       name: "Bed",       restBonus: 10 },
      { id: "furn_table",     name: "Table",     restBonus: 0  },
      { id: "furn_chair",     name: "Chair",     restBonus: 5  },
      { id: "furn_bookshelf", name: "Bookshelf", restBonus: 0  },
      { id: "furn_chest",     name: "Chest",     restBonus: 0  },
      { id: "furn_fireplace", name: "Fireplace", restBonus: 8  },
      { id: "furn_rug",       name: "Rug",       restBonus: 3  },
      { id: "furn_lamp",      name: "Lamp",      restBonus: 0  },
      { id: "furn_wardrobe",  name: "Wardrobe",  restBonus: 0  },
      { id: "furn_anvil",     name: "Anvil",     restBonus: 0  },
    ],
    DECORATIONS: [
      { id: "decor_painting", name: "Painting" },
      { id: "decor_trophy",   name: "Trophy"   },
      { id: "decor_banner",   name: "Banner"   },
      { id: "decor_plant",    name: "Plant"    },
      { id: "decor_candle",   name: "Candle"   },
      { id: "decor_clock",    name: "Clock"    },
    ],
  };

  it("GRID_SIZE is 16px", () => expect(HOUSING.GRID_SIZE).toBe(16));
  it("INTERIOR_WIDTH is 160px (10 grid cells wide)", () => expect(HOUSING.INTERIOR_WIDTH).toBe(160));
  it("INTERIOR_HEIGHT is 128px (8 grid cells tall)", () => expect(HOUSING.INTERIOR_HEIGHT).toBe(128));
  it("MAX_FURNITURE cap is 20 items", () => expect(HOUSING.MAX_FURNITURE).toBe(20));

  it("interior has exactly 10 columns", () => {
    expect(HOUSING.INTERIOR_WIDTH / HOUSING.GRID_SIZE).toBe(10);
  });

  it("interior has exactly 8 rows", () => {
    expect(HOUSING.INTERIOR_HEIGHT / HOUSING.GRID_SIZE).toBe(8);
  });

  it("all furniture items have a non-empty id, name, and numeric restBonus", () => {
    for (const f of HOUSING.FURNITURE) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(typeof f.restBonus).toBe("number");
    }
  });

  it("at least one furniture item provides a positive rest bonus", () => {
    const restItems = HOUSING.FURNITURE.filter(f => f.restBonus > 0);
    expect(restItems.length).toBeGreaterThan(0);
  });

  it("bed has the highest rest bonus of all furniture", () => {
    const bed = HOUSING.FURNITURE.find(f => f.id === "furn_bed");
    const maxBonus = Math.max(...HOUSING.FURNITURE.map(f => f.restBonus));
    expect(bed).toBeDefined();
    expect(bed!.restBonus).toBe(maxBonus);
  });

  it("fireplace rest bonus is positive (8)", () => {
    const fireplace = HOUSING.FURNITURE.find(f => f.id === "furn_fireplace");
    expect(fireplace!.restBonus).toBeGreaterThan(0);
  });

  it("all furniture ids are prefixed with 'furn_'", () => {
    for (const f of HOUSING.FURNITURE) {
      expect(f.id).toMatch(/^furn_/);
    }
  });

  it("all decoration ids are prefixed with 'decor_'", () => {
    for (const d of HOUSING.DECORATIONS) {
      expect(d.id).toMatch(/^decor_/);
    }
  });

  it("all decorations have a non-empty id and name", () => {
    for (const d of HOUSING.DECORATIONS) {
      expect(d.id).toBeTruthy();
      expect(d.name).toBeTruthy();
    }
  });

  it("there are exactly 10 furniture types and 6 decoration types", () => {
    expect(HOUSING.FURNITURE).toHaveLength(10);
    expect(HOUSING.DECORATIONS).toHaveLength(6);
  });
});

// ── Grid placement boundary logic ─────────────────────────────────────────────
//
// Mirrors HousingScene._isValidCell(): col ∈ [1, COLS-2], row ∈ [1, ROWS-2]
// where COLS = INTERIOR_WIDTH / GRID_SIZE = 10, ROWS = INTERIOR_HEIGHT / GRID_SIZE = 8
// Valid interior cells: col ∈ [1..8], row ∈ [1..6]

describe("Grid placement boundary logic", () => {
  const GRID_SIZE       = 16;
  const INTERIOR_WIDTH  = 160;
  const INTERIOR_HEIGHT = 128;
  const COLS = INTERIOR_WIDTH  / GRID_SIZE; // 10
  const ROWS = INTERIOR_HEIGHT / GRID_SIZE; //  8

  function isValidCell(col: number, row: number): boolean {
    return col >= 1 && col < COLS - 1 && row >= 1 && row < ROWS - 1;
  }

  it("center cell (5, 4) is a valid placement position", () => {
    expect(isValidCell(5, 4)).toBe(true);
  });

  it("top-left interior corner (1, 1) is valid", () => {
    expect(isValidCell(1, 1)).toBe(true);
  });

  it("bottom-right interior corner (8, 6) is valid", () => {
    expect(isValidCell(8, 6)).toBe(true);
  });

  it("left wall column (col=0) is invalid — wall tile", () => {
    expect(isValidCell(0, 3)).toBe(false);
  });

  it("right wall column (col=9) is invalid — wall tile", () => {
    expect(isValidCell(9, 3)).toBe(false);
  });

  it("top wall row (row=0) is invalid — wall tile", () => {
    expect(isValidCell(3, 0)).toBe(false);
  });

  it("bottom wall row (row=7) is invalid — wall tile", () => {
    expect(isValidCell(3, 7)).toBe(false);
  });

  it("negative col is invalid", () => {
    expect(isValidCell(-1, 3)).toBe(false);
  });

  it("negative row is invalid", () => {
    expect(isValidCell(3, -1)).toBe(false);
  });

  it("all interior cells are valid", () => {
    let count = 0;
    for (let col = 1; col <= COLS - 2; col++) {
      for (let row = 1; row <= ROWS - 2; row++) {
        expect(isValidCell(col, row)).toBe(true);
        count++;
      }
    }
    // 8 cols × 6 rows = 48 interior cells
    expect(count).toBe((COLS - 2) * (ROWS - 2));
  });
});

// ── Permission cycle order ────────────────────────────────────────────────────
//
// Mirrors HousingPanel._cyclePermission(): public → friends → locked → public

describe("Permission cycle order", () => {
  type HousingPermission = "public" | "friends" | "locked";

  function cyclePermission(current: HousingPermission): HousingPermission {
    const order: HousingPermission[] = ["public", "friends", "locked"];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  }

  it("cycles public → friends → locked → public", () => {
    expect(cyclePermission("public")).toBe("friends");
    expect(cyclePermission("friends")).toBe("locked");
    expect(cyclePermission("locked")).toBe("public");
  });

  it("cycling through all three permissions returns to the starting value", () => {
    let perm: HousingPermission = "public";
    perm = cyclePermission(perm);
    perm = cyclePermission(perm);
    perm = cyclePermission(perm);
    expect(perm).toBe("public");
  });

  it("each permission appears exactly once in a full cycle", () => {
    const seen = new Set<string>();
    let perm: HousingPermission = "public";
    for (let i = 0; i < 3; i++) {
      seen.add(perm);
      perm = cyclePermission(perm);
    }
    expect(seen).toEqual(new Set(["public", "friends", "locked"]));
  });
});
