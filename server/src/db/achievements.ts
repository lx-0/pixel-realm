/**
 * Achievement system — definitions and database operations.
 *
 * Achievements track long-term player progress across five categories:
 * Combat, Exploration, Crafting, Social, and Questing.
 *
 * DB operations are no-ops when called without a valid DB connection (dev/solo).
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { playerAchievements } from "./schema";

// ── Achievement definitions ────────────────────────────────────────────────────

export type AchievementCategory = "combat" | "exploration" | "crafting" | "social" | "questing";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  /** Target progress value required to unlock (1 = single-event binary). */
  goal: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Combat ───────────────────────────────────────────────────────────────────
  {
    id: "first_blood",
    title: "First Blood",
    description: "Kill your first enemy.",
    icon: "⚔",
    category: "combat",
    points: 1,
    goal: 1,
  },
  {
    id: "warrior_path",
    title: "Warrior's Path",
    description: "Kill 50 enemies.",
    icon: "⚔",
    category: "combat",
    points: 3,
    goal: 50,
  },
  {
    id: "centurion",
    title: "Centurion",
    description: "Kill 100 enemies.",
    icon: "⚔",
    category: "combat",
    points: 4,
    goal: 100,
  },
  {
    id: "slayer",
    title: "Slayer",
    description: "Kill 200 enemies.",
    icon: "💀",
    category: "combat",
    points: 5,
    goal: 200,
  },
  {
    id: "boss_slayer",
    title: "Boss Slayer",
    description: "Defeat a zone boss.",
    icon: "👑",
    category: "combat",
    points: 4,
    goal: 1,
  },
  {
    id: "unstoppable",
    title: "Unstoppable",
    description: "Kill 500 enemies.",
    icon: "🔥",
    category: "combat",
    points: 7,
    goal: 500,
  },

  // ── Exploration ───────────────────────────────────────────────────────────────
  {
    id: "wanderer",
    title: "Wanderer",
    description: "Visit 2 different zones.",
    icon: "🗺",
    category: "exploration",
    points: 2,
    goal: 2,
  },
  {
    id: "explorer",
    title: "Explorer",
    description: "Visit 4 different zones.",
    icon: "🗺",
    category: "exploration",
    points: 3,
    goal: 4,
  },
  {
    id: "world_traveler",
    title: "World Traveler",
    description: "Visit all 6 zones.",
    icon: "🌍",
    category: "exploration",
    points: 5,
    goal: 6,
  },
  {
    id: "zone_clearer",
    title: "Zone Clearer",
    description: "Complete 3 different zones.",
    icon: "✓",
    category: "exploration",
    points: 3,
    goal: 3,
  },
  {
    id: "completionist",
    title: "Completionist",
    description: "Complete all 6 zones.",
    icon: "🏆",
    category: "exploration",
    points: 7,
    goal: 6,
  },

  // ── Crafting ──────────────────────────────────────────────────────────────────
  {
    id: "tinkerer",
    title: "Tinkerer",
    description: "Craft your first item.",
    icon: "🔨",
    category: "crafting",
    points: 1,
    goal: 1,
  },
  {
    id: "artisan",
    title: "Artisan",
    description: "Craft 10 items total.",
    icon: "🔨",
    category: "crafting",
    points: 3,
    goal: 10,
  },
  {
    id: "master_crafter",
    title: "Master Crafter",
    description: "Craft 25 items total.",
    icon: "⚒",
    category: "crafting",
    points: 5,
    goal: 25,
  },
  {
    id: "recipe_collector",
    title: "Recipe Collector",
    description: "Craft 3 different recipes.",
    icon: "📜",
    category: "crafting",
    points: 3,
    goal: 3,
  },

  // ── Social ────────────────────────────────────────────────────────────────────
  {
    id: "guild_founder",
    title: "Guild Founder",
    description: "Create a guild.",
    icon: "🏰",
    category: "social",
    points: 3,
    goal: 1,
  },
  {
    id: "team_spirit",
    title: "Team Spirit",
    description: "Join a guild.",
    icon: "🤝",
    category: "social",
    points: 2,
    goal: 1,
  },
  {
    id: "well_connected",
    title: "Well Connected",
    description: "Invite 3 players to your guild.",
    icon: "👥",
    category: "social",
    points: 4,
    goal: 3,
  },
  {
    id: "veteran",
    title: "Veteran",
    description: "Reach player level 5.",
    icon: "🎖",
    category: "social",
    points: 3,
    goal: 5,
  },
  {
    id: "legend",
    title: "Legend",
    description: "Reach player level 10.",
    icon: "⭐",
    category: "social",
    points: 7,
    goal: 10,
  },

  // ── Questing ──────────────────────────────────────────────────────────────────
  {
    id: "quest_seeker",
    title: "Quest Seeker",
    description: "Complete your first quest.",
    icon: "📋",
    category: "questing",
    points: 1,
    goal: 1,
  },
  {
    id: "hero_realm",
    title: "Hero of the Realm",
    description: "Complete 5 quests.",
    icon: "📋",
    category: "questing",
    points: 3,
    goal: 5,
  },
  {
    id: "legendary_quester",
    title: "Legendary Quester",
    description: "Complete 15 quests.",
    icon: "📜",
    category: "questing",
    points: 5,
    goal: 15,
  },
  {
    id: "type_specialist",
    title: "Type Specialist",
    description: "Complete 3 different quest types.",
    icon: "📋",
    category: "questing",
    points: 3,
    goal: 3,
  },
];

// Map for quick lookup
export const ACHIEVEMENT_MAP = new Map<string, AchievementDef>(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

// ── Event types ───────────────────────────────────────────────────────────────

export type AchievementEventType =
  | "enemy_killed"    // data: { isBoss?: boolean }
  | "zone_visited"    // data: { distinctZones: number }
  | "zone_completed"  // data: { distinctZones: number }
  | "item_crafted"    // data: { totalCrafts: number; distinctRecipes: number }
  | "guild_created"
  | "guild_joined"
  | "player_invited"  // data: { totalInvited: number }
  | "quest_completed" // data: { totalQuests: number; distinctTypes: number }
  | "level_up";       // data: { level: number }

// ── Public result types ────────────────────────────────────────────────────────

export interface AchievementProgress {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  goal: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string; // ISO timestamp
}

export interface AchievementEventResult {
  newlyUnlocked: AchievementProgress[];
}

// ── DB helpers ────────────────────────────────────────────────────────────────

/** Fetch all achievement progress rows for a player. Returns empty array if DB unavailable. */
async function fetchRows(
  playerId: string,
): Promise<Map<string, { progress: number; unlocked: boolean; unlockedAt: Date | null }>> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(playerAchievements)
      .where(eq(playerAchievements.playerId, playerId));
    return new Map(
      rows.map((r) => [
        r.achievementId,
        { progress: r.progress, unlocked: r.unlocked, unlockedAt: r.unlockedAt },
      ]),
    );
  } catch {
    return new Map();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Return all achievements with per-player progress. */
export async function getPlayerAchievements(playerId: string): Promise<AchievementProgress[]> {
  const rows = await fetchRows(playerId);
  return ACHIEVEMENTS.map((def) => {
    const row = rows.get(def.id);
    return {
      id:          def.id,
      title:       def.title,
      description: def.description,
      icon:        def.icon,
      category:    def.category,
      points:      def.points,
      goal:        def.goal,
      progress:    row?.progress ?? 0,
      unlocked:    row?.unlocked ?? false,
      unlockedAt:  row?.unlockedAt?.toISOString(),
    };
  });
}

/**
 * Process an achievement event for a player.
 * Returns any achievements that were newly unlocked by this event.
 * Never throws — DB errors are swallowed so game flow is unaffected.
 */
export async function processAchievementEvent(
  playerId: string,
  eventType: AchievementEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> = {},
): Promise<AchievementEventResult> {
  try {
    const db = getDb();
    const rows = await fetchRows(playerId);
    const newlyUnlocked: AchievementProgress[] = [];

    // Determine which achievements are affected by this event
    const updates: { id: string; progress: number }[] = [];

    switch (eventType) {
      case "enemy_killed": {
        const killRow = rows.get("first_blood");
        const currentKills = killRow?.progress ?? 0;
        const newKills = currentKills + 1;
        for (const id of ["first_blood", "warrior_path", "centurion", "slayer", "unstoppable"]) {
          updates.push({ id, progress: newKills });
        }
        if (data.isBoss) {
          const bossRow = rows.get("boss_slayer");
          updates.push({ id: "boss_slayer", progress: (bossRow?.progress ?? 0) + 1 });
        }
        break;
      }
      case "zone_visited": {
        const v = Number(data.distinctZones ?? 0);
        updates.push({ id: "wanderer", progress: v });
        updates.push({ id: "explorer", progress: v });
        updates.push({ id: "world_traveler", progress: v });
        break;
      }
      case "zone_completed": {
        const c = Number(data.distinctZones ?? 0);
        updates.push({ id: "zone_clearer", progress: c });
        updates.push({ id: "completionist", progress: c });
        break;
      }
      case "item_crafted": {
        const total = Number(data.totalCrafts ?? 0);
        const distinct = Number(data.distinctRecipes ?? 0);
        updates.push({ id: "tinkerer", progress: total });
        updates.push({ id: "artisan", progress: total });
        updates.push({ id: "master_crafter", progress: total });
        updates.push({ id: "recipe_collector", progress: distinct });
        break;
      }
      case "guild_created": {
        updates.push({ id: "guild_founder", progress: 1 });
        updates.push({ id: "team_spirit", progress: 1 });
        break;
      }
      case "guild_joined": {
        updates.push({ id: "team_spirit", progress: 1 });
        break;
      }
      case "player_invited": {
        updates.push({ id: "well_connected", progress: Number(data.totalInvited ?? 1) });
        break;
      }
      case "quest_completed": {
        const total = Number(data.totalQuests ?? 0);
        const distinct = Number(data.distinctTypes ?? 0);
        updates.push({ id: "quest_seeker", progress: total });
        updates.push({ id: "hero_realm", progress: total });
        updates.push({ id: "legendary_quester", progress: total });
        updates.push({ id: "type_specialist", progress: distinct });
        break;
      }
      case "level_up": {
        const level = Number(data.level ?? 1);
        updates.push({ id: "veteran", progress: level });
        updates.push({ id: "legend", progress: level });
        break;
      }
    }

    // Upsert each affected achievement and detect new unlocks
    const now = new Date();
    for (const { id, progress } of updates) {
      const def = ACHIEVEMENT_MAP.get(id);
      if (!def) continue;

      const existing = rows.get(id);
      if (existing?.unlocked) continue; // already unlocked, skip

      // Never decrease progress
      const newProgress = Math.max(existing?.progress ?? 0, progress);
      const shouldUnlock = newProgress >= def.goal;

      await db
        .insert(playerAchievements)
        .values({
          playerId,
          achievementId: id,
          progress: newProgress,
          unlocked: shouldUnlock,
          unlockedAt: shouldUnlock ? now : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [playerAchievements.playerId, playerAchievements.achievementId],
          set: {
            progress: newProgress,
            unlocked: shouldUnlock,
            unlockedAt: shouldUnlock && !existing?.unlocked ? now : existing?.unlockedAt ?? null,
            updatedAt: now,
          },
        });

      if (shouldUnlock && !existing?.unlocked) {
        newlyUnlocked.push({
          id:          def.id,
          title:       def.title,
          description: def.description,
          icon:        def.icon,
          category:    def.category,
          points:      def.points,
          goal:        def.goal,
          progress:    newProgress,
          unlocked:    true,
          unlockedAt:  now.toISOString(),
        });
      }
    }

    return { newlyUnlocked };
  } catch (err) {
    // Non-fatal — game should never break due to achievement tracking
    console.warn("[Achievements] processAchievementEvent failed:", (err as Error).message);
    return { newlyUnlocked: [] };
  }
}

/**
 * Compute total achievement points earned by a player.
 */
export async function getAchievementPoints(playerId: string): Promise<number> {
  const all = await getPlayerAchievements(playerId);
  return all.filter((a) => a.unlocked).reduce((sum, a) => sum + a.points, 0);
}
