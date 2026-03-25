/**
 * Player data access layer.
 *
 * Covers:
 *   - Player identity (create, find by username/id)
 *   - Player state (load, save, upsert on first load)
 */

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq, isNull } from "drizzle-orm";
import { getDb } from "./client";
import { players, playerState, type Player, type PlayerState, type NewPlayer } from "./schema";

const BCRYPT_ROUNDS = 12;

// ── Identity ──────────────────────────────────────────────────────────────────

export async function createPlayerRecord(
  username: string,
  password: string,
  email?: string,
): Promise<Player> {
  const db = getDb();

  const existing = await db
    .select()
    .from(players)
    .where(eq(players.usernameLower, username.toLowerCase()))
    .limit(1);

  if (existing.length > 0) throw new Error("USERNAME_TAKEN");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const newPlayer: NewPlayer = {
    id: randomUUID(),
    username,
    usernameLower: username.toLowerCase(),
    passwordHash,
    email: email ?? null,
  };

  const [row] = await db.insert(players).values(newPlayer).returning();
  return row;
}

export async function findPlayerByUsername(username: string): Promise<Player | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(players)
    .where(eq(players.usernameLower, username.toLowerCase()))
    .limit(1);
  const row = rows[0] ?? null;
  // Treat soft-deleted accounts as not found (prevents login after deletion)
  if (row?.deletedAt) return null;
  return row;
}

export async function findPlayerById(id: string): Promise<Player | null> {
  const db = getDb();
  const rows = await db.select().from(players).where(eq(players.id, id)).limit(1);
  const row = rows[0] ?? null;
  if (row?.deletedAt) return null;
  return row;
}

export async function findPlayerByEmail(email: string): Promise<Player | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(players)
    .where(eq(players.email, email.toLowerCase()))
    .limit(1);
  const row = rows[0] ?? null;
  if (row?.deletedAt) return null;
  return row;
}

/**
 * Soft-deletes a player by setting deletedAt to now.
 * The row is retained for audit purposes; all active queries filter it out.
 */
export async function softDeletePlayer(id: string): Promise<void> {
  const db = getDb();
  await db.update(players).set({ deletedAt: new Date() }).where(eq(players.id, id));
}

export async function updatePlayerPassword(id: string, newPassword: string): Promise<void> {
  const db = getDb();
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(players).set({ passwordHash }).where(eq(players.id, id));
}

export async function verifyPlayerPassword(player: Player, password: string): Promise<boolean> {
  return bcrypt.compare(password, player.passwordHash);
}

// ── Player State ──────────────────────────────────────────────────────────────

export async function loadPlayerState(playerId: string): Promise<PlayerState | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playerState)
    .where(eq(playerState.playerId, playerId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Creates default player state on first login.
 * No-op if state already exists.
 */
export async function initPlayerState(playerId: string): Promise<PlayerState> {
  const db = getDb();
  const existing = await loadPlayerState(playerId);
  if (existing) return existing;

  const [row] = await db
    .insert(playerState)
    .values({ playerId })
    .returning();
  return row;
}

export interface PlayerStateUpdate {
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  level?: number;
  xp?: number;
  gold?: number;
  currentZone?: string;
  pveKills?: number;
  pvpWins?: number;
  prestigeLevel?: number;
  totalPrestigeResets?: number;
}

export async function savePlayerState(
  playerId: string,
  update: PlayerStateUpdate,
): Promise<void> {
  const db = getDb();
  await db
    .update(playerState)
    .set({ ...update, updatedAt: new Date(), lastSeenAt: new Date() })
    .where(eq(playerState.playerId, playerId));
}
