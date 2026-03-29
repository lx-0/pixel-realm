/**
 * Faction definitions for PixelRealm.
 *
 * Four factions, each tied to a zone. Reputation ranges from -100 (hostile)
 * to +100 (exalted), starting at 0 (neutral).
 *
 * Standing thresholds (6-tier):
 *   <= -51  → hostile     (NPCs attack on sight, quests blocked)
 *   <= -20  → unfriendly  (quests blocked, warning dialogue)
 *   <= +19  → neutral     (normal quest access)
 *   <= +49  → friendly    (faction vendor unlocked, 10% gold reward bonus)
 *   <= +74  → honored     (exclusive gear rewards)
 *   >= +75  → exalted     (unique title, 25% gold reward bonus, best quests)
 */

export interface FactionVendorItem {
  id: string;
  name: string;
  description: string;
  goldCost: number;
  /** Minimum standing required to purchase. */
  requiredStanding: "friendly" | "honored" | "exalted";
  type: "consumable" | "gear" | "cosmetic";
}

export interface FactionDailyTask {
  id: string;
  description: string;
  /** Enemy type to kill. */
  enemyType: string;
  /** Number to kill. */
  killCount: number;
  /** Reputation reward on completion. */
  repReward: number;
  goldReward: number;
}

export interface FactionTitleReward {
  standing: "honored" | "exalted";
  title: string;
  titleId: string;
}

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
  /** Items available from the faction vendor (accessible at Friendly+). */
  vendorItems: FactionVendorItem[];
  /** One daily task offered by this faction. */
  dailyTask: FactionDailyTask;
  /** Titles awarded at Honored and Exalted standing. */
  titleRewards: FactionTitleReward[];
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
    vendorItems: [
      {
        id: "nw_potion_speed",
        name: "Potion of Forest Speed",
        description: "Grants a brief movement speed boost in forest zones.",
        goldCost: 50,
        requiredStanding: "friendly",
        type: "consumable",
      },
      {
        id: "nw_charm_nature",
        name: "Nature-Blessed Charm",
        description: "A charm that increases XP gained from forest enemies.",
        goldCost: 200,
        requiredStanding: "honored",
        type: "gear",
      },
      {
        id: "nw_title_cosmetic",
        name: "Warden's Leaf Cloak",
        description: "A cosmetic cloak worn by honored members of the Nature Wardens.",
        goldCost: 500,
        requiredStanding: "exalted",
        type: "cosmetic",
      },
    ],
    dailyTask: {
      id: "nw_daily_slimes",
      description: "Cull 5 slimes threatening the forest border.",
      enemyType: "slime",
      killCount: 5,
      repReward: 15,
      goldReward: 30,
    },
    titleRewards: [
      { standing: "honored",  title: "Warden Ally",     titleId: "nw_ally" },
      { standing: "exalted",  title: "Warden Champion", titleId: "nw_champion" },
    ],
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
    vendorItems: [
      {
        id: "mg_charm_luck",
        name: "Merchant's Luck Charm",
        description: "Slightly increases gold drop rate from enemies.",
        goldCost: 60,
        requiredStanding: "friendly",
        type: "consumable",
      },
      {
        id: "mg_supply_pack",
        name: "Caravan Supply Pack",
        description: "A bundle of consumables packed for long journeys.",
        goldCost: 180,
        requiredStanding: "honored",
        type: "consumable",
      },
      {
        id: "mg_signet_ring",
        name: "Guild Signet Ring",
        description: "A cosmetic ring marking the wearer as a Guild Magnate.",
        goldCost: 500,
        requiredStanding: "exalted",
        type: "cosmetic",
      },
    ],
    dailyTask: {
      id: "mg_daily_bandits",
      description: "Eliminate 3 bandits preying on the trade road.",
      enemyType: "bandit",
      killCount: 3,
      repReward: 15,
      goldReward: 40,
    },
    titleRewards: [
      { standing: "honored",  title: "Guild Associate",  titleId: "mg_associate" },
      { standing: "exalted",  title: "Guild Magnate",    titleId: "mg_magnate" },
    ],
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
    vendorItems: [
      {
        id: "mc_arcane_scroll",
        name: "Arcane Scroll",
        description: "A scroll that temporarily boosts spell power.",
        goldCost: 70,
        requiredStanding: "friendly",
        type: "consumable",
      },
      {
        id: "mc_focus_stone",
        name: "Mages' Focus Stone",
        description: "A runestone that reduces skill cooldowns by a small amount.",
        goldCost: 220,
        requiredStanding: "honored",
        type: "gear",
      },
      {
        id: "mc_arcane_vestment",
        name: "Arcane Vestment",
        description: "A cosmetic robe worn by fully initiated members of the Mages Circle.",
        goldCost: 500,
        requiredStanding: "exalted",
        type: "cosmetic",
      },
    ],
    dailyTask: {
      id: "mc_daily_wraiths",
      description: "Banish 3 wraiths disturbing the ruins.",
      enemyType: "wraith",
      killCount: 3,
      repReward: 15,
      goldReward: 35,
    },
    titleRewards: [
      { standing: "honored",  title: "Circle Initiate",  titleId: "mc_initiate" },
      { standing: "exalted",  title: "Circle Archmage",  titleId: "mc_archmage" },
    ],
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
    vendorItems: [
      {
        id: "sc_shadow_dust",
        name: "Shadow Dust Pouch",
        description: "Toss to briefly blind nearby enemies.",
        goldCost: 55,
        requiredStanding: "friendly",
        type: "consumable",
      },
      {
        id: "sc_corsair_knife",
        name: "Corsair's Knife",
        description: "A finely crafted blade that increases critical strike chance.",
        goldCost: 210,
        requiredStanding: "honored",
        type: "gear",
      },
      {
        id: "sc_shadow_wrap",
        name: "Shadow Wrappings",
        description: "A cosmetic dark cloak marking a trusted operative of the Shadow Clan.",
        goldCost: 500,
        requiredStanding: "exalted",
        type: "cosmetic",
      },
    ],
    dailyTask: {
      id: "sc_daily_crabs",
      description: "Cull 3 crabs fouling the harbor docks.",
      enemyType: "crab",
      killCount: 3,
      repReward: 15,
      goldReward: 35,
    },
    titleRewards: [
      { standing: "honored",  title: "Shadow Operative", titleId: "sc_operative" },
      { standing: "exalted",  title: "Shadow Phantom",   titleId: "sc_phantom" },
    ],
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

export type FactionStanding = "hostile" | "unfriendly" | "neutral" | "friendly" | "honored" | "exalted";

export function getStanding(rep: number): FactionStanding {
  if (rep <= -51) return "hostile";
  if (rep <= -20) return "unfriendly";
  if (rep <= +19) return "neutral";
  if (rep <= +49) return "friendly";
  if (rep <= +74) return "honored";
  return "exalted";
}

/** Returns true if standing grants access to the faction vendor. */
export function canAccessVendor(standing: FactionStanding): boolean {
  return standing === "friendly" || standing === "honored" || standing === "exalted";
}

/** Returns a gold reward multiplier based on standing (1.0 = no bonus). */
export function standingGoldMultiplier(standing: FactionStanding): number {
  switch (standing) {
    case "friendly": return 1.10;
    case "honored":  return 1.18;
    case "exalted":  return 1.25;
    default:         return 1.00;
  }
}

/** Returns all title rewards a player should have unlocked given current rep. */
export function getEarnedTitles(factionId: string, rep: number): FactionTitleReward[] {
  const faction = FACTION_BY_ID.get(factionId);
  if (!faction) return [];
  const standing = getStanding(rep);
  const order: FactionStanding[] = ["hostile", "unfriendly", "neutral", "friendly", "honored", "exalted"];
  const standingRank = order.indexOf(standing);
  return faction.titleRewards.filter(
    (t) => order.indexOf(t.standing) <= standingRank,
  );
}

export const REP_CLAMP_MIN = -100;
export const REP_CLAMP_MAX = 100;
export const REP_PER_KILL  = 2;   // rep gain per enemy kill (to that enemy's faction)
export const RIVAL_REP_LOSS = 2;  // rep loss to rival faction on quest complete
