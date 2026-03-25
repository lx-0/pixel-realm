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
import type { GeneratedQuest, QuestGenerationContext, QuestType, GeneratedQuestWithChain } from "./types";
import { factionForZone, getStanding } from "../factions";
import { getPlayerFactionReputation } from "../db/factions";
import {
  getNpcMemory,
  appendNpcMemory,
  getActiveSeason,
  getCachedChain,
  storeQuestChain,
  getOrStartChainProgress,
  advanceChainStep,
} from "../db/content";

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
  zone5: {
    name: "Ice Caverns",
    biome: "Ice / Cave",
    description: "Frozen depths beneath the world. Ice elementals, frost wolves, and crystal golems guard the lair of the Glacial Wyrm.",
    enemyTypes: ["ice_elemental", "frost_wolf", "crystal_golem"],
  },
  zone6: {
    name: "Volcanic Highlands",
    biome: "Volcanic",
    description: "Scorched peaks above a sea of magma. Lava slimes, fire imps, and magma golems guard the forge of the Infernal Warden.",
    enemyTypes: ["lava_slime", "fire_imp", "magma_golem"],
  },
  zone7: {
    name: "Shadowmire Swamp",
    biome: "Swamp",
    description: "Ancient wetlands choked with fog and decay. Bog crawlers, swamp wraiths, and toxic toads lurk in the murk, serving the dreaded Mire Queen.",
    enemyTypes: ["bog_crawler", "swamp_wraith", "toxic_toad"],
  },
  zone8: {
    name: "Frostpeak Highlands",
    biome: "Ice / Mountain",
    description: "Frozen peaks battered by eternal blizzards. Frost elementals, snow wolves, and ice archers guard the summit throne of the mighty Frost Titan.",
    enemyTypes: ["frost_elemental", "snow_wolf", "ice_archer"],
  },
  zone9: {
    name: "Celestial Spire",
    biome: "Sky / Celestial",
    description: "A towering spire piercing the heavens. Star sentinels, void mages, and astral beasts guard the throne of the Celestial Arbiter.",
    enemyTypes: ["star_sentinel", "void_mage", "astral_beast"],
  },
  zone16: {
    name: "Ethereal Nexus",
    biome: "ethereal-nexus",
    description: "A shimmering dimension where reality dissolves into pure energy. Nexus guardians, phase striders, and energy parasites swarm the crystalline conduits where The Nexus Overseer seeks to consume all dimensional fabric.",
    enemyTypes: ["nexus_guardian", "phase_strider", "energy_parasite"],
  },
  zone17: {
    name: "Twilight Citadel",
    biome: "twilight-citadel",
    description: "A crumbling citadel suspended between twilight dimensions, half light and half shadow. Twilight sentinels, rift stalkers, and echo wraiths patrol the amber-and-violet battlements where The Twilight Warden enforces an eternal dusk.",
    enemyTypes: ["twilight_sentinel", "rift_stalker", "echo_wraith"],
  },
  zone18: {
    name: "Oblivion Spire",
    biome: "oblivion-spire",
    description: "The Oblivion Spire rises at the edge of reality — fractured celestial architecture suspended over absolute void. Spire sentinels, reality shards, and oblivion wraiths guard the crystallized platforms where The Spire Keeper channels void-gold energy to unmake the boundaries of existence.",
    enemyTypes: ["spire_sentinel", "reality_shard", "oblivion_wraith"],
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

// ── Quest chain generation ─────────────────────────────────────────────────────

const CHAIN_LENGTH = 3;

/**
 * Generate a quest chain of CHAIN_LENGTH quests with a shared theme.
 * Returns the chain id.
 */
async function generateQuestChain(
  playerId: string,
  zoneId: string,
  playerLevel: number,
): Promise<string | null> {
  try {
    const bucket = levelBucket(playerLevel);
    const existing = await getCachedChain(zoneId, bucket);
    if (existing) return existing.id;

    const meta = ZONE_META[zoneId] ?? ZONE_META["zone1"];
    const faction = factionForZone(zoneId);
    const season = await getActiveSeason();

    let playerStanding: string | null = null;
    if (faction) {
      const rep = await getPlayerFactionReputation(playerId, faction.id);
      playerStanding = rep.standing;
    }

    // Chain theme: derive from season name and zone, or use a fallback
    const chainTheme = season
      ? `${season.name} — ${meta.biome} troubles`
      : `Mysteries of ${meta.name}`;

    // Generate each quest step with the chain context
    const questIds: string[] = [];
    const questTypes: QuestType[] = ["fetch", "kill", "explore"];

    for (let step = 1; step <= CHAIN_LENGTH; step++) {
      const questType = questTypes[(step - 1) % questTypes.length];
      const cacheKey = buildCacheKey(zoneId, bucket, questType) + `:chain:step${step}`;

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
        seasonName: season?.name ?? null,
        seasonTheme: season?.storyPromptTemplate ?? null,
        chainTheme,
        chainStep: step,
        chainTotalSteps: CHAIN_LENGTH,
      };

      const data = await generateQuestLLM(ctx);
      const db = getDb();
      const expiresAt = new Date(Date.now() + QUEST_CACHE_TTL_MS);

      const [row] = await db
        .insert(generatedQuests)
        .values({
          zoneId,
          playerLevelBucket: bucket,
          questType,
          factionId: faction?.id ?? null,
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
            generatedAt: new Date(),
            expiresAt,
          },
        })
        .returning();

      questIds.push(row.id);
    }

    const chainId = await storeQuestChain(zoneId, bucket, `${chainTheme} (chain)`, chainTheme, questIds);
    return chainId;
  } catch (err) {
    console.warn("[Quest] Chain generation failed:", (err as Error).message);
    return null;
  }
}

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
): Promise<{ quest: GeneratedQuestWithChain; isNew: boolean }> {
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

  // 2. No active quest — check for a quest chain first, then fall back to standalone.
  const bucket = levelBucket(playerLevel);

  // Try quest chain: see if player has an active chain step
  let chainId: string | null = null;
  let chainStep = 0;
  let chainTotalSteps = CHAIN_LENGTH;
  let chainTitle: string | undefined;

  try {
    let chain = await getCachedChain(zoneId, bucket);
    if (!chain) {
      // Generate a new chain (async, non-blocking for solo quest fallback)
      const newChainId = await generateQuestChain(playerId, zoneId, playerLevel);
      if (newChainId) chain = await getCachedChain(zoneId, bucket);
    }

    if (chain && chain.questIds.length > 0) {
      const progress = await getOrStartChainProgress(playerId, chain.id);
      if (progress.status === "active" && progress.currentStep < chain.questIds.length) {
        chainId = chain.id;
        chainStep = progress.currentStep;
        chainTotalSteps = chain.questIds.length;
        chainTitle = chain.title;

        // Look up the quest at this step
        const stepQuestId = chain.questIds[chainStep];
        const stepRows = await db
          .select()
          .from(generatedQuests)
          .where(eq(generatedQuests.id, stepQuestId))
          .limit(1);

        if (stepRows.length) {
          const row = stepRows[0];
          const quest: GeneratedQuestWithChain = {
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
            chainId,
            chainStep: chainStep + 1,
            chainTotalSteps,
            chainTitle,
          };
          const questProgressId = `${prefix}${quest.id}`;
          await db.insert(progression).values({ playerId, questId: questProgressId, status: "active", progress: {} }).onConflictDoNothing();
          return { quest, isNew: true };
        }
      }
    }
  } catch (chainErr) {
    console.warn("[Quest] Chain lookup failed, falling back to standalone:", (chainErr as Error).message);
  }

  // Standalone quest fallback
  const questType = pickQuestType();
  const cacheKey = buildCacheKey(zoneId, bucket, questType);

  // Load NPC memory and season for context
  const npcId = `quest_npc_${zoneId}`;
  const [npcMemory, season] = await Promise.all([
    getNpcMemory(playerId, npcId).catch(() => [] as string[]),
    getActiveSeason().catch(() => null),
  ]);

  let quest = await getCachedQuest(cacheKey);

  if (!quest) {
    const meta = ZONE_META[zoneId] ?? ZONE_META["zone1"];
    const faction = factionForZone(zoneId);

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
      npcMemory: npcMemory.length ? npcMemory : undefined,
      seasonName: season?.name ?? null,
      seasonTheme: season?.storyPromptTemplate ?? null,
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
 * Also records NPC memory and advances chain step if applicable.
 */
export async function completeQuestForPlayer(
  playerId: string,
  zoneId: string,
  questId: string,
): Promise<{ factionId: string | null; chainAdvanced: boolean; chainComplete: boolean }> {
  const db = getDb();
  const progressId = `llm:${zoneId}:${questId}`;
  await db
    .update(progression)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(progression.playerId, playerId), eq(progression.questId, progressId)));

  // Look up quest data
  const rows = await db
    .select()
    .from(generatedQuests)
    .where(eq(generatedQuests.id, questId))
    .limit(1);

  const factionId = rows[0]?.factionId ?? null;
  const questTitle = rows[0]?.title ?? "a quest";

  // Record NPC memory for future quest generation
  const npcId = `quest_npc_${zoneId}`;
  const summary = `Player completed "${questTitle}".`;
  appendNpcMemory(playerId, npcId, zoneId, summary).catch(() => {});

  // Advance quest chain step if player was on one
  let chainAdvanced = false;
  let chainComplete = false;
  try {
    // Find chain by checking if questId is one of the chain's quest IDs
    const pool = (await import("../db/client")).getPool();
    const chainRes = await pool.query<{ id: string; quest_ids: string[]; total: number }>(
      `SELECT id, quest_ids, jsonb_array_length(quest_ids) AS total
         FROM quest_chains
        WHERE zone_id = $1 AND quest_ids @> to_jsonb($2::text) AND expires_at > NOW()
        LIMIT 1`,
      [zoneId, questId],
    );
    if (chainRes.rows.length) {
      const chainRec = chainRes.rows[0];
      const progress = await getOrStartChainProgress(playerId, chainRec.id);
      if (progress.status === "active") {
        const nextStep = progress.currentStep + 1;
        chainComplete = nextStep >= chainRec.total;
        await advanceChainStep(playerId, chainRec.id, nextStep, chainComplete);
        chainAdvanced = true;
      }
    }
  } catch (_chainErr) { /* non-fatal */ }

  return { factionId, chainAdvanced, chainComplete };
}
