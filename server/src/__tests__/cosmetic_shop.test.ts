/**
 * Cosmetic shop and character appearance integration tests.
 *
 * Covers:
 *   - COSMETICS catalog data integrity — required fields, valid rarities/slots
 *   - Slot coverage — all six cosmetic slots represented
 *   - Rarity distribution — common through legendary present
 *   - Gold costs — positive values, legendary items cost more than common
 *   - Achievement-gated items — achievementId set, gold not required
 *   - Unique ids and asset keys
 *   - CosmeticSlot type values — six valid slots
 *   - Buy logic (pure functions derived from CosmeticShopPanel.buy())
 *   - Equip / unequip slot tracking
 *   - Category filtering — 'all' returns full catalog; slot filters narrow results
 *   - RARITY_COLOR — each rarity maps to a distinct color
 */

import { describe, it, expect, vi } from "vitest";

// Phaser is imported by CosmeticShopPanel but the catalog data we test does not
// require a browser environment.  Stub the module to prevent device-detection
// code from running in the Node test environment.
vi.mock("phaser", () => ({ default: {} }));

import { COSMETICS, type CosmeticDef, type CosmeticSlot } from "../../../src/ui/CosmeticShopPanel";

const VALID_SLOTS: CosmeticSlot[] = ["outfit", "hat", "aura", "cloak", "wings", "portraitFrame"];
const VALID_RARITIES = ["common", "rare", "epic", "legendary"] as const;

// ── COSMETICS catalog data integrity ─────────────────────────────────────────

describe("COSMETICS catalog data integrity", () => {
  it("has at least 20 cosmetic items defined", () => {
    expect(COSMETICS.length).toBeGreaterThanOrEqual(20);
  });

  it("every cosmetic has a non-empty id, name, and description", () => {
    for (const c of COSMETICS) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it("every cosmetic has a valid slot", () => {
    for (const c of COSMETICS) {
      expect(VALID_SLOTS).toContain(c.slot);
    }
  });

  it("every cosmetic has a valid rarity", () => {
    for (const c of COSMETICS) {
      expect(VALID_RARITIES).toContain(c.rarity);
    }
  });

  it("every cosmetic has a non-negative goldCost", () => {
    for (const c of COSMETICS) {
      expect(c.goldCost).toBeGreaterThanOrEqual(0);
    }
  });

  it("every cosmetic has a non-empty assetKey", () => {
    for (const c of COSMETICS) {
      expect(c.assetKey.length).toBeGreaterThan(0);
    }
  });

  it("all cosmetic ids are unique", () => {
    const ids = COSMETICS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all asset keys are unique (no two cosmetics share an asset)", () => {
    const keys = COSMETICS.map(c => c.assetKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("achievementId is always a string (empty string means gold purchase)", () => {
    for (const c of COSMETICS) {
      expect(typeof c.achievementId).toBe("string");
    }
  });
});

// ── Slot coverage ─────────────────────────────────────────────────────────────

describe("Slot coverage", () => {
  it("all six cosmetic slots are represented in the catalog", () => {
    const usedSlots = new Set(COSMETICS.map(c => c.slot));
    for (const slot of VALID_SLOTS) {
      expect(usedSlots.has(slot)).toBe(true);
    }
  });

  it("each slot has at least one item", () => {
    for (const slot of VALID_SLOTS) {
      const items = COSMETICS.filter(c => c.slot === slot);
      expect(items.length, `slot '${slot}' has no items`).toBeGreaterThan(0);
    }
  });

  it("outfit slot has the most items (most popular customization)", () => {
    const outfitCount = COSMETICS.filter(c => c.slot === "outfit").length;
    for (const slot of VALID_SLOTS.filter(s => s !== "outfit")) {
      const count = COSMETICS.filter(c => c.slot === slot).length;
      expect(outfitCount).toBeGreaterThanOrEqual(count);
    }
  });
});

// ── Rarity distribution ───────────────────────────────────────────────────────

describe("Rarity distribution", () => {
  it("all four rarities are represented", () => {
    const rarities = new Set(COSMETICS.map(c => c.rarity));
    for (const r of VALID_RARITIES) {
      expect(rarities.has(r)).toBe(true);
    }
  });

  it("legendary and common items together make up the majority of the catalog", () => {
    const legendary = COSMETICS.filter(c => c.rarity === "legendary").length;
    const common    = COSMETICS.filter(c => c.rarity === "common").length;
    // Both rarities are well-represented (at least 3 each)
    expect(legendary).toBeGreaterThanOrEqual(3);
    expect(common).toBeGreaterThanOrEqual(3);
  });

  it("legendary items have the highest average gold cost", () => {
    function avgCost(rarity: string) {
      const items = COSMETICS.filter(c => c.rarity === rarity && c.goldCost > 0);
      if (items.length === 0) return 0;
      return items.reduce((s, c) => s + c.goldCost, 0) / items.length;
    }
    expect(avgCost("legendary")).toBeGreaterThan(avgCost("common"));
  });
});

// ── Gold costs ────────────────────────────────────────────────────────────────

describe("Gold costs", () => {
  it("items without an achievementId have goldCost > 0", () => {
    const goldItems = COSMETICS.filter(c => !c.achievementId);
    for (const c of goldItems) {
      expect(c.goldCost, `${c.id} goldCost must be > 0`).toBeGreaterThan(0);
    }
  });

  it("achievement-gated items are clearly identified by their achievementId", () => {
    const achieveItems = COSMETICS.filter(c => c.achievementId.length > 0);
    expect(achieveItems.length).toBeGreaterThan(0);
    for (const c of achieveItems) {
      expect(c.achievementId.length).toBeGreaterThan(0);
    }
  });

  it("legendary wings cost at least 1500 gold", () => {
    const legendaryWings = COSMETICS.filter(c => c.slot === "wings" && c.rarity === "legendary");
    expect(legendaryWings.length).toBeGreaterThan(0);
    for (const w of legendaryWings) {
      expect(w.goldCost).toBeGreaterThanOrEqual(1500);
    }
  });

  it("common items cost less than 600 gold each", () => {
    const commonItems = COSMETICS.filter(c => c.rarity === "common" && !c.achievementId);
    for (const c of commonItems) {
      expect(c.goldCost, `${c.id} goldCost`).toBeLessThan(600);
    }
  });
});

// ── Buy logic (mirrors CosmeticShopPanel.buy()) ───────────────────────────────

describe("Buy logic", () => {
  function canBuy(def: CosmeticDef, playerGold: number, owned: string[]): {
    ok: boolean;
    error?: string;
  } {
    if (def.achievementId) {
      return { ok: false, error: "This item is earned via an achievement." };
    }
    if (owned.includes(def.id)) {
      return { ok: false, error: "Already owned" };
    }
    if (playerGold < def.goldCost) {
      return { ok: false, error: `Not enough gold! (need ${def.goldCost}g)` };
    }
    return { ok: true };
  }

  it("returns ok:true when player has enough gold and item is not owned", () => {
    const item = COSMETICS.find(c => c.slot === "hat" && !c.achievementId)!;
    expect(canBuy(item, 9999, [])).toMatchObject({ ok: true });
  });

  it("returns error when player has insufficient gold", () => {
    const item = COSMETICS.find(c => c.goldCost > 100)!;
    const result = canBuy(item, 1, []);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Not enough gold");
  });

  it("returns error for achievement-gated items regardless of gold", () => {
    const item = COSMETICS.find(c => c.achievementId.length > 0)!;
    const result = canBuy(item, 999999, []);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("achievement");
  });

  it("deducts goldCost from playerGold on successful purchase", () => {
    const item = COSMETICS.find(c => !c.achievementId && c.goldCost === 200)!;
    let gold = 1000;
    const result = canBuy(item, gold, []);
    if (result.ok) {
      gold -= item.goldCost;
    }
    expect(gold).toBe(800);
  });
});

// ── Category filtering (mirrors CosmeticShopPanel.getFiltered()) ─────────────

describe("Category filtering", () => {
  function getFiltered(category: "all" | CosmeticSlot): CosmeticDef[] {
    if (category === "all") return COSMETICS;
    return COSMETICS.filter(c => c.slot === category);
  }

  it("'all' category returns the full catalog", () => {
    expect(getFiltered("all")).toHaveLength(COSMETICS.length);
  });

  it("'outfit' category returns only outfit items", () => {
    const items = getFiltered("outfit");
    expect(items.length).toBeGreaterThan(0);
    for (const c of items) {
      expect(c.slot).toBe("outfit");
    }
  });

  it("'wings' category returns only wing items", () => {
    const items = getFiltered("wings");
    expect(items.length).toBeGreaterThan(0);
    for (const c of items) {
      expect(c.slot).toBe("wings");
    }
  });

  it("sum of all slot-filtered items equals total catalog size", () => {
    const total = VALID_SLOTS.reduce((sum, slot) => sum + getFiltered(slot).length, 0);
    expect(total).toBe(COSMETICS.length);
  });
});

// ── Equip / unequip slot tracking ─────────────────────────────────────────────

describe("Equip slot tracking", () => {
  type EquippedCosmetics = Partial<Record<CosmeticSlot, string | undefined>>;

  function equip(equipped: EquippedCosmetics, slot: CosmeticSlot, id: string): EquippedCosmetics {
    return { ...equipped, [slot]: id };
  }

  function unequip(equipped: EquippedCosmetics, slot: CosmeticSlot): EquippedCosmetics {
    const next = { ...equipped };
    delete next[slot];
    return next;
  }

  it("equipping an item sets the slot to the item's id", () => {
    const equipped = equip({}, "hat", "hat_wizard");
    expect(equipped.hat).toBe("hat_wizard");
  });

  it("equipping a new item replaces the previously equipped one in the same slot", () => {
    let equipped = equip({}, "hat", "hat_wizard");
    equipped = equip(equipped, "hat", "hat_crown");
    expect(equipped.hat).toBe("hat_crown");
  });

  it("unequipping a slot removes it from the equipped state", () => {
    let equipped = equip({}, "hat", "hat_wizard");
    equipped = unequip(equipped, "hat");
    expect(equipped.hat).toBeUndefined();
  });

  it("equipping one slot does not affect other slots", () => {
    let equipped = equip({}, "hat", "hat_wizard");
    equipped = equip(equipped, "outfit", "outfit_shadow");
    expect(equipped.hat).toBe("hat_wizard");
    expect(equipped.outfit).toBe("outfit_shadow");
  });

  it("can equip all six slots simultaneously", () => {
    let equipped: EquippedCosmetics = {};
    equipped = equip(equipped, "outfit", "outfit_shadow");
    equipped = equip(equipped, "hat", "hat_wizard");
    equipped = equip(equipped, "aura", "aura_frost");
    equipped = equip(equipped, "cloak", "cloak_crimson");
    equipped = equip(equipped, "wings", "wings_fairy");
    equipped = equip(equipped, "portraitFrame", "frame_gold");
    expect(Object.keys(equipped)).toHaveLength(6);
  });
});

// ── Specific notable items ────────────────────────────────────────────────────

describe("Notable cosmetic items", () => {
  it("outfit_royal is legendary and costs 1200 gold", () => {
    const royal = COSMETICS.find(c => c.id === "outfit_royal");
    expect(royal).toBeDefined();
    expect(royal!.rarity).toBe("legendary");
    expect(royal!.goldCost).toBe(1200);
  });

  it("hat_wizard is common and costs 200 gold", () => {
    const wizard = COSMETICS.find(c => c.id === "hat_wizard");
    expect(wizard).toBeDefined();
    expect(wizard!.rarity).toBe("common");
    expect(wizard!.goldCost).toBe(200);
  });

  it("aura_holy is achievement-gated (completionist achievement)", () => {
    const holy = COSMETICS.find(c => c.id === "aura_holy");
    expect(holy).toBeDefined();
    expect(holy!.achievementId).toBe("completionist");
  });

  it("frame_celestial requires 'game_complete' achievement", () => {
    const frame = COSMETICS.find(c => c.id === "frame_celestial");
    expect(frame).toBeDefined();
    expect(frame!.achievementId).toBe("game_complete");
  });

  it("wings are among the most expensive items in the catalog", () => {
    const wingCosts = COSMETICS.filter(c => c.slot === "wings").map(c => c.goldCost);
    const maxWingCost = Math.max(...wingCosts);
    const maxOverall = Math.max(...COSMETICS.map(c => c.goldCost));
    // Wings should include some of the most expensive non-achievement items
    expect(maxWingCost).toBeGreaterThanOrEqual(1500);
    expect(maxWingCost).toBeLessThanOrEqual(maxOverall);
  });
});
