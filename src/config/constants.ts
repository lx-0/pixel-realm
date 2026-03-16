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
  /** Cumulative XP required to reach level 2, then level 3. */
  XP_THRESHOLDS: [80, 200] as const,
  MAX_LEVEL: 3,
  HP_BONUS_PER_LEVEL: 30,
  DAMAGE_BONUS_PER_LEVEL: 8,
  SPEED_BONUS_PER_LEVEL: 10,
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
  ATTACK_RANGE_PX: 30,           // melee radius in pixels
  ATTACK_COOLDOWN_MS: 480,       // minimum ms between swings
  ATTACK_KNOCKBACK: 160,         // px/s applied to enemy on hit
  PLAYER_HIT_DAMAGE: 10,         // HP lost per enemy contact
  PLAYER_INVINCIBILITY_MS: 900,  // ms of iframes after taking a hit
  ENEMY_HP: 50,                  // base HP per enemy (scales by wave tier)
  WAVE_BASE_ENEMY_COUNT: 4,      // enemies in wave 1; +2 per additional wave
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
  GAME: 'GameScene',
  PAUSE: 'PauseScene',
  GAME_OVER: 'GameOverScene',
  UI: 'UIScene',
} as const;
