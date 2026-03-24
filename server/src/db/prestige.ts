/**
 * Prestige system — server-side data access.
 *
 * Rules:
 *   - Player must be at MAX_LEVEL (50) to prestige.
 *   - Prestige level is capped at MAX_PRESTIGE (10).
 *   - Each prestige grants +2% permanent stat multiplier to HP, damage, and speed.
 *   - On reset: level → 1, xp → 0, skill allocations reset (handled by caller in ZoneRoom).
 */

import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { playerState } from "./schema";

export const MAX_PRESTIGE = 10;
/** Stat multiplier bonus granted per prestige level (stacks additively). */
export const PRESTIGE_BONUS_PER_LEVEL = 0.02;

export interface PrestigeBonuses {
  /** Additive multiplier applied to base HP/damage/speed (e.g. 0.06 = +6%). */
  statMultiplier: number;
}

/** Returns the permanent stat bonuses for a given prestige level (0–10). */
export function getPrestigeBonuses(prestigeLevel: number): PrestigeBonuses {
  const capped = Math.min(Math.max(prestigeLevel, 0), MAX_PRESTIGE);
  return { statMultiplier: capped * PRESTIGE_BONUS_PER_LEVEL };
}

export interface PrestigeResetResult {
  newPrestigeLevel: number;
  bonuses: PrestigeBonuses;
}

/**
 * Performs the prestige reset for a player.
 * - Increments prestige_level (capped at MAX_PRESTIGE).
 * - Resets level to 1 and xp to 0.
 * - Increments total_prestige_resets for audit history.
 *
 * Returns the new prestige level and the resulting bonuses.
 * Throws if the player is already at max prestige.
 */
export async function performPrestigeReset(playerId: string): Promise<PrestigeResetResult> {
  const db = getDb();

  const rows = await db
    .select()
    .from(playerState)
    .where(eq(playerState.playerId, playerId))
    .limit(1);

  const state = rows[0];
  if (!state) throw new Error("PLAYER_STATE_NOT_FOUND");
  if (state.level < 50) throw new Error("NOT_MAX_LEVEL");
  if (state.prestigeLevel >= MAX_PRESTIGE) throw new Error("MAX_PRESTIGE_REACHED");

  const newPrestigeLevel = state.prestigeLevel + 1;
  const newTotalResets   = state.totalPrestigeResets + 1;

  await db
    .update(playerState)
    .set({
      level:               1,
      xp:                  0,
      prestigeLevel:       newPrestigeLevel,
      totalPrestigeResets: newTotalResets,
      updatedAt:           new Date(),
    })
    .where(eq(playerState.playerId, playerId));

  return {
    newPrestigeLevel,
    bonuses: getPrestigeBonuses(newPrestigeLevel),
  };
}
