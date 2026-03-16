/**
 * Player data access layer.
 *
 * Covers:
 *   - Player identity (create, find by username/id)
 *   - Player state (load, save, upsert on first load)
 */

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { players, playerState, type Player, type PlayerState, type NewPlayer } from "./schema";

const BCRYPT_ROUNDS = 12;

// ── Identity ──────────────────────────────────────────────────────────────────

export async function createPlayerRecord(
  username: string,
  password: string,
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
  return rows[0] ?? null;
}

export async function findPlayerById(id: string): Promise<Player | null> {
  const db = getDb();
  const rows = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return rows[0] ?? null;
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
