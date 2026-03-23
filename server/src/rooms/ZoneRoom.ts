import { Room, Client, Delayed } from "@colyseus/core";
import { incrementMessageCount } from "../metrics";
import { ZoneGameState, Player, Enemy, Projectile } from "./schema/GameState";
import { loadPlayerState, savePlayerState, initPlayerState } from "../db/players";
import { invalidateLeaderboardCache } from "../db/leaderboard";
import { getPool } from "../db/client";
import { getOrGenerateQuest, completeQuestForPlayer } from "../quests/db";
import { verifyRoomToken, AuthPayload } from "../auth/middleware";
import {
  getPlayerFactionReputations,
  adjustFactionReputation,
  initPlayerFactionReputations,
} from "../db/factions";
import {
  factionForZone,
  factionForEnemy,
  getStanding,
  REP_PER_KILL,
  RIVAL_REP_LOSS,
  FACTION_BY_ID,
} from "../factions";
import { executeP2PTrade, type TradeItem } from "../db/marketplace";
import { initSkillState, loadSkillState, saveSkillState, type SkillState } from "../db/skills";
import { ALL_SKILLS, SKILL_BY_ID, computePassiveBonuses, type ClassId } from "../skills";
import { addItem } from "../db/inventory";
import { getPlayerGuild } from "../db/guilds";
import { filterProfanity } from "../chat/filter";
import { isPlayerBanned, isPlayerMuted, logChat, createReport } from "../db/moderation";
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriendList,
  blockPlayer,
  unblockPlayer,
  getAcceptedFriendIds,
  isBlocked,
} from "../db/social";
import {
  getActiveWorldEvents,
  getActiveSeason,
  type WorldEventRecord,
} from "../db/content";

// ── Constants (mirrored from client constants.ts) ─────────────────────────────
const TICK_RATE_MS = 50;          // 20 Hz server tick
const ATTACK_COOLDOWN_MS = 480;
const ATTACK_RANGE_PX = 30;

// Movement speed validation
/** Client base move speed px/s (120) × sprint (1.5) + generous 40% tolerance for lag. */
const MAX_PLAYER_SPEED_PX_S = 260;
/** Max distance a player can move between server ticks (50 ms). */
const MAX_MOVE_PX_PER_TICK = (MAX_PLAYER_SPEED_PX_S / 1000) * TICK_RATE_MS * 4; // ×4 for jitter

// Reconnection window
const RECONNECT_GRACE_MS = 60_000; // 60 s to reconnect after unintentional disconnect
const ATTACK_DAMAGE = 25;
const PLAYER_HIT_DAMAGE = 10;
const PLAYER_INVINCIBILITY_MS = 900;
const MANA_REGEN_PER_SEC = 6;
const MANA_ATTACK_COST = 5;
const PROJECTILE_SPEED = 100;
const PROJECTILE_LIFETIME_MS = 2000;
const WAVE_PREP_MS = 5000;        // 5 s between waves
const BASE_ENEMY_COUNT = 4;       // enemies in wave 1; +2 per additional wave

// ── Skill buff flags (bitmask, synced to player.buffFlags) ───────────────────
const BUFF_BERSERK      = 1; // +50% dmg, +20% spd for 6 s
const BUFF_DIVINE_SHIELD = 2; // invulnerable for 3 s
const BUFF_ARCANE_SURGE = 4; // 2× skill dmg, no mana cost for 10 s

// ── Player skill range constants ──────────────────────────────────────────────
const SKILL_AoE_RADIUS = 55;  // pixels — for AoE skills
const SKILL_MELEE_RANGE = 38; // pixels — for targeted melee skills

// ── Status effect flags (bitmask, mirrors client STATUS_EFFECTS) ──────────────
const STATUS_FLAG_FREEZE = 4; // bit 2
const STATUS_FREEZE_MS   = 3000;
/** Enemy types whose melee contact applies a status flag to the player. */
const MELEE_STATUS_MAP: Record<string, { flag: number; durationMs: number }> = {
  frost_wolf:    { flag: STATUS_FLAG_FREEZE, durationMs: STATUS_FREEZE_MS },
  crystal_golem: { flag: STATUS_FLAG_FREEZE, durationMs: STATUS_FREEZE_MS },
};

// ── Crafting material loot tables (per zone) ──────────────────────────────────
/** Each entry rolls independently on enemy death. */
const ZONE_LOOT: Record<string, Array<{ itemId: string; chance: number }>> = {
  zone1: [
    { itemId: "mat_slime_gel",      chance: 0.40 },
    { itemId: "mat_leather_scraps", chance: 0.25 },
  ],
  zone2: [
    { itemId: "mat_iron_ore",       chance: 0.35 },
    { itemId: "mat_leather_scraps", chance: 0.30 },
    { itemId: "mat_bone_fragment",  chance: 0.15 },
  ],
  zone3: [
    { itemId: "mat_iron_ore",       chance: 0.30 },
    { itemId: "mat_magic_crystal",  chance: 0.20 },
    { itemId: "mat_bone_fragment",  chance: 0.25 },
  ],
  zone4: [
    { itemId: "mat_leather_scraps", chance: 0.25 },
    { itemId: "mat_magic_crystal",  chance: 0.25 },
    { itemId: "mat_bone_fragment",  chance: 0.20 },
  ],
  zone5: [
    { itemId: "mat_magic_crystal",  chance: 0.30 },
    { itemId: "mat_bone_fragment",  chance: 0.25 },
  ],
};

// Zone → enemy type tables
interface EnemyDef {
  type: string;
  hp: number;
  dmg: number;
  speed: number;
  aggroRange: number;
  ranged?: boolean;
  xp?: number;
}

const ZONE_ENEMIES: Record<string, EnemyDef[]> = {
  zone1: [
    { type: "slime",    hp: 30,  dmg: 5,  speed: 45, aggroRange: 80,  xp: 10 },
    { type: "mushroom", hp: 50,  dmg: 8,  speed: 70, aggroRange: 70,  xp: 15 },
  ],
  zone2: [
    { type: "beetle",  hp: 45,  dmg: 10, speed: 85, aggroRange: 120, xp: 18 },
    { type: "bandit",  hp: 80,  dmg: 18, speed: 55, aggroRange: 100, xp: 25, ranged: true },
    { type: "sentry",  hp: 120, dmg: 0,  speed: 0,  aggroRange: 0,   xp: 30 },
  ],
  zone3: [
    { type: "wraith",  hp: 90,  dmg: 20, speed: 65, aggroRange: 100, xp: 35 },
    { type: "golem",   hp: 200, dmg: 35, speed: 30, aggroRange: 80,  xp: 55 },
    { type: "archer",  hp: 70,  dmg: 22, speed: 40, aggroRange: 110, xp: 32, ranged: true },
  ],
  zone4: [
    { type: "crab",    hp: 60,  dmg: 12, speed: 65, aggroRange: 80,  xp: 28 },
    { type: "wisp",    hp: 110, dmg: 28, speed: 72, aggroRange: 100, xp: 45, ranged: true },
    { type: "raider",  hp: 140, dmg: 32, speed: 50, aggroRange: 90,  xp: 50 },
  ],
  zone5: [
    { type: "ice_elemental", hp: 90,  dmg: 22, speed: 55,  aggroRange: 110, xp: 48, ranged: true },
    { type: "frost_wolf",    hp: 75,  dmg: 18, speed: 100, aggroRange: 120, xp: 40 },
    { type: "crystal_golem", hp: 250, dmg: 40, speed: 28,  aggroRange: 75,  xp: 75 },
  ],
};

// ── Join options / messages ───────────────────────────────────────────────────

interface JoinOptions {
  zoneId?: string;
  playerName?: string;
  token?: string; // JWT access token — verified in onAuth
}

interface MoveMessage {
  x: number;
  y: number;
  facingX: number;
  facingY: number;
}

interface ChatMessage {
  text: string;
  whisperTo?: string; // name of target player for private messages
  guild?: boolean;    // true = send to guild channel only
}

interface QuestNpcMessage {
  npcId: string; // which quest NPC the player interacted with
}

interface QuestCompleteMessage {
  questId: string;
}

// P2P trade messages
interface TradeRequestMessage {
  targetSessionId: string; // who the initiator wants to trade with
}

interface TradeRespondMessage {
  accept: boolean; // true = accept, false = decline
}

interface TradeOfferMessage {
  // Both sides call this to lock in their side of the offer before confirming
  items: Array<{ inventoryId: string; itemId: string; quantity: number }>;
  gold: number;
}

interface TradeConfirmMessage {
  confirmed: boolean; // both must confirm to execute
}

// Crafting notify message — sent by client after a successful craft
interface CraftNotifyMessage {
  itemId: string;
  itemName: string;
}

// Party messages
interface PartyInviteMessage  { targetSessionId: string }
interface PartyRespondMessage { accept: boolean }
interface PartyKickMessage    { targetSessionId: string }
interface PartyLootModeMessage { mode: "round_robin" | "need_greed" }
interface PartyChatMessage    { text: string }

// In-memory party state per room
interface PartyData {
  id: string;
  leaderSessionId: string;
  memberSessionIds: string[];  // includes leader
  lootMode: "round_robin" | "need_greed";
  roundRobinIndex: number;     // whose turn it is for round-robin loot
}

/** Proximity radius (server coords) for shared XP distribution. */
const PARTY_XP_RANGE = 80;

// Skill messages
interface SkillUseMessage   { skillId: string }
interface SkillAllocMessage { skillId: string }
interface SkillHotbarMessage { hotbar: string[] }  // ordered array of skill ids (len ≤ 6)
interface SkillClassMessage  { classId: string }
interface SkillRespecMessage { confirm: boolean }

// Per-room pending trade state
interface PendingTrade {
  initiatorSessionId: string;
  counterpartSessionId: string;
  initiatorOffer: { items: TradeItem[]; gold: number } | null;
  counterpartOffer: { items: TradeItem[]; gold: number } | null;
  initiatorConfirmed: boolean;
  counterpartConfirmed: boolean;
}

// Need/greed loot roll state
interface LootRoll {
  items: string[];
  partySessionIds: string[];
  rolls: Map<string, "need" | "greed" | "pass">;
  timer: Delayed;
}

// Loot roll response from client
interface LootRollResponseMessage {
  rollId: string;
  choice: "need" | "greed" | "pass";
}

// Player report message
interface ReportPlayerMessage {
  reportedName: string;  // in-zone display name of the reported player
  reason?: string;       // optional short reason from reporter
}

// Emote message
interface EmoteMessage { emoteId: string }

// Social messages
interface FriendRequestMessage  { targetName: string }
interface FriendRespondMessage  { requesterName: string; accept: boolean }
interface FriendRemoveMessage   { targetName: string }
interface BlockPlayerMessage    { targetName: string }
interface UnblockPlayerMessage  { targetName: string }

// ── Chat spam constants ───────────────────────────────────────────────────────

/** Max messages allowed in the sliding window before triggering a spam-mute. */
const CHAT_RATE_MAX     = 5;
/** Sliding window size (ms). */
const CHAT_RATE_WINDOW  = 10_000;
/** Auto-mute duration (ms) after exceeding rate limit. */
const SPAM_MUTE_MS      = 30_000;

// ── Utility ───────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Room ──────────────────────────────────────────────────────────────────────

// Maps sessionId → userId for persistence lookups
const sessionUserMap = new Map<string, string>();

// Interval (ms) between automatic mid-session saves
const PERSIST_INTERVAL_MS = 30_000;

export class ZoneRoom extends Room<ZoneGameState> {
  maxClients = 16;

  private lastTick: number = 0;

  // Active P2P trades keyed by the initiator's sessionId
  private pendingTrades = new Map<string, PendingTrade>();

  // ── Skill tree state (in-memory per session) ──────────────────────────────
  /** Skill allocation state, keyed by sessionId */
  private skillStateMap = new Map<string, SkillState>();
  /** Per-player skill cooldowns: sessionId → skillId → expiresAtMs */
  private skillCooldowns = new Map<string, Record<string, number>>();

  // ── Party state (in-memory per room) ──────────────────────────────────────
  /** Parties keyed by partyId. */
  private parties = new Map<string, PartyData>();
  /** Maps sessionId → partyId. */
  private playerParty = new Map<string, string>();
  /** Pending invites: inviteeSessionId → inviterSessionId. */
  private partyInvites = new Map<string, string>();

  // ── Chat moderation state (in-memory per room) ────────────────────────────
  /** Spam window: sessionId → { count, windowStart } */
  private chatWindows  = new Map<string, { count: number; windowStart: number }>();
  /** Spam mutes: sessionId → expiry timestamp (ms) */
  private spamMutes    = new Map<string, number>();

  // ── Movement validation ────────────────────────────────────────────────────
  /** Last validated server position per session for speed-hack detection. */
  private lastPosition = new Map<string, { x: number; y: number; t: number }>();
  /** Speed-hack violation count per session (resets on clean movement). */
  private speedViolations = new Map<string, number>();

  // ── Area of Interest (AoI) ─────────────────────────────────────────────────
  /** Tracks which entity IDs each client currently considers "visible". sessionId → Set<entityId> */
  private clientVisibleEntities = new Map<string, Set<string>>();
  /** AoI tick counter — run AoI update every N game ticks. */
  private aoiTickCounter = 0;
  /** Visible radius in world units. At 320×180 the full canvas fits within 360 px diagonal,
   *  so 200 px gives a practical near-field cull for denser servers in larger future worlds. */
  private static readonly AOI_RADIUS = 200;

  // ── Need/greed loot rolls ─────────────────────────────────────────────────
  /** Active loot rolls keyed by a rollId (uid). */
  private lootRolls = new Map<string, LootRoll>();

  // ── World events + season (loaded on room creation) ───────────────────────
  private activeWorldEvents: WorldEventRecord[] = [];
  private activeSeason: { name: string; storyPromptTemplate: string } | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  // ── Auth ─────────────────────────────────────────────────────────────────────

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthPayload> {
    const payload = await verifyRoomToken(options.token);
    // Reject banned players before they enter the room
    const banned = await isPlayerBanned(payload.userId).catch(() => false);
    if (banned) throw new Error("Account banned");
    return payload;
  }

  onCreate(options: JoinOptions) {
    this.setState(new ZoneGameState());

    const zoneId = options?.zoneId ?? "zone1";
    this.state.zoneId = zoneId;
    this.state.totalWaves = 3;
    this.state.waveState = "waiting";

    // Register message handlers
    this.onMessage("move",             (client: Client, msg: MoveMessage)       => this.handleMove(client, msg));
    this.onMessage("attack",           (client: Client)                         => this.handleAttack(client));
    this.onMessage("chat",             (client: Client, msg: ChatMessage)        => this.handleChat(client, msg));
    this.onMessage("quest_npc_interact", (client: Client, msg: QuestNpcMessage) => this.handleQuestNpcInteract(client, msg));
    this.onMessage("quest_complete",   (client: Client, msg: QuestCompleteMessage) => this.handleQuestComplete(client, msg));

    // Skill tree messages
    this.onMessage("level_up",     (client: Client)                           => this.handleLevelUp(client));
    this.onMessage("skill_use",    (client: Client, msg: SkillUseMessage)    => this.handleSkillUse(client, msg));
    this.onMessage("skill_alloc",  (client: Client, msg: SkillAllocMessage)  => this.handleSkillAlloc(client, msg));
    this.onMessage("skill_hotbar", (client: Client, msg: SkillHotbarMessage) => this.handleSkillHotbar(client, msg));
    this.onMessage("skill_class",  (client: Client, msg: SkillClassMessage)  => this.handleSkillClass(client, msg));
    this.onMessage("skill_respec", (client: Client, msg: SkillRespecMessage) => this.handleSkillRespec(client, msg));

    // Crafting notify — broadcast to other players in the zone
    this.onMessage("craft_notify", (client: Client, msg: CraftNotifyMessage) => this.handleCraftNotify(client, msg));

    // Guild chat (guild members only in this zone)
    this.onMessage("guild_chat", (client: Client, msg: ChatMessage) => this.handleGuildChat(client, msg));

    // Player report — creates an abuse report record
    this.onMessage("report_player", (client: Client, msg: ReportPlayerMessage) => this.handleReportPlayer(client, msg));

    // Party messages
    this.onMessage("party_invite",    (client: Client, msg: PartyInviteMessage)   => this.handlePartyInvite(client, msg));
    this.onMessage("party_respond",   (client: Client, msg: PartyRespondMessage)  => this.handlePartyRespond(client, msg));
    this.onMessage("party_leave",     (client: Client)                             => this.handlePartyLeave(client));
    this.onMessage("party_kick",      (client: Client, msg: PartyKickMessage)     => this.handlePartyKick(client, msg));
    this.onMessage("party_loot_mode", (client: Client, msg: PartyLootModeMessage) => this.handlePartyLootMode(client, msg));
    this.onMessage("party_chat",      (client: Client, msg: PartyChatMessage)     => this.handlePartyChat(client, msg));

    // P2P trade messages
    this.onMessage("trade_request",  (client: Client, msg: TradeRequestMessage)  => this.handleTradeRequest(client, msg));
    this.onMessage("trade_respond",  (client: Client, msg: TradeRespondMessage)  => this.handleTradeRespond(client, msg));
    this.onMessage("trade_offer",    (client: Client, msg: TradeOfferMessage)    => this.handleTradeOffer(client, msg));
    this.onMessage("trade_confirm",  (client: Client, msg: TradeConfirmMessage)  => this.handleTradeConfirm(client, msg));
    this.onMessage("trade_cancel",   (client: Client)                            => this.handleTradeCancel(client));

    // Need/greed loot rolls
    this.onMessage("loot_roll_response", (client: Client, msg: LootRollResponseMessage) => this.handleLootRollResponse(client, msg));

    // Emote
    this.onMessage("emote", (client: Client, msg: EmoteMessage) => this.handleEmote(client, msg));

    // Social — friend list and block system
    this.onMessage("friend_request",  (client: Client, msg: FriendRequestMessage)  => this.handleFriendRequest(client, msg));
    this.onMessage("friend_respond",  (client: Client, msg: FriendRespondMessage)   => this.handleFriendRespond(client, msg));
    this.onMessage("friend_remove",   (client: Client, msg: FriendRemoveMessage)    => this.handleFriendRemove(client, msg));
    this.onMessage("block_player",    (client: Client, msg: BlockPlayerMessage)     => this.handleBlockPlayer(client, msg));
    this.onMessage("unblock_player",  (client: Client, msg: UnblockPlayerMessage)   => this.handleUnblockPlayer(client, msg));
    this.onMessage("friends_list",    (client: Client)                              => this.handleFriendsList(client));

    // Count every incoming WS message for /metrics
    this.onMessage("*", () => { incrementMessageCount(); });

    // Start game loop
    this.lastTick = Date.now();
    this.clock.setInterval(() => this.tick(), TICK_RATE_MS);

    // Begin first wave after prep time
    this.clock.setTimeout(() => this.startNextWave(), WAVE_PREP_MS);

    // Periodic mid-session persistence (every 30 s)
    this.clock.setInterval(() => this.persistAllPlayers(), PERSIST_INTERVAL_MS);

    // Load world events and active season (best-effort)
    Promise.all([
      getActiveWorldEvents(zoneId).catch(() => [] as WorldEventRecord[]),
      getActiveSeason().catch(() => null),
    ]).then(([events, season]) => {
      this.activeWorldEvents = events;
      this.activeSeason = season;
      if (events.length) {
        console.log(`[ZoneRoom] Loaded ${events.length} world event(s) for zone ${zoneId}`);
      }
    });

    console.log(`[ZoneRoom] created room ${this.roomId} for zone ${zoneId}`);
  }

  async onJoin(client: Client, options: JoinOptions) {
    const auth = client.auth as AuthPayload;
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options?.playerName ?? auth?.username ?? "Hero";
    // Spawn at a random position near center
    player.x = 100 + Math.random() * 120;
    player.y = 50  + Math.random() * 80;

    this.state.players.set(client.sessionId, player);
    // Seed last-known position for speed validation
    this.lastPosition.set(client.sessionId, { x: player.x, y: player.y, t: Date.now() });

    // Load persisted state using the verified userId from the JWT
    const userId = auth?.userId;
    if (userId) {
      sessionUserMap.set(client.sessionId, userId);
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
        // Load skill allocations and apply passive bonuses
        const skillState = await initSkillState(userId);
        this.skillStateMap.set(client.sessionId, skillState);
        this.skillCooldowns.set(client.sessionId, {});
        this.applySkillPassives(player, skillState);
        this.syncSkillState(player, skillState);

        // Load guild membership (best-effort — non-blocking)
        try {
          const guildInfo = await getPlayerGuild(userId);
          if (guildInfo) {
            player.guildId  = guildInfo.guildId;
            player.guildTag = `[${guildInfo.guildTag}]`;
          }
        } catch (_guildErr) {
          // Non-fatal: guild data unavailable, player continues without tag
        }

        // Load faction reputations and send to client (best-effort)
        try {
          await initPlayerFactionReputations(userId);
          const reps = await getPlayerFactionReputations(userId);
          client.send("faction_reputations", { reputations: reps });
        } catch (_factionErr) {
          // Non-fatal: faction data unavailable
        }

        // Send world events and active season to the joining player
        if (this.activeWorldEvents.length) {
          client.send("world_events", { events: this.activeWorldEvents });
        }
        if (this.activeSeason) {
          client.send("season_info", { name: this.activeSeason.name });
        }

        // Friend list — send to joining player and notify friends they're online
        try {
          const friends = await getFriendList(userId);
          client.send("friends_list", { friends });

          // Notify accepted friends who are currently in this room
          const playerName = player.name;
          const friendIds = new Set(friends.filter(f => f.status === "accepted").map(f => f.playerId));
          this.clients.forEach((other) => {
            if (other.sessionId === client.sessionId) return;
            const otherId = sessionUserMap.get(other.sessionId);
            if (otherId && friendIds.has(otherId)) {
              other.send("friend_online", { username: playerName });
            }
          });
        } catch (_socialErr) {
          // Non-fatal
        }
      } catch (err) {
        console.warn(`[ZoneRoom] Failed to load state for ${userId}:`, (err as Error).message);
      }
    }

    console.log(`[ZoneRoom] ${client.sessionId} (${auth?.username}) joined zone ${this.state.zoneId} (${this.clients.length} players)`);
  }

  async onLeave(client: Client, consented: boolean) {
    this.cancelTradesForClient(client.sessionId);

    if (!consented) {
      // Give the client RECONNECT_GRACE_MS to reconnect before cleaning up state
      console.log(`[ZoneRoom] ${client.sessionId} disconnected unexpectedly — holding state for ${RECONNECT_GRACE_MS / 1000}s`);
      const player = this.state.players.get(client.sessionId);
      if (player) player.isAttacking = false; // freeze player visually

      try {
        await this.allowReconnection(client, RECONNECT_GRACE_MS / 1000);
        // Reconnected successfully — restore tracking and continue
        this.lastPosition.set(client.sessionId, { x: player?.x ?? 160, y: player?.y ?? 90, t: Date.now() });
        console.log(`[ZoneRoom] ${client.sessionId} reconnected successfully`);
        return;
      } catch {
        // Grace period expired — fall through to normal cleanup
        console.log(`[ZoneRoom] ${client.sessionId} did not reconnect within grace period`);
      }
    }

    this.removeFromParty(client.sessionId);
    await this.persistPlayer(client.sessionId);

    // Notify friends this player went offline
    const leavingUserId = sessionUserMap.get(client.sessionId);
    const leavingPlayer = this.state.players.get(client.sessionId);
    if (leavingUserId && leavingPlayer) {
      const leavingName = leavingPlayer.name;
      try {
        const friendIds = await getAcceptedFriendIds(leavingUserId);
        this.clients.forEach((other) => {
          if (other.sessionId === client.sessionId) return;
          const otherId = sessionUserMap.get(other.sessionId);
          if (otherId && friendIds.has(otherId)) {
            other.send("friend_offline", { username: leavingName });
          }
        });
      } catch (_e) { /* non-fatal */ }
    }

    this.skillStateMap.delete(client.sessionId);
    this.skillCooldowns.delete(client.sessionId);
    this.lastPosition.delete(client.sessionId);
    this.speedViolations.delete(client.sessionId);
    sessionUserMap.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(`[ZoneRoom] ${client.sessionId} left (consented=${consented})`);
  }

  async onDispose() {
    // Persist all remaining players on room teardown
    await this.persistAllPlayers();
    console.log(`[ZoneRoom] disposing room ${this.roomId}`);
  }

  // ── Persistence Helpers ───────────────────────────────────────────────────────

  private async persistPlayer(sessionId: string): Promise<void> {
    const userId = sessionUserMap.get(sessionId);
    if (!userId) return;
    const player = this.state.players.get(sessionId);
    if (!player) return;
    try {
      await savePlayerState(userId, {
        hp: player.hp,
        maxHp: player.maxHp,
        mana: player.mana,
        maxMana: player.maxMana,
        level: player.level,
        xp: player.xp,
        currentZone: this.state.zoneId,
      });
      const skillState = this.skillStateMap.get(sessionId);
      if (skillState) {
        await saveSkillState(userId, skillState);
      }
    } catch (err) {
      console.warn(`[ZoneRoom] Failed to save state for ${userId}:`, (err as Error).message);
    }
  }

  private async persistAllPlayers(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.state.players.forEach((_player, sessionId) => {
      promises.push(this.persistPlayer(sessionId));
    });
    await Promise.allSettled(promises);
  }

  // ── Message Handlers ─────────────────────────────────────────────────────────

  private handleMove(client: Client, msg: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Clamp to world bounds
    const newX = Math.max(0, Math.min(320, msg.x));
    const newY = Math.max(0, Math.min(180, msg.y));

    // Speed-hack detection: reject moves that exceed the maximum possible distance per tick
    const last = this.lastPosition.get(client.sessionId);
    if (last) {
      const elapsed = Date.now() - last.t;
      const maxDist = (MAX_PLAYER_SPEED_PX_S / 1000) * elapsed * 1.4; // 40% lag tolerance
      const moved   = dist(last.x, last.y, newX, newY);
      if (moved > maxDist + MAX_MOVE_PX_PER_TICK) {
        const violations = (this.speedViolations.get(client.sessionId) ?? 0) + 1;
        this.speedViolations.set(client.sessionId, violations);
        console.warn(`[ZoneRoom] Speed violation #${violations} from ${client.sessionId}: moved ${moved.toFixed(1)}px in ${elapsed}ms (max ${maxDist.toFixed(1)}px)`);
        // After 5 violations, reject the move entirely (keep player at last valid pos)
        if (violations >= 5) return;
      } else {
        // Reset violation count on clean movement
        if (this.speedViolations.get(client.sessionId)) {
          this.speedViolations.set(client.sessionId, 0);
        }
      }
    }

    player.x      = newX;
    player.y      = newY;
    player.facingX = msg.facingX;
    player.facingY = msg.facingY;
    this.lastPosition.set(client.sessionId, { x: newX, y: newY, t: Date.now() });
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

    // Resolve melee hits against enemies in range
    this.state.enemies.forEach((enemy: Enemy) => {
      if (enemy.aiState === "dead") return;
      if (dist(player.x, player.y, enemy.x, enemy.y) > ATTACK_RANGE_PX) return;

      enemy.hp = Math.max(0, enemy.hp - ATTACK_DAMAGE);
      if (enemy.hp === 0) {
        this.killEnemy(enemy, client.sessionId);
      }
    });

    // Clear attacking flag after one tick
    this.clock.setTimeout(() => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.isAttacking = false;
    }, TICK_RATE_MS * 2);
  }

  /** Returns true if this session is currently spam-muted (and clears expired mutes). */
  private isSpamMuted(sessionId: string): boolean {
    const exp = this.spamMutes.get(sessionId);
    if (!exp) return false;
    if (Date.now() >= exp) { this.spamMutes.delete(sessionId); return false; }
    return true;
  }

  /**
   * Tracks message rate for the session.
   * Returns true (and applies an in-memory mute) if the rate limit is exceeded.
   */
  private checkSpamLimit(sessionId: string): boolean {
    const now = Date.now();
    const win = this.chatWindows.get(sessionId) ?? { count: 0, windowStart: now };
    if (now - win.windowStart > CHAT_RATE_WINDOW) {
      win.count = 1;
      win.windowStart = now;
    } else {
      win.count++;
    }
    this.chatWindows.set(sessionId, win);
    if (win.count > CHAT_RATE_MAX) {
      this.spamMutes.set(sessionId, now + SPAM_MUTE_MS);
      return true;
    }
    return false;
  }

  private handleChat(client: Client, msg: ChatMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Sanitise: cap text length, strip control chars
    const raw = String(msg.text ?? "").replace(/[\x00-\x1f]/g, "").slice(0, 140);
    if (!raw) return;

    const senderName = player.name || "Hero";
    const userId = sessionUserMap.get(client.sessionId);

    // Spam rate-limit check
    if (this.isSpamMuted(client.sessionId)) {
      client.send("chat", { sender: "System", text: "You are muted for spamming. Please wait.", whisper: false });
      return;
    }
    if (this.checkSpamLimit(client.sessionId)) {
      client.send("chat", { sender: "System", text: "You are sending messages too fast. Muted for 30 seconds.", whisper: false });
      return;
    }

    // Persistent mute check (admin-applied)
    if (userId) {
      isPlayerMuted(userId).then((muted) => {
        if (muted) {
          client.send("chat", { sender: "System", text: "You are muted and cannot send messages.", whisper: false });
        }
      }).catch(() => {});
      // We optimistically continue — persistent mute check is async.
      // For a stricter approach this would need to be awaited; the in-memory
      // spam-mute path already provides synchronous enforcement.
    }

    // Profanity filter
    const { filtered: text, violated } = filterProfanity(raw);

    // Log to DB (fire-and-forget)
    if (userId) {
      logChat(userId, senderName, this.state.zoneId, raw, violated).catch(() => {});
    }

    if (msg.whisperTo) {
      // Private whisper — find target in this zone room
      const targetName = String(msg.whisperTo).slice(0, 32);
      let targetClient: Client | undefined;
      this.state.players.forEach((p: Player, sid: string) => {
        if (p.name === targetName && sid !== client.sessionId) {
          targetClient = this.clients.find((c: Client) => c.sessionId === sid);
        }
      });

      if (targetClient) {
        // Block check (fire-and-forget async guard)
        const senderUserId = sessionUserMap.get(client.sessionId);
        const targetUserId = sessionUserMap.get(targetClient.sessionId);
        if (senderUserId && targetUserId) {
          isBlocked(senderUserId, targetUserId).then((blocked) => {
            if (blocked) {
              client.send("chat", { sender: "System", text: `Cannot whisper "${targetName}".`, whisper: false });
            } else {
              client.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
              targetClient!.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
            }
          }).catch(() => {
            // Fallthrough on DB error — deliver normally
            client.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
            targetClient!.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
          });
        } else {
          client.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
          targetClient.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
        }
      } else {
        // Target not found in this zone
        client.send("chat", {
          sender: "System",
          text: `Player "${targetName}" is not in this zone.`,
          whisper: false,
        });
      }
    } else {
      // Zone-wide broadcast
      this.broadcast("chat", { sender: senderName, text, whisper: false });
    }
  }

  // ── Guild Chat ────────────────────────────────────────────────────────────────

  private handleGuildChat(client: Client, msg: ChatMessage) {
    const sender = this.state.players.get(client.sessionId);
    if (!sender) return;
    if (!sender.guildId) {
      client.send("chat", { sender: "System", text: "You are not in a guild.", whisper: false });
      return;
    }

    const text = String(msg.text ?? "").replace(/[\x00-\x1f]/g, "").slice(0, 140);
    if (!text) return;

    const senderName = sender.name || "Hero";

    // Deliver to all guild members currently in this zone
    this.state.players.forEach((p: Player, sid: string) => {
      if (p.guildId !== sender.guildId) return;
      const target = this.clients.find((c: Client) => c.sessionId === sid);
      target?.send("guild_chat", { sender: senderName, text });
    });
  }

  // ── Player Report ─────────────────────────────────────────────────────────────

  private handleReportPlayer(client: Client, msg: ReportPlayerMessage) {
    const reporter = this.state.players.get(client.sessionId);
    if (!reporter) return;

    const reporterUserId = sessionUserMap.get(client.sessionId);
    if (!reporterUserId) {
      client.send("chat", { sender: "System", text: "You must be logged in to submit a report.", whisper: false });
      return;
    }

    const reportedName = String(msg.reportedName ?? "").slice(0, 32);
    if (!reportedName) return;

    // Find the reported player in this zone room
    let reportedUserId: string | undefined;
    this.state.players.forEach((_p: Player, sid: string) => {
      if (_p.name === reportedName) {
        reportedUserId = sessionUserMap.get(sid);
      }
    });

    if (!reportedUserId) {
      client.send("chat", { sender: "System", text: `Player "${reportedName}" not found in this zone.`, whisper: false });
      return;
    }

    const reason = String(msg.reason ?? "").replace(/[\x00-\x1f]/g, "").slice(0, 200);
    createReport(reporterUserId, reportedUserId, reason, this.state.zoneId).catch(() => {});

    client.send("chat", { sender: "System", text: `Report submitted against "${reportedName}". Thank you.`, whisper: false });
  }

  // ── Emote Handler ─────────────────────────────────────────────────────────────

  private static readonly VALID_EMOTES = new Set(["wave", "dance", "sit", "cheer", "bow", "angry"]);
  private static readonly EMOTE_RANGE = 80; // server coord units
  private readonly _emoteCooldowns = new Map<string, number>(); // sessionId → expiry ms
  private static readonly EMOTE_COOLDOWN_MS = 2000;

  private handleEmote(client: Client, msg: EmoteMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const emoteId = String(msg.emoteId ?? "").trim().toLowerCase();
    if (!ZoneRoom.VALID_EMOTES.has(emoteId)) return;

    // Per-player cooldown
    const now = Date.now();
    const cooldownExp = this._emoteCooldowns.get(client.sessionId) ?? 0;
    if (now < cooldownExp) return;
    this._emoteCooldowns.set(client.sessionId, now + ZoneRoom.EMOTE_COOLDOWN_MS);

    // Broadcast to nearby players only
    const senderName = player.name;
    this.state.players.forEach((other: Player, sid: string) => {
      if (sid === client.sessionId) return;
      if (dist(player.x, player.y, other.x, other.y) > ZoneRoom.EMOTE_RANGE) return;
      const tc = this.clients.find((c: Client) => c.sessionId === sid);
      tc?.send("emote", { sessionId: client.sessionId, playerName: senderName, emoteId });
    });
    // Also confirm to sender
    client.send("emote", { sessionId: client.sessionId, playerName: senderName, emoteId });
  }

  // ── Social Handlers ───────────────────────────────────────────────────────────

  private async handleFriendRequest(client: Client, msg: FriendRequestMessage) {
    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) {
      client.send("social_error", { message: "Must be logged in to add friends." });
      return;
    }
    const targetName = String(msg.targetName ?? "").slice(0, 32).trim();
    if (!targetName) return;

    const result = await sendFriendRequest(userId, targetName).catch(() => "error" as const);
    switch (result) {
      case "sent":
        client.send("social_info", { message: `Friend request sent to ${targetName}.` });
        // Notify the target if they are in this room
        this.state.players.forEach((p: Player, sid: string) => {
          if (p.name === targetName) {
            const tc = this.clients.find((c: Client) => c.sessionId === sid);
            tc?.send("friend_request_received", {
              fromName: this.state.players.get(client.sessionId)?.name ?? "Someone",
            });
          }
        });
        break;
      case "already_friends":
        client.send("social_info", { message: `${targetName} is already your friend.` });
        break;
      case "already_pending":
        client.send("social_info", { message: `Friend request to ${targetName} already pending.` });
        break;
      case "blocked":
        client.send("social_error", { message: `Cannot send friend request to ${targetName}.` });
        break;
      case "not_found":
        client.send("social_error", { message: `Player "${targetName}" not found.` });
        break;
      default:
        client.send("social_error", { message: "Friend request failed. Try again." });
    }
  }

  private async handleFriendRespond(client: Client, msg: FriendRespondMessage) {
    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) return;

    const requesterName = String(msg.requesterName ?? "").slice(0, 32).trim();
    if (!requesterName) return;

    if (msg.accept) {
      const ok = await acceptFriendRequest(userId, requesterName).catch(() => false);
      if (ok) {
        client.send("social_info", { message: `You are now friends with ${requesterName}.` });
        // Notify the requester if online in this room
        this.state.players.forEach((p: Player, sid: string) => {
          if (p.name === requesterName) {
            const tc = this.clients.find((c: Client) => c.sessionId === sid);
            tc?.send("friend_request_accepted", {
              byName: this.state.players.get(client.sessionId)?.name ?? "",
            });
          }
        });
        // Refresh both players' friend lists
        await this.sendFriendsList(client);
      } else {
        client.send("social_error", { message: "Could not accept friend request." });
      }
    } else {
      await removeFriend(userId, requesterName).catch(() => {});
      client.send("social_info", { message: `Declined friend request from ${requesterName}.` });
    }
  }

  private async handleFriendRemove(client: Client, msg: FriendRemoveMessage) {
    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) return;

    const targetName = String(msg.targetName ?? "").slice(0, 32).trim();
    if (!targetName) return;

    await removeFriend(userId, targetName).catch(() => {});
    client.send("social_info", { message: `Removed ${targetName} from friends.` });
    await this.sendFriendsList(client);
  }

  private async handleBlockPlayer(client: Client, msg: BlockPlayerMessage) {
    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) return;

    const targetName = String(msg.targetName ?? "").slice(0, 32).trim();
    if (!targetName) return;

    const result = await blockPlayer(userId, targetName).catch(() => "error" as const);
    switch (result) {
      case "ok":
        client.send("social_info", { message: `${targetName} has been blocked.` });
        await this.sendFriendsList(client);
        break;
      case "already_blocked":
        client.send("social_info", { message: `${targetName} is already blocked.` });
        break;
      case "not_found":
        client.send("social_error", { message: `Player "${targetName}" not found.` });
        break;
      default:
        client.send("social_error", { message: "Block failed." });
    }
  }

  private async handleUnblockPlayer(client: Client, msg: UnblockPlayerMessage) {
    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) return;

    const targetName = String(msg.targetName ?? "").slice(0, 32).trim();
    if (!targetName) return;

    await unblockPlayer(userId, targetName).catch(() => {});
    client.send("social_info", { message: `${targetName} has been unblocked.` });
  }

  private async handleFriendsList(client: Client) {
    await this.sendFriendsList(client);
  }

  /** Build and send the friend list with live online status. */
  private async sendFriendsList(client: Client) {
    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) return;
    try {
      const friends = await getFriendList(userId);
      // Annotate with online status (in this zone)
      const onlineNames = new Set<string>();
      this.state.players.forEach((p: Player) => { onlineNames.add(p.name); });
      const annotated = friends.map((f) => ({
        ...f,
        online: onlineNames.has(f.username),
      }));
      client.send("friends_list", { friends: annotated });
    } catch (_e) { /* non-fatal */ }
  }

  // ── Quest NPC Handlers ────────────────────────────────────────────────────────

  private async handleQuestNpcInteract(client: Client, _msg: QuestNpcMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) {
      client.send("quest_error", { message: "You must be logged in to accept quests." });
      return;
    }

    // Check faction standing — hostile NPCs won't offer quests
    const zoneFaction = factionForZone(this.state.zoneId);
    if (zoneFaction) {
      try {
        const reps = await getPlayerFactionReputations(userId);
        const entry = reps.find((r) => r.factionId === zoneFaction.id);
        if (entry && entry.standing === "hostile") {
          client.send("quest_error", {
            message: `The ${zoneFaction.name} won't speak with you — you are hostile to them!`,
          });
          return;
        }
        if (entry && entry.standing === "unfriendly") {
          client.send("quest_error", {
            message: `The ${zoneFaction.name} are wary of you. Improve your standing to receive quests.`,
          });
          return;
        }
      } catch {
        // Non-fatal: allow quest if rep check fails
      }
    }

    try {
      const { quest, isNew } = await getOrGenerateQuest(
        userId,
        this.state.zoneId,
        player.level,
      );
      client.send("quest_data", { quest, isNew });
    } catch (err) {
      const msg = (err as Error).message ?? "Quest generation failed.";
      console.warn(`[ZoneRoom] Quest generation error for ${userId}:`, msg);
      client.send("quest_error", { message: msg });
    }
  }

  private async handleQuestComplete(client: Client, msg: QuestCompleteMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) return;

    const questId = String(msg.questId ?? "").slice(0, 100);
    if (!questId) return;

    try {
      const { factionId, chainAdvanced, chainComplete } = await completeQuestForPlayer(userId, this.state.zoneId, questId);
      client.send("quest_completed", { questId, chainAdvanced, chainComplete });
      if (chainAdvanced) {
        if (chainComplete) {
          client.send("chat", { sender: "System", text: "✦ Quest chain complete! Well done, adventurer.", whisper: false });
        } else {
          client.send("chat", { sender: "System", text: "✦ Quest chain step complete — speak to the NPC for the next task!", whisper: false });
        }
      }
      console.log(`[ZoneRoom] Quest ${questId} completed by ${userId}`);

      // Award faction reputation
      if (factionId) {
        const faction = FACTION_BY_ID.get(factionId);
        if (faction) {
          const gain = faction.questRepGain;
          const newRep = await adjustFactionReputation(userId, factionId, gain);
          const standing = getStanding(newRep);

          // Apply rival rep loss
          if (faction.rivalFactionId) {
            await adjustFactionReputation(userId, faction.rivalFactionId, -RIVAL_REP_LOSS);
          }

          // Send updated standings
          const reps = await getPlayerFactionReputations(userId);
          client.send("faction_reputations", { reputations: reps });
          client.send("faction_rep_changed", {
            factionId,
            factionName: faction.name,
            delta: gain,
            newRep,
            standing,
          });
        }
      }
    } catch (err) {
      console.warn(`[ZoneRoom] Quest completion error for ${userId}:`, (err as Error).message);
    }
  }

  // ── Wave Management ───────────────────────────────────────────────────────────

  private startNextWave() {
    if (this.state.currentWave >= this.state.totalWaves) return;

    this.state.currentWave += 1;
    this.state.waveState = "active";
    this.state.waveStartAt = Date.now();

    this.spawnWaveEnemies();
    console.log(`[ZoneRoom] wave ${this.state.currentWave}/${this.state.totalWaves} started in zone ${this.state.zoneId}`);
  }

  private spawnWaveEnemies() {
    const zoneDefs = ZONE_ENEMIES[this.state.zoneId] ?? ZONE_ENEMIES["zone1"];
    const count = BASE_ENEMY_COUNT + (this.state.currentWave - 1) * 2;

    for (let i = 0; i < count; i++) {
      const def = zoneDefs[Math.floor(Math.random() * zoneDefs.length)];
      const enemy = new Enemy();
      enemy.id = uid();
      enemy.type = def.type;
      enemy.hp = def.hp;
      enemy.maxHp = def.hp;
      enemy.damage = def.dmg;
      enemy.speed = def.speed;
      enemy.aggroRange = def.aggroRange;
      enemy.aiState = "patrol";
      enemy.spawnedAt = Date.now();

      // Spawn near edges of the 320×180 canvas
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: enemy.x = Math.random() * 320; enemy.y = 5;   break;
        case 1: enemy.x = Math.random() * 320; enemy.y = 175; break;
        case 2: enemy.x = 5;   enemy.y = Math.random() * 180; break;
        default: enemy.x = 315; enemy.y = Math.random() * 180; break;
      }
      enemy.patrolX = enemy.x;
      enemy.patrolY = enemy.y;

      this.state.enemies.set(enemy.id, enemy);
    }

    this.updateEnemiesAlive();
  }

  private updateEnemiesAlive() {
    let count = 0;
    this.state.enemies.forEach((e: Enemy) => { if (e.aiState !== "dead") count++; });
    this.state.enemiesAlive = count;
  }

  private killEnemy(enemy: Enemy, killerSessionId?: string) {
    enemy.aiState = "dead";
    // Drop crafting materials for the killer and increment kill counter
    if (killerSessionId) {
      this.dropLootForParty(killerSessionId, enemy).catch(() => {/* best-effort */});
      this.shareXpWithParty(killerSessionId, enemy);
      this.incrementPveKills(killerSessionId).catch(() => {/* best-effort */});
      this.awardKillFactionRep(killerSessionId, enemy.type).catch(() => {/* best-effort */});
    }
    // Remove from state after a short delay (so clients can play death animation)
    this.clock.setTimeout(() => {
      this.state.enemies.delete(enemy.id);
      this.updateEnemiesAlive();
      this.checkWaveComplete();
    }, 500);
  }

  /** Broadcast XP to nearby party members (not the killer — they gain XP locally). */
  private shareXpWithParty(killerSessionId: string, enemy: Enemy): void {
    const partyId = this.playerParty.get(killerSessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party || party.memberSessionIds.length < 2) return;

    const killer = this.state.players.get(killerSessionId);
    if (!killer) return;

    // Lookup XP value from zone enemy table
    const zoneDefs = ZONE_ENEMIES[this.state.zoneId] ?? [];
    const def = zoneDefs.find(d => d.type === enemy.type);
    const baseXp = def?.xp ?? 10;

    // Split evenly among all members in proximity (including killer)
    const nearby = party.memberSessionIds.filter(sid => {
      const p = this.state.players.get(sid);
      return p && dist(p.x, p.y, killer.x, killer.y) <= PARTY_XP_RANGE;
    });
    if (nearby.length === 0) return;

    const sharedXp = Math.max(1, Math.floor(baseXp / nearby.length));

    // Notify non-killer party members in range
    for (const sid of nearby) {
      if (sid === killerSessionId) continue;
      const target = this.clients.find((c: Client) => c.sessionId === sid);
      target?.send("party_xp", { amount: sharedXp });
    }
  }

  /** Rolls loot table for the current zone and distributes drops per party loot rules. */
  private async dropLootForParty(killerSessionId: string, _enemy: Enemy): Promise<void> {
    const lootTable = ZONE_LOOT[this.state.zoneId] ?? [];
    const droppedItems: string[] = [];

    for (const entry of lootTable) {
      if (Math.random() < entry.chance) {
        droppedItems.push(entry.itemId);
      }
    }
    if (droppedItems.length === 0) return;

    const partyId = this.playerParty.get(killerSessionId);
    const party = partyId ? this.parties.get(partyId) : null;

    if (!party || party.memberSessionIds.length < 2) {
      // Solo or no party — killer gets everything
      await this.grantLootToSession(killerSessionId, droppedItems);
      return;
    }

    // Only consider online party members in this room
    const onlineMembers = party.memberSessionIds.filter(sid => this.state.players.has(sid));
    if (onlineMembers.length === 0) {
      await this.grantLootToSession(killerSessionId, droppedItems);
      return;
    }

    if (party.lootMode === "round_robin") {
      // Advance round-robin index; one player gets all drops this turn
      party.roundRobinIndex = (party.roundRobinIndex + 1) % onlineMembers.length;
      const recipientSid = onlineMembers[party.roundRobinIndex]!;
      await this.grantLootToSession(recipientSid, droppedItems);
    } else {
      // Need/greed/pass — start a timed roll
      this.startNeedGreedRoll(droppedItems, onlineMembers);
    }
  }

  /** Initiates a need/greed/pass roll for party loot. Auto-resolves after 15 s. */
  private startNeedGreedRoll(items: string[], partySessionIds: string[]): void {
    const rollId = uid();
    const timer = this.clock.setTimeout(() => this.resolveNeedGreedRoll(rollId), 15_000);
    const roll: LootRoll = {
      items,
      partySessionIds,
      rolls: new Map(),
      timer,
    };
    this.lootRolls.set(rollId, roll);

    // Notify all party members
    for (const sid of partySessionIds) {
      const c = this.clients.find((cl: Client) => cl.sessionId === sid);
      c?.send("loot_roll_start", { rollId, items, timeoutMs: 15_000 });
    }
  }

  /** Handles a player's need/greed/pass choice. */
  private handleLootRollResponse(client: Client, msg: LootRollResponseMessage): void {
    const roll = this.lootRolls.get(msg.rollId);
    if (!roll) return;
    if (!roll.partySessionIds.includes(client.sessionId)) return;
    if (roll.rolls.has(client.sessionId)) return; // already voted

    const choice = msg.choice;
    if (choice !== "need" && choice !== "greed" && choice !== "pass") return;
    roll.rolls.set(client.sessionId, choice);

    // If everyone has voted, resolve immediately
    if (roll.rolls.size >= roll.partySessionIds.length) {
      roll.timer.clear();
      this.resolveNeedGreedRoll(msg.rollId);
    }
  }

  /** Resolves a need/greed/pass roll: picks winner and grants loot. */
  private resolveNeedGreedRoll(rollId: string): void {
    const roll = this.lootRolls.get(rollId);
    if (!roll) return;
    this.lootRolls.delete(rollId);

    // Auto-pass for anyone who didn't respond
    for (const sid of roll.partySessionIds) {
      if (!roll.rolls.has(sid)) roll.rolls.set(sid, "pass");
    }

    // Priority: need > greed > pass. Within same tier, pick random winner.
    const needers  = roll.partySessionIds.filter(sid => roll.rolls.get(sid) === "need");
    const greeders = roll.partySessionIds.filter(sid => roll.rolls.get(sid) === "greed");

    const candidates = needers.length > 0 ? needers : greeders;

    const rollResults: Record<string, { choice: string; roll: number }> = {};
    let winnerSid: string | null = null;

    if (candidates.length > 0) {
      // Each candidate rolls 1-100; highest wins
      let bestRoll = -1;
      for (const sid of candidates) {
        const r = Math.floor(Math.random() * 100) + 1;
        rollResults[sid] = { choice: roll.rolls.get(sid) ?? "pass", roll: r };
        if (r > bestRoll) { bestRoll = r; winnerSid = sid; }
      }
      // Fill pass votes in results too
      for (const sid of roll.partySessionIds) {
        if (!rollResults[sid]) rollResults[sid] = { choice: "pass", roll: 0 };
      }
    }

    // Notify all party members of the outcome
    for (const sid of roll.partySessionIds) {
      const c = this.clients.find((cl: Client) => cl.sessionId === sid);
      c?.send("loot_roll_result", {
        rollId,
        items: roll.items,
        winnerSessionId: winnerSid,
        winnerName: winnerSid ? (this.state.players.get(winnerSid)?.name ?? "Unknown") : null,
        rolls: rollResults,
      });
    }

    if (winnerSid) {
      this.grantLootToSession(winnerSid, roll.items).catch(err =>
        console.warn("[ZoneRoom] grantLootToSession failed:", (err as Error).message),
      );
    }
    // If all passed, loot is lost (by design)
  }

  /** Adds items to a player's inventory and notifies their client. */
  private async grantLootToSession(sessionId: string, itemIds: string[]): Promise<void> {
    const userId = sessionUserMap.get(sessionId);
    if (!userId) return;
    for (const itemId of itemIds) {
      await addItem(userId, itemId, 1);
    }
    const recipientClient = this.clients.find((c: Client) => c.sessionId === sessionId);
    if (recipientClient) {
      recipientClient.send("loot_drop", { items: itemIds });
    }
  }

  /** Increments the PvE kill counter for a player in the DB and invalidates leaderboard cache. */
  private async incrementPveKills(sessionId: string): Promise<void> {
    const userId = sessionUserMap.get(sessionId);
    if (!userId) return;
    try {
      const pool = getPool();
      await pool.query(
        "UPDATE player_state SET pve_kills = pve_kills + 1 WHERE player_id = $1",
        [userId],
      );
      invalidateLeaderboardCache("kills").catch(() => {/* non-fatal */});
    } catch (err) {
      console.warn("[ZoneRoom] Failed to increment pve_kills:", (err as Error).message);
    }
  }

  /**
   * Awards +REP_PER_KILL reputation to the faction whose enemies include this enemy type.
   * Sends updated standings to the killer's client.
   */
  private async awardKillFactionRep(sessionId: string, enemyType: string): Promise<void> {
    const userId = sessionUserMap.get(sessionId);
    if (!userId) return;

    const faction = factionForEnemy(enemyType);
    if (!faction) return;

    const newRep = await adjustFactionReputation(userId, faction.id, REP_PER_KILL);
    const standing = getStanding(newRep);

    const killerClient = this.clients.find((c: Client) => c.sessionId === sessionId);
    if (killerClient) {
      killerClient.send("faction_rep_changed", {
        factionId: faction.id,
        factionName: faction.name,
        delta: REP_PER_KILL,
        newRep,
        standing,
      });
    }
  }

  /** Broadcast crafting event to all other players in the zone. */
  private handleCraftNotify(client: Client, msg: CraftNotifyMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const playerName = player.name || "Hero";
    const itemName = String(msg.itemName ?? "").slice(0, 50);
    if (!itemName) return;

    // Broadcast to everyone else in the room
    this.broadcast(
      "craft_event",
      { playerName, itemName },
      { except: client },
    );
  }

  private checkWaveComplete() {
    if (this.state.waveState !== "active") return;
    if (this.state.enemiesAlive > 0) return;

    if (this.state.currentWave >= this.state.totalWaves) {
      this.state.waveState = "complete";
      console.log(`[ZoneRoom] zone ${this.state.zoneId} complete`);
    } else {
      this.state.waveState = "waiting";
      this.clock.setTimeout(() => this.startNextWave(), WAVE_PREP_MS);
    }
  }

  // ── Game Tick ─────────────────────────────────────────────────────────────────

  private tick() {
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000; // seconds
    this.lastTick = now;

    this.tickEnemyAI(dt, now);
    this.tickProjectiles(dt, now);
    this.tickManaRegen(dt);
    this.tickStatusEffects(now);
    this.tickBuffs(now);
  }

  /** Expire player status effects whose duration has elapsed. */
  private tickStatusEffects(now: number) {
    this.state.players.forEach((player: Player) => {
      if (player.statusFlags !== 0 && now > player.statusExpiry) {
        player.statusFlags = 0;
      }
    });
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────────────

  private tickEnemyAI(dt: number, now: number) {
    this.state.enemies.forEach((enemy: Enemy) => {
      if (enemy.aiState === "dead") return;

      // Find nearest living player
      let nearestPlayer: Player | null = null;
      let nearestDist = Infinity;
      this.state.players.forEach((player: Player) => {
        if (player.hp <= 0) return;
        const d = dist(enemy.x, enemy.y, player.x, player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPlayer = player;
        }
      });

      if (nearestPlayer !== null && nearestDist <= enemy.aggroRange) {
        const target = nearestPlayer as Player;
        enemy.aiState = "chase";
        enemy.targetId = target.sessionId;
        this.moveEnemyToward(enemy, target.x, target.y, dt);
        this.checkEnemyMeleeHit(enemy, target, now);
      } else {
        // Patrol: wander around spawn point
        enemy.aiState = "patrol";
        enemy.targetId = "";
        this.patrolEnemy(enemy, dt);
      }
    });
  }

  private moveEnemyToward(enemy: Enemy, tx: number, ty: number, dt: number) {
    if (enemy.speed === 0) return;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 2) return;
    enemy.x += (dx / d) * enemy.speed * dt;
    enemy.y += (dy / d) * enemy.speed * dt;
    enemy.x = Math.max(0, Math.min(320, enemy.x));
    enemy.y = Math.max(0, Math.min(180, enemy.y));
  }

  private patrolEnemy(enemy: Enemy, dt: number) {
    if (enemy.speed === 0) return;
    const d = dist(enemy.x, enemy.y, enemy.patrolX, enemy.patrolY);
    if (d < 5) {
      enemy.patrolX = Math.max(0, Math.min(320, enemy.x + (Math.random() - 0.5) * 60));
      enemy.patrolY = Math.max(0, Math.min(180, enemy.y + (Math.random() - 0.5) * 60));
    }
    this.moveEnemyToward(enemy, enemy.patrolX, enemy.patrolY, dt * 0.5);
  }

  private checkEnemyMeleeHit(enemy: Enemy, player: Player, now: number) {
    if (now < player.invincibleUntil) return;
    if (dist(enemy.x, enemy.y, player.x, player.y) > 12) return;

    // Arcane shield absorb
    let dmgToApply = PLAYER_HIT_DAMAGE;
    if (player.shieldAbsorb > 0) {
      const absorbed = Math.min(player.shieldAbsorb, dmgToApply);
      player.shieldAbsorb -= absorbed;
      dmgToApply -= absorbed;
    }
    player.hp = Math.max(0, player.hp - dmgToApply);
    player.invincibleUntil = now + PLAYER_INVINCIBILITY_MS;

    // Apply status effect from this enemy type (e.g. frost_wolf → freeze)
    const statusDef = MELEE_STATUS_MAP[enemy.type];
    if (statusDef && now >= player.statusExpiry) {
      player.statusFlags |= statusDef.flag;
      player.statusExpiry = now + statusDef.durationMs;
    }

    if (player.hp === 0) {
      console.log(`[ZoneRoom] player ${player.sessionId} died`);
    }
  }

  // ── Projectile Tick ───────────────────────────────────────────────────────────

  private tickProjectiles(dt: number, now: number) {
    const toDelete: string[] = [];

    this.state.projectiles.forEach((proj: Projectile) => {
      if (now > proj.expiresAt) {
        toDelete.push(proj.id);
        return;
      }

      proj.x += proj.velX * dt;
      proj.y += proj.velY * dt;

      if (proj.x < 0 || proj.x > 320 || proj.y < 0 || proj.y > 180) {
        toDelete.push(proj.id);
        return;
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
      });
    });

    toDelete.forEach((id) => this.state.projectiles.delete(id));
  }

  // ── Mana Regen ────────────────────────────────────────────────────────────────

  private tickManaRegen(dt: number) {
    this.state.players.forEach((player: Player) => {
      if (player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN_PER_SEC * dt);
      }
    });
  }

  // ── Ranged projectile spawn (called from tickEnemyAI for ranged enemies) ──────

  protected spawnProjectile(enemy: Enemy, tx: number, ty: number) {
    const proj = new Projectile();
    proj.id = uid();
    proj.ownerId = enemy.id;
    proj.x = enemy.x;
    proj.y = enemy.y;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    proj.velX = (dx / d) * PROJECTILE_SPEED;
    proj.velY = (dy / d) * PROJECTILE_SPEED;
    proj.damage = enemy.damage;
    proj.expiresAt = Date.now() + PROJECTILE_LIFETIME_MS;
    this.state.projectiles.set(proj.id, proj);
  }

  // ── P2P Trade handlers ────────────────────────────────────────────────────────

  /** Initiator sends a trade invite to another player in the zone. */
  private handleTradeRequest(client: Client, msg: TradeRequestMessage): void {
    const target = this.clients.find((c) => c.sessionId === msg.targetSessionId);
    if (!target) {
      client.send("trade_error", { message: "Player not found in this zone" });
      return;
    }
    if (target.sessionId === client.sessionId) {
      client.send("trade_error", { message: "Cannot trade with yourself" });
      return;
    }
    // Check if either side is already in a trade
    for (const [, trade] of this.pendingTrades) {
      if (
        trade.initiatorSessionId === client.sessionId ||
        trade.counterpartSessionId === client.sessionId ||
        trade.initiatorSessionId === target.sessionId ||
        trade.counterpartSessionId === target.sessionId
      ) {
        client.send("trade_error", { message: "One of you is already in a trade" });
        return;
      }
    }

    const initiatorName = this.state.players.get(client.sessionId)?.name ?? "Unknown";
    this.pendingTrades.set(client.sessionId, {
      initiatorSessionId: client.sessionId,
      counterpartSessionId: target.sessionId,
      initiatorOffer: null,
      counterpartOffer: null,
      initiatorConfirmed: false,
      counterpartConfirmed: false,
    });

    target.send("trade_invited", { from: client.sessionId, fromName: initiatorName });
    client.send("trade_pending", { with: target.sessionId });
    console.log(`[Trade] ${client.sessionId} invited ${target.sessionId}`);
  }

  /** Counterpart accepts or declines a trade invite. */
  private handleTradeRespond(client: Client, msg: TradeRespondMessage): void {
    // Find trade where this client is the counterpart
    let trade: PendingTrade | undefined;
    let tradeKey: string | undefined;
    for (const [key, t] of this.pendingTrades) {
      if (t.counterpartSessionId === client.sessionId) {
        trade = t;
        tradeKey = key;
        break;
      }
    }
    if (!trade || !tradeKey) {
      client.send("trade_error", { message: "No pending trade invite" });
      return;
    }

    const initiatorClient = this.clients.find((c) => c.sessionId === trade!.initiatorSessionId);

    if (!msg.accept) {
      this.pendingTrades.delete(tradeKey);
      initiatorClient?.send("trade_declined", { by: client.sessionId });
      client.send("trade_cancelled", { reason: "You declined" });
      return;
    }

    // Both clients enter the offer phase
    initiatorClient?.send("trade_accepted", { with: client.sessionId });
    client.send("trade_accepted", { with: trade.initiatorSessionId });
  }

  /** Each side submits their offer (items + gold). */
  private handleTradeOffer(client: Client, msg: TradeOfferMessage): void {
    const { trade, isInitiator } = this.findTrade(client.sessionId);
    if (!trade) {
      client.send("trade_error", { message: "No active trade" });
      return;
    }

    const offer = {
      items: msg.items.map((i) => ({
        inventoryId: i.inventoryId,
        itemId: i.itemId,
        quantity: Math.max(1, Math.floor(i.quantity)),
      })),
      gold: Math.max(0, Math.floor(msg.gold)),
    };

    if (isInitiator) {
      trade.initiatorOffer = offer;
      trade.initiatorConfirmed = false; // reset on re-offer
    } else {
      trade.counterpartOffer = offer;
      trade.counterpartConfirmed = false;
    }

    // Notify the other side
    const otherSessionId = isInitiator
      ? trade.counterpartSessionId
      : trade.initiatorSessionId;
    const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
    otherClient?.send("trade_offer_updated", { offer, fromInitiator: isInitiator });
  }

  /** Each side confirms the current offers. When both confirm → execute. */
  private handleTradeConfirm(client: Client, msg: TradeConfirmMessage): void {
    const { trade, isInitiator, tradeKey } = this.findTrade(client.sessionId);
    if (!trade || !tradeKey) {
      client.send("trade_error", { message: "No active trade" });
      return;
    }

    if (!msg.confirmed) {
      // Un-confirm resets the other side too
      trade.initiatorConfirmed = false;
      trade.counterpartConfirmed = false;
      const otherSessionId = isInitiator ? trade.counterpartSessionId : trade.initiatorSessionId;
      const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
      otherClient?.send("trade_unconfirmed", {});
      return;
    }

    if (isInitiator) {
      trade.initiatorConfirmed = true;
    } else {
      trade.counterpartConfirmed = true;
    }

    if (trade.initiatorConfirmed && trade.counterpartConfirmed) {
      this.executeTrade(trade, tradeKey);
    } else {
      // Notify the other side they're waiting for them
      const otherSessionId = isInitiator ? trade.counterpartSessionId : trade.initiatorSessionId;
      const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
      otherClient?.send("trade_awaiting_confirm", {});
    }
  }

  /** Either side can cancel at any time before execution. */
  private handleTradeCancel(client: Client): void {
    const { trade, tradeKey } = this.findTrade(client.sessionId);
    if (!trade || !tradeKey) return;

    this.pendingTrades.delete(tradeKey);

    const initiatorClient  = this.clients.find((c) => c.sessionId === trade.initiatorSessionId);
    const counterpartClient = this.clients.find((c) => c.sessionId === trade.counterpartSessionId);
    initiatorClient?.send("trade_cancelled", { reason: "Trade was cancelled" });
    counterpartClient?.send("trade_cancelled", { reason: "Trade was cancelled" });
  }

  /** Execute a fully-confirmed P2P trade via the DB layer. */
  private async executeTrade(trade: PendingTrade, tradeKey: string): Promise<void> {
    const initiatorUserId   = sessionUserMap.get(trade.initiatorSessionId);
    const counterpartUserId = sessionUserMap.get(trade.counterpartSessionId);

    const initiatorClient   = this.clients.find((c) => c.sessionId === trade.initiatorSessionId);
    const counterpartClient = this.clients.find((c) => c.sessionId === trade.counterpartSessionId);

    if (!initiatorUserId || !counterpartUserId) {
      initiatorClient?.send("trade_error", { message: "Trade requires a logged-in account" });
      counterpartClient?.send("trade_error", { message: "Trade requires a logged-in account" });
      this.pendingTrades.delete(tradeKey);
      return;
    }

    try {
      const result = await executeP2PTrade(
        initiatorUserId,
        counterpartUserId,
        trade.initiatorOffer?.items ?? [],
        trade.initiatorOffer?.gold ?? 0,
        trade.counterpartOffer?.items ?? [],
        trade.counterpartOffer?.gold ?? 0,
      );

      this.pendingTrades.delete(tradeKey);

      if (result.success) {
        initiatorClient?.send("trade_complete", { success: true });
        counterpartClient?.send("trade_complete", { success: true });
        console.log(`[Trade] P2P trade completed between ${initiatorUserId} and ${counterpartUserId}`);
      } else {
        initiatorClient?.send("trade_error", { message: result.error ?? "Trade failed" });
        counterpartClient?.send("trade_error", { message: result.error ?? "Trade failed" });
      }
    } catch (err) {
      this.pendingTrades.delete(tradeKey);
      initiatorClient?.send("trade_error", { message: "Trade execution failed" });
      counterpartClient?.send("trade_error", { message: "Trade execution failed" });
      console.error("[Trade] executeTrade error:", (err as Error).message);
    }
  }

  /** Cancel all trades involving a disconnecting player. */
  private cancelTradesForClient(sessionId: string): void {
    for (const [key, trade] of this.pendingTrades) {
      if (trade.initiatorSessionId === sessionId || trade.counterpartSessionId === sessionId) {
        const otherSessionId =
          trade.initiatorSessionId === sessionId
            ? trade.counterpartSessionId
            : trade.initiatorSessionId;
        const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
        otherClient?.send("trade_cancelled", { reason: "Other player disconnected" });
        this.pendingTrades.delete(key);
      }
    }
  }

  /** Helper: find a pending trade involving sessionId. */
  private findTrade(sessionId: string): {
    trade?: PendingTrade;
    tradeKey?: string;
    isInitiator: boolean;
  } {
    for (const [key, trade] of this.pendingTrades) {
      if (trade.initiatorSessionId === sessionId) {
        return { trade, tradeKey: key, isInitiator: true };
      }
      if (trade.counterpartSessionId === sessionId) {
        return { trade, tradeKey: key, isInitiator: false };
      }
    }
    return { isInitiator: false };
  }

  // ── Skill Tree Handlers ───────────────────────────────────────────────────────

  /** Apply all passive bonuses from unlocked skills to the Colyseus Player schema. */
  private applySkillPassives(player: Player, skillState: SkillState): void {
    const bonuses = computePassiveBonuses(Object.keys(skillState.unlockedSkills));
    const baseHp   = 100 + (player.level - 1) * 20;
    const baseMana =  50;
    player.maxHp   = baseHp   + bonuses.maxHpFlat;
    player.maxMana = baseMana + bonuses.maxManaFlat;
    // Clamp current values to new maxes
    player.hp   = Math.min(player.hp,   player.maxHp);
    player.mana = Math.min(player.mana, player.maxMana);
  }

  /** Push skill state into the Colyseus-synced Player fields. */
  private syncSkillState(player: Player, skillState: SkillState): void {
    player.classId        = skillState.classId;
    player.skillPoints    = skillState.skillPoints;
    player.unlockedSkills = JSON.stringify(Object.keys(skillState.unlockedSkills));
    player.hotbar         = JSON.stringify(skillState.hotbar.slice(0, 6));
  }

  /** Called by the client on level-up — grant one skill point. */
  private handleLevelUp(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;
    skillState.skillPoints += 1;
    player.skillPoints = skillState.skillPoints;
    client.send("skill_points_updated", { skillPoints: skillState.skillPoints });
  }

  /** Player spends a skill point to unlock a skill. */
  private handleSkillAlloc(client: Client, msg: SkillAllocMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const skillId = String(msg.skillId ?? "").slice(0, 50);
    const skillDef = SKILL_BY_ID.get(skillId);
    if (!skillDef) { client.send("skill_error", { message: "Unknown skill" }); return; }
    if (skillDef.classId !== skillState.classId) { client.send("skill_error", { message: "Wrong class" }); return; }
    if (skillState.unlockedSkills[skillId]) { client.send("skill_error", { message: "Already unlocked" }); return; }
    if (skillState.skillPoints <= 0) { client.send("skill_error", { message: "No skill points" }); return; }

    // Check prerequisite
    if (skillDef.prerequisiteId && !skillState.unlockedSkills[skillDef.prerequisiteId]) {
      client.send("skill_error", { message: "Prerequisite not met" }); return;
    }

    skillState.unlockedSkills[skillId] = 1;
    skillState.skillPoints -= 1;

    this.applySkillPassives(player, skillState);
    this.syncSkillState(player, skillState);
    client.send("skill_alloc_ok", { skillId, skillPoints: skillState.skillPoints });
  }

  /** Player updates their hotbar layout. */
  private handleSkillHotbar(client: Client, msg: SkillHotbarMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const hotbar = (Array.isArray(msg.hotbar) ? msg.hotbar : [])
      .slice(0, 6)
      .map(id => String(id).slice(0, 50));

    // Only allow skills they've unlocked (or empty slots "")
    const validated = hotbar.map(id => {
      if (!id) return "";
      const def = SKILL_BY_ID.get(id);
      if (!def || !skillState.unlockedSkills[id] || def.type !== "active") return "";
      return id;
    });

    skillState.hotbar = validated;
    player.hotbar = JSON.stringify(validated);
    client.send("skill_hotbar_ok", { hotbar: validated });
  }

  /** Player switches class (only allowed if no skills unlocked yet). */
  private handleSkillClass(client: Client, msg: SkillClassMessage): void {
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;
    const classId = String(msg.classId ?? "").slice(0, 20) as ClassId;
    if (classId !== "warrior" && classId !== "mage") {
      client.send("skill_error", { message: "Invalid class" }); return;
    }
    if (Object.keys(skillState.unlockedSkills).length > 0) {
      client.send("skill_error", { message: "Respec first to change class" }); return;
    }
    skillState.classId = classId;
    const player = this.state.players.get(client.sessionId);
    if (player) player.classId = classId;
    client.send("skill_class_ok", { classId });
  }

  /** Respec: refund all skill points (resets unlocked skills). */
  private handleSkillRespec(client: Client, msg: SkillRespecMessage): void {
    if (!msg.confirm) return;
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const refunded = Object.keys(skillState.unlockedSkills).length;
    skillState.unlockedSkills = {};
    skillState.hotbar         = [];
    skillState.skillPoints    += refunded;

    this.applySkillPassives(player, skillState);
    this.syncSkillState(player, skillState);
    client.send("skill_respec_ok", { skillPoints: skillState.skillPoints });
  }

  /** Player activates an active skill. */
  private handleSkillUse(client: Client, msg: SkillUseMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.hp <= 0) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const skillId = String(msg.skillId ?? "").slice(0, 50);
    const skillDef = SKILL_BY_ID.get(skillId);
    if (!skillDef || skillDef.type !== "active") return;
    if (!skillState.unlockedSkills[skillId]) return;

    const now = Date.now();
    const cds = this.skillCooldowns.get(client.sessionId) ?? {};

    // Check cooldown
    if ((cds[skillId] ?? 0) > now) {
      client.send("skill_on_cooldown", { skillId, expiresAt: cds[skillId] });
      return;
    }

    // Check mana (unless arcane_surge is active)
    const surgeBuff = (player.buffFlags & BUFF_ARCANE_SURGE) !== 0 && now < player.buffExpiresAt;
    const manaCost  = surgeBuff ? 0 : (skillDef.manaCost ?? 0);
    if (player.mana < manaCost) {
      client.send("skill_no_mana", { skillId }); return;
    }

    // Cooldown reduction from passives
    const bonuses = computePassiveBonuses(Object.keys(skillState.unlockedSkills));
    const cdMult  = Math.max(0.2, 1 - bonuses.allCdReductionPct);
    const cd      = Math.round((skillDef.cooldownMs ?? 0) * cdMult);
    cds[skillId]  = now + cd;
    this.skillCooldowns.set(client.sessionId, cds);
    player.mana = Math.max(0, player.mana - manaCost);

    // Skill multipliers
    const surgeMult  = surgeBuff ? 2.0 : 1.0;
    const berserkMult = ((player.buffFlags & BUFF_BERSERK) !== 0 && now < player.buffExpiresAt) ? 1.5 : 1.0;
    const dmgBonus   = 1 + bonuses.damagePct;

    this.executeSkillEffect(client, player, skillId, now, surgeMult * berserkMult * dmgBonus);

    // Broadcast cooldown info back to the caster
    player.skillCooldowns = JSON.stringify(cds);
    client.send("skill_used", { skillId, cooldownMs: cd, expiresAt: cds[skillId] });
  }

  private executeSkillEffect(client: Client, player: Player, skillId: string, now: number, dmgMult: number): void {
    const sid = client.sessionId;
    switch (skillId) {
      // ── Warrior — Berserker ──────────────────────────────────────────────────
      case "reckless_strike": {
        const enemy = this.nearestEnemyTo(player, SKILL_MELEE_RANGE * 2);
        if (enemy) this.dealDamageToEnemy(enemy, Math.round(50 * dmgMult), player, sid);
        break;
      }
      case "blade_fury": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS) return;
          this.dealDamageToEnemy(e, Math.round(38 * dmgMult), player, sid);
        });
        break;
      }
      case "berserk_mode": {
        player.buffFlags    |= BUFF_BERSERK;
        player.buffExpiresAt = now + 6000;
        break;
      }

      // ── Warrior — Guardian ───────────────────────────────────────────────────
      case "shield_bash": {
        const enemy = this.nearestEnemyTo(player, SKILL_MELEE_RANGE * 2);
        if (enemy) {
          enemy.statusFlags |= 8; // stun
          // Use spawnedAt as a temporary stun-expiry tag (repurposed field)
          enemy.spawnedAt = now + 1500;
        }
        break;
      }
      case "taunt": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState !== "dead") {
            e.aiState  = "chase";
            e.targetId = player.sessionId;
          }
        });
        // Taunt lasts 4s on client — server just forces chase state
        break;
      }
      case "last_stand": break; // purely passive (handled in applySkillPassives)

      // ── Warrior — Paladin ────────────────────────────────────────────────────
      case "holy_mending": {
        player.hp = Math.min(player.maxHp, player.hp + 50);
        break;
      }
      case "sacred_strike": {
        const enemy = this.nearestEnemyTo(player, SKILL_MELEE_RANGE * 2);
        if (enemy) {
          this.dealDamageToEnemy(enemy, Math.round(45 * dmgMult), player, sid);
          // Apply burn (flag 2)
          enemy.statusFlags |= 2;
        }
        break;
      }
      case "divine_shield": {
        player.buffFlags    |= BUFF_DIVINE_SHIELD;
        player.buffExpiresAt = now + 3000;
        player.invincibleUntil = now + 3000;
        break;
      }

      // ── Mage — Pyromancer ────────────────────────────────────────────────────
      case "fireball": {
        const enemy = this.nearestEnemyTo(player, 200);
        if (enemy) {
          this.dealDamageToEnemy(enemy, Math.round(60 * dmgMult), player, sid);
          enemy.statusFlags |= 2; // burn
        }
        break;
      }
      case "inferno_ring": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS) return;
          this.dealDamageToEnemy(e, Math.round(80 * dmgMult), player, sid);
          e.statusFlags |= 2; // burn
        });
        break;
      }
      case "meteor_strike": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS * 1.5) return;
          this.dealDamageToEnemy(e, Math.round(150 * dmgMult), player, sid);
        });
        break;
      }

      // ── Mage — Frostbinder ───────────────────────────────────────────────────
      case "ice_lance": {
        const enemy = this.nearestEnemyTo(player, 200);
        if (enemy) {
          this.dealDamageToEnemy(enemy, Math.round(45 * dmgMult), player, sid);
          enemy.statusFlags |= 4; // freeze
        }
        break;
      }
      case "blizzard": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS * 1.3) return;
          e.statusFlags |= 4; // freeze
        });
        break;
      }
      case "glacial_nova": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS * 1.5) return;
          this.dealDamageToEnemy(e, Math.round(100 * dmgMult), player, sid);
          e.statusFlags |= 4; // freeze
        });
        break;
      }

      // ── Mage — Arcanist ──────────────────────────────────────────────────────
      case "arcane_bolt": {
        const enemy = this.nearestEnemyTo(player, 200);
        if (enemy) this.dealDamageToEnemy(enemy, Math.round(70 * dmgMult), player, sid);
        break;
      }
      case "arcane_shield": {
        player.shieldAbsorb = 80;
        break;
      }
      case "arcane_surge": {
        player.buffFlags    |= BUFF_ARCANE_SURGE;
        player.buffExpiresAt = now + 10000;
        break;
      }

      default: break;
    }
  }

  /** Deals damage to an enemy. killerSessionId is used for loot drops on kill. */
  private dealDamageToEnemy(enemy: Enemy, damage: number, _player: Player, killerSessionId?: string): void {
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.hp === 0) this.killEnemy(enemy, killerSessionId);
  }

  /** Returns the closest alive enemy within maxRange of the player, or null. */
  private nearestEnemyTo(player: Player, maxRange: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist = maxRange;
    this.state.enemies.forEach((e: Enemy) => {
      if (e.aiState === "dead") return;
      const d = dist(player.x, player.y, e.x, e.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    });
    return nearest;
  }

  /** Tick buff expiry and expire buff flags. */
  private tickBuffs(now: number): void {
    this.state.players.forEach((player: Player) => {
      if (player.buffFlags !== 0 && now > player.buffExpiresAt) {
        player.buffFlags = 0;
      }
    });
  }

  // ── Party Handlers ────────────────────────────────────────────────────────────

  /** Broadcasts current party state to all party members. */
  private broadcastPartyUpdate(partyId: string): void {
    const party = this.parties.get(partyId);
    if (!party) return;

    const members = party.memberSessionIds.map(sid => {
      const p = this.state.players.get(sid);
      return p
        ? { sessionId: sid, name: p.name, hp: p.hp, maxHp: p.maxHp, mana: p.mana, maxMana: p.maxMana, level: p.level, isLeader: sid === party.leaderSessionId }
        : null;
    }).filter(Boolean);

    for (const sid of party.memberSessionIds) {
      const target = this.clients.find((c: Client) => c.sessionId === sid);
      target?.send("party_update", {
        partyId,
        lootMode: party.lootMode,
        members,
      });
    }
  }

  private handlePartyInvite(client: Client, msg: PartyInviteMessage): void {
    const inviter = this.state.players.get(client.sessionId);
    if (!inviter) return;

    // Only leaders (or players without a party) can invite
    const inviterPartyId = this.playerParty.get(client.sessionId);
    if (inviterPartyId) {
      const party = this.parties.get(inviterPartyId);
      if (party && party.leaderSessionId !== client.sessionId) {
        client.send("party_error", { message: "Only the party leader can invite players." });
        return;
      }
      if (party && party.memberSessionIds.length >= 4) {
        client.send("party_error", { message: "Party is full (max 4 players)." });
        return;
      }
    }

    const target = this.clients.find((c: Client) => c.sessionId === msg.targetSessionId);
    if (!target) {
      client.send("party_error", { message: "Player not found in this zone." });
      return;
    }
    if (msg.targetSessionId === client.sessionId) {
      client.send("party_error", { message: "You cannot invite yourself." });
      return;
    }
    if (this.playerParty.has(msg.targetSessionId)) {
      client.send("party_error", { message: "That player is already in a party." });
      return;
    }

    this.partyInvites.set(msg.targetSessionId, client.sessionId);
    target.send("party_invited", { fromSessionId: client.sessionId, fromName: inviter.name });
    client.send("party_info", { message: `Invite sent to ${this.state.players.get(msg.targetSessionId)?.name ?? "player"}.` });
  }

  private handlePartyRespond(client: Client, msg: PartyRespondMessage): void {
    const inviterSessionId = this.partyInvites.get(client.sessionId);
    this.partyInvites.delete(client.sessionId);

    if (!inviterSessionId) {
      client.send("party_error", { message: "No pending party invite." });
      return;
    }

    if (!msg.accept) {
      const inviter = this.clients.find((c: Client) => c.sessionId === inviterSessionId);
      inviter?.send("party_info", { message: `${this.state.players.get(client.sessionId)?.name ?? "Player"} declined your party invite.` });
      return;
    }

    // Accept: create new party or add to existing
    let partyId = this.playerParty.get(inviterSessionId);
    let party: PartyData;

    if (!partyId) {
      // Create a new party with inviter as leader
      partyId = uid();
      party = {
        id: partyId,
        leaderSessionId: inviterSessionId,
        memberSessionIds: [inviterSessionId],
        lootMode: "need_greed",
        roundRobinIndex: 0,
      };
      this.parties.set(partyId, party);
      this.playerParty.set(inviterSessionId, partyId);
      const inviterPlayer = this.state.players.get(inviterSessionId);
      if (inviterPlayer) {
        inviterPlayer.partyId = partyId;
        inviterPlayer.isPartyLeader = true;
      }
    } else {
      party = this.parties.get(partyId)!;
      if (party.memberSessionIds.length >= 4) {
        client.send("party_error", { message: "Party is full (max 4 players)." });
        return;
      }
    }

    party.memberSessionIds.push(client.sessionId);
    this.playerParty.set(client.sessionId, partyId);

    const joiner = this.state.players.get(client.sessionId);
    if (joiner) {
      joiner.partyId = partyId;
      joiner.isPartyLeader = false;
    }

    this.broadcastPartyUpdate(partyId);
  }

  private handlePartyLeave(client: Client): void {
    this.removeFromParty(client.sessionId);
  }

  private handlePartyKick(client: Client, msg: PartyKickMessage): void {
    const partyId = this.playerParty.get(client.sessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    if (party.leaderSessionId !== client.sessionId) {
      client.send("party_error", { message: "Only the party leader can kick members." });
      return;
    }
    if (msg.targetSessionId === client.sessionId) {
      client.send("party_error", { message: "You cannot kick yourself. Use leave instead." });
      return;
    }
    if (!party.memberSessionIds.includes(msg.targetSessionId)) {
      client.send("party_error", { message: "That player is not in your party." });
      return;
    }
    this.removeFromParty(msg.targetSessionId, true);
  }

  private handlePartyLootMode(client: Client, msg: PartyLootModeMessage): void {
    const partyId = this.playerParty.get(client.sessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    if (party.leaderSessionId !== client.sessionId) {
      client.send("party_error", { message: "Only the party leader can change loot mode." });
      return;
    }
    party.lootMode = msg.mode;
    this.broadcastPartyUpdate(partyId);
  }

  private handlePartyChat(client: Client, msg: PartyChatMessage): void {
    const sender = this.state.players.get(client.sessionId);
    if (!sender) return;
    const partyId = this.playerParty.get(client.sessionId);
    if (!partyId) {
      client.send("chat", { sender: "System", text: "You are not in a party.", whisper: false });
      return;
    }
    const party = this.parties.get(partyId);
    if (!party) return;

    const text = String(msg.text ?? "").replace(/[\x00-\x1f]/g, "").slice(0, 140);
    if (!text) return;

    for (const sid of party.memberSessionIds) {
      const target = this.clients.find((c: Client) => c.sessionId === sid);
      target?.send("party_chat", { sender: sender.name, text });
    }
  }

  /**
   * Remove a session from its party. If the player is the leader, either
   * promotes the next member or disbands if they were the last member.
   */
  private removeFromParty(sessionId: string, wasKicked = false): void {
    const partyId = this.playerParty.get(sessionId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;

    party.memberSessionIds = party.memberSessionIds.filter(sid => sid !== sessionId);
    this.playerParty.delete(sessionId);

    const leavingPlayer = this.state.players.get(sessionId);
    if (leavingPlayer) {
      leavingPlayer.partyId = "";
      leavingPlayer.isPartyLeader = false;
    }

    // Notify the leaving player
    const leavingClient = this.clients.find((c: Client) => c.sessionId === sessionId);
    if (wasKicked) {
      leavingClient?.send("party_disbanded", { reason: "You were kicked from the party." });
    } else {
      leavingClient?.send("party_disbanded", { reason: "You left the party." });
    }

    if (party.memberSessionIds.length === 0) {
      // Disband empty party
      this.parties.delete(partyId);
      return;
    }

    if (party.memberSessionIds.length === 1) {
      // Only one member left — disband
      const lastSid = party.memberSessionIds[0];
      this.playerParty.delete(lastSid);
      const lastPlayer = this.state.players.get(lastSid);
      if (lastPlayer) { lastPlayer.partyId = ""; lastPlayer.isPartyLeader = false; }
      const lastClient = this.clients.find((c: Client) => c.sessionId === lastSid);
      lastClient?.send("party_disbanded", { reason: "Party disbanded (not enough members)." });
      this.parties.delete(partyId);
      return;
    }

    // If leader left, promote the next member
    if (party.leaderSessionId === sessionId) {
      party.leaderSessionId = party.memberSessionIds[0];
      const newLeader = this.state.players.get(party.leaderSessionId);
      if (newLeader) newLeader.isPartyLeader = true;
    }

    this.broadcastPartyUpdate(partyId);
  }
}
