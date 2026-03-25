/**
 * Seasonal event rotation service.
 *
 * Defines the four calendar seasons (spring/summer/fall/winter), seeds them
 * into the database on startup, and flips the `is_active` flag to the season
 * whose date window contains the current date.
 *
 * Calendar mapping:
 *   Spring  — March 1 – May 31
 *   Summer  — June 1 – August 31
 *   Fall    — September 1 – November 30
 *   Winter  — December 1 – February 28/29
 *
 * Zone overlay config:
 *   Seasonal enemy types are blended into SEASONAL_FEATURED_ZONES during
 *   wave spawning (30 % of enemies swapped to seasonal variants).
 */

import { getPool } from "../db/client";
import type { RewardTier } from "../db/seasonalEvents";

// ── Season names (stable identifiers used in quest gen context) ────────────────

export type SeasonName = "spring" | "summer" | "fall" | "winter";

// ── Calendar helpers ───────────────────────────────────────────────────────────

/**
 * Returns which season the given Date falls in.
 * Month is 0-indexed (JS Date.getMonth()).
 */
export function getSeasonForDate(date: Date): SeasonName {
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 2 && month <= 4)  return "spring"; // Mar-May
  if (month >= 5 && month <= 7)  return "summer"; // Jun-Aug
  if (month >= 8 && month <= 10) return "fall";   // Sep-Nov
  return "winter";                                 // Dec-Feb
}

/**
 * Returns the UTC start/end timestamps for the current seasonal window.
 * The window is always the full 3-month block for the given season
 * in the same calendar year (or spanning year-boundary for winter).
 */
export function getSeasonWindow(season: SeasonName, ref: Date): { startsAt: Date; endsAt: Date } {
  const year = ref.getUTCFullYear();
  switch (season) {
    case "spring":
      return {
        startsAt: new Date(Date.UTC(year, 2, 1)),   // Mar 1
        endsAt:   new Date(Date.UTC(year, 5, 0, 23, 59, 59, 999)), // May 31 end
      };
    case "summer":
      return {
        startsAt: new Date(Date.UTC(year, 5, 1)),   // Jun 1
        endsAt:   new Date(Date.UTC(year, 8, 0, 23, 59, 59, 999)), // Aug 31 end
      };
    case "fall":
      return {
        startsAt: new Date(Date.UTC(year, 8, 1)),   // Sep 1
        endsAt:   new Date(Date.UTC(year, 11, 0, 23, 59, 59, 999)), // Nov 30 end
      };
    case "winter": {
      // Dec 1 of current year – Feb 28/29 of next year
      // Winter straddles two calendar years: for Jan/Feb refs, look back to prior December
      const isWinterStart = ref.getUTCMonth() === 11; // December
      const decYear = isWinterStart ? year : year - 1;
      return {
        startsAt: new Date(Date.UTC(decYear,     11, 1)),   // Dec 1
        endsAt:   new Date(Date.UTC(decYear + 1,  2, 0, 23, 59, 59, 999)), // Feb 28/29 end
      };
    }
  }
}

// ── Seasonal event definitions ─────────────────────────────────────────────────

export interface SeasonDef {
  season:      SeasonName;
  name:        string;
  description: string;
  theme:       string;
  rewardTiers: RewardTier[];
}

export const SEASON_DEFS: SeasonDef[] = [
  {
    season:      "spring",
    name:        "Spring Blossom Festival",
    description: "The land awakens! Petal Shades and Growth Guardians stir among the blossoms. Gather seasonal tokens to claim rare spring rewards.",
    theme:       "spring renewal, blossoms, growth, new beginnings — enemies bloom from the earth itself",
    rewardTiers: [
      { points: 100,  itemId: "icon_reward_spring_staff",      label: "Spring Staff",     title: "Blossom Bearer" },
      { points: 250,  itemId: "icon_reward_spring_butterfly",  label: "Butterfly Wings" },
      { points: 500,  itemId: "icon_reward_spring_crown",      label: "Flower Crown",     title: "Crown of Petals" },
      { points: 1000, itemId: "icon_reward_spring_bow",        label: "Petal Bow",        title: "Guardian of the Grove" },
    ],
  },
  {
    season:      "summer",
    name:        "Summer Tide Festival",
    description: "The tides rise! Sand Crabs and Wave Wraiths patrol the sunlit shores. Chase the waves and claim treasures from the deep.",
    theme:       "summer heat, ocean waves, beach adventure, tropical storms — enemies rise from the sea",
    rewardTiers: [
      { points: 100,  itemId: "icon_reward_summer_shield",     label: "Coral Shield" },
      { points: 250,  itemId: "icon_reward_summer_crown",      label: "Shell Crown",      title: "Tide Walker" },
      { points: 500,  itemId: "icon_reward_summer_blade",      label: "Sun Blade",        title: "Blazeborn" },
      { points: 1000, itemId: "icon_reward_summer_wings",      label: "Tidal Wings",      title: "Sovereign of Shores" },
    ],
  },
  {
    season:      "fall",
    name:        "Harvest Moon Festival",
    description: "The harvest beckons! Scarecrow Shades and Harvest Golems guard the fields. Reap the bounty before the frost arrives.",
    theme:       "autumn harvest, falling leaves, pumpkins, harvest moon — enemies animated by the turning season",
    rewardTiers: [
      { points: 100,  itemId: "icon_reward_fall_scythe",       label: "Harvest Scythe" },
      { points: 250,  itemId: "icon_reward_fall_crown",        label: "Autumn Crown",     title: "Harvest Hand" },
      { points: 500,  itemId: "icon_reward_fall_cloak",        label: "Leaf Cloak",       title: "Reaper of Seasons" },
      { points: 1000, itemId: "icon_reward_fall_shield",       label: "Pumpkin Shield",   title: "Guardian of the Harvest" },
    ],
  },
  {
    season:      "winter",
    name:        "Frost Monarch Festival",
    description: "The Frost Monarch stirs! Blizzard Elementals and Snow Stalkers haunt the frozen wastes. Brave the cold to claim legendary winter relics.",
    theme:       "winter frost, blizzards, ice and snow, frozen mysteries — enemies born from the glacial depths",
    rewardTiers: [
      { points: 100,  itemId: "icon_reward_winter_staff",      label: "Glacial Staff" },
      { points: 250,  itemId: "icon_reward_winter_crown",      label: "Aurora Crown",     title: "Frostborn" },
      { points: 500,  itemId: "icon_reward_winter_blade",      label: "Frostbite Blade",  title: "Blizzard Blade" },
      { points: 1000, itemId: "icon_reward_winter_cloak",      label: "Snowdrift Cloak",  title: "Chosen of the Frost Monarch" },
    ],
  },
];

// ── Zone overlay config ────────────────────────────────────────────────────────

/** Enemy definitions blended into featured zones during their seasonal event. */
export interface SeasonalEnemyDef {
  type:        string;
  hp:          number;
  dmg:         number;
  speed:       number;
  aggroRange:  number;
  xp:          number;
  ranged?:     boolean;
}

export const SEASONAL_ENEMY_OVERLAYS: Record<SeasonName, SeasonalEnemyDef[]> = {
  spring: [
    { type: "bud_sprite",       hp: 55,  dmg: 10, speed: 60,  aggroRange: 85,  xp: 18 },
    { type: "petal_shade",      hp: 45,  dmg: 14, speed: 75,  aggroRange: 90,  xp: 20, ranged: true },
    { type: "growth_guardian",  hp: 90,  dmg: 18, speed: 40,  aggroRange: 70,  xp: 28 },
    { type: "sprout_stalker",   hp: 60,  dmg: 12, speed: 80,  aggroRange: 95,  xp: 22 },
  ],
  summer: [
    { type: "sand_crab",        hp: 65,  dmg: 12, speed: 50,  aggroRange: 80,  xp: 22 },
    { type: "wave_wraith",      hp: 50,  dmg: 16, speed: 85,  aggroRange: 95,  xp: 24, ranged: true },
    { type: "reef_rider",       hp: 80,  dmg: 14, speed: 70,  aggroRange: 90,  xp: 26 },
    { type: "tide_stalker",     hp: 55,  dmg: 18, speed: 90,  aggroRange: 100, xp: 25 },
  ],
  fall: [
    { type: "harvest_golem",    hp: 100, dmg: 16, speed: 35,  aggroRange: 75,  xp: 28 },
    { type: "scarecrow_shade",  hp: 60,  dmg: 12, speed: 55,  aggroRange: 85,  xp: 22 },
    { type: "autumn_wraith",    hp: 55,  dmg: 18, speed: 80,  aggroRange: 95,  xp: 26, ranged: true },
    { type: "leaf_stalker",     hp: 65,  dmg: 14, speed: 75,  aggroRange: 90,  xp: 24 },
  ],
  winter: [
    { type: "frost_wraith",     hp: 70,  dmg: 20, speed: 75,  aggroRange: 95,  xp: 28, ranged: true },
    { type: "ice_golem",        hp: 110, dmg: 18, speed: 30,  aggroRange: 70,  xp: 30 },
    { type: "blizzard_elemental", hp: 75, dmg: 22, speed: 65, aggroRange: 90,  xp: 32, ranged: true },
    { type: "snow_stalker",     hp: 65,  dmg: 16, speed: 85,  aggroRange: 100, xp: 26 },
  ],
};

/**
 * Zones that display seasonal decorations and receive enemy overlays.
 * zone1 = town hub (always overlaid), zone2 and zone3 = featured adventure zones.
 */
export const SEASONAL_FEATURED_ZONES = new Set(["zone1", "zone2", "zone3"]);

/**
 * Fraction of spawned enemies replaced by seasonal variants in featured zones.
 * 0.3 = 30 % seasonal, 70 % normal — keeps the zone feel while adding event flavour.
 */
export const SEASONAL_SPAWN_RATIO = 0.3;

/** Tile overlay key sent to the client to apply seasonal decorations. */
export const SEASONAL_OVERLAY_KEY: Record<SeasonName, string> = {
  spring: "seasonal_spring",
  summer: "seasonal_summer",
  fall:   "seasonal_fall",
  winter: "seasonal_winter",
};

// ── DB helpers ────────────────────────────────────────────────────────────────

/**
 * Upserts the four canonical seasonal events into the DB for the current year.
 * Safe to call on every startup — uses ON CONFLICT (season_key) DO UPDATE.
 */
export async function ensureSeasonalEvents(): Promise<void> {
  const pool = getPool();
  const now  = new Date();

  for (const def of SEASON_DEFS) {
    const window = getSeasonWindow(def.season, now);
    await pool.query(
      `INSERT INTO seasonal_events
         (season_key, name, description, theme, starts_at, ends_at, is_active, reward_tiers, quest_chain_ids)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, '[]')
       ON CONFLICT (season_key) DO UPDATE
         SET name         = EXCLUDED.name,
             description  = EXCLUDED.description,
             theme        = EXCLUDED.theme,
             starts_at    = EXCLUDED.starts_at,
             ends_at      = EXCLUDED.ends_at,
             reward_tiers = EXCLUDED.reward_tiers`,
      [
        def.season,
        def.name,
        def.description,
        def.theme,
        window.startsAt,
        window.endsAt,
        JSON.stringify(def.rewardTiers),
      ],
    );
  }
  console.log("[Seasons] Ensured 4 seasonal events in DB.");
}

/**
 * Activates exactly the event whose date window contains `now` and
 * deactivates all others.  Idempotent — safe to call repeatedly.
 *
 * Returns the name of the newly-activated season, or null if none matched
 * (shouldn't happen given the four windows cover the full year).
 */
export async function syncSeasonalActivation(now: Date = new Date()): Promise<SeasonName | null> {
  const pool = getPool();
  const currentSeason = getSeasonForDate(now);

  // Deactivate all, then activate the one whose key matches the current season
  await pool.query(`UPDATE seasonal_events SET is_active = FALSE`);

  const res = await pool.query<{ id: string }>(
    `UPDATE seasonal_events
        SET is_active = TRUE
      WHERE season_key = $1
      RETURNING id`,
    [currentSeason],
  );

  if (res.rows.length) {
    console.log(`[Seasons] Activated season: ${currentSeason}`);
    return currentSeason;
  }

  // Fallback: match by date window (in case season_key column is not yet populated)
  const fb = await pool.query<{ id: string }>(
    `UPDATE seasonal_events
        SET is_active = TRUE
      WHERE starts_at <= $1 AND ends_at >= $1
      RETURNING id`,
    [now],
  );
  if (fb.rows.length) {
    console.log(`[Seasons] Activated season via date window: ${currentSeason}`);
    return currentSeason;
  }

  console.warn(`[Seasons] Could not activate any season for date: ${now.toISOString()}`);
  return null;
}
