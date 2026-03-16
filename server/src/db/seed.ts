/**
 * Seeds initial game data: item definitions and zone configs.
 * Idempotent — safe to run on every startup.
 */

import { getDb } from "./client";
import { items, zoneState } from "./schema";
import { sql } from "drizzle-orm";

const SEED_ITEMS = [
  // ── Weapons ──────────────────────────────────────────────────────────────────
  {
    id: "sword_iron",
    name: "Iron Sword",
    type: "weapon",
    stats: { attack: 12, speed: 1.0 },
    description: "A dependable iron sword. Not flashy, but reliable.",
    rarity: "common",
  },
  {
    id: "sword_steel",
    name: "Steel Sword",
    type: "weapon",
    stats: { attack: 20, speed: 1.1 },
    description: "Forged from refined steel. Holds a sharper edge.",
    rarity: "uncommon",
  },
  {
    id: "staff_oak",
    name: "Oak Staff",
    type: "weapon",
    stats: { attack: 8, magic: 15, speed: 0.8 },
    description: "A carved oak staff. Channels mana efficiently.",
    rarity: "common",
  },
  {
    id: "bow_hunters",
    name: "Hunter's Bow",
    type: "weapon",
    stats: { attack: 14, range: 120, speed: 0.9 },
    description: "Light and accurate. Preferred by zone scouts.",
    rarity: "common",
  },
  // ── Armor ─────────────────────────────────────────────────────────────────────
  {
    id: "armor_leather",
    name: "Leather Armor",
    type: "armor",
    stats: { defense: 8 },
    description: "Supple leather stitched into protective gear.",
    rarity: "common",
  },
  {
    id: "armor_chainmail",
    name: "Chainmail",
    type: "armor",
    stats: { defense: 16 },
    description: "Interlocked iron rings. Heavy but protective.",
    rarity: "uncommon",
  },
  {
    id: "helm_iron",
    name: "Iron Helm",
    type: "armor",
    stats: { defense: 5 },
    description: "A simple iron helmet. Keeps your head attached.",
    rarity: "common",
  },
  // ── Consumables ───────────────────────────────────────────────────────────────
  {
    id: "potion_health_small",
    name: "Small Health Potion",
    type: "consumable",
    stats: { restoreHp: 30 },
    description: "Restores 30 HP. Tastes vaguely of berries.",
    rarity: "common",
  },
  {
    id: "potion_health_large",
    name: "Large Health Potion",
    type: "consumable",
    stats: { restoreHp: 70 },
    description: "Restores 70 HP. A bright red concoction.",
    rarity: "uncommon",
  },
  {
    id: "potion_mana_small",
    name: "Small Mana Potion",
    type: "consumable",
    stats: { restoreMana: 20 },
    description: "Restores 20 mana. Glows faintly blue.",
    rarity: "common",
  },
  {
    id: "elixir_xp",
    name: "Experience Elixir",
    type: "consumable",
    stats: { bonusXp: 50 },
    description: "A shimmering elixir. Grants 50 bonus experience.",
    rarity: "rare",
  },
  // ── Materials ────────────────────────────────────────────────────────────────
  {
    id: "mat_iron_ore",
    name: "Iron Ore",
    type: "material",
    stats: {},
    description: "Raw iron ore. Used for crafting metal gear.",
    rarity: "common",
  },
  {
    id: "mat_magic_crystal",
    name: "Magic Crystal",
    type: "material",
    stats: {},
    description: "A crystallized fragment of mana energy.",
    rarity: "uncommon",
  },
  {
    id: "mat_slime_gel",
    name: "Slime Gel",
    type: "material",
    stats: {},
    description: "Viscous gel dropped by slimes. Useful for alchemy.",
    rarity: "common",
  },
];

const SEED_ZONES = [
  { zoneId: "zone1", data: { name: "Green Plains", difficulty: 1, bossType: null } },
  { zoneId: "zone2", data: { name: "Dark Forest", difficulty: 2, bossType: "bandit_king" } },
  { zoneId: "zone3", data: { name: "Ruined Keep", difficulty: 3, bossType: "golem_lord" } },
  { zoneId: "zone4", data: { name: "Sunken Coast", difficulty: 4, bossType: "tide_kraken" } },
];

export async function seed(): Promise<void> {
  const db = getDb();

  // Upsert items — do nothing on conflict (preserves any manual edits)
  if (SEED_ITEMS.length > 0) {
    await db
      .insert(items)
      .values(SEED_ITEMS)
      .onConflictDoNothing();
    console.log(`[DB] Seeded ${SEED_ITEMS.length} item definitions.`);
  }

  // Upsert zone configs
  for (const z of SEED_ZONES) {
    await db
      .insert(zoneState)
      .values(z)
      .onConflictDoNothing();
  }
  console.log(`[DB] Seeded ${SEED_ZONES.length} zone configs.`);
}
