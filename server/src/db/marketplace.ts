/**
 * Marketplace data access layer.
 *
 * Handles auction-house listings, purchases, cancellations, and trade-history
 * recording for both marketplace and P2P trades.
 */

import { eq, and, gt, or } from "drizzle-orm";
import { getDb } from "./client";
import { getPool } from "./client";
import {
  marketplaceListings,
  tradeHistory,
  inventory,
  playerState,
  items,
  type MarketplaceListing,
  type TradeHistoryRow,
} from "./schema";

// Listing fee rate: 5 % of asking price (gold sink), minimum 1 gold
const LISTING_FEE_RATE = 0.05;
const LISTING_DURATION_HOURS = 24;

// ── Public types ──────────────────────────────────────────────────────────────

export interface ListingDetail {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  itemRarity: string;
  itemType: string;
  quantity: number;
  priceGold: number;
  listedAt: Date;
  expiresAt: Date;
}

export interface CreateListingResult {
  success: boolean;
  listingId?: string;
  feeCharged?: number;
  error?: string;
}

export interface BuyListingResult {
  success: boolean;
  error?: string;
}

export interface TradeItem {
  itemId: string;
  inventoryId: string; // inventory row id
  quantity: number;
}

export interface P2PTradeResult {
  success: boolean;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function listingFee(priceGold: number): number {
  return Math.max(1, Math.round(priceGold * LISTING_FEE_RATE));
}

// ── Marketplace listing operations ────────────────────────────────────────────

/**
 * Create a marketplace listing.
 * Deducts the listing fee from the seller's gold.
 * Removes the item from the seller's inventory while it is listed.
 */
export async function createListing(
  sellerId: string,
  inventoryId: string,
  quantity: number,
  priceGold: number,
): Promise<CreateListingResult> {
  const db = getDb();

  // Validate the inventory row belongs to this seller
  const invRows = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, inventoryId), eq(inventory.playerId, sellerId)))
    .limit(1);

  if (!invRows.length) {
    return { success: false, error: "Item not found in inventory" };
  }
  const invRow = invRows[0];
  if (invRow.quantity < quantity) {
    return { success: false, error: "Not enough quantity to list" };
  }

  const fee = listingFee(priceGold);

  // Deduct fee and item in a transaction
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check seller has enough gold for the fee
    const goldRes = await client.query<{ gold: number }>(
      "SELECT gold FROM player_state WHERE player_id = $1 FOR UPDATE",
      [sellerId],
    );
    if (!goldRes.rows.length || goldRes.rows[0].gold < fee) {
      await client.query("ROLLBACK");
      return { success: false, error: `Insufficient gold for listing fee (${fee}g)` };
    }

    // Deduct fee
    await client.query(
      "UPDATE player_state SET gold = gold - $1 WHERE player_id = $2",
      [fee, sellerId],
    );

    // Remove item from inventory (or reduce quantity)
    if (invRow.quantity <= quantity) {
      await client.query("DELETE FROM inventory WHERE id = $1", [inventoryId]);
    } else {
      await client.query(
        "UPDATE inventory SET quantity = quantity - $1 WHERE id = $2",
        [quantity, inventoryId],
      );
    }

    const expiresAt = new Date(Date.now() + LISTING_DURATION_HOURS * 60 * 60 * 1000);

    // Create listing
    const listRes = await client.query<{ id: string }>(
      `INSERT INTO marketplace_listings
         (seller_id, item_id, quantity, price_gold, listing_fee, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [sellerId, invRow.itemId, quantity, priceGold, fee, expiresAt],
    );

    await client.query("COMMIT");

    return {
      success: true,
      listingId: listRes.rows[0].id,
      feeCharged: fee,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fetch active, non-expired marketplace listings with item and seller details.
 */
export async function getActiveListings(): Promise<ListingDetail[]> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    seller_id: string;
    seller_name: string;
    item_id: string;
    item_name: string;
    item_rarity: string;
    item_type: string;
    quantity: number;
    price_gold: number;
    listed_at: Date;
    expires_at: Date;
  }>(
    `SELECT
       ml.id,
       ml.seller_id,
       p.username AS seller_name,
       ml.item_id,
       i.name AS item_name,
       i.rarity AS item_rarity,
       i.type AS item_type,
       ml.quantity,
       ml.price_gold,
       ml.listed_at,
       ml.expires_at
     FROM marketplace_listings ml
     JOIN players p ON p.id = ml.seller_id
     JOIN items i ON i.id = ml.item_id
     WHERE ml.status = 'active' AND ml.expires_at > NOW()
     ORDER BY ml.listed_at DESC
     LIMIT 100`,
  );

  return res.rows.map((r) => ({
    id: r.id,
    sellerId: r.seller_id,
    sellerName: r.seller_name,
    itemId: r.item_id,
    itemName: r.item_name,
    itemRarity: r.item_rarity,
    itemType: r.item_type,
    quantity: r.quantity,
    priceGold: r.price_gold,
    listedAt: r.listed_at,
    expiresAt: r.expires_at,
  }));
}

/**
 * Buy a marketplace listing.
 * Deducts gold from buyer, credits seller, transfers item to buyer.
 */
export async function buyListing(
  listingId: string,
  buyerId: string,
): Promise<BuyListingResult> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock listing row
    const listRes = await client.query<{
      id: string;
      seller_id: string;
      item_id: string;
      quantity: number;
      price_gold: number;
      status: string;
      expires_at: Date;
    }>(
      "SELECT * FROM marketplace_listings WHERE id = $1 FOR UPDATE",
      [listingId],
    );
    if (!listRes.rows.length) {
      await client.query("ROLLBACK");
      return { success: false, error: "Listing not found" };
    }
    const listing = listRes.rows[0];

    if (listing.status !== "active") {
      await client.query("ROLLBACK");
      return { success: false, error: "Listing is no longer available" };
    }
    if (new Date(listing.expires_at) < new Date()) {
      // Expire it
      await client.query(
        "UPDATE marketplace_listings SET status = 'expired' WHERE id = $1",
        [listingId],
      );
      await client.query("COMMIT");
      return { success: false, error: "Listing has expired" };
    }
    if (listing.seller_id === buyerId) {
      await client.query("ROLLBACK");
      return { success: false, error: "Cannot buy your own listing" };
    }

    // Check buyer gold
    const goldRes = await client.query<{ gold: number }>(
      "SELECT gold FROM player_state WHERE player_id = $1 FOR UPDATE",
      [buyerId],
    );
    if (!goldRes.rows.length || goldRes.rows[0].gold < listing.price_gold) {
      await client.query("ROLLBACK");
      return { success: false, error: "Insufficient gold" };
    }

    // Deduct gold from buyer
    await client.query(
      "UPDATE player_state SET gold = gold - $1 WHERE player_id = $2",
      [listing.price_gold, buyerId],
    );

    // Credit gold to seller
    await client.query(
      "UPDATE player_state SET gold = gold + $1 WHERE player_id = $2",
      [listing.price_gold, listing.seller_id],
    );

    // Add item to buyer inventory (stack if possible)
    const existingInv = await client.query<{ id: string; quantity: number }>(
      "SELECT id, quantity FROM inventory WHERE player_id = $1 AND item_id = $2 AND equipped = false LIMIT 1",
      [buyerId, listing.item_id],
    );
    if (existingInv.rows.length) {
      await client.query(
        "UPDATE inventory SET quantity = quantity + $1 WHERE id = $2",
        [listing.quantity, existingInv.rows[0].id],
      );
    } else {
      await client.query(
        "INSERT INTO inventory (player_id, item_id, quantity) VALUES ($1, $2, $3)",
        [buyerId, listing.item_id, listing.quantity],
      );
    }

    // Mark listing sold
    await client.query(
      "UPDATE marketplace_listings SET status = 'sold', buyer_id = $1, completed_at = NOW() WHERE id = $2",
      [buyerId, listingId],
    );

    // Record trade history
    await client.query(
      `INSERT INTO trade_history
         (trade_type, initiator_id, counterpart_id, counterpart_items, initiator_gold, marketplace_listing_id)
       VALUES ('marketplace', $1, $2, $3, $4, $5)`,
      [
        buyerId,
        listing.seller_id,
        JSON.stringify([{ itemId: listing.item_id, quantity: listing.quantity }]),
        listing.price_gold,
        listingId,
      ],
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cancel a listing. Returns the item to the seller's inventory.
 */
export async function cancelListing(
  listingId: string,
  sellerId: string,
): Promise<{ success: boolean; error?: string }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const listRes = await client.query<{
      id: string;
      seller_id: string;
      item_id: string;
      quantity: number;
      status: string;
    }>(
      "SELECT * FROM marketplace_listings WHERE id = $1 FOR UPDATE",
      [listingId],
    );
    if (!listRes.rows.length) {
      await client.query("ROLLBACK");
      return { success: false, error: "Listing not found" };
    }
    const listing = listRes.rows[0];

    if (listing.seller_id !== sellerId) {
      await client.query("ROLLBACK");
      return { success: false, error: "Not your listing" };
    }
    if (listing.status !== "active") {
      await client.query("ROLLBACK");
      return { success: false, error: "Listing is not active" };
    }

    // Return item to seller inventory
    const existingInv = await client.query<{ id: string }>(
      "SELECT id FROM inventory WHERE player_id = $1 AND item_id = $2 AND equipped = false LIMIT 1",
      [sellerId, listing.item_id],
    );
    if (existingInv.rows.length) {
      await client.query(
        "UPDATE inventory SET quantity = quantity + $1 WHERE id = $2",
        [listing.quantity, existingInv.rows[0].id],
      );
    } else {
      await client.query(
        "INSERT INTO inventory (player_id, item_id, quantity) VALUES ($1, $2, $3)",
        [sellerId, listing.item_id, listing.quantity],
      );
    }

    // Cancel listing (no fee refund — that's the gold sink)
    await client.query(
      "UPDATE marketplace_listings SET status = 'cancelled', completed_at = NOW() WHERE id = $1",
      [listingId],
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get trade history for a player (most recent 50).
 */
export async function getTradeHistory(playerId: string): Promise<TradeHistoryRow[]> {
  const db = getDb();
  return db
    .select()
    .from(tradeHistory)
    .where(
      or(
        eq(tradeHistory.initiatorId, playerId),
        eq(tradeHistory.counterpartId, playerId),
      ),
    )
    .limit(50) as Promise<TradeHistoryRow[]>;
}

// ── P2P trade helpers (called from REST after server-side validation) ─────────

/**
 * Execute a confirmed P2P trade atomically.
 *
 * Each side's offered items are moved to the other player's inventory.
 * Gold is transferred as specified.
 */
export async function executeP2PTrade(
  initiatorId: string,
  counterpartId: string,
  initiatorItems: TradeItem[],  // items offered by initiator
  initiatorGold: number,         // gold offered by initiator
  counterpartItems: TradeItem[], // items offered by counterpart
  counterpartGold: number,        // gold offered by counterpart
): Promise<P2PTradeResult> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify gold balances
    const initiatorGoldRes = await client.query<{ gold: number }>(
      "SELECT gold FROM player_state WHERE player_id = $1 FOR UPDATE",
      [initiatorId],
    );
    const counterpartGoldRes = await client.query<{ gold: number }>(
      "SELECT gold FROM player_state WHERE player_id = $1 FOR UPDATE",
      [counterpartId],
    );

    if (!initiatorGoldRes.rows.length || initiatorGoldRes.rows[0].gold < initiatorGold) {
      await client.query("ROLLBACK");
      return { success: false, error: "Initiator has insufficient gold" };
    }
    if (!counterpartGoldRes.rows.length || counterpartGoldRes.rows[0].gold < counterpartGold) {
      await client.query("ROLLBACK");
      return { success: false, error: "Counterpart has insufficient gold" };
    }

    // Move initiator → counterpart items
    for (const ti of initiatorItems) {
      const invRes = await client.query<{ quantity: number }>(
        "SELECT quantity FROM inventory WHERE id = $1 AND player_id = $2 FOR UPDATE",
        [ti.inventoryId, initiatorId],
      );
      if (!invRes.rows.length || invRes.rows[0].quantity < ti.quantity) {
        await client.query("ROLLBACK");
        return { success: false, error: "Initiator item mismatch — trade cancelled" };
      }
      // Deduct from initiator
      if (invRes.rows[0].quantity <= ti.quantity) {
        await client.query("DELETE FROM inventory WHERE id = $1", [ti.inventoryId]);
      } else {
        await client.query(
          "UPDATE inventory SET quantity = quantity - $1 WHERE id = $2",
          [ti.quantity, ti.inventoryId],
        );
      }
      // Add to counterpart
      const cpInv = await client.query<{ id: string }>(
        "SELECT id FROM inventory WHERE player_id = $1 AND item_id = $2 AND equipped = false LIMIT 1",
        [counterpartId, ti.itemId],
      );
      if (cpInv.rows.length) {
        await client.query("UPDATE inventory SET quantity = quantity + $1 WHERE id = $2", [ti.quantity, cpInv.rows[0].id]);
      } else {
        await client.query("INSERT INTO inventory (player_id, item_id, quantity) VALUES ($1, $2, $3)", [counterpartId, ti.itemId, ti.quantity]);
      }
    }

    // Move counterpart → initiator items
    for (const ti of counterpartItems) {
      const invRes = await client.query<{ quantity: number }>(
        "SELECT quantity FROM inventory WHERE id = $1 AND player_id = $2 FOR UPDATE",
        [ti.inventoryId, counterpartId],
      );
      if (!invRes.rows.length || invRes.rows[0].quantity < ti.quantity) {
        await client.query("ROLLBACK");
        return { success: false, error: "Counterpart item mismatch — trade cancelled" };
      }
      if (invRes.rows[0].quantity <= ti.quantity) {
        await client.query("DELETE FROM inventory WHERE id = $1", [ti.inventoryId]);
      } else {
        await client.query(
          "UPDATE inventory SET quantity = quantity - $1 WHERE id = $2",
          [ti.quantity, ti.inventoryId],
        );
      }
      const initInv = await client.query<{ id: string }>(
        "SELECT id FROM inventory WHERE player_id = $1 AND item_id = $2 AND equipped = false LIMIT 1",
        [initiatorId, ti.itemId],
      );
      if (initInv.rows.length) {
        await client.query("UPDATE inventory SET quantity = quantity + $1 WHERE id = $2", [ti.quantity, initInv.rows[0].id]);
      } else {
        await client.query("INSERT INTO inventory (player_id, item_id, quantity) VALUES ($1, $2, $3)", [initiatorId, ti.itemId, ti.quantity]);
      }
    }

    // Transfer gold
    if (initiatorGold > 0) {
      await client.query("UPDATE player_state SET gold = gold - $1 WHERE player_id = $2", [initiatorGold, initiatorId]);
      await client.query("UPDATE player_state SET gold = gold + $1 WHERE player_id = $2", [initiatorGold, counterpartId]);
    }
    if (counterpartGold > 0) {
      await client.query("UPDATE player_state SET gold = gold - $1 WHERE player_id = $2", [counterpartGold, counterpartId]);
      await client.query("UPDATE player_state SET gold = gold + $1 WHERE player_id = $2", [counterpartGold, initiatorId]);
    }

    // Record trade history
    await client.query(
      `INSERT INTO trade_history
         (trade_type, initiator_id, counterpart_id,
          initiator_items, initiator_gold, counterpart_items, counterpart_gold)
       VALUES ('p2p', $1, $2, $3, $4, $5, $6)`,
      [
        initiatorId,
        counterpartId,
        JSON.stringify(initiatorItems.map((ti) => ({ itemId: ti.itemId, quantity: ti.quantity }))),
        initiatorGold,
        JSON.stringify(counterpartItems.map((ti) => ({ itemId: ti.itemId, quantity: ti.quantity }))),
        counterpartGold,
      ],
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
