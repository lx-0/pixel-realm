/**
 * Dungeon cooldown persistence layer.
 *
 * Replaces the server-wide in-memory Map so that per-player dungeon cooldowns
 * survive server restarts. Uses the player_dungeon_cooldowns table.
 */

import { and, eq, gt } from "drizzle-orm";
import { getDb } from "./client";
import { playerDungeonCooldowns } from "./schema";

const DEFAULT_DUNGEON_ID = "default";

/**
 * Records a dungeon completion for a player, starting their cooldown.
 * Upserts — if the player already has a row for this dungeonId it is replaced.
 */
export async function recordDungeonCooldown(
  playerId: string,
  cooldownMs: number,
  dungeonId = DEFAULT_DUNGEON_ID,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + cooldownMs);

  await db
    .insert(playerDungeonCooldowns)
    .values({ playerId, dungeonId, completedAt: now, expiresAt })
    .onConflictDoUpdate({
      target: [playerDungeonCooldowns.playerId, playerDungeonCooldowns.dungeonId],
      set: { completedAt: now, expiresAt },
    });
}

/**
 * Returns milliseconds remaining on the player's cooldown, or 0 if expired/none.
 */
export async function getDungeonCooldownRemainingDb(
  playerId: string,
  dungeonId = DEFAULT_DUNGEON_ID,
): Promise<number> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({ expiresAt: playerDungeonCooldowns.expiresAt })
    .from(playerDungeonCooldowns)
    .where(
      and(
        eq(playerDungeonCooldowns.playerId, playerId),
        eq(playerDungeonCooldowns.dungeonId, dungeonId),
        gt(playerDungeonCooldowns.expiresAt, now),
      ),
    )
    .limit(1);

  if (!rows.length) return 0;
  return rows[0].expiresAt.getTime() - now.getTime();
}
