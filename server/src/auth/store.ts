/**
 * User and session storage backed by Redis.
 *
 * Keys:
 *   user:id:{userId}       → JSON UserRecord
 *   user:name:{username}   → userId  (index for login lookups)
 *   session:{jti}          → JSON SessionRecord
 */

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getRedis } from "./redis";

// ── Types ─────────────────────────────────────────────────────────────────────

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

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_S = 7 * 24 * 60 * 60; // 7 days (matches refresh token)

// ── User helpers ──────────────────────────────────────────────────────────────

export async function createUser(username: string, password: string): Promise<UserRecord> {
  const redis = getRedis();

  // Case-insensitive uniqueness check
  const existing = await redis.get(`user:name:${username.toLowerCase()}`);
  if (existing) throw new Error("USERNAME_TAKEN");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user: UserRecord = {
    id: randomUUID(),
    username,
    passwordHash,
    createdAt: Date.now(),
  };

  await redis
    .pipeline()
    .set(`user:id:${user.id}`, JSON.stringify(user))
    .set(`user:name:${username.toLowerCase()}`, user.id)
    .exec();

  return user;
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const redis = getRedis();
  const userId = await redis.get(`user:name:${username.toLowerCase()}`);
  if (!userId) return null;
  const raw = await redis.get(`user:id:${userId}`);
  return raw ? (JSON.parse(raw) as UserRecord) : null;
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const redis = getRedis();
  const raw = await redis.get(`user:id:${userId}`);
  return raw ? (JSON.parse(raw) as UserRecord) : null;
}

export async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

// ── Session helpers ───────────────────────────────────────────────────────────

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

/** Rotate a session: delete old JTI, create a new one for the same user. */
export async function rotateSession(
  oldJti: string,
  userId: string,
  username: string,
): Promise<SessionRecord> {
  await deleteSession(oldJti);
  return createSession(userId, username);
}
