/**
 * Guild database operations.
 *
 * Guilds have three roles: leader, officer, member.
 * A player may belong to at most one guild at a time.
 * The leader cannot leave — they must disband or promote someone first.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { guilds, guildMemberships, players, playerState } from "./schema";

// ── Public types ──────────────────────────────────────────────────────────────

export type GuildRole = "leader" | "officer" | "member";

export interface GuildInfo {
  id: string;
  name: string;
  tag: string;
  description: string;
  leaderId: string;
  createdAt: Date;
}

export interface GuildMemberInfo {
  playerId: string;
  username: string;
  role: GuildRole;
  level: number;
  joinedAt: Date;
  isOnline: boolean; // populated at query time from in-memory session data
}

export interface GuildWithRoster extends GuildInfo {
  members: GuildMemberInfo[];
}

// ── Create guild ──────────────────────────────────────────────────────────────

export interface CreateGuildResult {
  success: boolean;
  guildId?: string;
  error?: string;
}

export async function createGuild(
  leaderId: string,
  name: string,
  tag: string,
  description: string,
): Promise<CreateGuildResult> {
  const db = getDb();

  const trimName = name.trim();
  const trimTag  = tag.trim().toUpperCase();
  if (!trimName || trimName.length > 40)  return { success: false, error: "Guild name must be 1–40 characters." };
  if (!trimTag  || trimTag.length > 6)    return { success: false, error: "Guild tag must be 1–6 characters." };
  if (!/^[A-Z0-9]+$/.test(trimTag))       return { success: false, error: "Guild tag may only contain letters and digits." };

  const existing = await db
    .select()
    .from(guildMemberships)
    .where(eq(guildMemberships.playerId, leaderId))
    .limit(1);
  if (existing.length > 0) return { success: false, error: "You are already in a guild. Leave first." };

  try {
    const [guild] = await db
      .insert(guilds)
      .values({ name: trimName, tag: trimTag, description: description.trim().slice(0, 200), leaderId })
      .returning({ id: guilds.id });

    await db.insert(guildMemberships).values({
      guildId: guild.id,
      playerId: leaderId,
      role: "leader",
    });

    return { success: true, guildId: guild.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      return { success: false, error: "A guild with that name or tag already exists." };
    }
    throw err;
  }
}

// ── Get guild info + roster ───────────────────────────────────────────────────

export async function getGuildById(guildId: string): Promise<GuildWithRoster | null> {
  const db = getDb();

  const [guild] = await db
    .select()
    .from(guilds)
    .where(eq(guilds.id, guildId))
    .limit(1);
  if (!guild) return null;

  const members = await db
    .select({
      playerId: guildMemberships.playerId,
      username: players.username,
      role: guildMemberships.role,
      level: playerState.level,
      joinedAt: guildMemberships.joinedAt,
    })
    .from(guildMemberships)
    .innerJoin(players, eq(players.id, guildMemberships.playerId))
    .leftJoin(playerState, eq(playerState.playerId, guildMemberships.playerId))
    .where(eq(guildMemberships.guildId, guildId));

  return {
    ...guild,
    members: members.map(m => ({
      playerId:  m.playerId,
      username:  m.username,
      role:      m.role as GuildRole,
      level:     m.level ?? 1,
      joinedAt:  m.joinedAt,
      isOnline:  false,
    })),
  };
}

// ── Get player's guild ────────────────────────────────────────────────────────

export interface PlayerGuildInfo {
  guildId: string;
  guildName: string;
  guildTag: string;
  role: GuildRole;
}

export async function getPlayerGuild(playerId: string): Promise<PlayerGuildInfo | null> {
  const db = getDb();

  const [row] = await db
    .select({
      guildId:   guildMemberships.guildId,
      guildName: guilds.name,
      guildTag:  guilds.tag,
      role:      guildMemberships.role,
    })
    .from(guildMemberships)
    .innerJoin(guilds, eq(guilds.id, guildMemberships.guildId))
    .where(eq(guildMemberships.playerId, playerId))
    .limit(1);

  if (!row) return null;
  return {
    guildId:   row.guildId,
    guildName: row.guildName,
    guildTag:  row.guildTag,
    role:      row.role as GuildRole,
  };
}

// ── Invite (join) ─────────────────────────────────────────────────────────────

export interface GuildActionResult {
  success: boolean;
  error?: string;
}

export async function invitePlayer(
  actorId: string,
  targetUsername: string,
  guildId: string,
): Promise<GuildActionResult> {
  const db = getDb();

  const [actorRow] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, actorId)))
    .limit(1);
  if (!actorRow || !["leader", "officer"].includes(actorRow.role)) {
    return { success: false, error: "You must be a leader or officer to invite." };
  }

  const [target] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.usernameLower, targetUsername.toLowerCase()))
    .limit(1);
  if (!target) return { success: false, error: `Player "${targetUsername}" not found.` };

  const [existingMembership] = await db
    .select()
    .from(guildMemberships)
    .where(eq(guildMemberships.playerId, target.id))
    .limit(1);
  if (existingMembership) return { success: false, error: `${targetUsername} is already in a guild.` };

  await db.insert(guildMemberships).values({
    guildId,
    playerId: target.id,
    role: "member",
  });

  return { success: true };
}

// ── Kick ──────────────────────────────────────────────────────────────────────

export async function kickPlayer(
  actorId: string,
  targetPlayerId: string,
  guildId: string,
): Promise<GuildActionResult> {
  const db = getDb();

  const [actorRow] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, actorId)))
    .limit(1);
  if (!actorRow || !["leader", "officer"].includes(actorRow.role)) {
    return { success: false, error: "You must be a leader or officer to kick." };
  }

  const [targetRow] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, targetPlayerId)))
    .limit(1);
  if (!targetRow) return { success: false, error: "Player is not in this guild." };
  if (targetRow.role === "leader") return { success: false, error: "Cannot kick the guild leader." };
  if (actorRow.role === "officer" && targetRow.role === "officer") {
    return { success: false, error: "Officers cannot kick other officers." };
  }

  await db
    .delete(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, targetPlayerId)));

  return { success: true };
}

// ── Leave ─────────────────────────────────────────────────────────────────────

export async function leaveGuild(playerId: string): Promise<GuildActionResult> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(guildMemberships)
    .where(eq(guildMemberships.playerId, playerId))
    .limit(1);
  if (!row) return { success: false, error: "You are not in a guild." };
  if (row.role === "leader") {
    return { success: false, error: "The leader cannot leave. Promote someone first or disband the guild." };
  }

  await db
    .delete(guildMemberships)
    .where(and(eq(guildMemberships.guildId, row.guildId), eq(guildMemberships.playerId, playerId)));

  return { success: true };
}

// ── Promote / demote ──────────────────────────────────────────────────────────

export async function promotePlayer(
  actorId: string,
  targetPlayerId: string,
  guildId: string,
): Promise<GuildActionResult> {
  const db = getDb();

  const [actorRow] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, actorId)))
    .limit(1);
  if (!actorRow || actorRow.role !== "leader") {
    return { success: false, error: "Only the leader can promote members." };
  }

  const [targetRow] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, targetPlayerId)))
    .limit(1);
  if (!targetRow) return { success: false, error: "Player is not in this guild." };

  if (targetRow.role === "member") {
    await db
      .update(guildMemberships)
      .set({ role: "officer" })
      .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, targetPlayerId)));
  } else if (targetRow.role === "officer") {
    // Transfer leadership: actor becomes officer, target becomes leader
    await db
      .update(guildMemberships)
      .set({ role: "officer" })
      .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, actorId)));
    await db
      .update(guildMemberships)
      .set({ role: "leader" })
      .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, targetPlayerId)));
    await db
      .update(guilds)
      .set({ leaderId: targetPlayerId })
      .where(eq(guilds.id, guildId));
  } else {
    return { success: false, error: "Target is already the leader." };
  }

  return { success: true };
}

export async function demotePlayer(
  actorId: string,
  targetPlayerId: string,
  guildId: string,
): Promise<GuildActionResult> {
  const db = getDb();

  const [actorRow] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, actorId)))
    .limit(1);
  if (!actorRow || actorRow.role !== "leader") {
    return { success: false, error: "Only the leader can demote officers." };
  }

  const [targetRow] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, targetPlayerId)))
    .limit(1);
  if (!targetRow) return { success: false, error: "Player is not in this guild." };
  if (targetRow.role !== "officer") return { success: false, error: "Player is not an officer." };

  await db
    .update(guildMemberships)
    .set({ role: "member" })
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.playerId, targetPlayerId)));

  return { success: true };
}
