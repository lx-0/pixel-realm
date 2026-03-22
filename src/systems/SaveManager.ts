/**
 * SaveManager — persists zone progress, player level, and high scores
 * to localStorage. Safe to call in any scene.
 *
 * v2 additions: 3 save slots (index 0–2; slot 0 is auto-save),
 * each storing full player + skill state with timestamp and zone metadata.
 */
import { LEVELS } from '../config/constants';

const SAVE_KEY       = 'pixelrealm_save_v1';
export const SKILL_SAVE_KEY = 'pixelrealm_skills_v1';
const SLOT_KEY_PREFIX = 'pixelrealm_slot_v1_';
export const NUM_SLOTS   = 3;
const CURRENT_SCHEMA = 1;

export interface SaveData {
  unlockedZones: string[];
  playerLevel: number;
  playerXP: number;
  totalKills: number;
  highScores: Record<string, number>;
  completedGame: boolean;
  tutorialCompleted: boolean;
}

export interface SkillSaveData {
  classId: string;
  unlockedSkills: string[];
  skillPoints: number;
  hotbar: string[];
}

/** Full state written into each save slot. */
export interface SlotSaveData extends SaveData, SkillSaveData {
  schemaVersion: number;
  timestamp: number;
  currentZoneId: string;
  currentZoneName: string;
}

/** Lightweight descriptor for displaying slot info in the UI. */
export interface SlotMeta {
  slotIndex: number;
  timestamp: number;
  currentZoneName: string;
  playerLevel: number;
  classId: string;
  completedGame: boolean;
}

const DEFAULT_SAVE: SaveData = {
  unlockedZones: ['zone1'],
  playerLevel: 1,
  playerXP: 0,
  totalKills: 0,
  highScores: {},
  completedGame: false,
  tutorialCompleted: false,
};

export class SaveManager {
  // ── Live-save (zone progress, XP, level) ─────────────────────────────────

  static load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE, unlockedZones: ['zone1'], highScores: {} };
      const p = JSON.parse(raw) as Partial<SaveData>;
      return {
        unlockedZones:     p.unlockedZones     ?? ['zone1'],
        playerLevel:       p.playerLevel       ?? 1,
        playerXP:          p.playerXP          ?? 0,
        totalKills:        p.totalKills        ?? 0,
        highScores:        p.highScores        ?? {},
        completedGame:     p.completedGame     ?? false,
        tutorialCompleted: p.tutorialCompleted ?? false,
      };
    } catch {
      return { ...DEFAULT_SAVE, unlockedZones: ['zone1'], highScores: {} };
    }
  }

  static save(data: SaveData): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* quota / SSR */ }
  }

  static unlockZone(zoneId: string): void {
    const data = SaveManager.load();
    if (!data.unlockedZones.includes(zoneId)) data.unlockedZones.push(zoneId);
    SaveManager.save(data);
  }

  static recordZoneClear(
    zoneId: string,
    score: number,
    xpGained: number,
    killsGained: number,
    nextZoneId: string | null,
    isLastZone: boolean,
  ): SaveData {
    const data = SaveManager.load();

    if (!data.highScores[zoneId] || score > data.highScores[zoneId]) {
      data.highScores[zoneId] = score;
    }
    data.playerXP    += xpGained;
    data.totalKills  += killsGained;

    // Level up from accumulated XP
    while (
      data.playerLevel < LEVELS.MAX_LEVEL &&
      data.playerXP >= LEVELS.XP_THRESHOLDS[data.playerLevel - 1]
    ) {
      data.playerLevel++;
    }

    if (nextZoneId && !data.unlockedZones.includes(nextZoneId)) {
      data.unlockedZones.push(nextZoneId);
    }
    if (isLastZone) data.completedGame = true;

    SaveManager.save(data);
    return data;
  }

  static completeTutorial(): void {
    const data = SaveManager.load();
    data.tutorialCompleted = true;
    SaveManager.save(data);
  }

  static reset(): void {
    localStorage.removeItem(SAVE_KEY);
    // Also clear achievement progress so it stays in sync
    try { localStorage.removeItem('pixelrealm_achievements_v1'); } catch { /* ignore */ }
  }

  // ── Save slots ────────────────────────────────────────────────────────────

  /** Write a full state snapshot to the given slot index (0 = auto-save). */
  static saveSlot(slotIndex: number, data: SlotSaveData): void {
    try {
      localStorage.setItem(`${SLOT_KEY_PREFIX}${slotIndex}`, JSON.stringify(data));
    } catch { /* quota */ }
  }

  /**
   * Load and validate a slot. Returns null if the slot is empty or corrupted.
   * Corrupted slots log a warning and return null — they do not throw.
   */
  static loadSlot(slotIndex: number): SlotSaveData | null {
    try {
      const raw = localStorage.getItem(`${SLOT_KEY_PREFIX}${slotIndex}`);
      if (!raw) return null;
      const p = JSON.parse(raw) as Partial<SlotSaveData>;
      // Minimal integrity check
      if (typeof p.schemaVersion !== 'number' || typeof p.timestamp !== 'number') {
        console.warn(`[SaveManager] Slot ${slotIndex} has invalid schema — skipping.`);
        return null;
      }
      const hotbar = (p.hotbar ?? ['', '', '', '', '', '']).slice(0, 6);
      while (hotbar.length < 6) hotbar.push('');
      return {
        // SaveData
        unlockedZones:     p.unlockedZones     ?? ['zone1'],
        playerLevel:       p.playerLevel       ?? 1,
        playerXP:          p.playerXP          ?? 0,
        totalKills:        p.totalKills        ?? 0,
        highScores:        p.highScores        ?? {},
        completedGame:     p.completedGame     ?? false,
        tutorialCompleted: p.tutorialCompleted ?? false,
        // SkillSaveData
        classId:        (p.classId as string)  ?? 'warrior',
        unlockedSkills: p.unlockedSkills       ?? [],
        skillPoints:    p.skillPoints          ?? 0,
        hotbar,
        // Metadata
        schemaVersion:   p.schemaVersion,
        timestamp:       p.timestamp,
        currentZoneId:   p.currentZoneId   ?? 'zone1',
        currentZoneName: p.currentZoneName ?? 'Verdant Hollow',
      };
    } catch {
      console.warn(`[SaveManager] Slot ${slotIndex} could not be parsed — skipping.`);
      return null;
    }
  }

  /** Return metadata for all slots (null entries = empty / corrupted). */
  static listSlots(): Array<SlotMeta | null> {
    return Array.from({ length: NUM_SLOTS }, (_, i) => {
      const slot = SaveManager.loadSlot(i);
      if (!slot) return null;
      return {
        slotIndex:       i,
        timestamp:       slot.timestamp,
        currentZoneName: slot.currentZoneName,
        playerLevel:     slot.playerLevel,
        classId:         slot.classId,
        completedGame:   slot.completedGame,
      };
    });
  }

  /** Delete a slot. */
  static clearSlot(slotIndex: number): void {
    try { localStorage.removeItem(`${SLOT_KEY_PREFIX}${slotIndex}`); } catch { /* ignore */ }
  }

  /**
   * Apply a slot's data as the active game state, overwriting the live
   * save key and the skill save key so GameScene will pick it up on next load.
   * Returns the slot data (for determining which zone to start), or null on failure.
   */
  static applySlot(slotIndex: number): SlotSaveData | null {
    const slot = SaveManager.loadSlot(slotIndex);
    if (!slot) return null;

    // Overwrite live save
    SaveManager.save({
      unlockedZones:     slot.unlockedZones,
      playerLevel:       slot.playerLevel,
      playerXP:          slot.playerXP,
      totalKills:        slot.totalKills,
      highScores:        slot.highScores,
      completedGame:     slot.completedGame,
      tutorialCompleted: slot.tutorialCompleted,
    });

    // Overwrite skill save
    try {
      localStorage.setItem(SKILL_SAVE_KEY, JSON.stringify({
        classId:        slot.classId,
        unlockedSkills: slot.unlockedSkills,
        skillPoints:    slot.skillPoints,
        hotbar:         slot.hotbar,
      }));
    } catch { /* ignore */ }

    return slot;
  }

  /** Build a SlotSaveData snapshot from the current live save + provided skill state. */
  static buildSlotSnapshot(
    skillState: SkillSaveData,
    currentZoneId: string,
    currentZoneName: string,
  ): SlotSaveData {
    const base = SaveManager.load();
    return {
      ...base,
      ...skillState,
      schemaVersion:   CURRENT_SCHEMA,
      timestamp:       Date.now(),
      currentZoneId,
      currentZoneName,
    };
  }
}
