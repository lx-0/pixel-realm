/**
 * User and session storage.
 *
 * Users   → PostgreSQL (persistent, relational)
 * Sessions → Redis      (ephemeral, fast-access)
 *
 * Redis keys:
 *   session:{jti}  → JSON SessionRecord
 */

import { randomUUID } from "crypto";
import {
  createPlayerRecord,
  findPlayerByUsername as dbFindByUsername,
  findPlayerByEmail as dbFindByEmail,
  findPlayerById as dbFindById,
  verifyPlayerPassword,
  updatePlayerPassword as dbUpdatePassword,
  initPlayerState,
} from "../db/players";
import type { Player } from "../db/schema";
import { getRedis } from "./redis";

// ── Re-exported types (consumers expect UserRecord shape) ─────────────────────

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface SessionRecord {
  jti: string;
  userId: string;
  username: string;
  expiresAt: number; // Unix ms
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_TTL_S = 7 * 24 * 60 * 60; // 7 days

// ── Adapters: map DB Player → UserRecord ──────────────────────────────────────

function toUserRecord(player: Player): UserRecord {
  return {
    id: player.id,
    username: player.username,
    passwordHash: player.passwordHash,
    createdAt: player.createdAt.getTime(),
  };
}

// ── User helpers ──────────────────────────────────────────────────────────────

export async function createUser(username: string, password: string, email?: string): Promise<UserRecord> {
  const player = await createPlayerRecord(username, password, email);
  // Bootstrap player_state row so the game has defaults from first login
  await initPlayerState(player.id).catch((err: Error) =>
    console.warn("[store] initPlayerState failed:", err.message),
  );
  return toUserRecord(player);
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const player = await dbFindByUsername(username);
  return player ? toUserRecord(player) : null;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const player = await dbFindByEmail(email);
  return player ? toUserRecord(player) : null;
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const player = await dbFindById(userId);
  return player ? toUserRecord(player) : null;
}

export async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
  return verifyPlayerPassword({ passwordHash: user.passwordHash } as Player, password);
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  await dbUpdatePassword(userId, newPassword);
}

// ── Session helpers (Redis-backed) ────────────────────────────────────────────

export async function createSession(userId: string, username: string): Promise<SessionRecord> {
  const redis = getRedis();
  const jti = randomUUID();
  const session: SessionRecord = {
    jti,
    userId,
    username,
    expiresAt: Date.now() + SESSION_TTL_S * 1000,
  };
  await redis.set(`session:${jti}`, JSON.stringify(session), "EX", SESSION_TTL_S);
  return session;
}

export async function findSession(jti: string): Promise<SessionRecord | null> {
  const redis = getRedis();
  const raw = await redis.get(`session:${jti}`);
  return raw ? (JSON.parse(raw) as SessionRecord) : null;
}

export async function deleteSession(jti: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`session:${jti}`);
}

export async function rotateSession(
  oldJti: string,
  userId: string,
  username: string,
): Promise<SessionRecord> {
  await deleteSession(oldJti);
  return createSession(userId, username);
}

// ── Password reset tokens (Redis-backed, 1-hour TTL) ──────────────────────────

export interface PasswordResetRecord {
  token: string;
  userId: string;
  username: string;
  expiresAt: number;
}

const RESET_TOKEN_TTL_S = 60 * 60; // 1 hour

export async function createPasswordResetToken(userId: string, username: string): Promise<PasswordResetRecord> {
  const redis = getRedis();
  const token = randomUUID();
  const record: PasswordResetRecord = {
    token,
    userId,
    username,
    expiresAt: Date.now() + RESET_TOKEN_TTL_S * 1000,
  };
  await redis.set(`pwreset:${token}`, JSON.stringify(record), "EX", RESET_TOKEN_TTL_S);
  return record;
}

export async function findPasswordResetToken(token: string): Promise<PasswordResetRecord | null> {
  const redis = getRedis();
  const raw = await redis.get(`pwreset:${token}`);
  return raw ? (JSON.parse(raw) as PasswordResetRecord) : null;
}

export async function deletePasswordResetToken(token: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`pwreset:${token}`);
}
