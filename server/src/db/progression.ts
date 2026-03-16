/**
 * Quest progression data access layer.
 *
 * Tracks per-player quest status and arbitrary progress data.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { progression, type ProgressionRow } from "./schema";

export async function getProgression(playerId: string): Promise<ProgressionRow[]> {
  const db = getDb();
  return db.select().from(progression).where(eq(progression.playerId, playerId));
}

export async function startQuest(playerId: string, questId: string): Promise<ProgressionRow> {
  const db = getDb();

  // Upsert: start or reset if previously failed
  const existing = await db
    .select()
    .from(progression)
    .where(and(eq(progression.playerId, playerId), eq(progression.questId, questId)))
    .limit(1);

  if (existing.length > 0 && existing[0].status === "active") {
    return existing[0];
  }

  const [row] = await db
    .insert(progression)
    .values({ playerId, questId, status: "active", progress: {} })
    .onConflictDoUpdate({
      target: [progression.playerId, progression.questId],
      set: { status: "active", progress: {}, startedAt: new Date(), completedAt: null },
    })
    .returning();
  return row;
}

export async function updateQuestProgress(
  playerId: string,
  questId: string,
  progress: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  await db
    .update(progression)
    .set({ progress })
    .where(and(eq(progression.playerId, playerId), eq(progression.questId, questId)));
}

export async function completeQuest(playerId: string, questId: string): Promise<void> {
  const db = getDb();
  await db
    .update(progression)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(progression.playerId, playerId), eq(progression.questId, questId)));
}
