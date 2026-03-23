/**
 * Faction definitions for PixelRealm.
 *
 * Four factions, each tied to a zone. Reputation ranges from -100 (hostile)
 * to +100 (exalted), starting at 0 (neutral).
 *
 * Standing thresholds:
 *   <= -51  → hostile     (NPCs attack on sight, quests blocked)
 *   <= -20  → unfriendly  (quests blocked, warning dialogue)
 *   <= +19  → neutral     (normal quest access)
 *   <= +49  → friendly    (quests available, 10% gold reward bonus)
 *    >= +50  → exalted     (best quests, 25% gold reward bonus, unique title)
 */

export interface FactionDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: number;       // Phaser/hex color for UI
  zoneId: string;      // primary zone this faction controls
  /** Enemy types that are hostile to this faction — killing them grants rep */
  hostileEnemies: string[];
  /** Faction rep bonus for completing one of their quests */
  questRepGain: number;
  /** Rival faction: quest completion also reduces rival rep */
  rivalFactionId: string | null;
}

export const FACTIONS: FactionDef[] = [
  {
    id: "nature_wardens",
    name: "Nature Wardens",
    shortName: "Wardens",
    description: "Guardians of the ancient forests, they protect the balance of nature.",
    color: 0x44cc66,
    zoneId: "zone1",
    hostileEnemies: ["slime", "mushroom"],
    questRepGain: 10,
    rivalFactionId: "shadow_clan",
  },
  {
    id: "merchants_guild",
    name: "Merchants Guild",
    shortName: "Merchants",
    description: "A powerful trade alliance controlling the desert crossroads and caravan routes.",
    color: 0xffcc44,
    zoneId: "zone2",
    hostileEnemies: ["beetle", "bandit", "sentry"],
    questRepGain: 10,
    rivalFactionId: "shadow_clan",
  },
  {
    id: "mages_circle",
    name: "Mages Circle",
    shortName: "Mages",
    description: "Scholars of arcane lore who study the ruins of the old empire.",
    color: 0x8844ff,
    zoneId: "zone3",
    hostileEnemies: ["wraith", "golem", "archer"],
    questRepGain: 10,
    rivalFactionId: "shadow_clan",
  },
  {
    id: "shadow_clan",
    name: "Shadow Clan",
    shortName: "Shadow",
    description: "A secretive guild of rogues and corsairs who operate from the harbor.",
    color: 0x884488,
    zoneId: "zone4",
    hostileEnemies: ["crab", "wisp", "raider"],
    questRepGain: 10,
    rivalFactionId: "merchants_guild",
  },
];

export const FACTION_BY_ID = new Map<string, FactionDef>(
  FACTIONS.map((f) => [f.id, f]),
);

/** Returns the faction that controls a given zone, or null. */
export function factionForZone(zoneId: string): FactionDef | null {
  return FACTIONS.find((f) => f.zoneId === zoneId) ?? null;
}

/** Returns the faction whose hostileEnemies list includes this enemy type. */
export function factionForEnemy(enemyType: string): FactionDef | null {
  return FACTIONS.find((f) => f.hostileEnemies.includes(enemyType)) ?? null;
}

// ── Standing helpers ──────────────────────────────────────────────────────────

export type FactionStanding = "hostile" | "unfriendly" | "neutral" | "friendly" | "exalted";

export function getStanding(rep: number): FactionStanding {
  if (rep <= -51) return "hostile";
  if (rep <= -20) return "unfriendly";
  if (rep <= +19) return "neutral";
  if (rep <= +49) return "friendly";
  return "exalted";
}

/** Returns a gold reward multiplier based on standing (1.0 = no bonus). */
export function standingGoldMultiplier(standing: FactionStanding): number {
  switch (standing) {
    case "friendly": return 1.10;
    case "exalted":  return 1.25;
    default:         return 1.00;
  }
}

export const REP_CLAMP_MIN = -100;
export const REP_CLAMP_MAX = 100;
export const REP_PER_KILL  = 2;   // rep gain per enemy kill (to that enemy's faction)
export const RIVAL_REP_LOSS = 2;  // rep loss to rival faction on quest complete
