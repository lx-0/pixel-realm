/**
 * Quest generation tests.
 *
 * Covers:
 *   - levelBucket() pure function
 *   - buildCacheKey() pure function
 *   - QUEST_CACHE_TTL_MS constant
 *   - Rate limiter behaviour (via mocked Redis)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockRedis } from "./helpers/mock-redis";

// ── Redis mock ────────────────────────────────────────────────────────────────

const mockRedisInstance = new MockRedis();

vi.mock("../auth/redis", () => ({
  getRedis: () => mockRedisInstance,
  closeRedis: vi.fn(),
}));

import {
  levelBucket,
  buildCacheKey,
  QUEST_CACHE_TTL_MS,
} from "../quests/generate";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Quest Generation – pure helpers", () => {
  describe("levelBucket()", () => {
    it("maps level 1 to bucket 1", () => expect(levelBucket(1)).toBe(1));
    it("maps level 3 to bucket 1", () => expect(levelBucket(3)).toBe(1));
    it("maps level 4 to bucket 2", () => expect(levelBucket(4)).toBe(2));
    it("maps level 6 to bucket 2", () => expect(levelBucket(6)).toBe(2));
    it("maps level 7 to bucket 3", () => expect(levelBucket(7)).toBe(3));
    it("maps level 9 to bucket 3", () => expect(levelBucket(9)).toBe(3));
    it("maps level 10 to bucket 4", () => expect(levelBucket(10)).toBe(4));
    it("maps level 99 to bucket 4", () => expect(levelBucket(99)).toBe(4));

    it("produces monotonically non-decreasing buckets", () => {
      for (let i = 1; i < 20; i++) {
        expect(levelBucket(i)).toBeGreaterThanOrEqual(levelBucket(i - 1 || 1));
      }
    });
  });

  describe("buildCacheKey()", () => {
    it("produces the expected format zoneId:lbN:questType", () => {
      expect(buildCacheKey("zone1", 1, "kill")).toBe("zone1:lb1:kill");
      expect(buildCacheKey("zone2", 2, "fetch")).toBe("zone2:lb2:fetch");
      expect(buildCacheKey("zone3", 3, "explore")).toBe("zone3:lb3:explore");
    });

    it("different questTypes produce different keys", () => {
      const keys = (["kill", "fetch", "explore", "escort", "puzzle"] as const).map(
        (t) => buildCacheKey("zone1", 1, t),
      );
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });

    it("different zones produce different keys", () => {
      const k1 = buildCacheKey("zone1", 1, "kill");
      const k2 = buildCacheKey("zone2", 1, "kill");
      expect(k1).not.toBe(k2);
    });

    it("different level buckets produce different keys", () => {
      const k1 = buildCacheKey("zone1", 1, "kill");
      const k2 = buildCacheKey("zone1", 2, "kill");
      expect(k1).not.toBe(k2);
    });
  });

  describe("QUEST_CACHE_TTL_MS", () => {
    it("equals 24 hours in milliseconds", () => {
      expect(QUEST_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    });
  });
});

// ── Rate limiter behaviour ────────────────────────────────────────────────────

describe("Quest rate limiter", () => {
  beforeEach(() => {
    mockRedisInstance.flush();
  });

  it("allows generation when under the rate limit", async () => {
    // incr returns 1 (first call in this minute bucket) → allowed
    const incrSpy = vi.spyOn(mockRedisInstance, "incr").mockResolvedValue(1);
    vi.spyOn(mockRedisInstance, "expire").mockResolvedValue(1);

    // Import the rate-limit checker indirectly by calling generateQuestLLM
    // and intercepting the Anthropic client so we don't make real API calls.
    // We only need to verify the rate-limit logic, so we mock the Anthropic
    // module to return a canned response.
    vi.mock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  title: "Test Quest",
                  description: "A test quest",
                  objectives: [
                    { type: "kill", target: "goblin", count: 3, description: "Defeat 3 goblins" },
                  ],
                  dialogue: {
                    greeting: "Hello",
                    acceptance: "Good luck",
                    completion: "Well done",
                  },
                  completionConditions: { type: "kill", target: "goblin", count: 3 },
                }),
              },
            ],
          }),
        };
      },
    }));

    const { generateQuestLLM } = await import("../quests/generate");
    const result = await generateQuestLLM({
      zoneId: "zone1",
      zoneName: "Green Plains",
      zoneBiome: "plains",
      zoneDescription: "A peaceful grassy area.",
      playerLevel: 2,
      levelBucket: 1,
      questType: "kill",
      enemyTypes: ["goblin", "slime"],
      factionId: null,
      factionName: null,
      playerStanding: null,
    });

    expect(result.title).toBe("Test Quest");
    expect(result.rewards.gold).toBeGreaterThan(0);
    expect(result.rewards.xp).toBeGreaterThan(0);
    expect(incrSpy).toHaveBeenCalled();
  });

  it("throws when rate limit is exceeded", async () => {
    // incr returns a value above the default limit (10)
    vi.spyOn(mockRedisInstance, "incr").mockResolvedValue(11);
    vi.spyOn(mockRedisInstance, "expire").mockResolvedValue(1);

    const { generateQuestLLM } = await import("../quests/generate");
    await expect(
      generateQuestLLM({
        zoneId: "zone1",
        zoneName: "Green Plains",
        zoneBiome: "plains",
        zoneDescription: "A peaceful grassy area.",
        playerLevel: 2,
        levelBucket: 1,
        questType: "kill",
        enemyTypes: ["goblin"],
        factionId: null,
        factionName: null,
        playerStanding: null,
      }),
    ).rejects.toThrow(/rate limit/i);
  });
});
