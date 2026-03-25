/**
 * Companion pet system — definitions and DB operations.
 *
 * Pet types and their passive bonuses (at level 1, scales +1% per level above 1):
 *   wolf         → +5% damage
 *   hawk         → +5% crit chance
 *   cat          → +5% dodge chance
 *   dragon_whelp → +3% all stats (damage, crit, dodge, maxHp)
 *   wisp         → +10% XP gain
 *   golem        → +10% max HP
 *
 * Happiness (0-100): decays 1/minute; feeding restores 30. Bonus disabled at 0.
 * Leveling: 1-20; XP per level = level × 100. Stats scale +1% per level above 1.
 * Acquisition: purchase from pet vendor (gold) or rare boss drop.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { playerPets } from "./schema";

// ── Pet type definitions ──────────────────────────────────────────────────────

export type PetType = "wolf" | "hawk" | "cat" | "dragon_whelp" | "wisp" | "golem";

export type PetBonusType = "damagePct" | "critPct" | "dodgePct" | "allStatPct" | "xpPct" | "maxHpPct";

export interface PetDefinition {
  type:       PetType;
  name:       string;
  bonusType:  PetBonusType;
  bonusValue: number; // base value at level 1
  /** Gold cost to purchase from vendor */
  vendorCost: number;
  /** Boss drop chance (0 = not available from bosses) */
  bossDrop:   number;
}

export const PET_DEFINITIONS: Record<PetType, PetDefinition> = {
  wolf:         { type: "wolf",         name: "Wolf",         bonusType: "damagePct",  bonusValue: 0.05, vendorCost: 500,  bossDrop: 0.03 },
  hawk:         { type: "hawk",         name: "Hawk",         bonusType: "critPct",    bonusValue: 0.05, vendorCost: 500,  bossDrop: 0.03 },
  cat:          { type: "cat",          name: "Cat",          bonusType: "dodgePct",   bonusValue: 0.05, vendorCost: 400,  bossDrop: 0.04 },
  dragon_whelp: { type: "dragon_whelp", name: "Dragon Whelp", bonusType: "allStatPct", bonusValue: 0.03, vendorCost: 1500, bossDrop: 0.01 },
  wisp:         { type: "wisp",         name: "Wisp",         bonusType: "xpPct",      bonusValue: 0.10, vendorCost: 800,  bossDrop: 0.02 },
  golem:        { type: "golem",        name: "Golem",        bonusType: "maxHpPct",   bonusValue: 0.10, vendorCost: 600,  bossDrop: 0.02 },
};

export const ALL_PET_TYPES = Object.keys(PET_DEFINITIONS) as PetType[];

export const MAX_PET_LEVEL = 20;

/** XP needed to advance from level `level` to level+1. */
export function petXpForLevel(level: number): number {
  return level * 100;
}

/** Scale base bonus by level: +1% multiplier per level above 1. */
export function scaledPetBonus(baseValue: number, level: number): number {
  const capped = Math.min(Math.max(level, 1), MAX_PET_LEVEL);
  return baseValue * (1 + (capped - 1) * 0.01);
}

// ── Effective bonus calculation ───────────────────────────────────────────────

export interface PetBonus {
  damagePct:  number;
  critPct:    number;
  dodgePct:   number;
  xpPct:      number;
  maxHpPct:   number;
}

/**
 * Compute the effective passive bonus for an equipped pet.
 * Returns zeroes if happiness = 0 (bonus disabled when pet is unhappy).
 */
export function computePetBonus(petType: string, petLevel: number, petHappiness: number): PetBonus {
  const bonus: PetBonus = { damagePct: 0, critPct: 0, dodgePct: 0, xpPct: 0, maxHpPct: 0 };
  if (petHappiness <= 0) return bonus;
  const def = PET_DEFINITIONS[petType as PetType];
  if (!def) return bonus;

  const value = scaledPetBonus(def.bonusValue, petLevel);

  switch (def.bonusType) {
    case "damagePct":  bonus.damagePct  = value; break;
    case "critPct":    bonus.critPct    = value; break;
    case "dodgePct":   bonus.dodgePct   = value; break;
    case "xpPct":      bonus.xpPct      = value; break;
    case "maxHpPct":   bonus.maxHpPct   = value; break;
    case "allStatPct":
      bonus.damagePct = value;
      bonus.critPct   = value;
      bonus.dodgePct  = value;
      bonus.maxHpPct  = value;
      break;
  }
  return bonus;
}

// ── DB row type ───────────────────────────────────────────────────────────────

export interface PetRow {
  id:         string;
  playerId:   string;
  petType:    string;
  level:      number;
  xp:         number;
  happiness:  number;
  lastFedAt:  Date;
  isEquipped: boolean;
  acquiredAt: Date;
}

// ── DB operations ─────────────────────────────────────────────────────────────

export async function getPlayerPets(playerId: string): Promise<PetRow[]> {
  const db = getDb();
  const rows = await db.select().from(playerPets).where(eq(playerPets.playerId, playerId));
  return rows as PetRow[];
}

export async function getEquippedPet(playerId: string): Promise<PetRow | null> {
  const db = getDb();
  const rows = await db.select().from(playerPets).where(
    and(eq(playerPets.playerId, playerId), eq(playerPets.isEquipped, true)),
  );
  return (rows[0] as PetRow) ?? null;
}

export async function addPet(playerId: string, petType: PetType): Promise<PetRow> {
  const db = getDb();
  const rows = await db.insert(playerPets).values({
    playerId,
    petType,
    level:      1,
    xp:         0,
    happiness:  100,
    lastFedAt:  new Date(),
    isEquipped: false,
  }).returning();
  return rows[0] as PetRow;
}

/** Equip a pet by ID; unequips all others first. */
export async function equipPet(playerId: string, petId: string): Promise<PetRow> {
  const db = getDb();
  // Unequip all
  await db.update(playerPets)
    .set({ isEquipped: false })
    .where(eq(playerPets.playerId, playerId));
  // Equip selected
  const rows = await db.update(playerPets)
    .set({ isEquipped: true })
    .where(and(eq(playerPets.playerId, playerId), eq(playerPets.id, petId)))
    .returning();
  if (!rows.length) throw new Error("PET_NOT_FOUND");
  return rows[0] as PetRow;
}

/** Dismiss (unequip) the currently equipped pet. */
export async function dismissPet(playerId: string): Promise<void> {
  const db = getDb();
  await db.update(playerPets)
    .set({ isEquipped: false })
    .where(eq(playerPets.playerId, playerId));
}

/**
 * Feed a pet — restores +30 happiness (capped at 100).
 * Caller must verify the player has a suitable consumable.
 */
export async function feedPet(playerId: string, petId: string): Promise<{ happiness: number }> {
  const db = getDb();
  const rows = await db.select().from(playerPets).where(
    and(eq(playerPets.playerId, playerId), eq(playerPets.id, petId)),
  );
  if (!rows.length) throw new Error("PET_NOT_FOUND");
  const pet = rows[0] as PetRow;
  const newHappiness = Math.min(100, pet.happiness + 30);
  await db.update(playerPets)
    .set({ happiness: newHappiness, lastFedAt: new Date() })
    .where(and(eq(playerPets.playerId, playerId), eq(playerPets.id, petId)));
  return { happiness: newHappiness };
}

/** Award XP to a pet; handles level-ups up to MAX_PET_LEVEL. */
export async function awardPetXp(
  playerId: string,
  petId: string,
  xp: number,
): Promise<{ level: number; xp: number; leveledUp: boolean }> {
  const db = getDb();
  const rows = await db.select().from(playerPets).where(
    and(eq(playerPets.playerId, playerId), eq(playerPets.id, petId)),
  );
  if (!rows.length) throw new Error("PET_NOT_FOUND");
  const pet = rows[0] as PetRow;
  if (pet.level >= MAX_PET_LEVEL) return { level: pet.level, xp: pet.xp, leveledUp: false };

  let newXp    = pet.xp + xp;
  let newLevel = pet.level;
  let leveledUp = false;

  while (newLevel < MAX_PET_LEVEL && newXp >= petXpForLevel(newLevel)) {
    newXp -= petXpForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  await db.update(playerPets)
    .set({ level: newLevel, xp: newXp })
    .where(and(eq(playerPets.playerId, playerId), eq(playerPets.id, petId)));

  return { level: newLevel, xp: newXp, leveledUp };
}

/** Save current in-memory happiness to DB. */
export async function savePetHappiness(playerId: string, petId: string, happiness: number): Promise<void> {
  const db = getDb();
  await db.update(playerPets)
    .set({ happiness: Math.max(0, Math.min(100, happiness)) })
    .where(and(eq(playerPets.playerId, playerId), eq(playerPets.id, petId)));
}
