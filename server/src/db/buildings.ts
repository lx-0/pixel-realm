/**
 * buildings.ts — DB CRUD for parcel exterior buildings (PIX-172 / M14e).
 *
 * Buildings are structures placed on NFT land parcels (not interior furniture).
 * Each parcel (identified by ERC-721 tokenId) can have up to 3 buildings,
 * one of each type: 'house', 'shop', 'garden'.
 * The DB UNIQUE(token_id, building_type) constraint enforces uniqueness.
 *
 * zone_id + plot_index are stored alongside tokenId so zone-level queries
 * don't require blockchain roundtrips.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { parcelBuildings } from "./schema";

// ── Types ──────────────────────────────────────────────────────────────────────

export type BuildingType = "house" | "shop" | "garden";

export const VALID_BUILDING_TYPES: BuildingType[] = ["house", "shop", "garden"];

export interface ParcelBuilding {
  id:           string;
  tokenId:      string;
  zoneId:       string;
  plotIndex:    number;
  buildingType: BuildingType;
  placedAt:     Date;
}

// ── Queries ────────────────────────────────────────────────────────────────────

/** Returns all buildings placed on a parcel (by tokenId). */
export async function getParcelBuildings(tokenId: string): Promise<ParcelBuilding[]> {
  const rows = await getDb()
    .select()
    .from(parcelBuildings)
    .where(eq(parcelBuildings.tokenId, tokenId));

  return rows.map((r) => ({
    id:           r.id,
    tokenId:      r.tokenId,
    zoneId:       r.zoneId,
    plotIndex:    r.plotIndex,
    buildingType: r.buildingType as BuildingType,
    placedAt:     r.placedAt,
  }));
}

/**
 * Returns all buildings in a zone — used by visiting players to render
 * structures in the world without a blockchain roundtrip.
 */
export async function getBuildingsByZone(zoneId: string): Promise<ParcelBuilding[]> {
  const rows = await getDb()
    .select()
    .from(parcelBuildings)
    .where(eq(parcelBuildings.zoneId, zoneId));

  return rows.map((r) => ({
    id:           r.id,
    tokenId:      r.tokenId,
    zoneId:       r.zoneId,
    plotIndex:    r.plotIndex,
    buildingType: r.buildingType as BuildingType,
    placedAt:     r.placedAt,
  }));
}

// ── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Place a building on a parcel.
 * Throws "AlreadyPlaced" if the type already exists on this parcel.
 */
export async function placeBuilding(
  tokenId:      string,
  zoneId:       string,
  plotIndex:    number,
  buildingType: BuildingType,
): Promise<ParcelBuilding> {
  // Check uniqueness manually first for a clear error message.
  const existing = await getDb()
    .select({ id: parcelBuildings.id })
    .from(parcelBuildings)
    .where(
      and(
        eq(parcelBuildings.tokenId, tokenId),
        eq(parcelBuildings.buildingType, buildingType),
      ),
    );

  if (existing.length > 0) {
    throw new Error("AlreadyPlaced");
  }

  const rows = await getDb()
    .insert(parcelBuildings)
    .values({ tokenId, zoneId, plotIndex, buildingType })
    .returning();

  const r = rows[0];
  if (!r) throw new Error("Insert failed");

  return {
    id:           r.id,
    tokenId:      r.tokenId,
    zoneId:       r.zoneId,
    plotIndex:    r.plotIndex,
    buildingType: r.buildingType as BuildingType,
    placedAt:     r.placedAt,
  };
}

/**
 * Remove a building from a parcel by building row id.
 * Caller must verify parcel ownership before calling.
 */
export async function removeBuilding(buildingId: string): Promise<void> {
  await getDb()
    .delete(parcelBuildings)
    .where(eq(parcelBuildings.id, buildingId));
}
