/**
 * Skill allocations data access layer.
 *
 * Handles loading / saving the skill tree state for each player:
 *   - which skills they've unlocked
 *   - unspent skill points
 *   - hotbar layout (up to 6 active skill slots)
 */

import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { skillAllocations, type SkillAllocationsRow } from "./schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillState {
  classId: string;
  /** Set of unlocked skill ids. */
  unlockedSkills: Record<string, 1>;
  /** Unspent skill points. */
  skillPoints: number;
  /** Active skill ids on hotbar slots 0–5 (empty string = empty slot). */
  hotbar: string[];
}

// ── Load / init ───────────────────────────────────────────────────────────────

export async function loadSkillState(playerId: string): Promise<SkillState | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(skillAllocations)
    .where(eq(skillAllocations.playerId, playerId))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToState(rows[0]);
}

/**
 * Ensures a row exists for the player. Returns the current state (default
 * Warrior with 0 points if this is the first call).
 */
export async function initSkillState(playerId: string): Promise<SkillState> {
  const db = getDb();
  const existing = await loadSkillState(playerId);
  if (existing) return existing;

  const [row] = await db
    .insert(skillAllocations)
    .values({ playerId })
    .returning();
  return rowToState(row);
}

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveSkillState(
  playerId: string,
  state: Partial<SkillState>,
): Promise<void> {
  const db = getDb();
  const update: Partial<SkillAllocationsRow> = { updatedAt: new Date() };
  if (state.classId           !== undefined) update.classId           = state.classId;
  if (state.unlockedSkills    !== undefined) update.unlockedSkills    = state.unlockedSkills;
  if (state.skillPoints       !== undefined) update.skillPoints       = state.skillPoints;
  if (state.hotbar            !== undefined) update.hotbar            = state.hotbar;

  await db
    .update(skillAllocations)
    .set(update)
    .where(eq(skillAllocations.playerId, playerId));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToState(row: SkillAllocationsRow): SkillState {
  return {
    classId: row.classId,
    unlockedSkills: (row.unlockedSkills as Record<string, 1>) ?? {},
    skillPoints: row.skillPoints,
    hotbar: Array.isArray(row.hotbar) ? (row.hotbar as string[]) : [],
  };
}
