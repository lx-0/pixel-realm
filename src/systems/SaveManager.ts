/**
 * SaveManager — persists zone progress, player level, and high scores
 * to localStorage. Safe to call in any scene.
 */
import { LEVELS } from '../config/constants';

const SAVE_KEY = 'pixelrealm_save_v1';

export interface SaveData {
  unlockedZones: string[];
  playerLevel: number;
  playerXP: number;
  totalKills: number;
  highScores: Record<string, number>;
  completedGame: boolean;
}

const DEFAULT_SAVE: SaveData = {
  unlockedZones: ['zone1'],
  playerLevel: 1,
  playerXP: 0,
  totalKills: 0,
  highScores: {},
  completedGame: false,
};

export class SaveManager {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE, unlockedZones: ['zone1'], highScores: {} };
      const p = JSON.parse(raw) as Partial<SaveData>;
      return {
        unlockedZones: p.unlockedZones ?? ['zone1'],
        playerLevel:   p.playerLevel   ?? 1,
        playerXP:      p.playerXP      ?? 0,
        totalKills:    p.totalKills     ?? 0,
        highScores:    p.highScores     ?? {},
        completedGame: p.completedGame  ?? false,
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

  static reset(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
