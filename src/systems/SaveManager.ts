/**
 * SaveManager — persists zone progress, player level, and high scores
 * to localStorage. Safe to call in any scene.
 *
 * v2 additions: 3 save slots (index 0–2; slot 0 is auto-save),
 * each storing full player + skill state with timestamp and zone metadata.
 */
import { LEVELS } from '../config/constants';

const SAVE_KEY              = 'pixelrealm_save_v1';
export const SKILL_SAVE_KEY = 'pixelrealm_skills_v1';
const SLOT_KEY_PREFIX       = 'pixelrealm_slot_v1_';
const HC_RECORDS_KEY        = 'pixelrealm_hardcore_v1';
export const NUM_SLOTS      = 3;
const CURRENT_SCHEMA        = 1;

/** Minimum normal-mode level required to unlock hardcore mode. */
export const HARDCORE_UNLOCK_LEVEL = 45;

/** Personal-best stats recorded per zone. */
export interface ZoneBest {
  bestTimeSecs:  number;  // fastest clear (lower = better); 0 = never set
  mostKills:     number;  // highest kill count in a single run
  leastDmgTaken: number;  // lowest damage taken in a single clear; -1 = never set
}

export interface SaveData {
  unlockedZones: string[];
  playerLevel: number;
  playerXP: number;
  totalKills: number;
  totalDeaths: number;
  highScores: Record<string, number>;
  zoneBests: Record<string, ZoneBest>;
  completedGame: boolean;
  tutorialCompleted: boolean;
  /** Highest level reached on a hardcore character (0 = never played HC). */
  hardcoreHighestLevel: number;
  /** Total zones cleared across all hardcore runs. */
  hardcoreZonesCleared: number;
  /** Display name used in multiplayer rooms. */
  playerName?: string;
  /** Server-side user ID for authenticated sessions. */
  userId?: string;
  /** Mount IDs the player has unlocked. */
  unlockedMounts?: string[];
  /** Currently active (last summoned) mount ID, or empty string for none. */
  activeMountId?: string;
  /** Player housing data (persisted locally; synced to server when online). */
  housing?: {
    owned:      boolean;
    styleId:    string;
    tier:       number;
    layout:     Array<{ furnitureId: string; x: number; y: number; rotation: number }>;
    permission: 'public' | 'friends' | 'locked';
    inventory:  Record<string, number>;
    storage:    string[];
  };
  /** Bestiary: enemy type IDs the player has encountered. */
  bestiary?: {
    discovered: string[];
    bossKills:  Record<string, number>;
  };
  /** Cosmetics: owned items and equipped slots. */
  cosmetics?: {
    owned:    string[];
    equipped: {
      outfit?:       string;
      hat?:          string;
      aura?:         string;
      cloak?:        string;
      wings?:        string;
      portraitFrame?: string;
    };
  };
}

/**
 * Archived record from a single hardcore character run.
 * Written to localStorage on permadeath; never deleted.
 */
export interface HardcoreDeathRecord {
  timestamp:    number;
  level:        number;
  kills:        number;
  zonesCleared: number;
  deathZone:    string;
  causeOfDeath: string;
  timeSecs:     number;
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
  totalDeaths: 0,
  highScores: {},
  zoneBests: {},
  completedGame: false,
  tutorialCompleted: false,
  hardcoreHighestLevel: 0,
  hardcoreZonesCleared: 0,
  unlockedMounts: [],
  activeMountId: '',
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
        totalDeaths:       p.totalDeaths       ?? 0,
        highScores:        p.highScores        ?? {},
        zoneBests:            p.zoneBests            ?? {},
        completedGame:        p.completedGame        ?? false,
        tutorialCompleted:    p.tutorialCompleted    ?? false,
        hardcoreHighestLevel: p.hardcoreHighestLevel ?? 0,
        hardcoreZonesCleared: p.hardcoreZonesCleared ?? 0,
        playerName:           p.playerName,
        userId:               p.userId,
        unlockedMounts:       p.unlockedMounts       ?? [],
        activeMountId:        p.activeMountId        ?? '',
        housing:              p.housing,
        bestiary:             p.bestiary,
        cosmetics:            p.cosmetics,
      };
    } catch {
      return { ...DEFAULT_SAVE, unlockedZones: ['zone1'], highScores: {} };
    }
  }

  static save(data: SaveData): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* quota / SSR */ }
  }

  static recordDeath(): void {
    const data = SaveManager.load();
    data.totalDeaths = (data.totalDeaths ?? 0) + 1;
    SaveManager.save(data);
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

  /**
   * Record personal-best stats for a zone clear.
   * Only updates a field when the new value is strictly better.
   */
  static recordZoneBest(
    zoneId: string,
    timeSecs: number,
    kills: number,
    damageTaken: number,
  ): void {
    const data = SaveManager.load();
    const prev = data.zoneBests[zoneId] ?? { bestTimeSecs: 0, mostKills: 0, leastDmgTaken: -1 };
    data.zoneBests[zoneId] = {
      bestTimeSecs:  prev.bestTimeSecs  === 0 || timeSecs < prev.bestTimeSecs ? timeSecs : prev.bestTimeSecs,
      mostKills:     kills > prev.mostKills ? kills : prev.mostKills,
      leastDmgTaken: prev.leastDmgTaken === -1 || damageTaken < prev.leastDmgTaken ? damageTaken : prev.leastDmgTaken,
    };
    SaveManager.save(data);
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

  // ── Mount helpers ─────────────────────────────────────────────────────────

  static unlockMount(mountId: string): void {
    const data = SaveManager.load();
    if (!(data.unlockedMounts ?? []).includes(mountId)) {
      data.unlockedMounts = [...(data.unlockedMounts ?? []), mountId];
      SaveManager.save(data);
    }
  }

  static setActiveMount(mountId: string): void {
    const data = SaveManager.load();
    data.activeMountId = mountId;
    SaveManager.save(data);
  }

  // ── Housing helpers ───────────────────────────────────────────────────────

  static getHousing(data?: ReturnType<typeof SaveManager.load>) {
    const d = data ?? SaveManager.load();
    return d.housing ?? {
      owned: false, styleId: 'cottage', tier: 1,
      layout: [], permission: 'public' as const,
      inventory: {}, storage: [],
    };
  }

  static purchaseHouse(styleId: string, tier: number): void {
    const data    = SaveManager.load();
    data.housing  = {
      owned: true, styleId, tier,
      layout: [], permission: 'public',
      inventory: {}, storage: [],
    };
    SaveManager.save(data);
  }

  static saveHousingLayout(layout: Array<{ furnitureId: string; x: number; y: number; rotation: number }>): void {
    const data = SaveManager.load();
    if (!data.housing) return;
    data.housing.layout = layout;
    SaveManager.save(data);
  }

  static saveHousingPermission(permission: 'public' | 'friends' | 'locked'): void {
    const data = SaveManager.load();
    if (!data.housing) return;
    data.housing.permission = permission;
    SaveManager.save(data);
  }

  static upgradeHouse(styleId: string, tier: number): void {
    const data = SaveManager.load();
    if (!data.housing) return;
    data.housing.styleId = styleId;
    data.housing.tier    = tier;
    SaveManager.save(data);
  }

  static addFurnitureToInventory(furnId: string, qty = 1): void {
    const data = SaveManager.load();
    if (!data.housing) return;
    data.housing.inventory[furnId] = (data.housing.inventory[furnId] ?? 0) + qty;
    SaveManager.save(data);
  }

  static removeFurnitureFromInventory(furnId: string): boolean {
    const data = SaveManager.load();
    if (!data.housing) return false;
    const qty = data.housing.inventory[furnId] ?? 0;
    if (qty <= 0) return false;
    if (qty === 1) delete data.housing.inventory[furnId];
    else data.housing.inventory[furnId] = qty - 1;
    SaveManager.save(data);
    return true;
  }

  // ── Bestiary ──────────────────────────────────────────────────────────────

  static getBestiary(): { discovered: string[]; bossKills: Record<string, number> } {
    const data = SaveManager.load();
    return data.bestiary ?? { discovered: [], bossKills: {} };
  }

  /** Mark an enemy type as discovered. Returns true if it was newly discovered. */
  static discoverEnemy(enemyTypeId: string): boolean {
    const data = SaveManager.load();
    if (!data.bestiary) data.bestiary = { discovered: [], bossKills: {} };
    if (data.bestiary.discovered.includes(enemyTypeId)) return false;
    data.bestiary.discovered.push(enemyTypeId);
    SaveManager.save(data);
    return true;
  }

  /** Increment kill counter for a boss type. Returns new total. */
  static recordBossKill(bossTypeId: string): number {
    const data = SaveManager.load();
    if (!data.bestiary) data.bestiary = { discovered: [], bossKills: {} };
    // Boss encounters also count as discovery
    if (!data.bestiary.discovered.includes(bossTypeId)) {
      data.bestiary.discovered.push(bossTypeId);
    }
    const prev = data.bestiary.bossKills[bossTypeId] ?? 0;
    data.bestiary.bossKills[bossTypeId] = prev + 1;
    SaveManager.save(data);
    return prev + 1;
  }

  // ── Cosmetics ─────────────────────────────────────────────────────────────

  static getCosmetics(): { owned: string[]; equipped: Record<string, string | undefined> } {
    const data = SaveManager.load();
    return {
      owned:    data.cosmetics?.owned    ?? [],
      equipped: (data.cosmetics?.equipped ?? {}) as Record<string, string | undefined>,
    };
  }

  /** Add a cosmetic item to the player's owned list. */
  static buyCosmetic(cosmeticId: string): void {
    const data = SaveManager.load();
    if (!data.cosmetics) data.cosmetics = { owned: [], equipped: {} };
    if (!data.cosmetics.owned.includes(cosmeticId)) {
      data.cosmetics.owned.push(cosmeticId);
    }
    SaveManager.save(data);
  }

  /** Equip a cosmetic to its slot. Pass null to unequip. */
  static equipCosmetic(slot: string, cosmeticId: string | null): void {
    const data = SaveManager.load();
    if (!data.cosmetics) data.cosmetics = { owned: [], equipped: {} };
    if (cosmeticId === null) {
      delete (data.cosmetics.equipped as Record<string, string | undefined>)[slot];
    } else {
      (data.cosmetics.equipped as Record<string, string | undefined>)[slot] = cosmeticId;
    }
    SaveManager.save(data);
  }

  /** Grant a cosmetic by achievement (bypasses gold cost). */
  static grantCosmetic(cosmeticId: string): void {
    SaveManager.buyCosmetic(cosmeticId);
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
        totalDeaths:       p.totalDeaths       ?? 0,
        highScores:        p.highScores        ?? {},
        zoneBests:         p.zoneBests         ?? {},
        completedGame:        p.completedGame        ?? false,
        tutorialCompleted:    p.tutorialCompleted    ?? false,
        hardcoreHighestLevel: p.hardcoreHighestLevel ?? 0,
        hardcoreZonesCleared: p.hardcoreZonesCleared ?? 0,
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
      unlockedZones:        slot.unlockedZones,
      playerLevel:          slot.playerLevel,
      playerXP:             slot.playerXP,
      totalKills:           slot.totalKills,
      totalDeaths:          slot.totalDeaths ?? 0,
      highScores:           slot.highScores,
      zoneBests:            slot.zoneBests ?? {},
      completedGame:        slot.completedGame,
      tutorialCompleted:    slot.tutorialCompleted,
      hardcoreHighestLevel: slot.hardcoreHighestLevel ?? 0,
      hardcoreZonesCleared: slot.hardcoreZonesCleared ?? 0,
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

  // ── Hardcore mode ─────────────────────────────────────────────────────────

  /**
   * Archive a completed hardcore run on permadeath.
   * Updates the player's all-time hardcore bests and appends a death record.
   */
  static recordHardcoreDeath(record: Omit<HardcoreDeathRecord, 'timestamp'>): void {
    // Update persistent bests
    const data = SaveManager.load();
    if (record.level > data.hardcoreHighestLevel) {
      data.hardcoreHighestLevel = record.level;
    }
    data.hardcoreZonesCleared += record.zonesCleared;
    SaveManager.save(data);

    // Append to graveyard log
    try {
      const raw      = localStorage.getItem(HC_RECORDS_KEY);
      const existing = raw ? (JSON.parse(raw) as HardcoreDeathRecord[]) : [];
      existing.push({ ...record, timestamp: Date.now() });
      // Keep last 50 records
      if (existing.length > 50) existing.splice(0, existing.length - 50);
      localStorage.setItem(HC_RECORDS_KEY, JSON.stringify(existing));
    } catch { /* quota / SSR */ }
  }

  /** Return all stored hardcore death records, most recent first. */
  static getHardcoreDeathRecords(): HardcoreDeathRecord[] {
    try {
      const raw = localStorage.getItem(HC_RECORDS_KEY);
      if (!raw) return [];
      const records = JSON.parse(raw) as HardcoreDeathRecord[];
      return records.slice().sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }
}
