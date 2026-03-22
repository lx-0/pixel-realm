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
  XP_THRESHOLDS: [80, 200, 350, 540, 760, 1020, 1320, 1660, 2040, 2500] as const,
  MAX_LEVEL: 10,
  HP_BONUS_PER_LEVEL: 20,
  DAMAGE_BONUS_PER_LEVEL: 5,
  SPEED_BONUS_PER_LEVEL: 5,
} as const;

// ── Mana ──────────────────────────────────────────────────────────────────────
export const MANA = {
  BASE: 50,
  REGEN_PER_SEC: 6,   // mana recovered per second
  ATTACK_COST: 5,     // mana used per attack swing
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
  MARKETPLACE_FEE_PCT: 0.025,
  CRAFTING_FAIL_RATE_HIGH_TIER: 0.15,
  FAST_TRAVEL_COST_PER_ZONE: 10,
  LAND_AUCTION_FLOOR: 500,
  GUILD_TREASURY_TAX_PCT: 0.05,
  LLM_QUEST_REWARD_MULTIPLIER: 1.2,
} as const;

// ── Scene Keys ────────────────────────────────────────────────────────────────
export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  LEVEL_SELECT: 'LevelSelectScene',
  GAME: 'GameScene',
  PAUSE: 'PauseScene',
  GAME_OVER: 'GameOverScene',
  CREDITS: 'CreditsScene',
  UI: 'UIScene',
} as const;

// ── Enemy Type Definitions ────────────────────────────────────────────────────
export type EnemyTypeName =
  | 'slime' | 'mushroom' | 'slime_mini'
  | 'beetle' | 'bandit' | 'sentry'
  | 'wraith' | 'golem' | 'archer'
  | 'crab' | 'wisp' | 'raider'
  | 'ice_elemental' | 'frost_wolf' | 'crystal_golem';

export type BossTypeName = 'slime_king' | 'bandit_chief' | 'archon' | 'kraken' | 'glacial_wyrm';

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
  slime_king:   { color: 0x22cc22, size: 20, baseHp: 300,  baseDmg: 15, speed: 50, xpValue: 150,  name: 'Slime King' },
  bandit_chief: { color: 0xff2200, size: 16, baseHp: 600,  baseDmg: 25, speed: 50, xpValue: 250,  name: 'Bandit Chief Korran' },
  archon:       { color: 0xaa44ff, size: 14, baseHp: 1200, baseDmg: 30, speed: 55, xpValue: 400,  name: 'Archon Thessar' },
  kraken:       { color: 0x114455, size: 22, baseHp: 2500, baseDmg: 40, speed: 0,  xpValue: 600,  name: 'Maw of the Deep' },
  glacial_wyrm: { color: 0x2266aa, size: 24, baseHp: 3500, baseDmg: 45, speed: 35, xpValue: 850,  name: 'Glacial Wyrm Vorthex' },
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
}

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
  },
];
