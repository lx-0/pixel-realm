// Game canvas dimensions (internal resolution — scaled up with pixel-perfect scaling)
export const CANVAS = {
  WIDTH: 320,
  HEIGHT: 180,
  SCALE: 4, // displayed at 1280x720
} as const;

// Player tuning
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

// Enemy tuning
export const ENEMIES = {
  HP_SCALE_PER_TIER: 1.5,
  AGGRO_RANGE_PX: 80,
  PATROL_SPEED: 60,
  ELITE_SPAWN_RATE: 0.10,
  BOSS_RESPAWN_MS: 24 * 60 * 60 * 1000,
  AI_REACTION_MS: 200,
} as const;

// Combat tuning
export const COMBAT = {
  ATTACK_DAMAGE: 25,             // damage per melee hit to enemy
  ATTACK_RANGE_PX: 28,           // melee range radius in pixels
  ATTACK_COOLDOWN_MS: 500,       // minimum ms between attacks
  ATTACK_KNOCKBACK: 150,         // px/s velocity applied to enemy on hit
  PLAYER_HIT_DAMAGE: 10,         // HP player loses per enemy contact
  PLAYER_INVINCIBILITY_MS: 1000, // ms of invincibility after taking a hit
  ENEMY_HP: 50,                  // base HP for each enemy
  WAVE_BASE_ENEMY_COUNT: 5,      // enemies in wave 1; +2 per additional wave
} as const;

// Economy tuning
export const ECONOMY = {
  MARKETPLACE_FEE_PCT: 0.025,
  CRAFTING_FAIL_RATE_HIGH_TIER: 0.15,
  FAST_TRAVEL_COST_PER_ZONE: 10,
  LAND_AUCTION_FLOOR: 500,
  GUILD_TREASURY_TAX_PCT: 0.05,
  LLM_QUEST_REWARD_MULTIPLIER: 1.2,
} as const;

// Scene keys
export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  UI: 'UIScene',
} as const;
