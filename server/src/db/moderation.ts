/**
 * Moderation data access layer.
 *
 * Covers:
 *   - Player bans (check, add)
 *   - Player mutes (check, add)
 *   - Chat log (write, read recent)
 *   - Player reports (create)
 */

import { eq, and, gt, desc, sql } from "drizzle-orm";
import { getDb } from "./client";
import { playerBans, playerMutes, chatLog, playerReports } from "./schema";

// ── Bans ──────────────────────────────────────────────────────────────────────

/** Returns true if the player has an active ban (permanent or not yet expired). */
export async function isPlayerBanned(playerId: string): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  // Check for any ban record: permanent (expiresAt IS NULL) or future expiry
  const rows = await db
    .select({ id: playerBans.id, expiresAt: playerBans.expiresAt })
    .from(playerBans)
    .where(eq(playerBans.playerId, playerId))
    .limit(10);

  for (const row of rows) {
    if (!row.expiresAt) return true;           // permanent
    if (row.expiresAt > now) return true;       // temporary, still active
  }
  return false;
}

/** Adds a ban record for the player. expiresAt = undefined means permanent. */
export async function banPlayer(
  playerId: string,
  reason: string,
  bannedBy: string,
  expiresAt?: Date,
): Promise<void> {
  const db = getDb();
  await db.insert(playerBans).values({
    playerId,
    reason,
    bannedBy,
    expiresAt: expiresAt ?? null,
  });
}

// ── Mutes ─────────────────────────────────────────────────────────────────────

/** Returns true if the player has an active persistent mute. */
export async function isPlayerMuted(playerId: string): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({ id: playerMutes.id })
    .from(playerMutes)
    .where(and(eq(playerMutes.playerId, playerId), gt(playerMutes.expiresAt, now)))
    .limit(1);
  return rows.length > 0;
}

/** Adds a persistent mute record for the player. durationMinutes = how long. */
export async function mutePlayer(
  playerId: string,
  reason: string,
  mutedBy: string,
  durationMinutes: number,
): Promise<void> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1_000);
  await db.insert(playerMutes).values({ playerId, reason, mutedBy, expiresAt });
}

// ── Chat Log ──────────────────────────────────────────────────────────────────

/** Persists a chat message. Trims the log to the most recent 1000 rows (non-blocking). */
export async function logChat(
  playerId: string,
  playerName: string,
  zoneId: string,
  message: string,
  filtered: boolean,
): Promise<void> {
  const db = getDb();
  await db.insert(chatLog).values({ playerId, playerName, zoneId, message, filtered });

  // Trim to last 1000 messages — fire-and-forget, non-blocking
  db.execute(
    sql`DELETE FROM chat_log WHERE id NOT IN (
      SELECT id FROM chat_log ORDER BY sent_at DESC LIMIT 1000
    )`,
  ).catch(() => {/* non-fatal */});
}

/** Returns the most recent chat messages (default: 100). */
export async function getRecentChatLog(limit = 100) {
  const db = getDb();
  return db
    .select()
    .from(chatLog)
    .orderBy(desc(chatLog.sentAt))
    .limit(Math.min(limit, 500));
}

// ── Reports ───────────────────────────────────────────────────────────────────

/** Creates a player-submitted abuse report. */
export async function createReport(
  reporterId: string,
  reportedId: string,
  reason: string,
  zoneId: string,
): Promise<void> {
  const db = getDb();
  await db.insert(playerReports).values({ reporterId, reportedId, reason, zoneId });
}
