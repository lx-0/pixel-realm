/**
 * DungeonRoom — instanced dungeon Colyseus room.
 *
 * Lifecycle:
 *   1. Players join during a short "preparing" window (JOIN_WINDOW_MS).
 *   2. Dungeon starts: spawn room → 4 combat rooms → treasure room → boss chamber.
 *   3. Each combat room clears when all enemies die; boss room has 3 phases.
 *   4. On dungeon completion: loot is granted, per-player cooldown is recorded.
 *
 * Matchmaking:
 *   Clients join via: client.joinOrCreate("dungeon", { tier, token })
 *   Each unique tier gets a fresh instance (filterBy: ["tier"]).
 *   Max 4 players per instance.
 *
 * Party scaling:
 *   Enemy HP and loot quantity scale with party size (1-4 players).
 */

import { Room, Client } from "@colyseus/core";
import { incrementMessageCount } from "../metrics";
import { DungeonGameState, Player, Enemy, Projectile } from "./schema/DungeonState";
import { loadPlayerState, savePlayerState, initPlayerState } from "../db/players";
import { invalidateLeaderboardCache } from "../db/leaderboard";
import { getPool } from "../db/client";
import { verifyRoomToken, AuthPayload } from "../auth/middleware";
import { initSkillState, loadSkillState, saveSkillState, type SkillState } from "../db/skills";
import { computePassiveBonuses } from "../skills";
import { addItem } from "../db/inventory";
import { getPlayerGuild } from "../db/guilds";
import { recordDungeonCooldown, getDungeonCooldownRemainingDb } from "../db/cooldowns";
import { processAchievementEvent } from "../db/achievements";

// ── Constants ─────────────────────────────────────────────────────────────────

const TICK_RATE_MS        = 50;     // 20 Hz
const ATTACK_COOLDOWN_MS  = 480;
const ATTACK_RANGE_PX     = 30;
const ATTACK_DAMAGE       = 25;
const PLAYER_HIT_DAMAGE   = 10;
const PLAYER_INVINCIBILITY_MS = 900;
const MANA_REGEN_PER_SEC  = 6;
const MANA_ATTACK_COST    = 5;
const PROJECTILE_SPEED    = 100;
const PROJECTILE_LIFETIME_MS = 2000;
const RANGED_FIRE_COOLDOWN_MS = 1500;  // time between ranged shots per enemy

const JOIN_WINDOW_MS      = 15_000; // 15 s for all party members to join
const ROOM_ADVANCE_DELAY_MS = 3_000; // pause between rooms
const PERSIST_INTERVAL_MS = 30_000;

/** Per-player dungeon cooldown (default 1 hour). Configurable via env. */
export const DUNGEON_COOLDOWN_MS = Number(process.env.DUNGEON_COOLDOWN_MS ?? 3_600_000);

// ── Dungeon Themes ────────────────────────────────────────────────────────────

/**
 * Named dungeon themes with distinct enemy flavour and visual identity.
 * Tier 1 → Cursed Crypt (undead), Tier 2 → Volcanic Forge (fire),
 * Tier 3 → Frozen Depths (ice), Tier 4 → Nightmare Void (endgame).
 *
 * Tier 4 can randomly pick from any endgame theme for variety.
 */
const DUNGEON_THEMES: Record<number, string> = {
  1: "cursed_crypt",
  2: "volcanic_forge",
  3: "frozen_depths",
  4: "nightmare_void",
};

// ── Seeded RNG (mulberry32) ────────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

function makeSeededRng(seed: string): () => number {
  let s = hashString(seed);
  return function rng(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// ── Data types ────────────────────────────────────────────────────────────────

interface EnemyDef {
  type: string;
  hp: number;
  dmg: number;
  speed: number;
  aggroRange: number;
  ranged?: boolean;
  xp?: number;
}

interface BossPhase {
  hpPctThreshold: number;  // enter phase when boss HP falls below this fraction
  speedMult: number;
  damageMult: number;
  ranged: boolean;
  label: string;
}

interface BossConfig {
  type: string;
  baseHp: number;
  baseDamage: number;
  phases: BossPhase[];
  xp: number;
}

// ── Dungeon enemy pools (per tier, per combat room slot 0-3) ──────────────────

const DUNGEON_ENEMIES: Record<number, EnemyDef[][]> = {
  1: [
    // Combat room 1 (easiest)
    [
      { type: "slime",    hp: 45,  dmg: 8,  speed: 55, aggroRange: 90,  xp: 15 },
      { type: "mushroom", hp: 70,  dmg: 12, speed: 75, aggroRange: 80,  xp: 20 },
    ],
    // Combat room 2
    [
      { type: "slime",    hp: 55,  dmg: 10, speed: 60, aggroRange: 90,  xp: 18 },
      { type: "beetle",   hp: 65,  dmg: 14, speed: 90, aggroRange: 120, xp: 25 },
    ],
    // Combat room 3
    [
      { type: "mushroom", hp: 80,  dmg: 14, speed: 80, aggroRange: 80,  xp: 25 },
      { type: "bandit",   hp: 100, dmg: 22, speed: 60, aggroRange: 100, xp: 35, ranged: true },
    ],
    // Combat room 4 (hardest regular)
    [
      { type: "beetle",   hp: 90,  dmg: 18, speed: 90, aggroRange: 120, xp: 35 },
      { type: "bandit",   hp: 120, dmg: 28, speed: 65, aggroRange: 110, xp: 45, ranged: true },
    ],
  ],
  2: [
    [
      { type: "wraith",   hp: 110, dmg: 25, speed: 70, aggroRange: 110, xp: 45 },
      { type: "archer",   hp: 90,  dmg: 28, speed: 50, aggroRange: 120, xp: 40, ranged: true },
    ],
    [
      { type: "wraith",   hp: 130, dmg: 28, speed: 75, aggroRange: 110, xp: 55 },
      { type: "golem",    hp: 280, dmg: 42, speed: 35, aggroRange: 90,  xp: 70 },
    ],
    [
      { type: "golem",    hp: 300, dmg: 45, speed: 35, aggroRange: 90,  xp: 80 },
      { type: "archer",   hp: 110, dmg: 32, speed: 55, aggroRange: 120, xp: 50, ranged: true },
    ],
    [
      { type: "raider",   hp: 200, dmg: 40, speed: 60, aggroRange: 100, xp: 70 },
      { type: "wisp",     hp: 150, dmg: 35, speed: 80, aggroRange: 110, xp: 60, ranged: true },
    ],
  ],
  3: [
    [
      { type: "crystal_golem",   hp: 320, dmg: 50, speed: 32, aggroRange: 85,  xp: 90 },
      { type: "ice_elemental",   hp: 130, dmg: 30, speed: 62, aggroRange: 120, xp: 65, ranged: true },
    ],
    [
      { type: "frost_wolf",      hp: 110, dmg: 25, speed: 115, aggroRange: 130, xp: 55 },
      { type: "crystal_golem",   hp: 350, dmg: 55, speed: 32,  aggroRange: 85,  xp: 95 },
    ],
    [
      { type: "ice_elemental",   hp: 150, dmg: 35, speed: 65, aggroRange: 120, xp: 75, ranged: true },
      { type: "frost_wolf",      hp: 130, dmg: 28, speed: 120, aggroRange: 130, xp: 60 },
    ],
    [
      { type: "crystal_golem",   hp: 380, dmg: 60, speed: 35, aggroRange: 90,  xp: 100 },
      { type: "ice_elemental",   hp: 160, dmg: 38, speed: 68, aggroRange: 120, xp: 80,  ranged: true },
      { type: "frost_wolf",      hp: 140, dmg: 30, speed: 125, aggroRange: 130, xp: 65 },
    ],
  ],
};

// ── Boss configs (per tier) ────────────────────────────────────────────────────

const BOSS_CONFIGS: Record<number, BossConfig> = {
  1: {
    type: "dungeon_keeper",
    baseHp: 1200,
    baseDamage: 30,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: false, label: "Awakened" },
      { hpPctThreshold: 0.66, speedMult: 1.3, damageMult: 1.5, ranged: false, label: "Enraged" },
      { hpPctThreshold: 0.33, speedMult: 1.6, damageMult: 2.0, ranged: true,  label: "Frenzied" },
    ],
    xp: 500,
  },
  2: {
    type: "shadow_warden",
    baseHp: 2000,
    baseDamage: 45,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: true,  label: "Shadow Form" },
      { hpPctThreshold: 0.66, speedMult: 1.4, damageMult: 1.6, ranged: true,  label: "Void Surge" },
      { hpPctThreshold: 0.33, speedMult: 1.8, damageMult: 2.2, ranged: false, label: "Berserker Rage" },
    ],
    xp: 900,
  },
  3: {
    type: "abyssal_overlord",
    baseHp: 3200,
    baseDamage: 65,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: false, label: "Dormant" },
      { hpPctThreshold: 0.66, speedMult: 1.5, damageMult: 1.8, ranged: true,  label: "Awakening" },
      { hpPctThreshold: 0.33, speedMult: 2.0, damageMult: 2.5, ranged: true,  label: "Transcended" },
    ],
    xp: 1500,
  },
};

// ── Tier 4 (Nightmare) enemy pools — endgame zone enemies ─────────────────────
// Extends DUNGEON_ENEMIES at runtime to avoid re-declaring the const.

(DUNGEON_ENEMIES as Record<number, EnemyDef[][]>)[4] = [
  // Combat slot 0 — zone 10/11 enemies
  [
    { type: "deep_angler",       hp: 500,  dmg: 80,  speed: 55, aggroRange: 110, xp: 140 },
    { type: "abyssal_leviathan", hp: 700,  dmg: 90,  speed: 40, aggroRange: 90,  xp: 160 },
  ],
  // Combat slot 1 — zone 12/13 enemies
  [
    { type: "rift_walker",    hp: 450, dmg: 85,  speed: 70, aggroRange: 120, xp: 150, ranged: true },
    { type: "eclipse_knight", hp: 600, dmg: 95,  speed: 55, aggroRange: 100, xp: 170 },
  ],
  // Combat slot 2 — zone 14/15 enemies
  [
    { type: "shattered_golem",   hp: 900,  dmg: 100, speed: 30, aggroRange: 85,  xp: 190 },
    { type: "elemental_amalgam", hp: 650,  dmg: 88,  speed: 60, aggroRange: 110, xp: 175, ranged: true },
  ],
  // Combat slot 3 — zone 16-18 enemies (hardest regular)
  [
    { type: "nexus_guardian",    hp: 800, dmg: 110, speed: 65, aggroRange: 120, xp: 200, ranged: true },
    { type: "twilight_sentinel", hp: 750, dmg: 105, speed: 60, aggroRange: 115, xp: 195 },
    { type: "spire_sentinel",    hp: 850, dmg: 115, speed: 50, aggroRange: 100, xp: 210 },
  ],
];

// ── Endgame boss pool (tier 4) — boss randomly selected per dungeon instance ──

const ENDGAME_BOSS_POOL: BossConfig[] = [
  {
    type: "abyssal_kraken_lord",
    baseHp: 8000, baseDamage: 120,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: false, label: "Submerged" },
      { hpPctThreshold: 0.66, speedMult: 1.4, damageMult: 1.7, ranged: true,  label: "Tentacle Fury" },
      { hpPctThreshold: 0.33, speedMult: 1.9, damageMult: 2.3, ranged: true,  label: "Abyssal Wrath" },
    ],
    xp: 3500,
  },
  {
    type: "ancient_dracolich",
    baseHp: 9000, baseDamage: 135,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: true,  label: "Dormant" },
      { hpPctThreshold: 0.66, speedMult: 1.5, damageMult: 1.8, ranged: true,  label: "Undead Surge" },
      { hpPctThreshold: 0.33, speedMult: 2.0, damageMult: 2.5, ranged: false, label: "Lich Rage" },
    ],
    xp: 4000,
  },
  {
    type: "void_architect",
    baseHp: 10000, baseDamage: 145,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: true,  label: "Blueprint Phase" },
      { hpPctThreshold: 0.66, speedMult: 1.5, damageMult: 1.9, ranged: true,  label: "Void Rift" },
      { hpPctThreshold: 0.33, speedMult: 2.1, damageMult: 2.6, ranged: true,  label: "Unraveling" },
    ],
    xp: 4500,
  },
  {
    type: "the_unmaker",
    baseHp: 11000, baseDamage: 155,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: false, label: "Constructing" },
      { hpPctThreshold: 0.66, speedMult: 1.6, damageMult: 2.0, ranged: true,  label: "Unmaking" },
      { hpPctThreshold: 0.33, speedMult: 2.2, damageMult: 2.8, ranged: true,  label: "Total Erasure" },
    ],
    xp: 5000,
  },
  {
    type: "nexus_overseer",
    baseHp: 12000, baseDamage: 165,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: true,  label: "Monitoring" },
      { hpPctThreshold: 0.66, speedMult: 1.7, damageMult: 2.1, ranged: true,  label: "Overcharge" },
      { hpPctThreshold: 0.33, speedMult: 2.3, damageMult: 3.0, ranged: true,  label: "Nexus Core Unleashed" },
    ],
    xp: 5500,
  },
  {
    type: "astral_sovereign",
    baseHp: 14000, baseDamage: 180,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: true,  label: "Celestial Form" },
      { hpPctThreshold: 0.66, speedMult: 1.8, damageMult: 2.2, ranged: true,  label: "Star Fall" },
      { hpPctThreshold: 0.33, speedMult: 2.4, damageMult: 3.2, ranged: true,  label: "Sovereign's Wrath" },
    ],
    xp: 6000,
  },
];

// ── Party HP / loot scaling ────────────────────────────────────────────────────

const PARTY_SCALE: Record<number, { hpMult: number; lootMult: number }> = {
  1: { hpMult: 1.0, lootMult: 1.0 },
  2: { hpMult: 1.5, lootMult: 1.2 },
  3: { hpMult: 2.0, lootMult: 1.4 },
  4: { hpMult: 2.5, lootMult: 1.6 },
};

// ── Dungeon loot tables ────────────────────────────────────────────────────────

const DUNGEON_LOOT: Record<number, Array<{ itemId: string; chance: number }>> = {
  1: [
    { itemId: "dungeon_gem_lesser",  chance: 0.60 },
    { itemId: "mat_bone_fragment",   chance: 0.40 },
    { itemId: "dungeon_scroll_t1",   chance: 0.15 },
    { itemId: "potion_health_large", chance: 0.30 },
  ],
  2: [
    { itemId: "dungeon_gem_greater", chance: 0.55 },
    { itemId: "mat_magic_crystal",   chance: 0.45 },
    { itemId: "dungeon_scroll_t2",   chance: 0.20 },
    { itemId: "potion_health_large", chance: 0.35 },
  ],
  3: [
    { itemId: "dungeon_gem_supreme", chance: 0.50 },
    { itemId: "dungeon_shard_void",  chance: 0.35 },
    { itemId: "dungeon_scroll_t3",   chance: 0.25 },
    { itemId: "potion_mana_large",   chance: 0.30 },
  ],
};

const BOSS_LOOT: Record<number, Array<{ itemId: string; chance: number }>> = {
  1: [
    { itemId: "boss_essence_keeper",  chance: 1.00 },
    { itemId: "dungeon_gem_lesser",   chance: 0.80 },
    { itemId: "dungeon_scroll_t1",    chance: 0.50 },
    { itemId: "sword_steel",          chance: 0.25 },
  ],
  2: [
    { itemId: "boss_essence_warden",  chance: 1.00 },
    { itemId: "dungeon_gem_greater",  chance: 0.80 },
    { itemId: "dungeon_scroll_t2",    chance: 0.60 },
    { itemId: "armor_chainmail",      chance: 0.30 },
  ],
  3: [
    { itemId: "boss_essence_overlord", chance: 1.00 },
    { itemId: "dungeon_gem_supreme",   chance: 0.80 },
    { itemId: "dungeon_shard_void",    chance: 0.60 },
    { itemId: "dungeon_scroll_t3",     chance: 0.70 },
    { itemId: "sword_void",            chance: 0.20 },
  ],
};

// Tier 4 loot — added at runtime to avoid re-declaring the consts.
(DUNGEON_LOOT as Record<number, Array<{ itemId: string; chance: number }>>)[4] = [
  { itemId: "dungeon_gem_prismatic", chance: 0.45 },
  { itemId: "mat_void_essence",      chance: 0.50 },
  { itemId: "mat_astral_dust",       chance: 0.40 },
  { itemId: "dungeon_scroll_t4",     chance: 0.30 },
  { itemId: "potion_mana_large",     chance: 0.35 },
];

(BOSS_LOOT as Record<number, Array<{ itemId: string; chance: number }>>)[4] = [
  { itemId: "boss_essence_endgame",  chance: 1.00 },
  { itemId: "dungeon_gem_prismatic", chance: 0.90 },
  { itemId: "dungeon_shard_void",    chance: 0.70 },
  { itemId: "dungeon_scroll_t4",     chance: 0.80 },
  { itemId: "weapon_void_blade",     chance: 0.25 },
  { itemId: "armor_void_plate",      chance: 0.20 },
];

/** Ranged enemy types (server-side tracking — Enemy schema has no ranged flag). */
const RANGED_TYPES = new Set<string>([
  "bandit", "archer", "wisp", "ice_elemental",
  // boss types that go ranged are handled per-phase in activeBossRanged
]);

// ── Room type definition ───────────────────────────────────────────────────────
// Layout is now procedurally generated per instance — see generateRoomLayout().
// Room types:
//   "spawn"    — no enemies, auto-advance after 3 s
//   "combat"   — standard wave of enemies
//   "arena"    — two waves: clear first to trigger harder second
//   "elite"    — 1-2 high-HP elite enemies with bonus loot
//   "treasure" — no enemies, loot burst (guaranteed 1 per dungeon)
//   "boss"     — final boss chamber with phase transitions
type RoomType = "spawn" | "combat" | "arena" | "elite" | "treasure" | "boss";

// ── Join options ───────────────────────────────────────────────────────────────

interface DungeonJoinOptions {
  tier?: number;
  playerName?: string;
  token?: string;
}

interface MoveMessage    { x: number; y: number; facingX: number; facingY: number }
interface ChatMessage    { text: string }
interface PartyChatMessage { text: string }
interface PartyInviteMessage  { targetSessionId: string }
interface PartyRespondMessage { accept: boolean }
interface PartyKickMessage    { targetSessionId: string }
interface PartyLootModeMessage { mode: "round_robin" | "need_greed" }
interface LootRollVoteMessage  { rollId: string; choice: "need" | "greed" | "pass" }

/** Tracks an in-flight need/greed loot roll. */
interface LootRoll {
  rollId: string;
  items: string[];
  voterSessionIds: string[];
  votes: Map<string, { choice: "need" | "greed" | "pass"; roll: number }>;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

// In-memory party state (mirrors ZoneRoom)
interface PartyData {
  id: string;
  leaderSessionId: string;
  memberSessionIds: string[];
  lootMode: "round_robin" | "need_greed";
  roundRobinIndex: number;
}

const PARTY_XP_RANGE = 80;

// ── Utility ───────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx; const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
function uid(): string { return Math.random().toString(36).slice(2, 10); }

// ── Session → userId map (module-level, matches ZoneRoom's pattern) ───────────
const dungeonSessionUserMap = new Map<string, string>();

// ── Room ──────────────────────────────────────────────────────────────────────

export class DungeonRoom extends Room<DungeonGameState> {
  maxClients = 4;

  private lastTick = 0;

  // RNG for procedural layout (seeded on create)
  private rng!: () => number;

  // Procedurally generated room sequence for this instance
  private roomLayout: RoomType[] = [];

  // Arena-room wave tracking (reset per arena room)
  private arenaCurrentWave = 0;
  private arenaMaxWaves    = 2;

  // Skill state per session
  private skillStateMap = new Map<string, SkillState>();
  private skillCooldowns = new Map<string, Record<string, number>>();

  // Party state
  private parties     = new Map<string, PartyData>();
  private playerParty = new Map<string, string>();
  private partyInvites = new Map<string, string>();

  // Per-enemy last ranged shot timestamp (enemyId → ms)
  private lastRangedShot = new Map<string, number>();

  // Wipe state
  private wipeHandled = false;

  // Active need/greed loot rolls (rollId → roll state)
  private activeRolls = new Map<string, LootRoll>();

  // Boss state (set when entering boss room)
  private bossConfig: BossConfig | null = null;
  private bossId: string | null = null;
  private bossCurrentPhase = 0;
  private activeBossRanged = false;

  // Combat room slot index (which of the 4 combat rooms we're on)
  private combatRoomSlot = 0;

  // ── Auth ─────────────────────────────────────────────────────────────────────

  async onAuth(_client: Client, options: DungeonJoinOptions): Promise<AuthPayload> {
    return verifyRoomToken(options.token);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  onCreate(options: DungeonJoinOptions) {
    this.setState(new DungeonGameState());

    const tier = Math.max(1, Math.min(4, Number(options?.tier ?? 1)));
    this.state.tier = tier;

    // Generate a seed from tier + timestamp for reproducibility
    const seed = `dungeon-t${tier}-${Date.now()}`;
    this.state.seed = seed;
    this.rng = makeSeededRng(seed);

    // Procedurally generate the room sequence for this instance
    this.roomLayout = this.generateRoomLayout();

    this.state.totalRooms  = this.roomLayout.length;
    this.state.currentRoom = 0;
    this.state.roomType    = this.roomLayout[0];

    // Set dungeon theme
    this.state.dungeonTheme = DUNGEON_THEMES[tier] ?? "cursed_crypt";

    // For tier 4, pick a random endgame boss from the pool
    let bossType: string;
    if (tier >= 4) {
      const poolIdx = Math.floor(this.rng() * ENDGAME_BOSS_POOL.length);
      bossType = ENDGAME_BOSS_POOL[poolIdx].type;
    } else {
      bossType = BOSS_CONFIGS[tier]?.type ?? "";
    }
    this.state.bossType     = bossType;
    this.state.dungeonState = "preparing";

    // Register message handlers
    this.onMessage("move",       (c, m: MoveMessage)     => this.handleMove(c, m));
    this.onMessage("attack",     (c)                      => this.handleAttack(c));
    this.onMessage("chat",       (c, m: ChatMessage)      => this.handleChat(c, m));
    this.onMessage("party_invite",    (c, m: PartyInviteMessage)   => this.handlePartyInvite(c, m));
    this.onMessage("party_respond",   (c, m: PartyRespondMessage)  => this.handlePartyRespond(c, m));
    this.onMessage("party_leave",     (c)                          => this.handlePartyLeave(c));
    this.onMessage("party_kick",      (c, m: PartyKickMessage)     => this.handlePartyKick(c, m));
    this.onMessage("party_loot_mode", (c, m: PartyLootModeMessage) => this.handlePartyLootMode(c, m));
    this.onMessage("party_chat",      (c, m: PartyChatMessage)     => this.handlePartyChat(c, m));
    this.onMessage("loot_roll_vote",  (c, m: LootRollVoteMessage)  => this.handleLootRollVote(c, m));

    // Count every incoming WS message for /metrics
    this.onMessage("*", () => { incrementMessageCount(); });

    // Game loop
    this.lastTick = Date.now();
    this.clock.setInterval(() => this.tick(), TICK_RATE_MS);

    // Periodic persistence
    this.clock.setInterval(() => this.persistAllPlayers(), PERSIST_INTERVAL_MS);

    // After join window, start the dungeon with however many players joined
    this.clock.setTimeout(() => this.beginDungeon(), JOIN_WINDOW_MS);

    console.log(`[DungeonRoom] created tier-${tier} instance ${this.roomId} seed=${seed} rooms=${this.roomLayout.length}`);
  }

  async onJoin(client: Client, options: DungeonJoinOptions) {
    const auth = client.auth as AuthPayload;
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options?.playerName ?? auth?.username ?? "Hero";

    // Tier 4 (Nightmare) requires level 40+
    if (this.state.tier >= 4) {
      const userId = auth?.userId;
      if (userId) {
        try {
          const saved = await import("../db/players").then(m => m.loadPlayerState(userId));
          if (saved && saved.level < 40) {
            client.error(403, "Nightmare dungeon requires level 40+");
            return;
          }
        } catch { /* non-fatal — allow entry if check fails */ }
      }
    }

    // Spawn near center
    player.x = 140 + this.rng() * 40;
    player.y = 80  + this.rng() * 20;

    this.state.players.set(client.sessionId, player);

    const userId = auth?.userId;
    if (userId) {
      dungeonSessionUserMap.set(client.sessionId, userId);
      try {
        await initPlayerState(userId);
        const saved = await loadPlayerState(userId);
        if (saved) {
          player.hp      = saved.hp;
          player.maxHp   = saved.maxHp;
          player.mana    = saved.mana;
          player.maxMana = saved.maxMana;
          player.level   = saved.level;
          player.xp      = saved.xp;
        }
        const skillState = await initSkillState(userId);
        this.skillStateMap.set(client.sessionId, skillState);
        this.skillCooldowns.set(client.sessionId, {});
        this.applySkillPassives(player, skillState);
        this.syncSkillState(player, skillState);

        try {
          const guildInfo = await getPlayerGuild(userId);
          if (guildInfo) {
            player.guildId  = guildInfo.guildId;
            player.guildTag = `[${guildInfo.guildTag}]`;
          }
        } catch { /* non-fatal */ }

        // Inform client of cooldown status so UI can track it
        const remaining = await getDungeonCooldownRemainingDb(userId).catch(() => 0);
        client.send("dungeon_cooldown", { remainingMs: remaining, totalMs: DUNGEON_COOLDOWN_MS });
      } catch (err) {
        console.warn(`[DungeonRoom] Failed to load state for ${userId}:`, (err as Error).message);
      }
    }

    console.log(`[DungeonRoom] ${client.sessionId} (${auth?.username}) joined tier-${this.state.tier} dungeon (${this.clients.length}/${this.maxClients})`);
  }

  async onLeave(client: Client, consented: boolean) {
    this.removeFromParty(client.sessionId);
    await this.persistPlayer(client.sessionId);
    this.skillStateMap.delete(client.sessionId);
    this.skillCooldowns.delete(client.sessionId);
    dungeonSessionUserMap.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(`[DungeonRoom] ${client.sessionId} left (consented=${consented})`);
  }

  async onDispose() {
    await this.persistAllPlayers();
    console.log(`[DungeonRoom] disposing room ${this.roomId}`);
  }

  // ── Procedural Layout Generator ───────────────────────────────────────────────

  /**
   * Generate a variable-length room sequence using the seeded RNG.
   * Structure: spawn → [3-6 middle rooms, shuffled] → boss
   * Middle room types and their approximate weights:
   *   combat   40% — standard wave
   *   arena    25% — two-wave gauntlet
   *   elite    15% — 1-2 elite enemies
   *   treasure 20% — bonus loot (always at least 1 guaranteed)
   */
  private generateRoomLayout(): RoomType[] {
    const middleCount = 3 + Math.floor(this.rng() * 4); // 3-6 middle rooms
    const middle: Array<"combat" | "arena" | "elite" | "treasure"> = ["treasure"]; // 1 guaranteed

    for (let i = 0; i < middleCount - 1; i++) {
      const roll = this.rng();
      if      (roll < 0.40) middle.push("combat");
      else if (roll < 0.65) middle.push("arena");
      else if (roll < 0.80) middle.push("elite");
      else                  middle.push("treasure");
    }

    // Fisher-Yates shuffle of middle rooms
    for (let i = middle.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [middle[i], middle[j]] = [middle[j], middle[i]];
    }

    const layout: RoomType[] = ["spawn", ...middle, "boss"];
    console.log(`[DungeonRoom] generated layout (${layout.length} rooms): ${layout.join(" → ")}`);
    return layout;
  }

  // ── Dungeon Flow ──────────────────────────────────────────────────────────────

  private beginDungeon() {
    if (this.state.dungeonState !== "preparing") return;

    const partySize = Math.max(1, Math.min(4, this.clients.length));
    this.state.partySize = partySize;
    console.log(`[DungeonRoom] beginning dungeon tier-${this.state.tier} with ${partySize} player(s)`);

    this.broadcast("dungeon_start", { tier: this.state.tier, partySize });
    this.enterRoom(0);
  }

  /** Transition to the given room index. */
  private enterRoom(roomIndex: number) {
    if (roomIndex >= this.roomLayout.length) {
      this.completeDungeon();
      return;
    }

    this.state.currentRoom = roomIndex;
    const roomType = this.roomLayout[roomIndex];
    this.state.roomType    = roomType;
    this.state.dungeonState = "room_active";

    this.broadcast("room_enter", { room: roomIndex, type: roomType, total: this.roomLayout.length });

    switch (roomType) {
      case "spawn":
        // No enemies — auto-advance after a short pause
        this.clock.setTimeout(() => this.advanceRoom(), ROOM_ADVANCE_DELAY_MS);
        break;
      case "combat":
        this.spawnCombatRoom();
        break;
      case "arena":
        this.arenaCurrentWave = 0;
        this.arenaMaxWaves    = 2;
        this.spawnArenaWave(1);
        break;
      case "elite":
        this.spawnEliteRoom();
        break;
      case "treasure":
        this.grantTreasureRoomLoot();
        this.clock.setTimeout(() => this.advanceRoom(), ROOM_ADVANCE_DELAY_MS);
        break;
      case "boss":
        this.spawnBoss();
        break;
    }
  }

  private advanceRoom() {
    this.enterRoom(this.state.currentRoom + 1);
  }

  // ── Combat Room ───────────────────────────────────────────────────────────────

  private spawnCombatRoom() {
    const slot = this.combatRoomSlot;
    this.combatRoomSlot = Math.min(this.combatRoomSlot + 1, 3);

    const tier = this.state.tier;
    const enemyPool = (DUNGEON_ENEMIES[tier] ?? DUNGEON_ENEMIES[1])[slot];
    const scale = PARTY_SCALE[this.state.partySize] ?? PARTY_SCALE[1];

    // Enemy count: 3 base + slot (3, 4, 5, 6) scaled by party
    const baseCount = 3 + slot;
    const count = Math.round(baseCount * (0.75 + this.state.partySize * 0.25));

    for (let i = 0; i < count; i++) {
      const def = enemyPool[Math.floor(this.rng() * enemyPool.length)];
      const enemy = new Enemy();
      enemy.id        = uid();
      enemy.type      = def.type;
      enemy.hp        = Math.round(def.hp * scale.hpMult);
      enemy.maxHp     = enemy.hp;
      enemy.damage    = def.dmg;
      enemy.speed     = def.speed;
      enemy.aggroRange = def.aggroRange;
      enemy.aiState   = "patrol";
      enemy.spawnedAt = Date.now();

      // Spread around room edges
      const edge = Math.floor(this.rng() * 4);
      switch (edge) {
        case 0: enemy.x = this.rng() * 320; enemy.y = 10;  break;
        case 1: enemy.x = this.rng() * 320; enemy.y = 170; break;
        case 2: enemy.x = 10;  enemy.y = this.rng() * 180; break;
        default: enemy.x = 310; enemy.y = this.rng() * 180; break;
      }
      enemy.patrolX = enemy.x;
      enemy.patrolY = enemy.y;

      this.state.enemies.set(enemy.id, enemy);
    }

    this.updateEnemiesAlive();
    console.log(`[DungeonRoom] combat room ${this.state.currentRoom} spawned ${count} enemies`);
  }

  // ── Treasure Room ─────────────────────────────────────────────────────────────

  private async grantTreasureRoomLoot() {
    const tier = this.state.tier;
    const lootTable = DUNGEON_LOOT[tier] ?? DUNGEON_LOOT[1];
    const scale = PARTY_SCALE[this.state.partySize] ?? PARTY_SCALE[1];

    // Each player gets loot rolls scaled by party
    const rollCount = Math.round(3 * scale.lootMult);

    for (const client of this.clients) {
      const grants: string[] = [];
      for (let r = 0; r < rollCount; r++) {
        for (const entry of lootTable) {
          if (this.rng() < entry.chance) {
            grants.push(entry.itemId);
          }
        }
      }
      if (grants.length > 0) {
        await this.grantLootToSession(client.sessionId, grants).catch(() => {/* best-effort */});
      }
    }

    this.broadcast("treasure_room_opened", { tier });
    console.log(`[DungeonRoom] treasure room granted loot to ${this.clients.length} players`);
  }

  // ── Arena Room (two-wave gauntlet) ────────────────────────────────────────────

  private spawnArenaWave(wave: number) {
    this.arenaCurrentWave = wave;
    const tier = this.state.tier;
    const enemyPool = (DUNGEON_ENEMIES[tier] ?? DUNGEON_ENEMIES[1]);
    // Pick a random slot from the pool for variety
    const slot = Math.floor(this.rng() * enemyPool.length);
    const pool = enemyPool[slot];
    const scale = PARTY_SCALE[this.state.partySize] ?? PARTY_SCALE[1];

    // Wave 1: normal count; wave 2: more enemies, scaled up
    const waveMult = wave === 1 ? 1.0 : 1.5;
    const baseCount = 2 + wave;
    const count = Math.round(baseCount * (0.75 + this.state.partySize * 0.25));

    for (let i = 0; i < count; i++) {
      const def = pool[Math.floor(this.rng() * pool.length)];
      const enemy = new Enemy();
      enemy.id        = uid();
      enemy.type      = def.type;
      enemy.hp        = Math.round(def.hp * scale.hpMult * waveMult);
      enemy.maxHp     = enemy.hp;
      enemy.damage    = Math.round(def.dmg * waveMult);
      enemy.speed     = def.speed;
      enemy.aggroRange = def.aggroRange;
      enemy.aiState   = "patrol";
      enemy.spawnedAt = Date.now();

      const edge = Math.floor(this.rng() * 4);
      switch (edge) {
        case 0: enemy.x = this.rng() * 320; enemy.y = 10;  break;
        case 1: enemy.x = this.rng() * 320; enemy.y = 170; break;
        case 2: enemy.x = 10;  enemy.y = this.rng() * 180; break;
        default: enemy.x = 310; enemy.y = this.rng() * 180; break;
      }
      enemy.patrolX = enemy.x;
      enemy.patrolY = enemy.y;

      this.state.enemies.set(enemy.id, enemy);
    }

    this.updateEnemiesAlive();
    this.broadcast("arena_wave", { wave, maxWaves: this.arenaMaxWaves, count });
    console.log(`[DungeonRoom] arena wave ${wave}/${this.arenaMaxWaves} spawned ${count} enemies`);
  }

  // ── Elite Room ────────────────────────────────────────────────────────────────

  private spawnEliteRoom() {
    const tier = this.state.tier;
    const enemyPool = (DUNGEON_ENEMIES[tier] ?? DUNGEON_ENEMIES[1]);
    const hardestSlot = enemyPool.length - 1; // use the strongest pool
    const pool = enemyPool[hardestSlot];
    const scale = PARTY_SCALE[this.state.partySize] ?? PARTY_SCALE[1];

    // 1-2 elite enemies with 3× HP and 1.5× damage
    const count = 1 + Math.floor(this.rng() * 2);
    for (let i = 0; i < count; i++) {
      const def = pool[Math.floor(this.rng() * pool.length)];
      const enemy = new Enemy();
      enemy.id        = uid();
      enemy.type      = def.type;
      enemy.hp        = Math.round(def.hp * scale.hpMult * 3.0);
      enemy.maxHp     = enemy.hp;
      enemy.damage    = Math.round(def.dmg * 1.5);
      enemy.speed     = Math.round(def.speed * 0.85); // slightly slower
      enemy.aggroRange = def.aggroRange + 20;          // more alert
      enemy.aiState   = "patrol";
      enemy.spawnedAt = Date.now();

      // Spawn near center for dramatic effect
      enemy.x = 120 + this.rng() * 80;
      enemy.y = 60  + this.rng() * 60;
      enemy.patrolX = enemy.x;
      enemy.patrolY = enemy.y;

      this.state.enemies.set(enemy.id, enemy);
    }

    this.updateEnemiesAlive();
    this.broadcast("elite_room_enter", { count, tier });
    console.log(`[DungeonRoom] elite room spawned ${count} elite enemies`);
  }

  // ── Boss Chamber ──────────────────────────────────────────────────────────────

  private spawnBoss() {
    const tier = this.state.tier;
    // Tier 4: randomly select from endgame boss pool using the seeded RNG
    let cfg: BossConfig;
    if (tier >= 4) {
      const poolIdx = Math.floor(this.rng() * ENDGAME_BOSS_POOL.length);
      cfg = ENDGAME_BOSS_POOL[poolIdx];
    } else {
      cfg = BOSS_CONFIGS[tier] ?? BOSS_CONFIGS[1];
    }
    this.bossConfig = cfg;

    const scale = PARTY_SCALE[this.state.partySize] ?? PARTY_SCALE[1];
    const hp = Math.round(cfg.baseHp * scale.hpMult);

    const boss = new Enemy();
    boss.id        = uid();
    boss.type      = cfg.type;
    boss.hp        = hp;
    boss.maxHp     = hp;
    boss.damage    = cfg.baseDamage;
    boss.speed     = 55;
    boss.aggroRange = 200; // aggros whole room
    boss.aiState   = "patrol";
    boss.spawnedAt = Date.now();

    // Spawn boss at far side of room
    boss.x = 260; boss.y = 90;
    boss.patrolX = 260; boss.patrolY = 90;

    this.bossId = boss.id;
    this.bossCurrentPhase = 1;
    this.state.bossPhase = 1;
    this.activeBossRanged = cfg.phases[0].ranged;

    this.state.enemies.set(boss.id, boss);
    this.updateEnemiesAlive();

    this.broadcast("boss_enter", {
      bossType: cfg.type,
      bossHp: hp,
      tier,
      phaseName: cfg.phases[0].label,
    });

    console.log(`[DungeonRoom] boss "${cfg.type}" spawned with ${hp} HP`);
  }

  /** Check for boss phase transitions based on current HP. Called on every boss hit. */
  private checkBossPhase(bossEnemy: Enemy) {
    if (!this.bossConfig) return;
    const hpPct = bossEnemy.hp / bossEnemy.maxHp;

    // Phases are ordered descending by threshold. Find the deepest phase the boss qualifies for.
    for (let i = this.bossConfig.phases.length - 1; i >= 0; i--) {
      const phase = this.bossConfig.phases[i];
      if (hpPct <= phase.hpPctThreshold && i + 1 > this.bossCurrentPhase) {
        // Transition to phase i+1 (1-indexed for clients)
        this.bossCurrentPhase = i + 1;
        this.state.bossPhase  = i + 1;
        this.activeBossRanged = phase.ranged;

        // Apply phase stats to boss entity
        bossEnemy.speed  = Math.round(55 * phase.speedMult);
        bossEnemy.damage = Math.round((this.bossConfig.baseDamage) * phase.damageMult);

        this.broadcast("boss_phase", {
          phase: this.bossCurrentPhase,
          label: phase.label,
          ranged: phase.ranged,
        });

        console.log(`[DungeonRoom] boss phase ${this.bossCurrentPhase} "${phase.label}" (${Math.round(hpPct * 100)}% HP)`);
        break;
      }
    }
  }

  // ── Dungeon Completion ────────────────────────────────────────────────────────

  private async completeDungeon() {
    this.state.dungeonState = "complete";

    const tier  = this.state.tier;
    const scale = PARTY_SCALE[this.state.partySize] ?? PARTY_SCALE[1];
    const bossLootTable = (BOSS_LOOT as Record<number, Array<{ itemId: string; chance: number }>>)[tier]
      ?? BOSS_LOOT[1];

    // Completion bonus XP: scales with tier and number of combat rooms cleared
    const combatRooms  = this.roomLayout.filter(t => t === "combat" || t === "arena" || t === "elite").length;
    const bonusXp      = Math.round(200 * tier * (combatRooms + 1));

    for (const client of this.clients) {
      // Boss loot
      const grants: string[] = [];
      for (const entry of bossLootTable) {
        if (this.rng() < entry.chance * scale.lootMult) {
          grants.push(entry.itemId);
        }
      }
      if (grants.length > 0) {
        await this.grantLootToSession(client.sessionId, grants).catch(() => {/* best-effort */});
      }

      // Bonus XP notification (client applies it to local counter)
      client.send("dungeon_bonus_xp", { amount: bonusXp });

      const userId = dungeonSessionUserMap.get(client.sessionId);
      if (userId) {
        // Persist bonus XP to DB
        await this.grantBonusXpToPlayer(userId, bonusXp).catch((err) =>
          console.warn("[DungeonRoom] Failed to grant bonus XP:", err),
        );

        // Cooldown
        await recordDungeonCooldown(userId, DUNGEON_COOLDOWN_MS).catch((err) =>
          console.warn("[DungeonRoom] Failed to persist cooldown:", err),
        );
        client.send("dungeon_cooldown", {
          remainingMs: DUNGEON_COOLDOWN_MS,
          totalMs: DUNGEON_COOLDOWN_MS,
        });

        // Achievement progress (non-fatal)
        const achieveResult = await processAchievementEvent(userId, "dungeon_completed", { tier }).catch(() => null);
        if (achieveResult?.newlyUnlocked?.length) {
          client.send("achievements_unlocked", { achievements: achieveResult.newlyUnlocked });
        }
      }
    }

    this.broadcast("dungeon_complete", { tier, bonusXp, rooms: this.roomLayout.length });
    console.log(`[DungeonRoom] dungeon tier-${tier} completed by ${this.clients.length} player(s) (bonusXp=${bonusXp})`);
  }

  /** Increment XP in player_state for dungeon completion bonus. */
  private async grantBonusXpToPlayer(userId: string, xp: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      "UPDATE player_state SET xp = xp + $2, updated_at = NOW() WHERE player_id = $1",
      [userId, xp],
    );
  }

  // ── Enemy Kill ────────────────────────────────────────────────────────────────

  private killEnemy(enemy: Enemy, killerSessionId?: string) {
    const wasBoss = enemy.id === this.bossId;
    enemy.aiState = "dead";

    if (killerSessionId) {
      this.dropDungeonLootForParty(killerSessionId, enemy, wasBoss).catch(() => {/* best-effort */});
      this.shareXpWithParty(killerSessionId, enemy, wasBoss);
      this.incrementPveKills(killerSessionId).catch(() => {/* best-effort */});
    }

    this.clock.setTimeout(() => {
      this.state.enemies.delete(enemy.id);
      this.lastRangedShot.delete(enemy.id);
      if (wasBoss) { this.bossId = null; }
      this.updateEnemiesAlive();
      this.checkRoomClear();
    }, 500);
  }

  private updateEnemiesAlive() {
    let count = 0;
    this.state.enemies.forEach((e: Enemy) => { if (e.aiState !== "dead") count++; });
    this.state.enemiesAlive = count;
  }

  private checkRoomClear() {
    if (this.state.dungeonState !== "room_active") return;
    if (this.state.enemiesAlive > 0) return;

    // Arena rooms have multiple waves — spawn next wave before clearing
    if (this.state.roomType === "arena" && this.arenaCurrentWave < this.arenaMaxWaves) {
      const nextWave = this.arenaCurrentWave + 1;
      this.clock.setTimeout(() => this.spawnArenaWave(nextWave), ROOM_ADVANCE_DELAY_MS);
      return;
    }

    this.state.dungeonState = "room_cleared";
    this.broadcast("room_cleared", { room: this.state.currentRoom });

    if (this.state.roomType === "boss") {
      this.completeDungeon();
    } else {
      this.clock.setTimeout(() => this.advanceRoom(), ROOM_ADVANCE_DELAY_MS);
    }
  }

  // ── Wipe Mechanic ─────────────────────────────────────────────────────────────

  /** Check if all players are dead. If so, trigger a party wipe. */
  private checkPartyWipe(): void {
    if (this.wipeHandled) return;
    if (this.state.dungeonState !== "room_active") return;
    let anyAlive = false;
    this.state.players.forEach((p: Player) => { if (p.hp > 0) anyAlive = true; });
    if (!anyAlive) {
      this.wipeHandled = true;
      this.handleWipe();
    }
  }

  /**
   * Party wipe: apply 5% gold loss to each player and send them back to town.
   * Per GDD: "death penalty = 5% non-equipped resource loss".
   * We interpret this as 5% of the player's current gold.
   */
  private async handleWipe(): Promise<void> {
    console.log(`[DungeonRoom] WIPE in tier-${this.state.tier} dungeon — applying penalties`);
    this.state.dungeonState = "wiped";

    const penaltyPromises = this.clients.map(async (client: Client) => {
      const userId = dungeonSessionUserMap.get(client.sessionId);
      let goldLost = 0;
      if (userId) {
        try {
          const pool = getPool();
          // Deduct 5% of current gold (floor), return how much was actually lost
          const result = await pool.query<{ gold_before: number; gold_after: number }>(
            `UPDATE player_state
              SET gold = GREATEST(0, FLOOR(gold * 0.95))
            WHERE player_id = $1
            RETURNING
              (SELECT gold FROM player_state WHERE player_id = $1) AS gold_before,
              GREATEST(0, FLOOR(gold * 0.95)) AS gold_after`,
            [userId],
          );
          if (result.rows[0]) {
            goldLost = Math.max(0, (result.rows[0].gold_before ?? 0) - (result.rows[0].gold_after ?? 0));
          }
        } catch (err) {
          console.warn("[DungeonRoom] wipe penalty failed for", userId, (err as Error).message);
        }
      }
      client.send("dungeon_wipe", { goldLost });
    });

    await Promise.allSettled(penaltyPromises);

    // Disconnect the room after a delay to give clients time to receive the message
    this.clock.setTimeout(() => this.disconnect(), 4_000);
  }

  // ── Loot ──────────────────────────────────────────────────────────────────────

  private async dropDungeonLootForParty(
    killerSessionId: string,
    _enemy: Enemy,
    isBoss: boolean,
  ): Promise<void> {
    const tier = this.state.tier;
    const lootTable = isBoss ? (BOSS_LOOT[tier] ?? BOSS_LOOT[1]) : (DUNGEON_LOOT[tier] ?? DUNGEON_LOOT[1]);
    const scale = PARTY_SCALE[this.state.partySize] ?? PARTY_SCALE[1];

    const droppedItems: string[] = [];
    for (const entry of lootTable) {
      if (this.rng() < entry.chance * scale.lootMult) {
        droppedItems.push(entry.itemId);
      }
    }
    if (droppedItems.length === 0) return;

    // Party loot distribution
    const partyId = this.playerParty.get(killerSessionId);
    const party = partyId ? this.parties.get(partyId) : null;

    if (!party || party.memberSessionIds.length < 2) {
      await this.grantLootToSession(killerSessionId, droppedItems);
      return;
    }

    const onlineMembers = party.memberSessionIds.filter(sid => this.state.players.has(sid));
    if (onlineMembers.length === 0) {
      await this.grantLootToSession(killerSessionId, droppedItems);
      return;
    }

    if (party.lootMode === "need_greed" && isBoss) {
      // Boss drops in need/greed mode → start a vote for each distinct item group
      this.startNeedGreedRoll(droppedItems, onlineMembers);
    } else if (party.lootMode === "round_robin") {
      party.roundRobinIndex = (party.roundRobinIndex + 1) % onlineMembers.length;
      await this.grantLootToSession(onlineMembers[party.roundRobinIndex], droppedItems);
    } else {
      // need_greed on non-boss enemies: round-robin for simplicity
      party.roundRobinIndex = (party.roundRobinIndex + 1) % onlineMembers.length;
      await this.grantLootToSession(onlineMembers[party.roundRobinIndex], droppedItems);
    }
  }

  /**
   * Start a need/greed roll for a set of items among party members.
   * Returns immediately; roll resolves asynchronously via votes or timeout.
   */
  private startNeedGreedRoll(items: string[], voterSessionIds: string[]): void {
    if (voterSessionIds.length === 0 || items.length === 0) return;

    const ROLL_TIMEOUT_MS = 15_000;
    const rollId = uid();

    const timeoutHandle = setTimeout(() => {
      this.resolveRoll(rollId);
    }, ROLL_TIMEOUT_MS);

    const roll: LootRoll = {
      rollId,
      items,
      voterSessionIds: [...voterSessionIds],
      votes: new Map(),
      timeoutHandle,
    };
    this.activeRolls.set(rollId, roll);

    // Notify all voters
    for (const sid of voterSessionIds) {
      this.clients.find((c: Client) => c.sessionId === sid)?.send("loot_roll_start", {
        rollId,
        items,
        timeoutMs: ROLL_TIMEOUT_MS,
      });
    }
  }

  private handleLootRollVote(client: Client, msg: LootRollVoteMessage): void {
    const roll = this.activeRolls.get(msg.rollId);
    if (!roll) return;
    if (!roll.voterSessionIds.includes(client.sessionId)) return;
    if (roll.votes.has(client.sessionId)) return; // already voted

    const rollValue = Math.floor(Math.random() * 100) + 1;
    roll.votes.set(client.sessionId, { choice: msg.choice, roll: rollValue });

    // Resolve immediately once all voters have voted
    if (roll.votes.size >= roll.voterSessionIds.length) {
      clearTimeout(roll.timeoutHandle);
      this.resolveRoll(msg.rollId);
    }
  }

  private resolveRoll(rollId: string): void {
    const roll = this.activeRolls.get(rollId);
    if (!roll) return;
    this.activeRolls.delete(rollId);
    clearTimeout(roll.timeoutHandle);

    // Determine winner: NEED > GREED > PASS; ties broken by random roll value
    let winnerSid: string | null = null;
    let winnerRoll = -1;
    let winnerChoice: "need" | "greed" | "pass" = "pass";

    const CHOICE_PRIO: Record<string, number> = { need: 2, greed: 1, pass: 0 };

    for (const [sid, vote] of roll.votes.entries()) {
      const prio = CHOICE_PRIO[vote.choice] ?? 0;
      const winPrio = CHOICE_PRIO[winnerChoice] ?? 0;
      if (prio > winPrio || (prio === winPrio && vote.roll > winnerRoll)) {
        winnerSid = sid;
        winnerRoll = vote.roll;
        winnerChoice = vote.choice;
      }
    }

    const winnerName = winnerSid
      ? (this.state.players.get(winnerSid)?.name ?? "Player")
      : null;

    const rollsSummary: Record<string, { choice: string; roll: number }> = {};
    for (const [sid, vote] of roll.votes.entries()) {
      const name = this.state.players.get(sid)?.name ?? sid;
      rollsSummary[name] = { choice: vote.choice, roll: vote.roll };
    }

    // Broadcast result to all voters
    for (const sid of roll.voterSessionIds) {
      this.clients.find((c: Client) => c.sessionId === sid)?.send("loot_roll_result", {
        rollId,
        items: roll.items,
        winnerName,
        rolls: rollsSummary,
      });
    }

    // Grant items to winner (NEED or GREED wins; PASS from all = no grant)
    if (winnerSid && winnerChoice !== "pass") {
      this.grantLootToSession(winnerSid, roll.items).catch(() => {/* best-effort */});
    }
  }

  private async grantLootToSession(sessionId: string, itemIds: string[]): Promise<void> {
    const userId = dungeonSessionUserMap.get(sessionId);
    if (!userId) return;
    for (const itemId of itemIds) {
      await addItem(userId, itemId, 1);
    }
    const c = this.clients.find((cl: Client) => cl.sessionId === sessionId);
    c?.send("loot_drop", { items: itemIds });
  }

  // ── XP sharing ────────────────────────────────────────────────────────────────

  private shareXpWithParty(killerSessionId: string, enemy: Enemy, isBoss: boolean): void {
    const tier = this.state.tier;
    const cfg = BOSS_CONFIGS[tier];

    // Look up XP from enemy defs or boss config
    let baseXp = 10;
    if (isBoss && cfg) {
      baseXp = cfg.xp;
    } else {
      outer: for (const pool of Object.values(DUNGEON_ENEMIES)) {
        for (const roomPool of pool) {
          const def = roomPool.find(d => d.type === enemy.type);
          if (def?.xp) { baseXp = def.xp; break outer; }
        }
      }
    }

    const partyId = this.playerParty.get(killerSessionId);
    const party   = partyId ? this.parties.get(partyId) : null;
    if (!party || party.memberSessionIds.length < 2) return;

    const killer = this.state.players.get(killerSessionId);
    if (!killer) return;

    const nearby = party.memberSessionIds.filter(sid => {
      const p = this.state.players.get(sid);
      return p && dist(p.x, p.y, killer.x, killer.y) <= PARTY_XP_RANGE;
    });
    if (nearby.length === 0) return;

    const sharedXp = Math.max(1, Math.floor(baseXp / nearby.length));
    for (const sid of nearby) {
      if (sid === killerSessionId) continue;
      this.clients.find((c: Client) => c.sessionId === sid)?.send("party_xp", { amount: sharedXp });
    }
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  private async persistPlayer(sessionId: string): Promise<void> {
    const userId = dungeonSessionUserMap.get(sessionId);
    if (!userId) return;
    const player = this.state.players.get(sessionId);
    if (!player) return;
    try {
      await savePlayerState(userId, {
        hp: player.hp, maxHp: player.maxHp,
        mana: player.mana, maxMana: player.maxMana,
        level: player.level, xp: player.xp,
        currentZone: `dungeon_t${this.state.tier}`,
      });
      const skillState = this.skillStateMap.get(sessionId);
      if (skillState) await saveSkillState(userId, skillState);
    } catch (err) {
      console.warn(`[DungeonRoom] Failed to save state for ${userId}:`, (err as Error).message);
    }
  }

  private async persistAllPlayers(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.state.players.forEach((_p, sid) => promises.push(this.persistPlayer(sid)));
    await Promise.allSettled(promises);
  }

  private async incrementPveKills(sessionId: string): Promise<void> {
    const userId = dungeonSessionUserMap.get(sessionId);
    if (!userId) return;
    try {
      const pool = getPool();
      await pool.query(
        "UPDATE player_state SET pve_kills = pve_kills + 1 WHERE player_id = $1",
        [userId],
      );
      invalidateLeaderboardCache("kills").catch(() => {/* non-fatal */});
    } catch (err) {
      console.warn("[DungeonRoom] Failed to increment pve_kills:", (err as Error).message);
    }
  }

  // ── Message Handlers ──────────────────────────────────────────────────────────

  private handleMove(client: Client, msg: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.x = Math.max(0, Math.min(320, msg.x));
    player.y = Math.max(0, Math.min(180, msg.y));
    player.facingX = msg.facingX;
    player.facingY = msg.facingY;
  }

  private handleAttack(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const now = Date.now();
    if (now - player.lastAttackAt < ATTACK_COOLDOWN_MS) return;
    if (player.mana < MANA_ATTACK_COST) return;

    player.lastAttackAt = now;
    player.mana = Math.max(0, player.mana - MANA_ATTACK_COST);
    player.isAttacking = true;

    this.state.enemies.forEach((enemy: Enemy) => {
      if (enemy.aiState === "dead") return;
      if (dist(player.x, player.y, enemy.x, enemy.y) > ATTACK_RANGE_PX) return;

      enemy.hp = Math.max(0, enemy.hp - ATTACK_DAMAGE);

      // Boss phase check
      if (enemy.id === this.bossId && enemy.hp > 0) {
        this.checkBossPhase(enemy);
      }

      if (enemy.hp === 0) {
        this.killEnemy(enemy, client.sessionId);
      }
    });

    this.clock.setTimeout(() => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.isAttacking = false;
    }, TICK_RATE_MS * 2);
  }

  private handleChat(client: Client, msg: ChatMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const text = String(msg.text ?? "").replace(/[\x00-\x1f]/g, "").slice(0, 140);
    if (!text) return;
    this.broadcast("chat", { sender: player.name || "Hero", text, whisper: false });
  }

  // ── Party Handlers (mirrors ZoneRoom) ─────────────────────────────────────────

  private handlePartyInvite(client: Client, msg: PartyInviteMessage) {
    const target = this.clients.find(c => c.sessionId === msg.targetSessionId);
    if (!target || target.sessionId === client.sessionId) return;
    this.partyInvites.set(target.sessionId, client.sessionId);
    const senderName = this.state.players.get(client.sessionId)?.name ?? "Player";
    target.send("party_invite", { from: client.sessionId, fromName: senderName });
  }

  private handlePartyRespond(client: Client, msg: PartyRespondMessage) {
    const inviterSid = this.partyInvites.get(client.sessionId);
    this.partyInvites.delete(client.sessionId);
    if (!inviterSid) return;

    const inviter = this.clients.find(c => c.sessionId === inviterSid);
    if (!msg.accept) {
      inviter?.send("party_declined", { by: client.sessionId });
      return;
    }

    // Join or create party
    const existingPartyId = this.playerParty.get(inviterSid);
    if (existingPartyId) {
      const party = this.parties.get(existingPartyId)!;
      party.memberSessionIds.push(client.sessionId);
      this.playerParty.set(client.sessionId, existingPartyId);
      this.syncPartyState(existingPartyId);
    } else {
      const partyId = uid();
      const party: PartyData = {
        id: partyId,
        leaderSessionId: inviterSid,
        memberSessionIds: [inviterSid, client.sessionId],
        lootMode: "round_robin",
        roundRobinIndex: 0,
      };
      this.parties.set(partyId, party);
      this.playerParty.set(inviterSid, partyId);
      this.playerParty.set(client.sessionId, partyId);

      const inviterPlayer = this.state.players.get(inviterSid);
      if (inviterPlayer) inviterPlayer.partyId = partyId, inviterPlayer.isPartyLeader = true;
      const joinerPlayer = this.state.players.get(client.sessionId);
      if (joinerPlayer) joinerPlayer.partyId = partyId, joinerPlayer.isPartyLeader = false;

      this.syncPartyState(partyId);
    }
  }

  private handlePartyLeave(client: Client) {
    this.removeFromParty(client.sessionId);
  }

  private handlePartyKick(client: Client, msg: PartyKickMessage) {
    const partyId = this.playerParty.get(client.sessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party || party.leaderSessionId !== client.sessionId) return;
    this.removeFromParty(msg.targetSessionId);
  }

  private handlePartyLootMode(client: Client, msg: PartyLootModeMessage) {
    const partyId = this.playerParty.get(client.sessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party || party.leaderSessionId !== client.sessionId) return;
    party.lootMode = msg.mode;
    this.syncPartyState(partyId);
  }

  private handlePartyChat(client: Client, msg: PartyChatMessage) {
    const partyId = this.playerParty.get(client.sessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    const text = String(msg.text ?? "").replace(/[\x00-\x1f]/g, "").slice(0, 140);
    if (!text) return;
    const senderName = this.state.players.get(client.sessionId)?.name ?? "Player";
    for (const sid of party.memberSessionIds) {
      this.clients.find((c: Client) => c.sessionId === sid)?.send("party_chat", { sender: senderName, text });
    }
  }

  private removeFromParty(sessionId: string) {
    const partyId = this.playerParty.get(sessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;

    party.memberSessionIds = party.memberSessionIds.filter(s => s !== sessionId);
    this.playerParty.delete(sessionId);

    const leavingPlayer = this.state.players.get(sessionId);
    if (leavingPlayer) { leavingPlayer.partyId = ""; leavingPlayer.isPartyLeader = false; }

    if (party.memberSessionIds.length === 0) {
      this.parties.delete(partyId);
      return;
    }

    // Transfer leadership if leader left
    if (party.leaderSessionId === sessionId) {
      party.leaderSessionId = party.memberSessionIds[0];
      const newLeader = this.state.players.get(party.leaderSessionId);
      if (newLeader) newLeader.isPartyLeader = true;
    }

    this.syncPartyState(partyId);
  }

  private syncPartyState(partyId: string) {
    const party = this.parties.get(partyId);
    if (!party) return;
    const payload = {
      partyId,
      leaderId: party.leaderSessionId,
      members: party.memberSessionIds,
      lootMode: party.lootMode,
    };
    for (const sid of party.memberSessionIds) {
      this.clients.find((c: Client) => c.sessionId === sid)?.send("party_update", payload);
    }
  }

  // ── Skill Passives ────────────────────────────────────────────────────────────

  private applySkillPassives(player: Player, skillState: SkillState): void {
    const bonuses = computePassiveBonuses(Object.keys(skillState.unlockedSkills));
    const baseHp   = 100 + (player.level - 1) * 20;
    const baseMana =  50;
    player.maxHp   = baseHp   + bonuses.maxHpFlat;
    player.maxMana = baseMana + bonuses.maxManaFlat;
    player.hp   = Math.min(player.hp,   player.maxHp);
    player.mana = Math.min(player.mana, player.maxMana);
  }

  private syncSkillState(player: Player, skillState: SkillState): void {
    player.classId        = skillState.classId;
    player.skillPoints    = skillState.skillPoints;
    player.unlockedSkills = JSON.stringify(Object.keys(skillState.unlockedSkills));
    player.hotbar         = JSON.stringify(skillState.hotbar.slice(0, 6));
  }

  // ── Game Tick ─────────────────────────────────────────────────────────────────

  private tick() {
    const now = Date.now();
    const dt  = (now - this.lastTick) / 1000;
    this.lastTick = now;

    if (this.state.dungeonState === "preparing" || this.state.dungeonState === "complete") return;

    this.tickEnemyAI(dt, now);
    this.tickProjectiles(dt, now);
    this.tickManaRegen(dt);
    this.tickStatusEffects(now);
  }

  private tickStatusEffects(now: number) {
    this.state.players.forEach((player: Player) => {
      if (player.statusFlags !== 0 && now > player.statusExpiry) {
        player.statusFlags = 0;
      }
    });
  }

  private tickManaRegen(dt: number) {
    this.state.players.forEach((player: Player) => {
      if (player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN_PER_SEC * dt);
      }
    });
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────────────

  private tickEnemyAI(dt: number, now: number) {
    this.state.enemies.forEach((enemy: Enemy) => {
      if (enemy.aiState === "dead") return;

      let nearestPlayer: Player | null = null;
      let nearestDist = Infinity;
      this.state.players.forEach((player: Player) => {
        if (player.hp <= 0) return;
        const d = dist(enemy.x, enemy.y, player.x, player.y);
        if (d < nearestDist) { nearestDist = d; nearestPlayer = player; }
      });

      const isBoss = enemy.id === this.bossId;

      if (nearestPlayer !== null && nearestDist <= enemy.aggroRange) {
        const target = nearestPlayer as Player;
        enemy.aiState = "chase";
        enemy.targetId = target.sessionId;

        // Ranged enemies: shoot projectile when in firing range; melee when close
        const isRanged = isBoss ? this.activeBossRanged : RANGED_TYPES.has(enemy.type);
        if (isRanged) {
          const lastShot = this.lastRangedShot.get(enemy.id) ?? 0;
          if (now - lastShot >= RANGED_FIRE_COOLDOWN_MS && nearestDist > 20) {
            this.spawnProjectile(enemy, target.x, target.y);
            this.lastRangedShot.set(enemy.id, now);
            // Ranged enemies keep distance
            if (nearestDist < 60) {
              // Back away slightly
              const dx = enemy.x - target.x; const dy = enemy.y - target.y;
              const d = Math.sqrt(dx*dx + dy*dy) || 1;
              enemy.x = Math.max(0, Math.min(320, enemy.x + (dx/d) * enemy.speed * dt));
              enemy.y = Math.max(0, Math.min(180, enemy.y + (dy/d) * enemy.speed * dt));
            }
          } else if (nearestDist > 80) {
            this.moveEnemyToward(enemy, target.x, target.y, dt);
          }
        } else {
          this.moveEnemyToward(enemy, target.x, target.y, dt);
          this.checkEnemyMeleeHit(enemy, target, now);
        }
      } else {
        enemy.aiState = "patrol";
        enemy.targetId = "";
        this.patrolEnemy(enemy, dt);
      }
    });
  }

  private moveEnemyToward(enemy: Enemy, tx: number, ty: number, dt: number) {
    if (enemy.speed === 0) return;
    const dx = tx - enemy.x; const dy = ty - enemy.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < 2) return;
    enemy.x = Math.max(0, Math.min(320, enemy.x + (dx/d) * enemy.speed * dt));
    enemy.y = Math.max(0, Math.min(180, enemy.y + (dy/d) * enemy.speed * dt));
  }

  private patrolEnemy(enemy: Enemy, dt: number) {
    if (enemy.speed === 0) return;
    const d = dist(enemy.x, enemy.y, enemy.patrolX, enemy.patrolY);
    if (d < 5) {
      enemy.patrolX = Math.max(0, Math.min(320, enemy.x + (this.rng() - 0.5) * 60));
      enemy.patrolY = Math.max(0, Math.min(180, enemy.y + (this.rng() - 0.5) * 60));
    }
    this.moveEnemyToward(enemy, enemy.patrolX, enemy.patrolY, dt * 0.5);
  }

  private checkEnemyMeleeHit(enemy: Enemy, player: Player, now: number) {
    if (now < player.invincibleUntil) return;
    if (dist(enemy.x, enemy.y, player.x, player.y) > 12) return;

    let dmg = enemy.damage;
    if (player.shieldAbsorb > 0) {
      const absorbed = Math.min(player.shieldAbsorb, dmg);
      player.shieldAbsorb -= absorbed;
      dmg -= absorbed;
    }
    player.hp = Math.max(0, player.hp - dmg);
    player.invincibleUntil = now + PLAYER_INVINCIBILITY_MS;

    if (player.hp === 0) {
      console.log(`[DungeonRoom] player ${player.sessionId} died in dungeon`);
      this.checkPartyWipe();
    }
  }

  // ── Projectiles ───────────────────────────────────────────────────────────────

  private spawnProjectile(enemy: Enemy, tx: number, ty: number) {
    const proj = new Projectile();
    proj.id = uid();
    proj.ownerId = enemy.id;
    proj.x = enemy.x; proj.y = enemy.y;
    const dx = tx - enemy.x; const dy = ty - enemy.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    proj.velX = (dx/d) * PROJECTILE_SPEED;
    proj.velY = (dy/d) * PROJECTILE_SPEED;
    proj.damage = enemy.damage;
    proj.expiresAt = Date.now() + PROJECTILE_LIFETIME_MS;
    this.state.projectiles.set(proj.id, proj);
  }

  private tickProjectiles(dt: number, now: number) {
    const toDelete: string[] = [];
    this.state.projectiles.forEach((proj: Projectile) => {
      if (now > proj.expiresAt) { toDelete.push(proj.id); return; }
      proj.x += proj.velX * dt;
      proj.y += proj.velY * dt;
      if (proj.x < 0 || proj.x > 320 || proj.y < 0 || proj.y > 180) {
        toDelete.push(proj.id); return;
      }
      this.state.players.forEach((player: Player) => {
        if (player.hp <= 0) return;
        if (now < player.invincibleUntil) return;
        if (dist(proj.x, proj.y, player.x, player.y) > 8) return;

        let projDmg = proj.damage;
        if (player.shieldAbsorb > 0) {
          const absorbed = Math.min(player.shieldAbsorb, projDmg);
          player.shieldAbsorb -= absorbed;
          projDmg -= absorbed;
        }
        player.hp = Math.max(0, player.hp - projDmg);
        player.invincibleUntil = now + PLAYER_INVINCIBILITY_MS;
        toDelete.push(proj.id);
        if (player.hp === 0) {
          console.log(`[DungeonRoom] player ${player.sessionId} killed by projectile`);
          this.checkPartyWipe();
        }
      });
    });
    toDelete.forEach(id => this.state.projectiles.delete(id));
  }
}
