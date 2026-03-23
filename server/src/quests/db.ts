/**
 * Quest DB layer.
 *
 * Handles reading/writing generated quests and assigning them to players
 * via the progression table.
 */

import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db/client";
import { generatedQuests, progression } from "../db/schema";
import {
  generateQuestLLM,
  levelBucket,
  buildCacheKey,
  QUEST_CACHE_TTL_MS,
} from "./generate";
import type { GeneratedQuest, QuestGenerationContext, QuestType } from "./types";
import { factionForZone, getStanding } from "../factions";
import { getPlayerFactionReputation } from "../db/factions";

// ── Zone metadata (mirrors client constants.ts ZONES) ─────────────────────────

const ZONE_META: Record<string, { name: string; biome: string; description: string; enemyTypes: string[] }> = {
  zone1: {
    name: "Verdant Hollow",
    biome: "Forest",
    description: "A mossy forest glen. Slimes and mushroom creeps lurk among ancient trees.",
    enemyTypes: ["slime", "mushroom"],
  },
  zone2: {
    name: "Dusty Trail",
    biome: "Plains / Desert",
    description: "Sun-baked crossroads. Bandits, beetles, and cactus sentries patrol the canyon.",
    enemyTypes: ["beetle", "bandit", "sentry"],
  },
  zone3: {
    name: "Ironveil Ruins",
    biome: "Dungeon",
    description: "Crumbling mage tower. Wraiths, golems, and cursed archers guard the archive.",
    enemyTypes: ["wraith", "golem", "archer"],
  },
  zone4: {
    name: "Saltmarsh Harbor",
    biome: "Ocean / Coastal",
    description: "Storm-lashed docks. Corsairs, sea wisps, and crabs defend the sunken vault.",
    enemyTypes: ["crab", "wisp", "raider"],
  },
};

const QUEST_TYPES: QuestType[] = ["kill", "fetch", "explore", "escort", "puzzle"];

function pickQuestType(): QuestType {
  return QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
}

// ── Cache lookup ──────────────────────────────────────────────────────────────

async function getCachedQuest(cacheKey: string): Promise<GeneratedQuest | null> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select()
    .from(generatedQuests)
    .where(and(eq(generatedQuests.cacheKey, cacheKey), gt(generatedQuests.expiresAt, now)))
    .limit(1);

  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: row.id,
    zoneId: row.zoneId,
    playerLevelBucket: row.playerLevelBucket,
    questType: row.questType as QuestType,
    factionId: row.factionId ?? null,
    title: row.title,
    description: row.description,
    objectives: row.objectives as GeneratedQuest["objectives"],
    rewards: row.rewards as GeneratedQuest["rewards"],
    dialogue: row.dialogue as GeneratedQuest["dialogue"],
    completionConditions: row.completionConditions as GeneratedQuest["completionConditions"],
    cacheKey: row.cacheKey,
    generatedAt: row.generatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

// ── Generate and store ────────────────────────────────────────────────────────

async function generateAndStore(ctx: QuestGenerationContext): Promise<GeneratedQuest> {
  const data = await generateQuestLLM(ctx);
  const db = getDb();

  const expiresAt = new Date(Date.now() + QUEST_CACHE_TTL_MS);
  const cacheKey = buildCacheKey(ctx.zoneId, ctx.levelBucket, ctx.questType);

  const [row] = await db
    .insert(generatedQuests)
    .values({
      zoneId: ctx.zoneId,
      playerLevelBucket: ctx.levelBucket,
      questType: ctx.questType,
      factionId: ctx.factionId,
      title: data.title,
      description: data.description,
      objectives: data.objectives,
      rewards: data.rewards,
      dialogue: data.dialogue,
      completionConditions: data.completionConditions,
      cacheKey,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: generatedQuests.cacheKey,
      set: {
        title: data.title,
        description: data.description,
        objectives: data.objectives,
        rewards: data.rewards,
        dialogue: data.dialogue,
        completionConditions: data.completionConditions,
        factionId: ctx.factionId,
        generatedAt: new Date(),
        expiresAt,
      },
    })
    .returning();

  return {
    id: row.id,
    zoneId: row.zoneId,
    playerLevelBucket: row.playerLevelBucket,
    questType: row.questType as QuestType,
    factionId: row.factionId ?? null,
    title: row.title,
    description: row.description,
    objectives: row.objectives as GeneratedQuest["objectives"],
    rewards: row.rewards as GeneratedQuest["rewards"],
    dialogue: row.dialogue as GeneratedQuest["dialogue"],
    completionConditions: row.completionConditions as GeneratedQuest["completionConditions"],
    cacheKey: row.cacheKey,
    generatedAt: row.generatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the player's active quest in this zone if they have one, otherwise
 * fetches a cached or freshly-generated quest and starts it for the player.
 *
 * Returns { quest, isNew: true } when assigning a brand-new quest,
 *          { quest, isNew: false } when the player already has this one active.
 */
export async function getOrGenerateQuest(
  playerId: string,
  zoneId: string,
  playerLevel: number,
): Promise<{ quest: GeneratedQuest; isNew: boolean }> {
  const db = getDb();

  // 1. Check for an existing active quest in this zone for the player.
  //    Quest IDs for LLM quests use the prefix `llm:${zoneId}:` so we can
  //    identify them without a separate table join.
  const prefix = `llm:${zoneId}:`;
  const activeRows = await db
    .select()
    .from(progression)
    .where(and(eq(progression.playerId, playerId), eq(progression.status, "active")));

  const existingRow = activeRows.find((r) => r.questId.startsWith(prefix));
  if (existingRow) {
    // Player has an active quest — look up its data from generated_quests
    const questId = existingRow.questId.replace(prefix, "");
    const rows = await db
      .select()
      .from(generatedQuests)
      .where(eq(generatedQuests.id, questId))
      .limit(1);

    if (rows.length) {
      const row = rows[0];
      const quest: GeneratedQuest = {
        id: row.id,
        zoneId: row.zoneId,
        playerLevelBucket: row.playerLevelBucket,
        questType: row.questType as QuestType,
        factionId: row.factionId ?? null,
        title: row.title,
        description: row.description,
        objectives: row.objectives as GeneratedQuest["objectives"],
        rewards: row.rewards as GeneratedQuest["rewards"],
        dialogue: row.dialogue as GeneratedQuest["dialogue"],
        completionConditions: row.completionConditions as GeneratedQuest["completionConditions"],
        cacheKey: row.cacheKey,
        generatedAt: row.generatedAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      };
      return { quest, isNew: false };
    }
  }

  // 2. No active quest — get or generate one.
  const bucket = levelBucket(playerLevel);
  const questType = pickQuestType();
  const cacheKey = buildCacheKey(zoneId, bucket, questType);

  let quest = await getCachedQuest(cacheKey);

  if (!quest) {
    const meta = ZONE_META[zoneId] ?? ZONE_META["zone1"];
    const faction = factionForZone(zoneId);

    // Look up player's standing with this zone's faction (if any)
    let playerStanding: string | null = null;
    if (faction) {
      const rep = await getPlayerFactionReputation(playerId, faction.id);
      playerStanding = rep.standing;
    }

    const ctx: QuestGenerationContext = {
      zoneId,
      zoneName: meta.name,
      zoneBiome: meta.biome,
      zoneDescription: meta.description,
      playerLevel,
      levelBucket: bucket,
      questType,
      enemyTypes: meta.enemyTypes,
      factionId: faction?.id ?? null,
      factionName: faction?.name ?? null,
      playerStanding,
    };
    quest = await generateAndStore(ctx);
  }

  // 3. Assign the quest to the player via progression table.
  const questProgressId = `${prefix}${quest.id}`;
  await db
    .insert(progression)
    .values({ playerId, questId: questProgressId, status: "active", progress: {} })
    .onConflictDoNothing();

  return { quest, isNew: true };
}

/**
 * Marks a player's LLM quest in a zone as completed.
 * Returns the factionId of the completed quest (for rep awards), or null.
 */
export async function completeQuestForPlayer(
  playerId: string,
  zoneId: string,
  questId: string,
): Promise<{ factionId: string | null }> {
  const db = getDb();
  const progressId = `llm:${zoneId}:${questId}`;
  await db
    .update(progression)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(progression.playerId, playerId), eq(progression.questId, progressId)));

  // Look up the factionId from the quest record
  const rows = await db
    .select({ factionId: generatedQuests.factionId })
    .from(generatedQuests)
    .where(eq(generatedQuests.id, questId))
    .limit(1);

  return { factionId: rows[0]?.factionId ?? null };
}
