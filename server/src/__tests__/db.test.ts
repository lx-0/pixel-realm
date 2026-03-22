/**
 * Database layer tests.
 *
 * Tests player CRUD and inventory operations with a mocked Drizzle client.
 * No real PostgreSQL connection is required.
 *
 * Mock strategy:
 *   - vi.mock('../db/client') at top level so all downstream imports see mocked getDb()
 *   - In each test, configure what getDb() returns via vi.mocked(getDb).mockReturnValue(...)
 *   - bcryptjs is mocked to keep tests fast (avoids 12-round hashing)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Top-level mocks (hoisted before all imports) ──────────────────────────────

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$mockhash"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getDb } from "../db/client";
import {
  createPlayerRecord,
  findPlayerByUsername,
  findPlayerById,
  initPlayerState,
  loadPlayerState,
  savePlayerState,
} from "../db/players";
import { addItem, removeItem, getInventory, setEquipped } from "../db/inventory";
import { startQuest, completeQuest, getProgression } from "../db/progression";

// ── Mock chain factories ──────────────────────────────────────────────────────
//
// Drizzle uses a chainable builder pattern.  Each factory creates a chain object
// that is both chainable (methods return `this`) and thenable so `await chain`
// resolves to the configured rows.

function thenable(rows: unknown[]) {
  return {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(res, rej ?? undefined),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(rows).catch(fn),
    finally: (fn: () => void) => Promise.resolve(rows).finally(fn),
  };
}

function makeSelectChain(rows: unknown[]) {
  // Single chain object: every navigation method returns `this` so any
  // combination of .from().where().innerJoin().limit() etc. works.
  const chain: Record<string, unknown> = {
    ...thenable(rows),
    limit: vi.fn().mockResolvedValue(rows),
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeInsertChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    values: vi.fn(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    onConflictDoUpdate: vi.fn(),
    returning: vi.fn().mockResolvedValue(rows),
  };
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeUpdateChain(rows: unknown[]) {
  const whereResult = {
    ...thenable(undefined),
    returning: vi.fn().mockResolvedValue(rows),
  };
  const setResult = {
    where: vi.fn().mockReturnValue(whereResult),
  };
  return {
    set: vi.fn().mockReturnValue(setResult),
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
  updateRows?: unknown[];
  selectRowsSequence?: unknown[][];
}) {
  const { selectRows = [], insertRows = [], updateRows = [], selectRowsSequence } = opts;

  let callIndex = 0;
  const selectFn = selectRowsSequence
    ? vi.fn().mockImplementation(() => {
        const rows = selectRowsSequence[callIndex] ?? [];
        callIndex++;
        return makeSelectChain(rows);
      })
    : vi.fn().mockReturnValue(makeSelectChain(selectRows));

  const mockInsert = vi.fn().mockReturnValue(makeInsertChain(insertRows));
  const mockUpdate = vi.fn().mockReturnValue(makeUpdateChain(updateRows));
  const mockDelete = vi.fn().mockReturnValue(makeDeleteChain());

  return {
    select: selectFn,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
    _mockDelete: mockDelete,
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLAYER_ID = "00000000-0000-0000-0000-000000000001";

const PLAYER_ROW = {
  id: PLAYER_ID,
  username: "alice",
  usernameLower: "alice",
  passwordHash: "$2a$12$mockhash",
  createdAt: new Date(),
};

const PLAYER_STATE_ROW = {
  playerId: PLAYER_ID,
  hp: 100,
  maxHp: 100,
  mana: 50,
  maxMana: 50,
  level: 1,
  xp: 0,
  gold: 0,
  currentZone: "zone1",
  lastSeenAt: new Date(),
  updatedAt: new Date(),
};

const INV_ROW_ID = "00000000-0000-0000-0000-000000000099";

const INV_ROW = {
  id: INV_ROW_ID,
  playerId: PLAYER_ID,
  itemId: "sword_iron",
  quantity: 2,
  slot: null,
  equipped: false,
  acquiredAt: new Date(),
};

// ── Tests: players.ts ─────────────────────────────────────────────────────────

describe("Player data access layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPlayerRecord()", () => {
    it("creates and returns a new player when username is not taken", async () => {
      // select → [] (no duplicate), insert → [PLAYER_ROW]
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [], insertRows: [PLAYER_ROW] }) as ReturnType<typeof getDb>,
      );

      const result = await createPlayerRecord("alice", "password123");

      expect(result).toMatchObject({ username: "alice", id: PLAYER_ID });
    });

    it("throws USERNAME_TAKEN when username already exists", async () => {
      // select → [PLAYER_ROW] (duplicate found)
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [PLAYER_ROW] }) as ReturnType<typeof getDb>,
      );

      await expect(createPlayerRecord("alice", "password123")).rejects.toThrow("USERNAME_TAKEN");
    });
  });

  describe("findPlayerByUsername()", () => {
    it("returns the player when found", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [PLAYER_ROW] }) as ReturnType<typeof getDb>,
      );

      const result = await findPlayerByUsername("alice");
      expect(result).toMatchObject({ username: "alice" });
    });

    it("returns null when player does not exist", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [] }) as ReturnType<typeof getDb>,
      );

      const result = await findPlayerByUsername("nobody");
      expect(result).toBeNull();
    });
  });

  describe("findPlayerById()", () => {
    it("returns the player by id", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [PLAYER_ROW] }) as ReturnType<typeof getDb>,
      );

      const result = await findPlayerById(PLAYER_ID);
      expect(result).toMatchObject({ id: PLAYER_ID });
    });

    it("returns null when id not found", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [] }) as ReturnType<typeof getDb>,
      );

      expect(await findPlayerById("nonexistent")).toBeNull();
    });
  });

  describe("initPlayerState()", () => {
    it("returns existing state without inserting if row already exists", async () => {
      // loadPlayerState (called inside initPlayerState) does a select → [state row]
      // The outer initPlayerState also calls getDb() once, but since it returns early
      // after finding existing state we need both getDb() calls to see the state row.
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [PLAYER_STATE_ROW] }) as ReturnType<typeof getDb>,
      );

      const mockDb = buildMockDb({ selectRows: [PLAYER_STATE_ROW] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      const result = await initPlayerState(PLAYER_ID);

      expect(result).toMatchObject({ playerId: PLAYER_ID, hp: 100 });
      // insert should NOT have been called
      expect(mockDb._mockInsert).not.toHaveBeenCalled();
    });

    it("inserts default state when no existing row is found", async () => {
      // First two getDb() calls (loadPlayerState + outer initPlayerState): select empty
      // Then insert is called
      const mockDb = buildMockDb({
        selectRows: [],
        insertRows: [PLAYER_STATE_ROW],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      const result = await initPlayerState(PLAYER_ID);

      expect(mockDb._mockInsert).toHaveBeenCalled();
      expect(result).toMatchObject({ playerId: PLAYER_ID });
    });
  });

  describe("savePlayerState()", () => {
    it("calls update with provided fields", async () => {
      const mockDb = buildMockDb({ updateRows: [] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      await savePlayerState(PLAYER_ID, { hp: 80, gold: 100 });

      expect(mockDb._mockUpdate).toHaveBeenCalled();
    });
  });

  describe("loadPlayerState()", () => {
    it("returns state row when found", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [PLAYER_STATE_ROW] }) as ReturnType<typeof getDb>,
      );

      const result = await loadPlayerState(PLAYER_ID);
      expect(result).toMatchObject({ playerId: PLAYER_ID, level: 1 });
    });

    it("returns null when no state exists", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [] }) as ReturnType<typeof getDb>,
      );

      expect(await loadPlayerState(PLAYER_ID)).toBeNull();
    });
  });
});

// ── Tests: inventory.ts ───────────────────────────────────────────────────────

describe("Inventory data access layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addItem()", () => {
    it("stacks quantity when the same item already exists in the bag", async () => {
      const mockDb = buildMockDb({
        selectRows: [INV_ROW],       // item already in inventory
        updateRows: [{ ...INV_ROW, quantity: 3 }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      await addItem(PLAYER_ID, "sword_iron", 1);

      expect(mockDb._mockUpdate).toHaveBeenCalled();
      expect(mockDb._mockInsert).not.toHaveBeenCalled();
    });

    it("inserts a new row when item is not yet in the inventory", async () => {
      const mockDb = buildMockDb({
        selectRows: [],              // not found
        insertRows: [INV_ROW],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      const result = await addItem(PLAYER_ID, "sword_iron", 1);

      expect(mockDb._mockInsert).toHaveBeenCalled();
      expect(result).toMatchObject({ playerId: PLAYER_ID, itemId: "sword_iron" });
    });
  });

  describe("removeItem()", () => {
    it("deletes the row when quantity would reach zero", async () => {
      // INV_ROW has quantity=2; removing 2 → delete
      const mockDb = buildMockDb({ selectRows: [INV_ROW] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      await removeItem(PLAYER_ID, INV_ROW_ID, 2);

      expect(mockDb._mockDelete).toHaveBeenCalled();
      expect(mockDb._mockUpdate).not.toHaveBeenCalled();
    });

    it("decrements quantity when some items remain", async () => {
      // INV_ROW has quantity=2; removing 1 → update with quantity=1
      const mockDb = buildMockDb({ selectRows: [INV_ROW], updateRows: [] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      await removeItem(PLAYER_ID, INV_ROW_ID, 1);

      expect(mockDb._mockUpdate).toHaveBeenCalled();
      expect(mockDb._mockDelete).not.toHaveBeenCalled();
    });

    it("is a no-op when the inventory row does not exist", async () => {
      const mockDb = buildMockDb({ selectRows: [] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      await removeItem(PLAYER_ID, "nonexistent", 1);

      expect(mockDb._mockDelete).not.toHaveBeenCalled();
      expect(mockDb._mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("getInventory()", () => {
    it("returns enriched entries joined with item definitions", async () => {
      const itemDef = {
        id: "sword_iron",
        name: "Iron Sword",
        type: "weapon",
        stats: { attack: 12 },
        description: "A reliable iron sword.",
        rarity: "common",
      };
      const joinedRow = { ...INV_ROW, item: itemDef };

      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [joinedRow] }) as ReturnType<typeof getDb>,
      );

      const result = await getInventory(PLAYER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: INV_ROW_ID,
        quantity: 2,
        item: { id: "sword_iron", name: "Iron Sword" },
      });
    });

    it("returns an empty array when inventory is empty", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [] }) as ReturnType<typeof getDb>,
      );

      expect(await getInventory(PLAYER_ID)).toEqual([]);
    });
  });

  describe("setEquipped()", () => {
    it("calls update with the provided equipped flag", async () => {
      const mockDb = buildMockDb({ updateRows: [] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      await setEquipped(PLAYER_ID, INV_ROW_ID, true);

      expect(mockDb._mockUpdate).toHaveBeenCalled();
    });
  });
});

// ── Tests: progression.ts ─────────────────────────────────────────────────────

describe("Quest progression data access layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const QUEST_ID = "quest-001";

  const PROG_ROW = {
    playerId: PLAYER_ID,
    questId: QUEST_ID,
    status: "active",
    progress: {},
    startedAt: new Date(),
    completedAt: null,
  };

  describe("startQuest()", () => {
    it("returns existing active quest without upserting", async () => {
      const mockDb = buildMockDb({ selectRows: [PROG_ROW] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      const result = await startQuest(PLAYER_ID, QUEST_ID);

      expect(result).toMatchObject({ questId: QUEST_ID, status: "active" });
      expect(mockDb._mockInsert).not.toHaveBeenCalled();
    });

    it("upserts a new row when quest has not been started", async () => {
      const mockDb = buildMockDb({ selectRows: [], insertRows: [PROG_ROW] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      const result = await startQuest(PLAYER_ID, QUEST_ID);

      expect(mockDb._mockInsert).toHaveBeenCalled();
      expect(result).toMatchObject({ questId: QUEST_ID });
    });
  });

  describe("completeQuest()", () => {
    it("updates the quest status to completed", async () => {
      const mockDb = buildMockDb({ updateRows: [] });
      vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

      await completeQuest(PLAYER_ID, QUEST_ID);

      expect(mockDb._mockUpdate).toHaveBeenCalled();
    });
  });

  describe("getProgression()", () => {
    it("returns all progression rows for a player", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [PROG_ROW] }) as ReturnType<typeof getDb>,
      );

      const result = await getProgression(PLAYER_ID);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ questId: QUEST_ID, status: "active" });
    });

    it("returns empty array when no quests are started", async () => {
      vi.mocked(getDb).mockReturnValue(
        buildMockDb({ selectRows: [] }) as ReturnType<typeof getDb>,
      );

      expect(await getProgression(PLAYER_ID)).toEqual([]);
    });
  });
});
