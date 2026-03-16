/**
 * Inventory data access layer.
 *
 * Manages the player → item relationship: add, remove, equip, list.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { inventory, items, type InventoryRow, type Item } from "./schema";

export interface InventoryEntry {
  id: string;
  item: Item;
  quantity: number;
  slot: number | null;
  equipped: boolean;
  acquiredAt: Date;
}

export async function getInventory(playerId: string): Promise<InventoryEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: inventory.id,
      quantity: inventory.quantity,
      slot: inventory.slot,
      equipped: inventory.equipped,
      acquiredAt: inventory.acquiredAt,
      item: items,
    })
    .from(inventory)
    .innerJoin(items, eq(inventory.itemId, items.id))
    .where(eq(inventory.playerId, playerId));

  return rows.map((r) => ({
    id: r.id,
    item: r.item,
    quantity: r.quantity,
    slot: r.slot,
    equipped: r.equipped,
    acquiredAt: r.acquiredAt,
  }));
}

export async function addItem(
  playerId: string,
  itemId: string,
  quantity = 1,
): Promise<InventoryRow> {
  const db = getDb();

  // Stack if same item already in bag (slot = null, not equipped)
  const existing = await db
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.playerId, playerId),
        eq(inventory.itemId, itemId),
        eq(inventory.equipped, false),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const [row] = await db
      .update(inventory)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(inventory.id, existing[0].id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(inventory)
    .values({ playerId, itemId, quantity })
    .returning();
  return row;
}

export async function removeItem(
  playerId: string,
  inventoryId: string,
  quantity = 1,
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, inventoryId), eq(inventory.playerId, playerId)))
    .limit(1);

  if (!rows.length) return;
  const row = rows[0];

  if (row.quantity <= quantity) {
    await db.delete(inventory).where(eq(inventory.id, inventoryId));
  } else {
    await db
      .update(inventory)
      .set({ quantity: row.quantity - quantity })
      .where(eq(inventory.id, inventoryId));
  }
}

export async function setEquipped(
  playerId: string,
  inventoryId: string,
  equipped: boolean,
): Promise<void> {
  const db = getDb();
  await db
    .update(inventory)
    .set({ equipped })
    .where(and(eq(inventory.id, inventoryId), eq(inventory.playerId, playerId)));
}
