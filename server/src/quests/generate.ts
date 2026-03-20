/**
 * LLM quest generation service.
 *
 * Calls Claude API to generate contextually appropriate quests for a given
 * zone + player level. Includes Redis-backed rate limiting to cap API costs.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getRedis } from "../auth/redis";
import type {
  QuestType,
  QuestObjective,
  QuestReward,
  QuestDialogue,
  QuestCompletionConditions,
  QuestGenerationContext,
} from "./types";

// ── Config ────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
/** Matches ECONOMY.LLM_QUEST_REWARD_MULTIPLIER in client constants.ts. */
const LLM_QUEST_REWARD_MULTIPLIER = 1.2;
/** Max LLM quest generations per minute (global, across all players). */
const RATE_LIMIT_PER_MIN = Number(process.env.QUEST_GEN_RATE_LIMIT ?? "10");
/** Cache TTL: generated quests are reused for 24 hours. */
export const QUEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ── Anthropic client (lazy) ───────────────────────────────────────────────────

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return _client;
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

/** Returns true if we are under the rate limit and increments the counter. */
async function checkRateLimit(): Promise<boolean> {
  const redis = getRedis();
  const bucket = Math.floor(Date.now() / 60_000); // 1-minute buckets
  const key = `quest:gen:rate:${bucket}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // Set TTL only on first increment so the key auto-expires after 2 min
      await redis.expire(key, 120);
    }
    return count <= RATE_LIMIT_PER_MIN;
  } catch {
    // Redis unavailable — allow generation (degrade gracefully)
    return true;
  }
}

// ── Level bucket helper ───────────────────────────────────────────────────────

/** Maps player level → bucket (1=lvl1-3, 2=lvl4-6, 3=lvl7-9, 4=lvl10). */
export function levelBucket(level: number): number {
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  if (level <= 9) return 3;
  return 4;
}

/** Builds the cache key for a given context. */
export function buildCacheKey(zoneId: string, bucket: number, questType: QuestType): string {
  return `${zoneId}:lb${bucket}:${questType}`;
}

// ── Reward calculator ─────────────────────────────────────────────────────────

function calcRewards(bucket: number, questType: QuestType): QuestReward {
  const mult = LLM_QUEST_REWARD_MULTIPLIER; // 1.2x — mirrors ECONOMY.LLM_QUEST_REWARD_MULTIPLIER
  const difficultyBonus: Record<QuestType, number> = {
    kill: 1.0,
    fetch: 0.9,
    explore: 0.8,
    escort: 1.1,
    puzzle: 1.0,
  };
  const d = difficultyBonus[questType];
  return {
    gold: Math.round(30 * bucket * mult * d),
    xp: Math.round(60 * bucket * mult * d),
  };
}

// ── LLM prompt ────────────────────────────────────────────────────────────────

function buildPrompt(ctx: QuestGenerationContext): string {
  const questTypeGuide: Record<QuestType, string> = {
    kill:    "Defeat a specific number of enemies in the zone.",
    fetch:   "Retrieve an item found somewhere in the zone.",
    explore: "Discover or visit a specific location within the zone.",
    escort:  "Protect an NPC and guide them safely across the zone.",
    puzzle:  "Solve an environmental or riddle-based challenge in the zone.",
  };

  return `You are a quest writer for a pixel-art MMORPG called PixelRealm. Your output must be appropriate for all ages (child-friendly, no violence gore or adult content).

Zone: ${ctx.zoneName} (${ctx.zoneBiome})
Zone description: ${ctx.zoneDescription}
Player level: ${ctx.playerLevel} (difficulty tier ${ctx.levelBucket}/4)
Quest type: ${ctx.questType} — ${questTypeGuide[ctx.questType]}
Enemy types present in this zone: ${ctx.enemyTypes.join(", ")}

Generate ONE quest in valid JSON. Use this exact schema — no extra keys, no markdown fences:
{
  "title": "string (max 60 chars)",
  "description": "string (1-2 sentences, zone-flavoured, age-appropriate)",
  "objectives": [
    {
      "type": "${ctx.questType}",
      "target": "string (what to kill/find/visit/escort/solve)",
      "count": <number or null — null for explore/escort/puzzle>,
      "description": "string (one clear instruction)"
    }
  ],
  "dialogue": {
    "greeting": "string (NPC opening line, max 120 chars)",
    "acceptance": "string (NPC encouragement after player accepts, max 120 chars)",
    "completion": "string (NPC thank-you when quest is turned in, max 120 chars)"
  },
  "completionConditions": {
    "type": "${ctx.questType}",
    "target": "string",
    "count": <number or null>
  }
}

Rules:
- Keep all text age-appropriate and positive in tone.
- Quest must feel thematically tied to the zone's biome and enemies.
- For kill quests, use an enemy type from the zone list.
- For fetch quests, invent a zone-flavoured item name.
- For escort/puzzle quests, name the NPC or puzzle element clearly.
- Output ONLY the JSON object — no prose before or after.`;
}

// ── Core generation function ──────────────────────────────────────────────────

export interface RawQuestData {
  title: string;
  description: string;
  objectives: QuestObjective[];
  dialogue: QuestDialogue;
  completionConditions: QuestCompletionConditions;
  rewards: QuestReward;
}

/** Calls the Claude API to generate a quest. Throws if rate-limited or API fails. */
export async function generateQuestLLM(ctx: QuestGenerationContext): Promise<RawQuestData> {
  const allowed = await checkRateLimit();
  if (!allowed) {
    throw new Error("Quest generation rate limit reached — please try again shortly.");
  }

  const client = getClient();
  const prompt = buildPrompt(ctx);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content.find((b) => b.type === "text")?.text ?? "";

  let parsed: Omit<RawQuestData, "rewards">;
  try {
    // Strip any accidental markdown fences just in case
    const json = raw.replace(/^```[a-z]*\n?/m, "").replace(/```$/m, "").trim();
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const rewards = calcRewards(ctx.levelBucket, ctx.questType);

  return {
    title: parsed.title,
    description: parsed.description,
    objectives: parsed.objectives,
    dialogue: parsed.dialogue,
    completionConditions: parsed.completionConditions,
    rewards,
  };
}
