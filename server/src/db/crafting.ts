/**
 * Crafting system — recipe definitions and server-side craft execution.
 *
 * craftItem() validates the player has all required materials, atomically
 * consumes them, and adds the output item to inventory.
 *
 * High-tier recipes carry a failureRate (default 0.15 per GDD).  On failure,
 * materials are still consumed but the output item is NOT created.
 * Crafting history is persisted to the crafting_progress table.
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./client";
import { inventory, craftingProgress } from "./schema";
import { addItem } from "./inventory";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: RecipeIngredient[];
  craftingTime: number; // seconds (informational; enforced client-side)
  description: string;
  /** 0–1 failure probability for high-tier recipes (default 0 = always succeed). */
  failureRate?: number;
}

export interface CraftResult {
  success: boolean;
  message: string;
  outputItemId?: string;
  /** true when a high-tier craft attempt ran but the roll failed (materials consumed). */
  craftFailed?: boolean;
}

// ── Recipes ───────────────────────────────────────────────────────────────────

export const RECIPES: CraftingRecipe[] = [
  // ── Potions ───────────────────────────────────────────────────────────────
  {
    id: "recipe_health_potion_small",
    name: "Small Health Potion",
    outputItemId: "potion_health_small",
    outputQuantity: 1,
    ingredients: [{ itemId: "mat_slime_gel", quantity: 2 }],
    craftingTime: 2,
    description: "Brew a restorative potion from slime gel.",
  },
  {
    id: "recipe_health_potion_large",
    name: "Large Health Potion",
    outputItemId: "potion_health_large",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_slime_gel", quantity: 3 },
      { itemId: "mat_magic_crystal", quantity: 1 },
    ],
    craftingTime: 3,
    description: "A potent healing potion infused with crystal energy.",
  },
  {
    id: "recipe_mana_potion",
    name: "Small Mana Potion",
    outputItemId: "potion_mana_small",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_magic_crystal", quantity: 1 },
      { itemId: "mat_slime_gel", quantity: 1 },
    ],
    craftingTime: 2,
    description: "Distilled crystal essence for mana recovery.",
  },
  // ── Armor ─────────────────────────────────────────────────────────────────
  {
    id: "recipe_leather_armor",
    name: "Leather Armor",
    outputItemId: "armor_leather",
    outputQuantity: 1,
    ingredients: [{ itemId: "mat_leather_scraps", quantity: 4 }],
    craftingTime: 4,
    description: "Stitch leather scraps into protective armor.",
  },
  {
    id: "recipe_iron_helm",
    name: "Iron Helm",
    outputItemId: "helm_iron",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 3 },
      { itemId: "mat_leather_scraps", quantity: 1 },
    ],
    craftingTime: 3,
    description: "Forge an iron helm with a leather liner for comfort.",
  },
  {
    id: "recipe_leather_boots",
    name: "Leather Boots",
    outputItemId: "boots_leather",
    outputQuantity: 1,
    ingredients: [{ itemId: "mat_leather_scraps", quantity: 3 }],
    craftingTime: 3,
    description: "Sturdy boots cut from thick leather hide.",
  },
  {
    id: "recipe_iron_shield",
    name: "Iron Shield",
    outputItemId: "shield_iron",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 2 },
      { itemId: "mat_leather_scraps", quantity: 1 },
    ],
    craftingTime: 4,
    description: "Forge a sturdy iron shield with a leather grip.",
  },
  {
    id: "recipe_chainmail",
    name: "Chainmail",
    outputItemId: "armor_chainmail",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 5 },
      { itemId: "mat_leather_scraps", quantity: 2 },
    ],
    craftingTime: 6,
    description: "Link iron rings into protective chainmail.",
  },
  // ── Weapons ───────────────────────────────────────────────────────────────
  {
    id: "recipe_steel_sword",
    name: "Steel Sword",
    outputItemId: "sword_steel",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 4 },
      { itemId: "mat_magic_crystal", quantity: 1 },
    ],
    craftingTime: 5,
    description: "Smelt iron with crystal essence for a keen steel blade.",
  },
  {
    id: "recipe_hunters_bow",
    name: "Hunter's Bow",
    outputItemId: "bow_hunters",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_leather_scraps", quantity: 2 },
      { itemId: "mat_bone_fragment", quantity: 1 },
    ],
    craftingTime: 4,
    description: "Craft a supple leather-backed bow with a bone nocking point.",
  },
  {
    id: "recipe_oak_staff",
    name: "Oak Staff",
    outputItemId: "staff_oak",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 2 },
      { itemId: "mat_magic_crystal", quantity: 2 },
    ],
    craftingTime: 6,
    description: "Bind iron bands around a crystal core to channel magical power.",
  },
  // ── High-tier (15% failure rate) ──────────────────────────────────────────
  {
    id: "recipe_enchanted_sword",
    name: "Enchanted Sword",
    outputItemId: "sword_enchanted",
    outputQuantity: 1,
    ingredients: [
      { itemId: "sword_steel", quantity: 1 },
      { itemId: "mat_magic_crystal", quantity: 3 },
    ],
    craftingTime: 8,
    description: "Imbue a steel sword with three crystals of raw magic.",
    failureRate: 0.15,
  },
  {
    id: "recipe_magic_ring",
    name: "Magic Ring",
    outputItemId: "ring_magic",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_magic_crystal", quantity: 2 },
      { itemId: "mat_bone_fragment", quantity: 1 },
    ],
    craftingTime: 5,
    description: "Bind crystal power into an enchanted bone-set ring.",
    failureRate: 0.15,
  },
  {
    id: "recipe_xp_elixir",
    name: "Experience Elixir",
    outputItemId: "elixir_xp",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_magic_crystal", quantity: 2 },
      { itemId: "mat_bone_fragment", quantity: 2 },
    ],
    craftingTime: 6,
    description: "A shimmering brew that accelerates learning.",
    failureRate: 0.15,
  },
  {
    id: "recipe_fire_scroll",
    name: "Fire Scroll",
    outputItemId: "scroll_fire",
    outputQuantity: 1,
    ingredients: [
      { itemId: "mat_magic_crystal", quantity: 2 },
      { itemId: "mat_slime_gel", quantity: 1 },
    ],
    craftingTime: 4,
    description: "Inscribe a volatile fire formula — the ink tends to combust.",
    failureRate: 0.15,
  },
];

// ── craftItem ─────────────────────────────────────────────────────────────────

export async function craftItem(
  playerId: string,
  recipeId: string,
): Promise<CraftResult> {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) {
    return { success: false, message: "Unknown recipe." };
  }

  const db = getDb();

  // Verify player has enough of each ingredient
  for (const ingredient of recipe.ingredients) {
    const rows = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.playerId, playerId),
          eq(inventory.itemId, ingredient.itemId),
        ),
      );
    const totalQty = rows.reduce((sum, r) => sum + r.quantity, 0);
    if (totalQty < ingredient.quantity) {
      return {
        success: false,
        message: `Need ${ingredient.quantity}× ${ingredient.itemId} (have ${totalQty}).`,
      };
    }
  }

  // Consume ingredients (FIFO by acquiredAt)
  for (const ingredient of recipe.ingredients) {
    let remaining = ingredient.quantity;
    const rows = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.playerId, playerId),
          eq(inventory.itemId, ingredient.itemId),
        ),
      )
      .orderBy(inventory.acquiredAt);

    for (const row of rows) {
      if (remaining <= 0) break;
      const consume = Math.min(row.quantity, remaining);
      remaining -= consume;
      if (row.quantity <= consume) {
        await db.delete(inventory).where(eq(inventory.id, row.id));
      } else {
        await db
          .update(inventory)
          .set({ quantity: row.quantity - consume })
          .where(eq(inventory.id, row.id));
      }
    }
  }

  // High-tier failure roll — materials already consumed
  const failureRate = recipe.failureRate ?? 0;
  if (failureRate > 0 && Math.random() < failureRate) {
    return {
      success: false,
      message: `The craft failed — the materials were lost in the process.`,
      craftFailed: true,
    };
  }

  // Add output item to inventory
  await addItem(playerId, recipe.outputItemId, recipe.outputQuantity);

  // Persist crafting progress
  try {
    await db
      .insert(craftingProgress)
      .values({ playerId, recipeId, craftCount: 1 })
      .onConflictDoUpdate({
        target: [craftingProgress.playerId, craftingProgress.recipeId],
        set: {
          craftCount: sql`crafting_progress.craft_count + 1`,
          lastCraftedAt: sql`NOW()`,
        },
      });
  } catch {
    // Non-fatal — craft already succeeded; progress tracking is best-effort
  }

  return {
    success: true,
    message: `Crafted ${recipe.name}!`,
    outputItemId: recipe.outputItemId,
  };
}

// ── getCraftingProgress ────────────────────────────────────────────────────────

export async function getCraftingProgress(
  playerId: string,
): Promise<Array<{ recipeId: string; craftCount: number; firstCraftedAt: Date; lastCraftedAt: Date }>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(craftingProgress)
    .where(eq(craftingProgress.playerId, playerId));
  return rows.map((r) => ({
    recipeId: r.recipeId,
    craftCount: r.craftCount,
    firstCraftedAt: r.firstCraftedAt,
    lastCraftedAt: r.lastCraftedAt,
  }));
}
