/**
 * AchievementTracker — client-side achievement tracking for solo mode.
 *
 * In multiplayer, the server is authoritative. In solo mode (no userId),
 * achievements are computed from localStorage save data and stored locally.
 *
 * Mirrors the achievement definitions from the server so both modes show the same list.
 */

import { SaveManager } from './SaveManager';

export type AchievementCategory = 'combat' | 'exploration' | 'crafting' | 'social' | 'questing';

export interface LocalAchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  goal: number;
}

export interface LocalAchievementState extends LocalAchievementDef {
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

// Achievement definitions — kept in sync with server/src/db/achievements.ts
const DEFS: LocalAchievementDef[] = [
  // Combat
  { id: 'first_blood',   title: 'First Blood',       description: 'Kill your first enemy.',      icon: '⚔', category: 'combat',      points: 1, goal: 1   },
  { id: 'warrior_path',  title: "Warrior's Path",    description: 'Kill 50 enemies.',            icon: '⚔', category: 'combat',      points: 3, goal: 50  },
  { id: 'centurion',     title: 'Centurion',          description: 'Kill 100 enemies.',           icon: '⚔', category: 'combat',      points: 4, goal: 100 },
  { id: 'slayer',        title: 'Slayer',             description: 'Kill 200 enemies.',           icon: '💀', category: 'combat',      points: 5, goal: 200 },
  { id: 'boss_slayer',   title: 'Boss Slayer',        description: 'Defeat a zone boss.',         icon: '👑', category: 'combat',      points: 4, goal: 1   },
  { id: 'unstoppable',   title: 'Unstoppable',        description: 'Kill 500 enemies.',           icon: '🔥', category: 'combat',      points: 7, goal: 500 },
  // Exploration
  { id: 'wanderer',      title: 'Wanderer',           description: 'Visit 2 different zones.',    icon: '🗺', category: 'exploration', points: 2, goal: 2   },
  { id: 'explorer',      title: 'Explorer',           description: 'Visit 4 different zones.',    icon: '🗺', category: 'exploration', points: 3, goal: 4   },
  { id: 'world_traveler',title: 'World Traveler',     description: 'Visit all 19 zones.',         icon: '🌍', category: 'exploration', points: 5, goal: 19  },
  { id: 'zone_clearer',  title: 'Zone Clearer',       description: 'Complete 3 different zones.', icon: '✓', category: 'exploration', points: 3, goal: 3   },
  { id: 'completionist', title: 'Completionist',      description: 'Complete all 19 zones.',      icon: '🏆', category: 'exploration', points: 7, goal: 19  },
  // Crafting
  { id: 'tinkerer',      title: 'Tinkerer',           description: 'Craft your first item.',      icon: '🔨', category: 'crafting',    points: 1, goal: 1   },
  { id: 'artisan',       title: 'Artisan',            description: 'Craft 10 items total.',       icon: '🔨', category: 'crafting',    points: 3, goal: 10  },
  { id: 'master_crafter',title: 'Master Crafter',     description: 'Craft 25 items total.',       icon: '⚒', category: 'crafting',    points: 5, goal: 25  },
  { id: 'recipe_collector', title: 'Recipe Collector',description: 'Craft 3 different recipes.',  icon: '📜', category: 'crafting',    points: 3, goal: 3   },
  // Social
  { id: 'guild_founder', title: 'Guild Founder',      description: 'Create a guild.',             icon: '🏰', category: 'social',      points: 3, goal: 1   },
  { id: 'team_spirit',   title: 'Team Spirit',        description: 'Join a guild.',               icon: '🤝', category: 'social',      points: 2, goal: 1   },
  { id: 'well_connected',title: 'Well Connected',     description: 'Invite 3 players to your guild.', icon: '👥', category: 'social', points: 4, goal: 3   },
  { id: 'veteran',       title: 'Veteran',            description: 'Reach player level 5.',       icon: '🎖', category: 'social',      points: 3, goal: 5   },
  { id: 'legend',        title: 'Legend',             description: 'Reach player level 10.',      icon: '⭐', category: 'social',      points: 7, goal: 10  },
  // Questing
  { id: 'first_steps',   title: 'First Steps',        description: 'Complete the tutorial.',      icon: '🎓', category: 'questing',    points: 2, goal: 1   },
  { id: 'quest_seeker',  title: 'Quest Seeker',       description: 'Complete your first quest.',  icon: '📋', category: 'questing',    points: 1, goal: 1   },
  { id: 'hero_realm',    title: 'Hero of the Realm',  description: 'Complete 5 quests.',          icon: '📋', category: 'questing',    points: 3, goal: 5   },
  { id: 'legendary_quester', title: 'Legendary Quester', description: 'Complete 15 quests.',     icon: '📜', category: 'questing',    points: 5, goal: 15  },
  { id: 'type_specialist',   title: 'Type Specialist',description: 'Complete 3 different quest types.', icon: '📋', category: 'questing', points: 3, goal: 3 },
];

const STORAGE_KEY = 'pixelrealm_achievements_v1';

interface StoredAchievement {
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

type StoredMap = Record<string, StoredAchievement>;

export class AchievementTracker {

  // ── Storage ──────────────────────────────────────────────────────────────────

  private static loadStored(): StoredMap {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredMap) : {};
    } catch {
      return {};
    }
  }

  private static saveStored(map: StoredMap): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* quota */ }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /** Get all achievement states merged with save-data-derived progress. */
  static getAll(): LocalAchievementState[] {
    const stored  = AchievementTracker.loadStored();
    const save    = SaveManager.load();

    return DEFS.map((def) => {
      const stored_entry = stored[def.id];
      let progress = stored_entry?.progress ?? 0;
      const unlocked = stored_entry?.unlocked ?? false;

      // Derive progress from save data where applicable
      switch (def.id) {
        case 'first_steps':
          progress = Math.max(progress, save.tutorialCompleted ? 1 : 0);
          break;
        case 'first_blood':
        case 'warrior_path':
        case 'centurion':
        case 'slayer':
        case 'unstoppable':
          progress = Math.max(progress, save.totalKills);
          break;
        case 'wanderer':
        case 'explorer':
        case 'world_traveler':
          progress = Math.max(progress, save.unlockedZones.length);
          break;
        case 'zone_clearer':
        case 'completionist': {
          const cleared = Object.keys(save.highScores).length;
          progress = Math.max(progress, cleared);
          break;
        }
        case 'veteran':
        case 'legend':
          progress = Math.max(progress, save.playerLevel);
          break;
      }

      return {
        ...def,
        progress,
        unlocked: unlocked || progress >= def.goal,
        unlockedAt: stored_entry?.unlockedAt,
      };
    });
  }

  /**
   * Record a progress event and return any newly unlocked achievements.
   * Called by GameScene for solo-mode events (kills, zone visits, level ups, boss kills).
   */
  static recordEvent(
    type: 'kill' | 'boss_kill' | 'zone_visit' | 'zone_complete' | 'level_up' | 'tutorial_complete',
    data: { count?: number; level?: number } = {},
  ): LocalAchievementState[] {
    const stored = AchievementTracker.loadStored();
    const save   = SaveManager.load();
    const newlyUnlocked: LocalAchievementState[] = [];
    const now    = new Date().toISOString();

    const tryUnlock = (id: string, progress: number): void => {
      const def  = DEFS.find(d => d.id === id);
      if (!def) return;
      const entry = stored[id] ?? { progress: 0, unlocked: false };
      if (entry.unlocked) return;
      const newProg = Math.max(entry.progress, progress);
      const shouldUnlock = newProg >= def.goal;
      stored[id] = {
        progress:   newProg,
        unlocked:   shouldUnlock,
        unlockedAt: shouldUnlock ? now : undefined,
      };
      if (shouldUnlock) {
        newlyUnlocked.push({ ...def, progress: newProg, unlocked: true, unlockedAt: now });
      }
    };

    switch (type) {
      case 'tutorial_complete': {
        tryUnlock('first_steps', 1);
        break;
      }
      case 'kill': {
        const kills = save.totalKills + (data.count ?? 1);
        tryUnlock('first_blood',  kills);
        tryUnlock('warrior_path', kills);
        tryUnlock('centurion',    kills);
        tryUnlock('slayer',       kills);
        tryUnlock('unstoppable',  kills);
        break;
      }
      case 'boss_kill': {
        const existing = stored['boss_slayer']?.progress ?? 0;
        tryUnlock('boss_slayer', existing + 1);
        break;
      }
      case 'zone_visit': {
        const distinct = save.unlockedZones.length;
        tryUnlock('wanderer',       distinct);
        tryUnlock('explorer',       distinct);
        tryUnlock('world_traveler', distinct);
        break;
      }
      case 'zone_complete': {
        const cleared = Object.keys(save.highScores).length + 1; // +1 includes current
        tryUnlock('zone_clearer',  cleared);
        tryUnlock('completionist', cleared);
        break;
      }
      case 'level_up': {
        const level = data.level ?? save.playerLevel;
        tryUnlock('veteran', level);
        tryUnlock('legend',  level);
        break;
      }
    }

    AchievementTracker.saveStored(stored);
    return newlyUnlocked;
  }

  /** Get total achievement points earned. */
  static getTotalPoints(): number {
    return AchievementTracker.getAll()
      .filter(a => a.unlocked)
      .reduce((s, a) => s + a.points, 0);
  }

  /** Reset all achievement progress (used on save reset). */
  static reset(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}
