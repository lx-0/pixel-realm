/**
 * social.ts — Friend list and block system DB layer.
 *
 * All queries are written in raw SQL against the pool for consistency with
 * the rest of the server-side DB helpers.
 */

import { getPool } from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FriendRow {
  playerId:    string;  // the friend's player UUID
  username:    string;
  status:      "pending" | "accepted";
  /** true = this player sent the request; false = they received it */
  iRequested:  boolean;
}

// ── Friend helpers ────────────────────────────────────────────────────────────

/**
 * Send a friend request from `requesterId` to the player with `targetUsername`.
 * Returns 'sent' | 'already_friends' | 'already_pending' | 'not_found' | 'blocked'.
 */
export async function sendFriendRequest(
  requesterId: string,
  targetUsername: string,
): Promise<"sent" | "already_friends" | "already_pending" | "not_found" | "blocked"> {
  const pool = getPool();

  // Resolve target
  const targetRes = await pool.query<{ id: string }>(
    "SELECT id FROM players WHERE username_lower = $1 AND deleted_at IS NULL",
    [targetUsername.toLowerCase()],
  );
  if (targetRes.rowCount === 0) return "not_found";
  const addresseeId = targetRes.rows[0].id;
  if (addresseeId === requesterId) return "not_found";

  // Check if blocker has blocked requester (or vice versa)
  const blockRes = await pool.query(
    `SELECT 1 FROM player_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)`,
    [requesterId, addresseeId],
  );
  if (blockRes.rowCount && blockRes.rowCount > 0) return "blocked";

  // Check existing relationship (both directions)
  const existingRes = await pool.query<{ status: string }>(
    `SELECT status FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)`,
    [requesterId, addresseeId],
  );
  if (existingRes.rowCount && existingRes.rowCount > 0) {
    const s = existingRes.rows[0].status;
    return s === "accepted" ? "already_friends" : "already_pending";
  }

  // Insert new pending request
  await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT DO NOTHING`,
    [requesterId, addresseeId],
  );
  return "sent";
}

/**
 * Accept a pending friend request sent by `requesterId` to `addresseeId`.
 * Returns true on success.
 */
export async function acceptFriendRequest(
  addresseeId: string,
  requesterUsername: string,
): Promise<boolean> {
  const pool = getPool();

  const targetRes = await pool.query<{ id: string }>(
    "SELECT id FROM players WHERE username_lower = $1 AND deleted_at IS NULL",
    [requesterUsername.toLowerCase()],
  );
  if (targetRes.rowCount === 0) return false;
  const requesterId = targetRes.rows[0].id;

  const result = await pool.query(
    `UPDATE friendships
        SET status = 'accepted', updated_at = NOW()
      WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'`,
    [requesterId, addresseeId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Remove a friend (or retract/decline a pending request).
 */
export async function removeFriend(
  playerId: string,
  targetUsername: string,
): Promise<boolean> {
  const pool = getPool();

  const targetRes = await pool.query<{ id: string }>(
    "SELECT id FROM players WHERE username_lower = $1 AND deleted_at IS NULL",
    [targetUsername.toLowerCase()],
  );
  if (targetRes.rowCount === 0) return false;
  const otherId = targetRes.rows[0].id;

  const result = await pool.query(
    `DELETE FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1)`,
    [playerId, otherId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Return all friends (accepted) and pending requests for `playerId`.
 */
export async function getFriendList(playerId: string): Promise<FriendRow[]> {
  const pool = getPool();

  const res = await pool.query<{
    player_id: string;
    username: string;
    status: string;
    i_requested: boolean;
  }>(
    `SELECT
       CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS player_id,
       p.username,
       f.status,
       f.requester_id = $1 AS i_requested
     FROM friendships f
     JOIN players p ON p.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
     WHERE (f.requester_id = $1 OR f.addressee_id = $1)
       AND p.deleted_at IS NULL`,
    [playerId],
  );

  return res.rows.map((r) => ({
    playerId:   r.player_id,
    username:   r.username,
    status:     r.status as "pending" | "accepted",
    iRequested: r.i_requested,
  }));
}

// ── Block helpers ─────────────────────────────────────────────────────────────

/**
 * Block `targetUsername` from the perspective of `blockerId`.
 * Also removes any friendship between them.
 * Returns 'ok' | 'not_found' | 'already_blocked'.
 */
export async function blockPlayer(
  blockerId: string,
  targetUsername: string,
): Promise<"ok" | "not_found" | "already_blocked"> {
  const pool = getPool();

  const targetRes = await pool.query<{ id: string }>(
    "SELECT id FROM players WHERE username_lower = $1 AND deleted_at IS NULL",
    [targetUsername.toLowerCase()],
  );
  if (targetRes.rowCount === 0) return "not_found";
  const blockedId = targetRes.rows[0].id;
  if (blockedId === blockerId) return "not_found";

  const existRes = await pool.query(
    "SELECT 1 FROM player_blocks WHERE blocker_id = $1 AND blocked_id = $2",
    [blockerId, blockedId],
  );
  if (existRes.rowCount && existRes.rowCount > 0) return "already_blocked";

  // Remove any friendship first
  await pool.query(
    `DELETE FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1)`,
    [blockerId, blockedId],
  );

  await pool.query(
    "INSERT INTO player_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [blockerId, blockedId],
  );
  return "ok";
}

/**
 * Unblock a player.
 */
export async function unblockPlayer(
  blockerId: string,
  targetUsername: string,
): Promise<boolean> {
  const pool = getPool();

  const targetRes = await pool.query<{ id: string }>(
    "SELECT id FROM players WHERE username_lower = $1 AND deleted_at IS NULL",
    [targetUsername.toLowerCase()],
  );
  if (targetRes.rowCount === 0) return false;
  const blockedId = targetRes.rows[0].id;

  const result = await pool.query(
    "DELETE FROM player_blocks WHERE blocker_id = $1 AND blocked_id = $2",
    [blockerId, blockedId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Return the set of player UUIDs that `playerId` has blocked.
 */
export async function getBlockedIds(playerId: string): Promise<Set<string>> {
  const pool = getPool();
  const res = await pool.query<{ blocked_id: string }>(
    "SELECT blocked_id FROM player_blocks WHERE blocker_id = $1",
    [playerId],
  );
  return new Set(res.rows.map((r) => r.blocked_id));
}

/**
 * Check whether `blockerId` has blocked `targetId` OR vice versa.
 */
export async function isBlocked(blockerId: string, targetId: string): Promise<boolean> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT 1 FROM player_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)`,
    [blockerId, targetId],
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Return the set of accepted friend UUIDs for `playerId` (for presence routing).
 */
export async function getAcceptedFriendIds(playerId: string): Promise<Set<string>> {
  const pool = getPool();
  const res = await pool.query<{ friend_id: string }>(
    `SELECT
       CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id
     FROM friendships
     WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'`,
    [playerId],
  );
  return new Set(res.rows.map((r) => r.friend_id));
}
