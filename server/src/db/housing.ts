/**
 * housing.ts — DB CRUD for the player housing system.
 *
 * Tables:
 *   land_plots     — town plot slots; one owner per slot
 *   player_housing — house state + furniture layout per player
 */

import { eq, and } from "drizzle-orm";
import { db } from "./client";
import { landPlots, playerHousing, playerState } from "./schema";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FurnitureItem {
  furnitureId: string;
  x:           number;
  y:           number;
  rotation:    number; // 0 | 90 | 180 | 270
}

export type HousingPermission = "public" | "friends" | "locked";

export interface HousingState {
  plotId:          string;
  zoneId:          string;
  plotIndex:       number;
  houseTier:       number;
  furnitureLayout: FurnitureItem[];
  permission:      HousingPermission;
  updatedAt:       Date;
}

// ── Queries ────────────────────────────────────────────────────────────────────

/** Returns all plots for a zone, including owner info. */
export async function getLandPlots(zoneId: string) {
  return db
    .select()
    .from(landPlots)
    .where(eq(landPlots.zoneId, zoneId));
}

/** Returns a single plot by id. */
export async function getPlotById(plotId: string) {
  const rows = await db
    .select()
    .from(landPlots)
    .where(eq(landPlots.id, plotId));
  return rows[0] ?? null;
}

/** Returns the player's housing state (null if no plot owned). */
export async function getPlayerHousing(playerId: string): Promise<HousingState | null> {
  const rows = await db
    .select({
      plotId:          playerHousing.plotId,
      zoneId:          landPlots.zoneId,
      plotIndex:       landPlots.plotIndex,
      houseTier:       playerHousing.houseTier,
      furnitureLayout: playerHousing.furnitureLayout,
      permission:      playerHousing.permission,
      updatedAt:       playerHousing.updatedAt,
    })
    .from(playerHousing)
    .innerJoin(landPlots, eq(playerHousing.plotId, landPlots.id))
    .where(eq(playerHousing.playerId, playerId));

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    plotId:          r.plotId,
    zoneId:          r.zoneId,
    plotIndex:       r.plotIndex,
    houseTier:       r.houseTier,
    furnitureLayout: (r.furnitureLayout as FurnitureItem[]) ?? [],
    permission:      r.permission as HousingPermission,
    updatedAt:       r.updatedAt,
  };
}

/** Returns the housing state for a given plot (for visiting). */
export async function getHousingByPlot(plotId: string): Promise<HousingState | null> {
  const rows = await db
    .select({
      plotId:          playerHousing.plotId,
      zoneId:          landPlots.zoneId,
      plotIndex:       landPlots.plotIndex,
      houseTier:       playerHousing.houseTier,
      furnitureLayout: playerHousing.furnitureLayout,
      permission:      playerHousing.permission,
      updatedAt:       playerHousing.updatedAt,
    })
    .from(playerHousing)
    .innerJoin(landPlots, eq(playerHousing.plotId, landPlots.id))
    .where(eq(playerHousing.plotId, plotId));

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    plotId:          r.plotId,
    zoneId:          r.zoneId,
    plotIndex:       r.plotIndex,
    houseTier:       r.houseTier,
    furnitureLayout: (r.furnitureLayout as FurnitureItem[]) ?? [],
    permission:      r.permission as HousingPermission,
    updatedAt:       r.updatedAt,
  };
}

// ── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Claim an available plot for a player.
 *
 * 1. Verifies the plot exists and is unclaimed.
 * 2. Deducts gold from player_state.
 * 3. Marks the plot as owned.
 * 4. Creates the player_housing row.
 *
 * Throws on insufficient gold, already-owned plot, or missing plot.
 */
export async function claimPlot(playerId: string, plotId: string): Promise<HousingState> {
  // Load plot
  const plot = await getPlotById(plotId);
  if (!plot) throw new Error("Plot not found");
  if (plot.ownerId) throw new Error("Plot already owned");

  // Check player doesn't already own a plot
  const existing = await getPlayerHousing(playerId);
  if (existing) throw new Error("Player already owns a plot");

  // Deduct gold
  const stateRows = await db
    .select({ gold: playerState.gold })
    .from(playerState)
    .where(eq(playerState.playerId, playerId));
  const currentGold = stateRows[0]?.gold ?? 0;
  if (currentGold < plot.priceGold) throw new Error("Insufficient gold");

  await db
    .update(playerState)
    .set({ gold: currentGold - plot.priceGold })
    .where(eq(playerState.playerId, playerId));

  // Assign plot
  const now = new Date();
  await db
    .update(landPlots)
    .set({ ownerId: playerId, purchasedAt: now })
    .where(eq(landPlots.id, plotId));

  // Create housing row
  await db.insert(playerHousing).values({
    playerId,
    plotId,
    houseTier: 1,
    furnitureLayout: [],
    permission: "public",
    updatedAt: now,
  });

  return (await getPlayerHousing(playerId))!;
}

/**
 * Save (overwrite) a player's furniture layout.
 * Max 20 items enforced here.
 */
export async function saveLayout(playerId: string, layout: FurnitureItem[]): Promise<void> {
  const clamped = layout.slice(0, 20);
  await db
    .update(playerHousing)
    .set({ furnitureLayout: clamped, updatedAt: new Date() })
    .where(eq(playerHousing.playerId, playerId));
}

/** Update the house visit permission setting. */
export async function setPermission(
  playerId: string,
  permission: HousingPermission,
): Promise<void> {
  await db
    .update(playerHousing)
    .set({ permission, updatedAt: new Date() })
    .where(eq(playerHousing.playerId, playerId));
}

/** Upgrade the house tier (1→2). Deducts upgrade cost from player gold. */
export async function upgradeHouse(playerId: string): Promise<number> {
  const housing = await getPlayerHousing(playerId);
  if (!housing) throw new Error("Player has no house");
  if (housing.houseTier >= 2) throw new Error("Already at max tier");

  const UPGRADE_COST = 1500;
  const stateRows = await db
    .select({ gold: playerState.gold })
    .from(playerState)
    .where(eq(playerState.playerId, playerId));
  const gold = stateRows[0]?.gold ?? 0;
  if (gold < UPGRADE_COST) throw new Error("Insufficient gold");

  await db
    .update(playerState)
    .set({ gold: gold - UPGRADE_COST })
    .where(eq(playerState.playerId, playerId));

  await db
    .update(playerHousing)
    .set({ houseTier: 2, updatedAt: new Date() })
    .where(eq(playerHousing.playerId, playerId));

  return 2;
}
