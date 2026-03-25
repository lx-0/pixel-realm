// ── Canvas ────────────────────────────────────────────────────────────────────
// Internal resolution (pixel-perfect; displayed at SCALE× on screen)
export const CANVAS = {
  WIDTH: 320,
  HEIGHT: 180,
  SCALE: 4, // displayed at 1280×720
} as const;

// ── Player ────────────────────────────────────────────────────────────────────
export const PLAYER = {
  BASE_HP: 100,
  BASE_MANA: 50,
  MOVE_SPEED: 120,
  ATTACK_SPEED: 1.0,
  BOUNCE: 0.1,
  XP_PER_KILL_BASE: 10,
  DROP_RATE_COMMON: 0.30,
  DROP_RATE_RARE: 0.05,
  DEATH_RESOURCE_LOSS_PCT: 0.05,
  SKILL_COOLDOWN_BASE_MS: 8000,
} as const;

// ── Level Progression ─────────────────────────────────────────────────────────
export const LEVELS = {
  // Cumulative XP required to reach each level (index 0 = reach level 2).
  // Levels 1–10 preserve original pacing; 11–50 continue the curve at +60/level.
  XP_THRESHOLDS: [
    // lv 1→2 … 9→10
       80,   200,   350,   540,   760,  1020,  1320,  1660,  2040,
    // lv 10→11 … 19→20
     2500,  3020,  3600,  4240,  4940,  5700,  6520,  7400,  8340,  9340,
    // lv 20→21 … 29→30
    10400, 11520, 12700, 13940, 15240, 16600, 18020, 19500, 21040, 22640,
    // lv 30→31 … 39→40
    24300, 26020, 27800, 29640, 31540, 33500, 35520, 37600, 39740, 41940,
    // lv 40→41 … 49→50
    44200, 46520, 48900, 51340, 53840, 56400, 59020, 61700, 64440, 67240,
  ] as const,
  MAX_LEVEL: 50,
  HP_BONUS_PER_LEVEL: 20,
  DAMAGE_BONUS_PER_LEVEL: 5,
  SPEED_BONUS_PER_LEVEL: 5,
} as const;

// ── Prestige System ───────────────────────────────────────────────────────────
/** New Game+ prestige reset — available at level 50. */
export const PRESTIGE = {
  /** Number of prestige tiers (resets). Cap beyond which bonuses stop increasing. */
  MAX_PRESTIGE: 10,
  /** Permanent stat multiplier bonus per prestige level (+2% per tier). */
  BONUS_PER_LEVEL: 0.02,
  /** Prestige tier cosmetic border colours (index = prestige level 1–10). */
  BORDER_COLORS: [
    0xaaaaaa, // P1 — silver
    0x44aaff, // P2 — blue
    0x44ff88, // P3 — green
    0xffaa00, // P4 — orange
    0xff4444, // P5 — red
    0xff44ff, // P6 — magenta
    0x44ffff, // P7 — cyan
    0xffff44, // P8 — yellow
    0xff8844, // P9 — gold-orange
    0xffd700, // P10 — gold
  ] as const,
} as const;

// ── Mana ──────────────────────────────────────────────────────────────────────
export const MANA = {
  BASE: 50,
  REGEN_PER_SEC: 6,   // mana recovered per second
  ATTACK_COST: 5,     // mana used per attack swing
} as const;

// ── Sprint ────────────────────────────────────────────────────────────────────
export const SPRINT = {
  SPEED_MULT:        1.5,  // speed multiplier while holding Shift
  MANA_COST_PER_SEC: 15,   // mana drained per second while sprinting
} as const;

// ── Dodge ─────────────────────────────────────────────────────────────────────
export const DODGE = {
  DASH_SPEED:  300,   // px/s during roll
  DURATION_MS: 220,   // how long the dash lasts
  INVULN_MS:   300,   // total i-frame window (≥ DURATION_MS)
  COOLDOWN_MS: 1500,  // time before dodge can be used again
  MANA_COST:   8,     // mana spent per dodge
} as const;

// ── Enemies ───────────────────────────────────────────────────────────────────
export const ENEMIES = {
  HP_SCALE_PER_TIER: 1.5,
  AGGRO_RANGE_PX: 90,
  PATROL_SPEED: 55,
  ELITE_SPAWN_RATE: 0.10,
  BOSS_RESPAWN_MS: 24 * 60 * 60 * 1000,
  AI_REACTION_MS: 200,
} as const;

// ── Combat ────────────────────────────────────────────────────────────────────
export const COMBAT = {
  ATTACK_DAMAGE: 25,             // damage per melee swing
  ATTACK_RANGE_PX: 36,           // melee radius in pixels
  ATTACK_COOLDOWN_MS: 480,       // minimum ms between swings
  ATTACK_KNOCKBACK: 160,         // px/s applied to enemy on hit
  PLAYER_HIT_DAMAGE: 10,         // HP lost per enemy contact
  PLAYER_INVINCIBILITY_MS: 900,  // ms of iframes after taking a hit
  ENEMY_HP: 50,                  // base HP per enemy (scales by wave tier)
  WAVE_BASE_ENEMY_COUNT: 4,      // enemies in wave 1; +2 per additional wave
  WAVE_HP_SCALE_PER_WAVE: 0.15,  // HP multiplier increase per wave (e.g. 0.15 = +15% per wave)
} as const;

// ── Economy ───────────────────────────────────────────────────────────────────
export const ECONOMY = {
  MARKETPLACE_FEE_PCT: 0.05,
  CRAFTING_FAIL_RATE_HIGH_TIER: 0.15,
  FAST_TRAVEL_COST_PER_ZONE: 10,
  LAND_AUCTION_FLOOR: 500,
  GUILD_TREASURY_TAX_PCT: 0.05,
  LLM_QUEST_REWARD_MULTIPLIER: 1.2,
  /** Gold fee charged per craft at a crafting station. */
  CRAFTING_STATION_FEE: 5,
  /** Flat gold cost deducted on death (equipment repair). */
  ITEM_REPAIR_COST_ON_DEATH: 25,
  /** Fraction of equipment durability lost on death (0–1). */
  EQUIPMENT_DURABILITY_LOSS_ON_DEATH: 0.10,
  /** Starting durability for all equipment pieces (0–100). */
  EQUIPMENT_MAX_DURABILITY: 100,
} as const;

// ── PvP Balance ───────────────────────────────────────────────────────────────
/** Modifiers applied only inside the arena (PvP context). */
export const PVP_BALANCE = {
  /** Multiplier on heal-on-kill passive in PvP (e.g. 0.5 = 50% reduction). */
  HEAL_ON_KILL_MULT: 0.5,
  /** Multiplier applied to all skill cooldowns in PvP (>1 = longer CDs). */
  COOLDOWN_MULT: 1.25,
  /** Maximum damage dealt in a single hit in PvP (prevents one-shots). */
  MAX_HIT_DAMAGE: 30,
} as const;

// ── Loot Tables ───────────────────────────────────────────────────────────────
/** Drop-rate tiers used when rolling item drops. */
export const LOOT = {
  /** Drop chance for a common item from a normal enemy. */
  COMMON_DROP_RATE: 0.30,
  /** Drop chance for a rare item from a normal enemy (< 2%). */
  RARE_DROP_RATE_NORMAL: 0.018,
  /** Drop chance for a rare item from a boss (5–10%). */
  RARE_DROP_RATE_BOSS: 0.075,
  /** Drop chance for an epic item from a boss. */
  EPIC_DROP_RATE_BOSS: 0.025,
} as const;

// ── Scene Keys ────────────────────────────────────────────────────────────────
export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  LEVEL_SELECT: 'LevelSelectScene',
  GAME: 'GameScene',
  PAUSE: 'PauseScene',
  SETTINGS: 'SettingsScene',
  GAME_OVER: 'GameOverScene',
  CREDITS: 'CreditsScene',
  UI: 'UIScene',
  ARENA: 'ArenaScene',
  HOUSING: 'HousingScene',
} as const;

// ── Housing ───────────────────────────────────────────────────────────────────
export const HOUSING = {
  /** Grid cell size in pixels (interior coordinate space) */
  GRID_SIZE: 16,
  /** Interior scene dimensions in pixels */
  INTERIOR_WIDTH: 160,
  INTERIOR_HEIGHT: 128,
  /** Maximum furniture pieces per house */
  MAX_FURNITURE: 20,
  /** House tier tileset keys */
  TILESETS: {
    1: 'tileset_house_cottage',
    2: 'tileset_house_manor',
  } as Record<number, string>,
  /** Available furniture definitions */
  FURNITURE: [
    { id: 'furn_bed',       name: 'Bed',         key: 'furn_bed',       restBonus: 10 },
    { id: 'furn_table',     name: 'Table',        key: 'furn_table',     restBonus: 0  },
    { id: 'furn_chair',     name: 'Chair',        key: 'furn_chair',     restBonus: 5  },
    { id: 'furn_bookshelf', name: 'Bookshelf',    key: 'furn_bookshelf', restBonus: 0  },
    { id: 'furn_chest',     name: 'Chest',        key: 'furn_chest',     restBonus: 0  },
    { id: 'furn_fireplace', name: 'Fireplace',    key: 'furn_fireplace', restBonus: 8  },
    { id: 'furn_rug',       name: 'Rug',          key: 'furn_rug',       restBonus: 3  },
    { id: 'furn_lamp',      name: 'Lamp',         key: 'furn_lamp',      restBonus: 0  },
    { id: 'furn_wardrobe',  name: 'Wardrobe',     key: 'furn_wardrobe',  restBonus: 0  },
    { id: 'furn_anvil',     name: 'Anvil',        key: 'furn_anvil',     restBonus: 0  },
  ] as const,
  DECORATIONS: [
    { id: 'decor_painting',  name: 'Painting',     key: 'decor_painting'  },
    { id: 'decor_trophy',    name: 'Trophy',       key: 'decor_trophy'    },
    { id: 'decor_banner',    name: 'Banner',       key: 'decor_banner'    },
    { id: 'decor_plant',     name: 'Plant',        key: 'decor_plant'     },
    { id: 'decor_candle',    name: 'Candle',       key: 'decor_candle'    },
    { id: 'decor_clock',     name: 'Clock',        key: 'decor_clock'     },
  ] as const,
} as const;

// ── Arena ─────────────────────────────────────────────────────────────────────
export const ARENA = {
  MATCH_DURATION_MS: 180_000,  // 3-minute timed matches
  ROUND_HP: 100,               // each combatant's HP per round
  ROUND_MANA: 50,
  ATTACK_DAMAGE: 20,
  ATTACK_RANGE_PX: 36,
  ATTACK_COOLDOWN_MS: 500,
  ATTACK_KNOCKBACK: 140,
  PLAYER_INVINCIBILITY_MS: 800,
  MOVE_SPEED: 110,
  ELO_K: 32,                   // K-factor for ELO updates
  ELO_DEFAULT: 1000,
  TIERS: {
    BRONZE:   { min: 0,    max: 1199, label: 'Bronze',   icon: 'icon_rank_arena_bronze' },
    SILVER:   { min: 1200, max: 1399, label: 'Silver',   icon: 'icon_rank_arena_silver' },
    GOLD:     { min: 1400, max: 1599, label: 'Gold',     icon: 'icon_rank_arena_gold' },
    PLATINUM: { min: 1600, max: 1799, label: 'Platinum', icon: 'icon_rank_arena_platinum' },
    DIAMOND:  { min: 1800, max: Infinity, label: 'Diamond', icon: 'icon_rank_arena_diamond' },
  },
} as const;

export type ArenaMode = '1v1' | '2v2';
export type ArenaTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type ArenaMap  = 'gladiator_pit' | 'shadow_sanctum';

// ── Enemy Type Definitions ────────────────────────────────────────────────────
export type EnemyTypeName =
  | 'slime' | 'mushroom' | 'slime_mini'
  | 'beetle' | 'bandit' | 'sentry'
  | 'wraith' | 'golem' | 'archer'
  | 'crab' | 'wisp' | 'raider'
  | 'ice_elemental' | 'frost_wolf' | 'crystal_golem'
  | 'lava_slime' | 'fire_imp' | 'magma_golem'
  | 'bog_crawler' | 'swamp_wraith' | 'toxic_toad'
  | 'frost_elemental' | 'snow_wolf' | 'ice_archer'
  | 'star_sentinel' | 'void_mage' | 'astral_beast'
  | 'deep_angler' | 'abyssal_leviathan' | 'coral_golem'
  | 'bone_revenant' | 'ashwyrm' | 'spectral_drake'
  | 'rift_walker' | 'void_sentinel' | 'shadow_weaver'
  | 'eclipse_knight' | 'shadow_herald' | 'dusk_wraith'
  | 'shattered_golem' | 'reality_fracture' | 'dominion_shade'
  | 'elemental_amalgam' | 'primordial_shard' | 'core_sentinel'
  | 'nexus_guardian' | 'phase_strider' | 'energy_parasite'
  | 'twilight_sentinel' | 'rift_stalker' | 'echo_wraith'
  | 'spire_sentinel' | 'reality_shard' | 'oblivion_wraith'
  | 'astral_warden' | 'cosmic_devourer' | 'nebula_wisp';

export type BossTypeName = 'slime_king' | 'bandit_chief' | 'archon' | 'kraken' | 'glacial_wyrm' | 'infernal_warden' | 'mire_queen' | 'frost_titan' | 'celestial_arbiter' | 'abyssal_kraken_lord' | 'ancient_dracolich' | 'void_architect' | 'eclipsed_king' | 'the_unmaker' | 'genesis_flame' | 'nexus_overseer' | 'twilight_warden' | 'spire_keeper' | 'astral_sovereign';

export interface EnemyTypeDef {
  color: number;
  size: number;
  baseHp: number;
  baseDmg: number;
  speed: number;
  aggroRange: number;
  xpValue: number;
  knockbackMultiplier: number;
  behaviour: 'chase' | 'burst' | 'ranged' | 'stationary' | 'phase' | 'tank' | 'ranged_flee' | 'sidestep' | 'charm' | 'block';
  projectileColor?: number;
}

export const ENEMY_TYPES: Record<EnemyTypeName, EnemyTypeDef> = {
  slime:      { color: 0x44dd44, size: 8,  baseHp: 30,  baseDmg: 5,  speed: 45,  aggroRange: 80,  xpValue: 10, knockbackMultiplier: 1.0, behaviour: 'chase' },
  mushroom:   { color: 0xcc8833, size: 9,  baseHp: 50,  baseDmg: 8,  speed: 70,  aggroRange: 70,  xpValue: 14, knockbackMultiplier: 0.8, behaviour: 'burst' },
  slime_mini: { color: 0x88ee88, size: 6,  baseHp: 25,  baseDmg: 5,  speed: 55,  aggroRange: 85,  xpValue: 6,  knockbackMultiplier: 1.2, behaviour: 'chase' },
  beetle:     { color: 0xbb6622, size: 8,  baseHp: 45,  baseDmg: 10, speed: 85,  aggroRange: 120, xpValue: 12, knockbackMultiplier: 0.7, behaviour: 'chase' },
  bandit:     { color: 0xdd3322, size: 9,  baseHp: 80,  baseDmg: 18, speed: 55,  aggroRange: 100, xpValue: 18, knockbackMultiplier: 0.9, behaviour: 'ranged', projectileColor: 0xffaa44 },
  sentry:     { color: 0x44aa44, size: 9,  baseHp: 120, baseDmg: 0,  speed: 0,   aggroRange: 0,   xpValue: 20, knockbackMultiplier: 0.0, behaviour: 'stationary' },
  wraith:     { color: 0x8888dd, size: 8,  baseHp: 90,  baseDmg: 20, speed: 65,  aggroRange: 100, xpValue: 22, knockbackMultiplier: 0.5, behaviour: 'phase' },
  golem:      { color: 0x888888, size: 12, baseHp: 200, baseDmg: 35, speed: 30,  aggroRange: 80,  xpValue: 30, knockbackMultiplier: 0.0, behaviour: 'tank' },
  archer:     { color: 0x884422, size: 8,  baseHp: 70,  baseDmg: 22, speed: 40,  aggroRange: 110, xpValue: 20, knockbackMultiplier: 1.0, behaviour: 'ranged_flee', projectileColor: 0xffcc44 },
  crab:          { color: 0x22bbaa, size: 9,  baseHp: 60,  baseDmg: 12, speed: 65,  aggroRange: 80,  xpValue: 14, knockbackMultiplier: 1.1, behaviour: 'sidestep' },
  wisp:          { color: 0x44ffee, size: 7,  baseHp: 110, baseDmg: 28, speed: 72,  aggroRange: 100, xpValue: 24, knockbackMultiplier: 0.8, behaviour: 'charm', projectileColor: 0x00ffff },
  raider:        { color: 0x3355bb, size: 9,  baseHp: 140, baseDmg: 32, speed: 50,  aggroRange: 90,  xpValue: 26, knockbackMultiplier: 0.6, behaviour: 'block' },
  // Ice Caverns enemies
  ice_elemental: { color: 0x44aaff, size: 8,  baseHp: 90,  baseDmg: 22, speed: 55,  aggroRange: 110, xpValue: 26, knockbackMultiplier: 0.6, behaviour: 'ranged', projectileColor: 0x00eeff },
  frost_wolf:    { color: 0xccddee, size: 9,  baseHp: 75,  baseDmg: 18, speed: 100, aggroRange: 120, xpValue: 22, knockbackMultiplier: 1.2, behaviour: 'chase' },
  crystal_golem: { color: 0x5599bb, size: 12, baseHp: 250, baseDmg: 40, speed: 28,  aggroRange: 75,  xpValue: 35, knockbackMultiplier: 0.0, behaviour: 'tank' },
  // Volcanic Highlands enemies
  lava_slime:  { color: 0xff5500, size: 9,  baseHp: 100, baseDmg: 20, speed: 50,  aggroRange: 90,  xpValue: 30, knockbackMultiplier: 1.0, behaviour: 'chase' },
  fire_imp:    { color: 0xff2200, size: 7,  baseHp: 80,  baseDmg: 25, speed: 90,  aggroRange: 115, xpValue: 32, knockbackMultiplier: 1.1, behaviour: 'ranged', projectileColor: 0xff8800 },
  magma_golem: { color: 0xcc3300, size: 13, baseHp: 320, baseDmg: 50, speed: 25,  aggroRange: 80,  xpValue: 45, knockbackMultiplier: 0.0, behaviour: 'tank' },
  // Shadowmire Swamp enemies
  bog_crawler:  { color: 0x2d5a1f, size: 9,  baseHp: 130, baseDmg: 28, speed: 45,  aggroRange: 85,  xpValue: 38, knockbackMultiplier: 0.8, behaviour: 'chase' },
  swamp_wraith: { color: 0x6b8e5e, size: 8,  baseHp: 110, baseDmg: 32, speed: 70,  aggroRange: 120, xpValue: 42, knockbackMultiplier: 0.6, behaviour: 'ranged', projectileColor: 0x44ff66 },
  toxic_toad:   { color: 0x4a7c1f, size: 10, baseHp: 160, baseDmg: 22, speed: 55,  aggroRange: 90,  xpValue: 35, knockbackMultiplier: 1.1, behaviour: 'chase' },
  // Frostpeak Highlands enemies
  frost_elemental: { color: 0x88ccff, size: 8,  baseHp: 150, baseDmg: 35, speed: 60,  aggroRange: 115, xpValue: 50, knockbackMultiplier: 0.7, behaviour: 'ranged', projectileColor: 0x00ccff },
  snow_wolf:       { color: 0xddeeff, size: 9,  baseHp: 120, baseDmg: 28, speed: 115, aggroRange: 130, xpValue: 45, knockbackMultiplier: 1.3, behaviour: 'chase' },
  ice_archer:      { color: 0x99bbdd, size: 8,  baseHp: 110, baseDmg: 38, speed: 45,  aggroRange: 125, xpValue: 48, knockbackMultiplier: 0.9, behaviour: 'ranged_flee', projectileColor: 0x44eeff },
  // Celestial Spire enemies
  star_sentinel:   { color: 0xffd700, size: 9,  baseHp: 200, baseDmg: 45, speed: 75,  aggroRange: 140, xpValue: 95, knockbackMultiplier: 0.8, behaviour: 'ranged',      projectileColor: 0xffee44 },
  void_mage:       { color: 0x9933ff, size: 8,  baseHp: 170, baseDmg: 50, speed: 55,  aggroRange: 150, xpValue: 100, knockbackMultiplier: 0.6, behaviour: 'ranged_flee', projectileColor: 0xcc55ff },
  astral_beast:    { color: 0x66ccff, size: 11, baseHp: 250, baseDmg: 38, speed: 80,  aggroRange: 100, xpValue: 90, knockbackMultiplier: 1.2, behaviour: 'chase' },
  // Abyssal Depths enemies
  deep_angler:        { color: 0x0044aa, size: 9,  baseHp: 180, baseDmg: 42, speed: 70,  aggroRange: 130, xpValue: 110, knockbackMultiplier: 0.8, behaviour: 'ranged_flee', projectileColor: 0x00aaff },
  abyssal_leviathan:  { color: 0x002244, size: 13, baseHp: 280, baseDmg: 55, speed: 60,  aggroRange: 110, xpValue: 130, knockbackMultiplier: 1.1, behaviour: 'chase' },
  coral_golem:        { color: 0xff6644, size: 12, baseHp: 350, baseDmg: 48, speed: 25,  aggroRange: 90,  xpValue: 120, knockbackMultiplier: 0.0, behaviour: 'tank' },
  // Dragonbone Wastes enemies
  bone_revenant:  { color: 0xc8a87a, size: 10, baseHp: 220, baseDmg: 48, speed: 50,  aggroRange: 100, xpValue: 140, knockbackMultiplier: 0.9, behaviour: 'chase' },
  ashwyrm:        { color: 0xff6600, size: 9,  baseHp: 185, baseDmg: 60, speed: 80,  aggroRange: 140, xpValue: 155, knockbackMultiplier: 0.7, behaviour: 'ranged_flee', projectileColor: 0xff4400 },
  spectral_drake: { color: 0x9966cc, size: 11, baseHp: 265, baseDmg: 52, speed: 100, aggroRange: 120, xpValue: 145, knockbackMultiplier: 1.2, behaviour: 'chase' },
  // Void Sanctum enemies
  rift_walker:    { color: 0x8822dd, size: 9,  baseHp: 250, baseDmg: 55, speed: 90,  aggroRange: 130, xpValue: 160, knockbackMultiplier: 0.8, behaviour: 'phase' },
  void_sentinel:  { color: 0x5500cc, size: 10, baseHp: 220, baseDmg: 65, speed: 55,  aggroRange: 155, xpValue: 170, knockbackMultiplier: 0.6, behaviour: 'ranged_flee', projectileColor: 0xaa44ff },
  shadow_weaver:  { color: 0x330055, size: 11, baseHp: 300, baseDmg: 58, speed: 70,  aggroRange: 140, xpValue: 165, knockbackMultiplier: 1.0, behaviour: 'charm',       projectileColor: 0xff00ff },
  // Eclipsed Throne enemies
  eclipse_knight: { color: 0x553300, size: 11, baseHp: 320, baseDmg: 65, speed: 60,  aggroRange: 110, xpValue: 185, knockbackMultiplier: 0.3, behaviour: 'tank' },
  shadow_herald:  { color: 0x331100, size: 9,  baseHp: 270, baseDmg: 72, speed: 85,  aggroRange: 160, xpValue: 195, knockbackMultiplier: 0.7, behaviour: 'ranged_flee', projectileColor: 0xff6600 },
  dusk_wraith:    { color: 0x884400, size: 10, baseHp: 290, baseDmg: 68, speed: 100, aggroRange: 145, xpValue: 190, knockbackMultiplier: 0.9, behaviour: 'phase' },
  // Shattered Dominion enemies
  shattered_golem:  { color: 0x8844cc, size: 13, baseHp: 380, baseDmg: 78, speed: 28,  aggroRange: 85,  xpValue: 210, knockbackMultiplier: 0.0, behaviour: 'tank' },
  reality_fracture: { color: 0xff44ff, size: 9,  baseHp: 300, baseDmg: 82, speed: 95,  aggroRange: 165, xpValue: 225, knockbackMultiplier: 0.8, behaviour: 'ranged_flee', projectileColor: 0xff88ff },
  dominion_shade:   { color: 0x220033, size: 10, baseHp: 340, baseDmg: 75, speed: 110, aggroRange: 150, xpValue: 215, knockbackMultiplier: 1.0, behaviour: 'phase' },
  // Primordial Core enemies
  elemental_amalgam: { color: 0xff8800, size: 13, baseHp: 420, baseDmg: 88, speed: 32,  aggroRange: 90,  xpValue: 240, knockbackMultiplier: 0.1, behaviour: 'tank' },
  primordial_shard:  { color: 0x00ffcc, size: 9,  baseHp: 330, baseDmg: 95, speed: 105, aggroRange: 175, xpValue: 260, knockbackMultiplier: 0.7, behaviour: 'ranged_flee', projectileColor: 0x88ffee },
  core_sentinel:     { color: 0xff4400, size: 11, baseHp: 370, baseDmg: 90, speed: 55,  aggroRange: 120, xpValue: 250, knockbackMultiplier: 0.4, behaviour: 'block' },
  // Ethereal Nexus enemies
  nexus_guardian:  { color: 0x0066ff, size: 12, baseHp: 460, baseDmg: 92,  speed: 35,  aggroRange: 95,  xpValue: 270, knockbackMultiplier: 0.1, behaviour: 'block' },
  phase_strider:   { color: 0x44ffdd, size: 9,  baseHp: 350, baseDmg: 105, speed: 110, aggroRange: 180, xpValue: 285, knockbackMultiplier: 0.6, behaviour: 'phase' },
  energy_parasite: { color: 0x00ddff, size: 8,  baseHp: 310, baseDmg: 110, speed: 95,  aggroRange: 185, xpValue: 295, knockbackMultiplier: 0.8, behaviour: 'ranged_flee', projectileColor: 0x55eeff },
  // Twilight Citadel enemies
  twilight_sentinel: { color: 0xaa6622, size: 12, baseHp: 520, baseDmg: 118, speed: 30,  aggroRange: 90,  xpValue: 300, knockbackMultiplier: 0.0, behaviour: 'block' },
  rift_stalker:      { color: 0x8844cc, size: 9,  baseHp: 380, baseDmg: 125, speed: 120, aggroRange: 195, xpValue: 315, knockbackMultiplier: 0.6, behaviour: 'phase' },
  echo_wraith:       { color: 0xcc88ff, size: 8,  baseHp: 340, baseDmg: 132, speed: 100, aggroRange: 190, xpValue: 325, knockbackMultiplier: 0.8, behaviour: 'ranged_flee', projectileColor: 0xff88cc },
  // Oblivion Spire enemies
  spire_sentinel:  { color: 0x3322aa, size: 12, baseHp: 580, baseDmg: 138, speed: 28,  aggroRange: 92,  xpValue: 345, knockbackMultiplier: 0.0, behaviour: 'block' },
  reality_shard:   { color: 0x88ccff, size: 8,  baseHp: 430, baseDmg: 148, speed: 115, aggroRange: 200, xpValue: 360, knockbackMultiplier: 0.7, behaviour: 'ranged_flee', projectileColor: 0xffd040 },
  oblivion_wraith: { color: 0x6622bb, size: 9,  baseHp: 470, baseDmg: 158, speed: 110, aggroRange: 195, xpValue: 375, knockbackMultiplier: 0.8, behaviour: 'phase' },
  // Astral Pinnacle enemies
  astral_warden:   { color: 0x2244cc, size: 13, baseHp: 640, baseDmg: 158, speed: 26,  aggroRange: 95,  xpValue: 395, knockbackMultiplier: 0.0, behaviour: 'block' },
  cosmic_devourer: { color: 0x9922ff, size: 9,  baseHp: 510, baseDmg: 172, speed: 115, aggroRange: 200, xpValue: 420, knockbackMultiplier: 0.8, behaviour: 'phase' },
  nebula_wisp:     { color: 0x44eeff, size: 8,  baseHp: 480, baseDmg: 165, speed: 108, aggroRange: 205, xpValue: 405, knockbackMultiplier: 0.7, behaviour: 'ranged_flee', projectileColor: 0xaaffee },
};

export interface BossTypeDef {
  color: number;
  size: number;
  baseHp: number;
  baseDmg: number;
  speed: number;
  xpValue: number;
  name: string;
}

export const BOSS_TYPES: Record<BossTypeName, BossTypeDef> = {
  slime_king:       { color: 0x22cc22, size: 20, baseHp: 300,  baseDmg: 15, speed: 50, xpValue: 150,  name: 'Slime King' },
  bandit_chief:     { color: 0xff2200, size: 16, baseHp: 600,  baseDmg: 25, speed: 50, xpValue: 250,  name: 'Bandit Chief Korran' },
  archon:           { color: 0xaa44ff, size: 14, baseHp: 1200, baseDmg: 30, speed: 55, xpValue: 400,  name: 'Archon Thessar' },
  kraken:           { color: 0x114455, size: 22, baseHp: 2500, baseDmg: 40, speed: 0,  xpValue: 600,  name: 'Maw of the Deep' },
  glacial_wyrm:     { color: 0x2266aa, size: 24, baseHp: 3500, baseDmg: 45, speed: 35, xpValue: 850,  name: 'Glacial Wyrm Vorthex' },
  infernal_warden:  { color: 0xff4400, size: 22, baseHp: 5000, baseDmg: 55, speed: 40, xpValue: 1200, name: 'Infernal Warden' },
  mire_queen:       { color: 0x2a5c2a, size: 24, baseHp: 7000,  baseDmg: 65, speed: 35, xpValue: 1800, name: 'Mire Queen' },
  frost_titan:         { color: 0x3388cc, size: 26, baseHp: 10000, baseDmg: 75, speed: 30, xpValue: 2500, name: 'Frost Titan' },
  celestial_arbiter:   { color: 0xfff0aa, size: 28, baseHp: 14000, baseDmg: 90,  speed: 35, xpValue: 3500, name: 'Celestial Arbiter' },
  abyssal_kraken_lord: { color: 0x001133, size: 30, baseHp: 18000, baseDmg: 100, speed: 25, xpValue: 5000, name: 'Abyssal Kraken Lord' },
  ancient_dracolich:   { color: 0x4a2200, size: 32, baseHp: 24000, baseDmg: 115, speed: 20, xpValue: 6500, name: 'Ancient Dracolich' },
  void_architect:      { color: 0x7700ff, size: 34, baseHp: 32000, baseDmg: 130, speed: 25, xpValue: 8000, name: 'Void Architect' },
  eclipsed_king:       { color: 0xffaa00, size: 36, baseHp: 42000, baseDmg: 145, speed: 22, xpValue: 10000, name: 'The Eclipsed King' },
  the_unmaker:         { color: 0xcc00ff, size: 38, baseHp: 55000, baseDmg: 165, speed: 20, xpValue: 13000, name: 'The Unmaker' },
  genesis_flame:       { color: 0xff6600, size: 40, baseHp: 70000, baseDmg: 188, speed: 22, xpValue: 16500, name: 'The Genesis Flame' },
  nexus_overseer:      { color: 0x0044cc, size: 42, baseHp: 88000, baseDmg: 205, speed: 20, xpValue: 20000, name: 'The Nexus Overseer' },
  twilight_warden:     { color: 0xaa55ff, size: 44, baseHp: 108000, baseDmg: 225, speed: 18, xpValue: 24000, name: 'The Twilight Warden' },
  spire_keeper:        { color: 0xffd040, size: 46, baseHp: 130000, baseDmg: 248, speed: 16, xpValue: 30000, name: 'The Spire Keeper' },
  astral_sovereign:    { color: 0x88ccff, size: 48, baseHp: 155000, baseDmg: 275, speed: 14, xpValue: 36000, name: 'The Astral Sovereign' },
};

// ── Zone Configurations ───────────────────────────────────────────────────────
export interface ZoneConfig {
  id: string;
  name: string;
  biome: string;
  description: string;
  bgColor: number;
  groundColor: number;
  wallColor: number;
  accentColor: number;
  waves: number;
  enemyTypes: EnemyTypeName[];
  bossType: BossTypeName;
  minPlayerLevel: number;
  xpReward: number;
  unlockRequirement: string | null;
  /** Multiplier applied to enemy HP, damage, and XP for this zone tier. */
  difficultyMult: number;
}

// ── Status Effects ────────────────────────────────────────────────────────────

export type EffectKey = 'poison' | 'burn' | 'freeze' | 'stun';

export interface EffectDef {
  durationMs:      number;
  immunityMs:      number;
  tint:            number;
  ticks?:          number;
  tickIntervalMs?: number;
  dmgPerTick?:     number;
  speedMult?:      number; // 0 = full stop (stun), 0.5 = half (freeze)
}

export const STATUS_EFFECTS: Record<EffectKey, EffectDef> = {
  poison: { durationMs: 6000, immunityMs: 1000, tint: 0x44ee44, ticks: 3, tickIntervalMs: 2000, dmgPerTick: 5 },
  burn:   { durationMs: 4000, immunityMs: 1000, tint: 0xff7722, ticks: 2, tickIntervalMs: 2000, dmgPerTick: 10 },
  freeze: { durationMs: 3000, immunityMs: 1000, tint: 0x88ccff, speedMult: 0.5 },
  stun:   { durationMs: 1500, immunityMs: 1000, tint: 0xffffaa, speedMult: 0.0 },
} as const;

/** Which enemy melee contact applies a status effect to the player. */
export const MELEE_STATUS_ON_HIT: Partial<Record<EnemyTypeName, EffectKey>> = {
  frost_wolf:    'freeze',
  crystal_golem: 'freeze',
  mushroom:      'poison',
  lava_slime:    'burn',
  magma_golem:   'burn',
  toxic_toad:    'poison',
  snow_wolf:         'freeze',
  astral_beast:      'stun',
  abyssal_leviathan: 'poison',
  coral_golem:       'stun',
  bone_revenant:     'poison',
  spectral_drake:    'burn',
  rift_walker:       'stun',
  shadow_weaver:     'stun',
  eclipse_knight:    'burn',
  dusk_wraith:       'stun',
  core_sentinel:     'burn',
  nexus_guardian:    'freeze',
  phase_strider:     'stun',
  twilight_sentinel: 'burn',
  rift_stalker:      'stun',
  spire_sentinel:    'freeze',
  oblivion_wraith:   'stun',
  astral_warden:     'freeze',
  cosmic_devourer:   'stun',
};

/** Which enemy projectile applies a status effect to the player. */
export const PROJECTILE_STATUS_ON_HIT: Partial<Record<EnemyTypeName | BossTypeName, EffectKey>> = {
  ice_elemental:   'freeze',
  bandit:          'burn',
  glacial_wyrm:    'freeze',
  fire_imp:        'burn',
  infernal_warden: 'burn',
  frost_elemental:   'freeze',
  ice_archer:        'freeze',
  frost_titan:       'freeze',
  star_sentinel:     'stun',
  void_mage:         'stun',
  celestial_arbiter: 'stun',
  deep_angler:         'freeze',
  abyssal_kraken_lord: 'poison',
  ashwyrm:             'burn',
  ancient_dracolich:   'burn',
  void_sentinel:       'stun',
  void_architect:      'stun',
  shadow_herald:       'burn',
  eclipsed_king:       'burn',
  primordial_shard:    'burn',
  genesis_flame:       'burn',
  energy_parasite:     'freeze',
  nexus_overseer:      'stun',
  echo_wraith:         'burn',
  twilight_warden:     'stun',
  reality_shard:       'burn',
  spire_keeper:        'freeze',
  nebula_wisp:         'burn',
  astral_sovereign:    'stun',
};

export const ZONES: ZoneConfig[] = [
  {
    id: 'zone1',
    name: 'Verdant Hollow',
    biome: 'Forest',
    description: 'A mossy forest glen. Slimes and mushroom creeps lurk among ancient trees.',
    bgColor: 0x0d1f0d,
    groundColor: 0x1e5a10,
    wallColor: 0x0a2408,
    accentColor: 0x44dd44,
    waves: 3,
    enemyTypes: ['slime', 'mushroom'],
    bossType: 'slime_king',
    minPlayerLevel: 1,
    xpReward: 150,
    unlockRequirement: null,
    difficultyMult: 1.0,
  },
  {
    id: 'zone2',
    name: 'Dusty Trail',
    biome: 'Plains / Desert',
    description: 'Sun-baked crossroads. Bandits, beetles, and cactus sentries patrol the canyon.',
    bgColor: 0x2a1a08,
    groundColor: 0x5a3a10,
    wallColor: 0x3a2408,
    accentColor: 0xffaa44,
    waves: 3,
    enemyTypes: ['beetle', 'bandit', 'sentry'],
    bossType: 'bandit_chief',
    minPlayerLevel: 3,
    xpReward: 250,
    unlockRequirement: 'zone1',
    difficultyMult: 1.5,
  },
  {
    id: 'zone3',
    name: 'Ironveil Ruins',
    biome: 'Dungeon',
    description: 'Crumbling mage tower. Wraiths, golems, and cursed archers guard the archive.',
    bgColor: 0x0a0a1a,
    groundColor: 0x252540,
    wallColor: 0x080818,
    accentColor: 0xaa88ff,
    waves: 3,
    enemyTypes: ['wraith', 'golem', 'archer'],
    bossType: 'archon',
    minPlayerLevel: 5,
    xpReward: 400,
    unlockRequirement: 'zone2',
    difficultyMult: 2.0,
  },
  {
    id: 'zone4',
    name: 'Saltmarsh Harbor',
    biome: 'Ocean / Coastal',
    description: 'Storm-lashed docks. Corsairs, sea wisps, and crabs defend the sunken vault.',
    bgColor: 0x061825,
    groundColor: 0x0d3050,
    wallColor: 0x041020,
    accentColor: 0x22aacc,
    waves: 3,
    enemyTypes: ['crab', 'wisp', 'raider'],
    bossType: 'kraken',
    minPlayerLevel: 7,
    xpReward: 600,
    unlockRequirement: 'zone3',
    difficultyMult: 2.5,
  },
  {
    id: 'zone5',
    name: 'Ice Caverns',
    biome: 'Ice / Cave',
    description: 'Frozen depths beneath the world. Ice elementals, frost wolves, and crystal golems guard the lair of the Glacial Wyrm.',
    bgColor: 0x040f1a,
    groundColor: 0x0d2a42,
    wallColor: 0x020a14,
    accentColor: 0x44aaff,
    waves: 3,
    enemyTypes: ['ice_elemental', 'frost_wolf', 'crystal_golem'],
    bossType: 'glacial_wyrm',
    minPlayerLevel: 9,
    xpReward: 850,
    unlockRequirement: 'zone4',
    difficultyMult: 3.0,
  },
  {
    id: 'zone6',
    name: 'Volcanic Highlands',
    biome: 'Volcanic',
    description: 'Scorched peaks above a sea of magma. Lava slimes, fire imps, and magma golems guard the forge of the Infernal Warden.',
    bgColor: 0x1a0800,
    groundColor: 0x4a1500,
    wallColor: 0x100500,
    accentColor: 0xff5500,
    waves: 3,
    enemyTypes: ['lava_slime', 'fire_imp', 'magma_golem'],
    bossType: 'infernal_warden',
    minPlayerLevel: 11,
    xpReward: 1200,
    unlockRequirement: 'zone5',
    difficultyMult: 3.5,
  },
  {
    id: 'zone7',
    name: 'Shadowmire Swamp',
    biome: 'Swamp',
    description: 'Ancient wetlands choked with fog and decay. Bog crawlers, swamp wraiths, and toxic toads lurk in the murk, serving the dreaded Mire Queen.',
    bgColor: 0x060e04,
    groundColor: 0x1a3a12,
    wallColor: 0x030802,
    accentColor: 0x44cc44,
    waves: 3,
    enemyTypes: ['bog_crawler', 'swamp_wraith', 'toxic_toad'],
    bossType: 'mire_queen',
    minPlayerLevel: 14,
    xpReward: 1800,
    unlockRequirement: 'zone6',
    difficultyMult: 4.0,
  },
  {
    id: 'zone8',
    name: 'Frostpeak Highlands',
    biome: 'Ice / Mountain',
    description: 'Frozen peaks battered by eternal blizzards. Frost elementals, snow wolves, and ice archers guard the summit throne of the mighty Frost Titan.',
    bgColor: 0x050d1a,
    groundColor: 0x0e2a4a,
    wallColor: 0x030a12,
    accentColor: 0x88ccff,
    waves: 3,
    enemyTypes: ['frost_elemental', 'snow_wolf', 'ice_archer'],
    bossType: 'frost_titan',
    minPlayerLevel: 17,
    xpReward: 2500,
    unlockRequirement: 'zone7',
    difficultyMult: 4.5,
  },
  {
    id: 'zone9',
    name: 'Celestial Spire',
    biome: 'Sky / Celestial',
    description: 'A towering spire piercing the heavens. Star sentinels, void mages, and astral beasts guard the throne of the Celestial Arbiter.',
    bgColor: 0x050a1a,
    groundColor: 0x0a1540,
    wallColor: 0x03071a,
    accentColor: 0xaaccff,
    waves: 3,
    enemyTypes: ['star_sentinel', 'void_mage', 'astral_beast'],
    bossType: 'celestial_arbiter',
    minPlayerLevel: 20,
    xpReward: 3500,
    unlockRequirement: 'zone8',
    difficultyMult: 5.0,
  },
  {
    id: 'zone10',
    name: 'Abyssal Depths',
    biome: 'Deep-Sea / Underwater',
    description: 'A lightless trench at the bottom of the world. Deep anglers, abyssal leviathans, and coral golems serve the dreaded Abyssal Kraken Lord.',
    bgColor: 0x000a14,
    groundColor: 0x001a2e,
    wallColor: 0x00060e,
    accentColor: 0x0088cc,
    waves: 3,
    enemyTypes: ['deep_angler', 'abyssal_leviathan', 'coral_golem'],
    bossType: 'abyssal_kraken_lord',
    minPlayerLevel: 23,
    xpReward: 4800,
    unlockRequirement: 'zone9',
    difficultyMult: 5.5,
  },
  {
    id: 'zone11',
    name: 'Dragonbone Wastes',
    biome: 'bone-wasteland',
    description: 'A scorched graveyard of ancient dragons. Bone revenants, ashwyrms, and spectral drakes prowl the ash-choked ruins, all in service of the undying Ancient Dracolich.',
    bgColor: 0x1a0e05,
    groundColor: 0x3d2a1a,
    wallColor: 0x140a03,
    accentColor: 0xff8c00,
    waves: 3,
    enemyTypes: ['bone_revenant', 'ashwyrm', 'spectral_drake'],
    bossType: 'ancient_dracolich',
    minPlayerLevel: 26,
    xpReward: 6000,
    unlockRequirement: 'zone10',
    difficultyMult: 6.0,
  },
  {
    id: 'zone12',
    name: 'Void Sanctum',
    biome: 'void-dimension',
    description: 'A fractured realm beyond reality. Rift walkers, void sentinels, and shadow weavers haunt the collapsing architecture of the Void Architect — master of dimensional collapse.',
    bgColor: 0x050008,
    groundColor: 0x0d001a,
    wallColor: 0x020005,
    accentColor: 0xcc33ff,
    waves: 3,
    enemyTypes: ['rift_walker', 'void_sentinel', 'shadow_weaver'],
    bossType: 'void_architect',
    minPlayerLevel: 29,
    xpReward: 7500,
    unlockRequirement: 'zone11',
    difficultyMult: 6.5,
  },
  {
    id: 'zone13',
    name: 'Eclipsed Throne',
    biome: 'eclipsed-throne',
    description: 'A shattered realm where the sun has been devoured. Eclipse knights, shadow heralds, and dusk wraiths guard the obsidian seat of The Eclipsed King — sovereign of eternal darkness.',
    bgColor: 0x0d0800,
    groundColor: 0x2d1500,
    wallColor: 0x080400,
    accentColor: 0xffaa00,
    waves: 3,
    enemyTypes: ['eclipse_knight', 'shadow_herald', 'dusk_wraith'],
    bossType: 'eclipsed_king',
    minPlayerLevel: 32,
    xpReward: 9500,
    unlockRequirement: 'zone12',
    difficultyMult: 7.0,
  },
  {
    id: 'zone14',
    name: 'Shattered Dominion',
    biome: 'shattered-dominion',
    description: 'A dimension torn apart by primordial conflict. Shattered golems, reality fractures, and dominion shades haunt the broken landscape where The Unmaker seeks to unmake all existence.',
    bgColor: 0x0a0012,
    groundColor: 0x1a0030,
    wallColor: 0x050008,
    accentColor: 0xcc00ff,
    waves: 3,
    enemyTypes: ['shattered_golem', 'reality_fracture', 'dominion_shade'],
    bossType: 'the_unmaker',
    minPlayerLevel: 35,
    xpReward: 12000,
    unlockRequirement: 'zone13',
    difficultyMult: 7.5,
  },
  {
    id: 'zone15',
    name: 'Primordial Core',
    biome: 'primordial-core',
    description: 'The raw beating heart of elemental chaos. Elemental amalgams, primordial shards, and core sentinels swarm the crystallized energy platforms where The Genesis Flame seeks to ignite a new age of destruction.',
    bgColor: 0x0d0600,
    groundColor: 0x1a0800,
    wallColor: 0x080300,
    accentColor: 0xff6600,
    waves: 3,
    enemyTypes: ['elemental_amalgam', 'primordial_shard', 'core_sentinel'],
    bossType: 'genesis_flame',
    minPlayerLevel: 38,
    xpReward: 15000,
    unlockRequirement: 'zone14',
    difficultyMult: 8.0,
  },
  {
    id: 'zone16',
    name: 'Ethereal Nexus',
    biome: 'ethereal-nexus',
    description: 'A shimmering dimension where reality dissolves into pure energy. Nexus guardians, phase striders, and energy parasites swarm the crystalline conduits where The Nexus Overseer seeks to consume all dimensional fabric.',
    bgColor: 0x010510,
    groundColor: 0x061028,
    wallColor: 0x010208,
    accentColor: 0x00aaff,
    waves: 3,
    enemyTypes: ['nexus_guardian', 'phase_strider', 'energy_parasite'],
    bossType: 'nexus_overseer',
    minPlayerLevel: 41,
    xpReward: 20000,
    unlockRequirement: 'zone15',
    difficultyMult: 8.5,
  },
  {
    id: 'zone17',
    name: 'Twilight Citadel',
    biome: 'twilight-citadel',
    description: 'A crumbling citadel suspended between twilight dimensions — half light, half shadow, ancient grandeur corrupted by dimensional instability. Twilight sentinels, rift stalkers, and echo wraiths patrol the amber-and-violet battlements where The Twilight Warden enforces an eternal dusk.',
    bgColor: 0x0c0410,
    groundColor: 0x1a0b28,
    wallColor: 0x080210,
    accentColor: 0xaa55ff,
    waves: 3,
    enemyTypes: ['twilight_sentinel', 'rift_stalker', 'echo_wraith'],
    bossType: 'twilight_warden',
    minPlayerLevel: 44,
    xpReward: 26000,
    unlockRequirement: 'zone16',
    difficultyMult: 9.0,
  },
  {
    id: 'zone18',
    name: 'Oblivion Spire',
    biome: 'oblivion-spire',
    description: 'The Oblivion Spire rises at the edge of reality — fractured celestial architecture suspended over absolute void. Spire sentinels, reality shards, and oblivion wraiths guard the crystallized platforms where The Spire Keeper channels void-gold energy to unmake the boundaries of existence.',
    bgColor: 0x030208,
    groundColor: 0x0a0820,
    wallColor: 0x020106,
    accentColor: 0xffd040,
    waves: 3,
    enemyTypes: ['spire_sentinel', 'reality_shard', 'oblivion_wraith'],
    bossType: 'spire_keeper',
    minPlayerLevel: 47,
    xpReward: 33000,
    unlockRequirement: 'zone17',
    difficultyMult: 9.5,
  },
  {
    id: 'zone19',
    name: 'Astral Pinnacle',
    biome: 'astral-pinnacle',
    description: 'The Astral Pinnacle crowns the cosmos — crystalline platforms suspended in deep space among nebulae and star clusters. Astral wardens, cosmic devourers, and nebula wisps defend the apex where The Astral Sovereign weaves the fundamental fabric of existence itself.',
    bgColor: 0x020212,
    groundColor: 0x0a0835,
    wallColor: 0x010108,
    accentColor: 0x88ccff,
    waves: 3,
    enemyTypes: ['astral_warden', 'cosmic_devourer', 'nebula_wisp'],
    bossType: 'astral_sovereign',
    minPlayerLevel: 50,
    xpReward: 36500,
    unlockRequirement: 'zone18',
    difficultyMult: 10.0,
  },
];
