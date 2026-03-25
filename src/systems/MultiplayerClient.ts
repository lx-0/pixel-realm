/**
 * MultiplayerClient — Colyseus 0.15 browser client wrapper for PixelRealm.
 *
 * Server uses 320×180 coordinate space; client world is 640×360.
 * All positions are scaled by COORD_SCALE (2×) on the way in, halved on the way out.
 */

import { Client, Room } from 'colyseus.js';

// Server coordinate space is half the client world size
const COORD_SCALE = 2;

const SERVER_URL: string =
  ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined) ??
  'ws://localhost:2567';

// ── Seasonal shop types ───────────────────────────────────────────────────────

export interface SeasonalShopData {
  open:    boolean;
  reason?: string;
  event?:  { id: string; name: string };
  items?:  Array<{ points: number; itemId: string; label: string; title?: string }>;
  points?: number;
  claimedRewards?: string[];
}

// ── Public data shapes ────────────────────────────────────────────────────────

export interface RemotePlayer {
  sessionId: string;
  name: string;
  x: number; // client coords
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  isAttacking: boolean;
  guildTag: string;    // e.g. "[PFG]" or empty string
  partyId: string;     // empty string = no party
  prestigeLevel: number; // 0 = never prestiged
  /** Equipped pet type ('wolf', 'hawk', etc.), empty string = no pet */
  equippedPetType: string;
  petHappiness: number;
  petLevel: number;
}

// ── Pet data shapes ───────────────────────────────────────────────────────────

export interface PetData {
  id:         string;
  petType:    string;
  level:      number;
  xp:         number;
  happiness:  number;
  isEquipped: boolean;
}

// ── Party data shapes ─────────────────────────────────────────────────────────

export interface PartyMember {
  sessionId:  string;
  name:       string;
  hp:         number;
  maxHp:      number;
  mana:       number;
  maxMana:    number;
  level:      number;
  isLeader:   boolean;
}

export interface PartyState {
  partyId:   string;
  lootMode:  "round_robin" | "need_greed";
  members:   PartyMember[];
}

export interface RemoteEnemy {
  id: string;
  type: string;
  x: number; // client coords
  y: number;
  hp: number;
  maxHp: number;
  aiState: string; // "patrol" | "chase" | "dead"
}

export interface ChatIncomingMessage {
  sender: string;
  text: string;
  whisper: boolean;
  whisperTo?: string;
}

// ── Quest data shapes (mirrors server quests/types.ts) ────────────────────────

export interface ClientQuestObjective {
  type: string;
  target: string;
  count?: number;
  description: string;
}

export interface ClientQuestReward {
  gold: number;
  xp: number;
  items?: Array<{ itemId: string; quantity: number }>;
}

export interface ClientDialogueChoice {
  id: string;
  label: string;
  response: string;
  outcome: "accept" | "decline" | "neutral" | "rep_bonus";
  repDelta?: number;
}

export interface ClientQuestDialogue {
  greeting: string;
  acceptance: string;
  completion: string;
  choices?: ClientDialogueChoice[];
}

export interface ClientQuest {
  id: string;
  zoneId: string;
  questType: string;
  factionId: string | null;
  title: string;
  description: string;
  objectives: ClientQuestObjective[];
  rewards: ClientQuestReward;
  dialogue: ClientQuestDialogue;
}

// ── Faction data shapes ───────────────────────────────────────────────────────

export type FactionStanding = "hostile" | "unfriendly" | "neutral" | "friendly" | "exalted";

export interface FactionRepEntry {
  factionId: string;
  reputation: number;  // -100 to +100
  standing: FactionStanding;
}

export interface FactionRepChanged {
  factionId: string;
  factionName: string;
  delta: number;
  newRep: number;
  standing: FactionStanding;
}

export interface ZoneRoomState {
  zoneId: string;
  currentWave: number;
  totalWaves: number;
  waveState: string; // "waiting" | "active" | "complete"
  enemiesAlive: number;
}

// ── Trade data shapes ─────────────────────────────────────────────────────────

export interface TradeOfferItem {
  inventoryId: string;
  itemId: string;
  quantity: number;
}

export interface TradeOffer {
  items: TradeOfferItem[];
  gold: number;
}

// ── Emote / world event shapes ────────────────────────────────────────────────

export type EmoteId = "wave" | "dance" | "sit" | "cheer" | "bow" | "angry";

export interface EmoteEvent {
  sessionId:  string;
  playerName: string;
  emoteId:    EmoteId;
}

export interface WorldEventEntry {
  id:          string;
  zoneId:      string;
  name:        string;
  description: string;
  startsAt:    string;
  endsAt:      string | null;
}

// ── Social data shapes ────────────────────────────────────────────────────────

export interface FriendEntry {
  playerId:   string;
  username:   string;
  status:     "pending" | "accepted";
  iRequested: boolean;
  online:     boolean;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class MultiplayerClient {
  private client: Client;
  private room: Room | null = null;

  /** Live view of players in the zone (keyed by sessionId). */
  readonly players = new Map<string, RemotePlayer>();

  /** Live view of enemies in the zone (keyed by enemy id). */
  readonly enemies = new Map<string, RemoteEnemy>();

  /** Snapshot of zone-level state. */
  zoneState: ZoneRoomState = {
    zoneId: 'zone1',
    currentWave: 0,
    totalWaves: 3,
    waveState: 'waiting',
    enemiesAlive: 0,
  };

  /** This client's Colyseus session id. */
  mySessionId = '';

  /** Current round-trip latency in ms. -1 = not yet measured. */
  latencyMs = -1;

  // ── Reconnect state ───────────────────────────────────────────────────────
  private storedZoneId     = '';
  private storedPlayerName = '';
  private storedUserId?: string;
  private isReconnecting   = false;
  private reconnectLeft    = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Ping interval ─────────────────────────────────────────────────────────
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;

  // ── Callbacks set by GameScene ────────────────────────────────────────────

  onWaveStateChange?: (wave: number, waveState: string) => void;
  onEnemyRemoved?: (id: string) => void;
  /** Fired when the WebSocket drops and auto-reconnect attempts begin. */
  onConnectionLost?: () => void;
  /** Fired on successful reconnect within the retry window. */
  onReconnected?: () => void;
  /** Fired when all reconnect attempts are exhausted (fall back to solo). */
  onDisconnected?: () => void;
  /** Fired whenever a latency measurement completes. */
  onLatencyUpdate?: (ms: number) => void;
  /** Fired when the server pushes a planned maintenance warning. */
  onMaintenanceNotice?: (minutesLeft: number) => void;
  onChatMessage?: (msg: ChatIncomingMessage) => void;
  onQuestData?: (quest: ClientQuest, isNew: boolean) => void;
  onQuestError?: (message: string) => void;
  onQuestCompleted?: (questId: string) => void;

  // Skill callbacks
  onSkillPointsUpdated?: (skillPoints: number) => void;
  onSkillAllocOk?: (skillId: string, skillPoints: number) => void;
  onSkillHotbarOk?: (hotbar: string[]) => void;
  onSkillRespecOk?: (skillPoints: number) => void;
  onSkillUsed?: (skillId: string, cooldownMs: number, expiresAt: number) => void;
  onSkillOnCooldown?: (skillId: string, expiresAt: number) => void;
  onSkillError?: (message: string) => void;

  // Prestige callbacks
  onPrestigeState?: (prestigeLevel: number, maxPrestige: number) => void;
  onPrestigeResetOk?: (prestigeLevel: number, maxPrestige: number, bonuses: { statMultiplier: number }) => void;
  onPrestigeError?: (message: string) => void;

  // Seasonal event callbacks
  onSeasonalEvent?: (
    event: { id: string; name: string; description: string; endsAt: string; rewardTiers: Array<{ points: number; itemId: string; label: string; title?: string }> },
    participation: { points: number; claimedRewards: string[] },
  ) => void;
  onSeasonalEventPoints?: (eventId: string, pointsDelta: number, totalPoints: number) => void;
  onEventClaimOk?:    (itemId: string, label: string) => void;
  onEventClaimError?: (message: string) => void;
  /** Fired when joining a featured zone during an active seasonal event — provides the decoration overlay key. */
  onSeasonOverlay?: (overlayKey: string, season: string) => void;
  onSeasonalShopData?:   (data: SeasonalShopData) => void;
  onSeasonalShopBuyOk?:  (itemId: string, label: string) => void;
  onSeasonalShopError?:  (message: string) => void;

  // Crafting callbacks
  /** Called when another player in the zone crafts an item. */
  onCraftEvent?: (playerName: string, itemName: string) => void;
  /** Called when the local player receives crafting material drops after a kill. */
  onLootDrop?: (items: string[]) => void;
  /** Called when a party need/greed/pass loot roll starts. */
  onLootRollStart?: (rollId: string, items: string[], timeoutMs: number) => void;
  /** Called when a party loot roll resolves with results. */
  onLootRollResult?: (rollId: string, items: string[], winnerName: string | null, rolls: Record<string, { choice: string; roll: number }>) => void;

  // Faction callbacks
  onFactionReputations?: (reputations: FactionRepEntry[]) => void;
  onFactionRepChanged?: (change: FactionRepChanged) => void;

  // Guild callbacks
  onGuildChatMessage?: (sender: string, text: string) => void;

  // Party callbacks
  onPartyInvited?: (fromSessionId: string, fromName: string) => void;
  onPartyUpdate?: (state: PartyState) => void;
  onPartyDisbanded?: (reason: string) => void;
  onPartyChat?: (sender: string, text: string) => void;
  onPartyXp?: (amount: number) => void;
  onPartyError?: (message: string) => void;
  onPartyInfo?: (message: string) => void;

  // Emote callbacks
  onEmote?: (event: EmoteEvent) => void;

  // Day/night time sync — server broadcasts authoritative zone hour
  onZoneTime?: (hour: number) => void;

  // World event / season callbacks
  onWorldEvents?: (events: WorldEventEntry[]) => void;
  onSeasonInfo?: (name: string) => void;

  // Social callbacks
  onFriendsList?: (friends: FriendEntry[]) => void;
  onFriendRequestReceived?: (fromName: string) => void;
  onFriendRequestAccepted?: (byName: string) => void;
  onFriendOnline?: (username: string) => void;
  onFriendOffline?: (username: string) => void;
  onSocialInfo?: (message: string) => void;
  onSocialError?: (message: string) => void;

  // Pet callbacks
  onPetList?:      (pets: PetData[]) => void;
  onPetAcquired?:  (pet: PetData, vendorCost: number) => void;
  onPetEquipped?:  (pet: PetData) => void;
  onPetFed?:       (petId: string, happiness: number) => void;
  onPetDismissed?: () => void;
  onPetHappiness?: (petId: string, happiness: number) => void;
  onPetError?:     (message: string) => void;

  // Trade callbacks
  onTradeInvited?: (fromSessionId: string, fromName: string) => void;
  onTradePending?: (withSessionId: string) => void;
  onTradeAccepted?: (withSessionId: string) => void;
  onTradeDeclined?: () => void;
  onTradeCancelled?: (reason: string) => void;
  onTradeOfferUpdated?: (offer: TradeOffer, fromInitiator: boolean) => void;
  onTradeAwaitingConfirm?: () => void;
  onTradeUnconfirmed?: () => void;
  onTradeComplete?: () => void;
  onTradeError?: (message: string) => void;

  constructor() {
    this.client = new Client(SERVER_URL);
  }

  // ── Connection ────────────────────────────────────────────────────────────

  /**
   * Attempt to join (or create) a zone room.
   * Returns true on success, false if server is unreachable.
   */
  async joinZone(
    zoneId: string,
    playerName: string,
    userId?: string,
  ): Promise<boolean> {
    // Store for reconnect attempts
    this.storedZoneId     = zoneId;
    this.storedPlayerName = playerName;
    this.storedUserId     = userId;

    try {
      const opts: Record<string, string> = { zoneId, playerName };
      if (userId) opts.userId = userId;

      this.room = await this.client.joinOrCreate<any>('zone', opts);
      this.mySessionId = this.room.sessionId;

      this.setupStateListeners();
      this.startPingLoop();
      console.log(`[MP] Joined zone ${zoneId} as session ${this.mySessionId}`);
      return true;
    } catch (err) {
      console.warn('[MP] Server unreachable — running solo:', (err as Error).message);
      return false;
    }
  }

  // ── State listeners ───────────────────────────────────────────────────────

  private setupStateListeners(): void {
    if (!this.room) return;
    const room = this.room;

    // ── Players ──────────────────────────────────────────────────────────
    room.state.players.onAdd((player: any, sessionId: string) => {
      this.players.set(sessionId, this.mapPlayer(sessionId, player));
      // Per-property change listener
      player.onChange(() => {
        this.players.set(sessionId, this.mapPlayer(sessionId, player));
      });
    });

    room.state.players.onRemove((_player: any, sessionId: string) => {
      this.players.delete(sessionId);
    });

    // ── Enemies ──────────────────────────────────────────────────────────
    room.state.enemies.onAdd((enemy: any, id: string) => {
      this.enemies.set(id, this.mapEnemy(id, enemy));
      enemy.onChange(() => {
        if (enemy.aiState === 'dead') {
          this.onEnemyRemoved?.(id);
          this.enemies.delete(id);
        } else {
          this.enemies.set(id, this.mapEnemy(id, enemy));
        }
      });
    });

    room.state.enemies.onRemove((_enemy: any, id: string) => {
      this.enemies.delete(id);
    });

    // ── Zone-level state ─────────────────────────────────────────────────
    let prevWave = 0;
    let prevWaveState = '';

    room.onStateChange((state: any) => {
      this.zoneState = {
        zoneId: state.zoneId,
        currentWave: state.currentWave,
        totalWaves: state.totalWaves,
        waveState: state.waveState,
        enemiesAlive: state.enemiesAlive,
      };
      if (state.currentWave !== prevWave || state.waveState !== prevWaveState) {
        prevWave = state.currentWave;
        prevWaveState = state.waveState;
        this.onWaveStateChange?.(state.currentWave, state.waveState);
      }
    });

    // ── Chat messages ────────────────────────────────────────────────────
    room.onMessage('chat', (msg: ChatIncomingMessage) => {
      this.onChatMessage?.(msg);
    });

    // ── Quest messages ────────────────────────────────────────────────────
    room.onMessage('quest_data', (msg: { quest: ClientQuest; isNew: boolean }) => {
      this.onQuestData?.(msg.quest, msg.isNew);
    });

    room.onMessage('quest_error', (msg: { message: string }) => {
      this.onQuestError?.(msg.message);
    });

    room.onMessage('quest_completed', (msg: { questId: string }) => {
      this.onQuestCompleted?.(msg.questId);
    });

    // ── Pet messages ──────────────────────────────────────────────────────
    room.onMessage('pet_list', (msg: { pets: PetData[] }) => {
      this.onPetList?.(msg.pets);
    });
    room.onMessage('pet_acquired', (msg: { pet: PetData; vendorCost: number }) => {
      this.onPetAcquired?.(msg.pet, msg.vendorCost);
    });
    room.onMessage('pet_equipped', (msg: { pet: PetData }) => {
      this.onPetEquipped?.(msg.pet);
    });
    room.onMessage('pet_fed', (msg: { petId: string; happiness: number }) => {
      this.onPetFed?.(msg.petId, msg.happiness);
    });
    room.onMessage('pet_dismissed', () => {
      this.onPetDismissed?.();
    });
    room.onMessage('pet_happiness', (msg: { petId: string; happiness: number }) => {
      this.onPetHappiness?.(msg.petId, msg.happiness);
    });
    room.onMessage('pet_error', (msg: { message: string }) => {
      this.onPetError?.(msg.message);
    });

    // ── Trade messages ────────────────────────────────────────────────────
    room.onMessage('trade_invited', (msg: { from: string; fromName: string }) => {
      this.onTradeInvited?.(msg.from, msg.fromName);
    });
    room.onMessage('trade_pending', (msg: { with: string }) => {
      this.onTradePending?.(msg.with);
    });
    room.onMessage('trade_accepted', (msg: { with: string }) => {
      this.onTradeAccepted?.(msg.with);
    });
    room.onMessage('trade_declined', () => {
      this.onTradeDeclined?.();
    });
    room.onMessage('trade_cancelled', (msg: { reason: string }) => {
      this.onTradeCancelled?.(msg.reason);
    });
    room.onMessage('trade_offer_updated', (msg: { offer: TradeOffer; fromInitiator: boolean }) => {
      this.onTradeOfferUpdated?.(msg.offer, msg.fromInitiator);
    });
    room.onMessage('trade_awaiting_confirm', () => {
      this.onTradeAwaitingConfirm?.();
    });
    room.onMessage('trade_unconfirmed', () => {
      this.onTradeUnconfirmed?.();
    });
    room.onMessage('trade_complete', () => {
      this.onTradeComplete?.();
    });
    room.onMessage('trade_error', (msg: { message: string }) => {
      this.onTradeError?.(msg.message);
    });

    // ── Faction messages ──────────────────────────────────────────────────
    room.onMessage('faction_reputations', (msg: { reputations: FactionRepEntry[] }) => {
      this.onFactionReputations?.(msg.reputations);
    });

    room.onMessage('faction_rep_changed', (msg: FactionRepChanged) => {
      this.onFactionRepChanged?.(msg);
    });

    // ── Guild messages ────────────────────────────────────────────────────
    room.onMessage('guild_chat', (msg: { sender: string; text: string }) => {
      this.onGuildChatMessage?.(msg.sender, msg.text);
    });

    // ── Party messages ────────────────────────────────────────────────────
    room.onMessage('party_invited', (msg: { fromSessionId: string; fromName: string }) => {
      this.onPartyInvited?.(msg.fromSessionId, msg.fromName);
    });
    room.onMessage('party_update', (msg: PartyState) => {
      this.onPartyUpdate?.(msg);
    });
    room.onMessage('party_disbanded', (msg: { reason: string }) => {
      this.onPartyDisbanded?.(msg.reason);
    });
    room.onMessage('party_chat', (msg: { sender: string; text: string }) => {
      this.onPartyChat?.(msg.sender, msg.text);
    });
    room.onMessage('party_xp', (msg: { amount: number }) => {
      this.onPartyXp?.(msg.amount);
    });
    room.onMessage('party_error', (msg: { message: string }) => {
      this.onPartyError?.(msg.message);
    });
    room.onMessage('party_info', (msg: { message: string }) => {
      this.onPartyInfo?.(msg.message);
    });

    // ── Crafting messages ─────────────────────────────────────────────────
    room.onMessage('craft_event', (msg: { playerName: string; itemName: string }) => {
      this.onCraftEvent?.(msg.playerName, msg.itemName);
    });
    room.onMessage('loot_drop', (msg: { items: string[] }) => {
      this.onLootDrop?.(msg.items);
    });
    room.onMessage('loot_roll_start', (msg: { rollId: string; items: string[]; timeoutMs: number }) => {
      this.onLootRollStart?.(msg.rollId, msg.items, msg.timeoutMs);
    });
    room.onMessage('loot_roll_result', (msg: { rollId: string; items: string[]; winnerName: string | null; rolls: Record<string, { choice: string; roll: number }> }) => {
      this.onLootRollResult?.(msg.rollId, msg.items, msg.winnerName, msg.rolls);
    });

    // ── Skill messages ────────────────────────────────────────────────────
    room.onMessage('skill_points_updated', (msg: { skillPoints: number }) => {
      this.onSkillPointsUpdated?.(msg.skillPoints);
    });
    room.onMessage('skill_alloc_ok', (msg: { skillId: string; skillPoints: number }) => {
      this.onSkillAllocOk?.(msg.skillId, msg.skillPoints);
    });
    room.onMessage('skill_hotbar_ok', (msg: { hotbar: string[] }) => {
      this.onSkillHotbarOk?.(msg.hotbar);
    });
    room.onMessage('skill_respec_ok', (msg: { skillPoints: number }) => {
      this.onSkillRespecOk?.(msg.skillPoints);
    });
    room.onMessage('skill_used', (msg: { skillId: string; cooldownMs: number; expiresAt: number }) => {
      this.onSkillUsed?.(msg.skillId, msg.cooldownMs, msg.expiresAt);
    });
    room.onMessage('skill_on_cooldown', (msg: { skillId: string; expiresAt: number }) => {
      this.onSkillOnCooldown?.(msg.skillId, msg.expiresAt);
    });
    room.onMessage('skill_error', (msg: { message: string }) => {
      this.onSkillError?.(msg.message);
    });

    // ── Prestige messages ─────────────────────────────────────────────────
    room.onMessage('prestige_state', (msg: { prestigeLevel: number; maxPrestige: number }) => {
      this.onPrestigeState?.(msg.prestigeLevel, msg.maxPrestige);
    });
    room.onMessage('prestige_reset_ok', (msg: { prestigeLevel: number; maxPrestige: number; bonuses: { statMultiplier: number } }) => {
      this.onPrestigeResetOk?.(msg.prestigeLevel, msg.maxPrestige, msg.bonuses);
    });
    room.onMessage('prestige_error', (msg: { message: string }) => {
      this.onPrestigeError?.(msg.message);
    });

    // ── Seasonal event messages ───────────────────────────────────────────
    room.onMessage('seasonal_event', (msg: {
      event: { id: string; name: string; description: string; endsAt: string; rewardTiers: Array<{ points: number; itemId: string; label: string; title?: string }> };
      participation: { points: number; claimedRewards: string[] };
    }) => {
      this.onSeasonalEvent?.(msg.event, msg.participation);
    });
    room.onMessage('seasonal_event_points', (msg: { eventId: string; pointsDelta: number; totalPoints: number }) => {
      this.onSeasonalEventPoints?.(msg.eventId, msg.pointsDelta, msg.totalPoints);
    });
    room.onMessage('event_claim_ok', (msg: { itemId: string; label: string }) => {
      this.onEventClaimOk?.(msg.itemId, msg.label);
    });
    room.onMessage('event_claim_error', (msg: { message: string }) => {
      this.onEventClaimError?.(msg.message);
    });
    room.onMessage('season_overlay', (msg: { overlayKey: string; season: string }) => {
      this.onSeasonOverlay?.(msg.overlayKey, msg.season);
    });
    room.onMessage('seasonal_shop_data', (msg: SeasonalShopData) => {
      this.onSeasonalShopData?.(msg);
    });
    room.onMessage('seasonal_shop_buy_ok', (msg: { itemId: string; label: string }) => {
      this.onSeasonalShopBuyOk?.(msg.itemId, msg.label);
    });
    room.onMessage('seasonal_shop_error', (msg: { message: string }) => {
      this.onSeasonalShopError?.(msg.message);
    });

    // ── Emote messages ────────────────────────────────────────────────────
    room.onMessage('emote', (msg: EmoteEvent) => {
      this.onEmote?.(msg);
    });

    // ── Day/night time sync ───────────────────────────────────────────────
    // Server broadcasts the authoritative zone hour (~once per game-minute)
    // so all players in the zone share the same time of day.
    room.onMessage('zone_time', (msg: { hour: number }) => {
      this.onZoneTime?.(msg.hour);
    });

    // ── World event / season messages ─────────────────────────────────────
    room.onMessage('world_events', (msg: { events: WorldEventEntry[] }) => {
      this.onWorldEvents?.(msg.events);
    });
    room.onMessage('season_info', (msg: { name: string }) => {
      this.onSeasonInfo?.(msg.name);
    });

    // ── Social messages ───────────────────────────────────────────────────
    room.onMessage('friends_list', (msg: { friends: FriendEntry[] }) => {
      this.onFriendsList?.(msg.friends);
    });
    room.onMessage('friend_request_received', (msg: { fromName: string }) => {
      this.onFriendRequestReceived?.(msg.fromName);
    });
    room.onMessage('friend_request_accepted', (msg: { byName: string }) => {
      this.onFriendRequestAccepted?.(msg.byName);
    });
    room.onMessage('friend_online', (msg: { username: string }) => {
      this.onFriendOnline?.(msg.username);
    });
    room.onMessage('friend_offline', (msg: { username: string }) => {
      this.onFriendOffline?.(msg.username);
    });
    room.onMessage('social_info', (msg: { message: string }) => {
      this.onSocialInfo?.(msg.message);
    });
    room.onMessage('social_error', (msg: { message: string }) => {
      this.onSocialError?.(msg.message);
    });

    // ── Ping / latency measurement ────────────────────────────────────────
    room.onMessage('pong', (msg: { t: number }) => {
      const rtt = Date.now() - (msg.t as number);
      this.latencyMs = rtt;
      this.onLatencyUpdate?.(rtt);
    });

    // ── Server maintenance notice ─────────────────────────────────────────
    room.onMessage('server_maintenance', (msg: { minutesLeft: number }) => {
      this.onMaintenanceNotice?.(msg.minutesLeft as number);
    });

    // ── Connection events ────────────────────────────────────────────────
    room.onLeave(() => {
      console.warn('[MP] Left room');
      this.stopPingLoop();
      this.room = null;
      if (this.isReconnecting) return; // already in reconnect loop
      this.isReconnecting = true;
      // 20 attempts × 3 s each = 60 s total window
      this.reconnectLeft = 20;
      this.onConnectionLost?.();
      this.scheduleReconnect();
    });

    room.onError((code: number, msg?: string) => {
      console.error('[MP] Room error:', code, msg);
    });
  }

  // ── Mapping (server → client coords) ─────────────────────────────────────

  private mapPlayer(sessionId: string, p: any): RemotePlayer {
    return {
      sessionId,
      name: (p.name as string) ?? 'Hero',
      x: (p.x as number) * COORD_SCALE,
      y: (p.y as number) * COORD_SCALE,
      hp: p.hp as number,
      maxHp: p.maxHp as number,
      level: p.level as number,
      isAttacking: p.isAttacking as boolean,
      guildTag: (p.guildTag as string) ?? '',
      partyId: (p.partyId as string) ?? '',
      prestigeLevel: (p.prestigeLevel as number) ?? 0,
      equippedPetType: (p.equippedPetType as string) ?? '',
      petHappiness: (p.petHappiness as number) ?? 0,
      petLevel: (p.petLevel as number) ?? 1,
    };
  }

  private mapEnemy(id: string, e: any): RemoteEnemy {
    return {
      id,
      type: (e.type as string) ?? 'slime',
      x: (e.x as number) * COORD_SCALE,
      y: (e.y as number) * COORD_SCALE,
      hp: e.hp as number,
      maxHp: e.maxHp as number,
      aiState: (e.aiState as string) ?? 'patrol',
    };
  }

  // ── Outbound messages ─────────────────────────────────────────────────────

  /** Send local player position to server (client coords → server coords). */
  sendMove(x: number, y: number, facingX: number, facingY: number): void {
    if (!this.room) return;
    this.room.send('move', {
      x: x / COORD_SCALE,
      y: y / COORD_SCALE,
      facingX,
      facingY,
    });
  }

  /** Notify server of a melee attack. */
  sendAttack(): void {
    this.room?.send('attack');
  }

  /** Trigger quest generation by interacting with an NPC. */
  sendQuestNpcInteract(npcId: string): void {
    this.room?.send('quest_npc_interact', { npcId });
  }

  /** Send the player's dialogue choice to the server (for rep delta processing). */
  sendDialogueChoice(questId: string, choiceId: string, repDelta?: number, factionId?: string): void {
    this.room?.send('dialogue_choice', { questId, choiceId, repDelta, factionId });
  }

  /** Mark a quest as completed on the server. */
  sendQuestComplete(questId: string): void {
    this.room?.send('quest_complete', { questId });
  }

  /**
   * Send a chat message.
   * @param text Message body (max 140 chars, sanitised server-side).
   * @param whisperTo Optional player name for a private message.
   */
  sendChat(text: string, whisperTo?: string): void {
    if (!this.room || !text.trim()) return;
    const msg: { text: string; whisperTo?: string } = { text: text.trim() };
    if (whisperTo) msg.whisperTo = whisperTo;
    this.room.send('chat', msg);
  }

  // ── Trade outbound messages ───────────────────────────────────────────────

  sendTradeRequest(targetSessionId: string): void {
    this.room?.send('trade_request', { targetSessionId });
  }

  sendTradeRespond(accept: boolean): void {
    this.room?.send('trade_respond', { accept });
  }

  sendTradeOffer(items: TradeOfferItem[], gold: number): void {
    this.room?.send('trade_offer', { items, gold });
  }

  sendTradeConfirm(confirmed: boolean): void {
    this.room?.send('trade_confirm', { confirmed });
  }

  sendTradeCancel(): void {
    this.room?.send('trade_cancel');
  }

  // ── Skill tree messages ───────────────────────────────────────────────────

  sendLevelUp(): void {
    this.room?.send('level_up');
  }

  sendPrestigeReset(): void {
    this.room?.send('prestige_reset');
  }

  sendEventClaimReward(itemId: string): void {
    this.room?.send('event_claim_reward', { itemId });
  }

  sendSeasonalShopOpen(): void {
    this.room?.send('seasonal_shop_open');
  }

  sendSeasonalShopBuy(itemId: string): void {
    this.room?.send('seasonal_shop_buy', { itemId });
  }

  sendSkillUse(skillId: string): void {
    this.room?.send('skill_use', { skillId });
  }

  sendSkillAlloc(skillId: string): void {
    this.room?.send('skill_alloc', { skillId });
  }

  sendSkillHotbar(hotbar: string[]): void {
    this.room?.send('skill_hotbar', { hotbar });
  }

  sendSkillClass(classId: string): void {
    this.room?.send('skill_class', { classId });
  }

  sendSkillRespec(): void {
    this.room?.send('skill_respec', { confirm: true });
  }

  // ── Pet messages ──────────────────────────────────────────────────────────

  sendPetEquip(petId: string): void {
    this.room?.send('pet:equip', { petId });
  }

  sendPetFeed(petId: string): void {
    this.room?.send('pet:feed', { petId });
  }

  sendPetDismiss(): void {
    this.room?.send('pet:dismiss');
  }

  sendPetAcquire(petType: string): void {
    this.room?.send('pet:acquire', { petType });
  }

  sendPetList(): void {
    this.room?.send('pet:list');
  }

  // ── Guild messages ────────────────────────────────────────────────────────

  /** Send a message to guild members in this zone. */
  sendGuildChat(text: string): void {
    if (!this.room || !text.trim()) return;
    this.room.send('guild_chat', { text: text.trim() });
  }

  // ── Party messages ─────────────────────────────────────────────────────────

  sendPartyInvite(targetSessionId: string): void {
    this.room?.send('party_invite', { targetSessionId });
  }

  sendPartyRespond(accept: boolean): void {
    this.room?.send('party_respond', { accept });
  }

  sendPartyLeave(): void {
    this.room?.send('party_leave');
  }

  sendPartyKick(targetSessionId: string): void {
    this.room?.send('party_kick', { targetSessionId });
  }

  sendPartyLootMode(mode: 'round_robin' | 'need_greed'): void {
    this.room?.send('party_loot_mode', { mode });
  }

  sendPartyChat(text: string): void {
    if (!this.room || !text.trim()) return;
    this.room.send('party_chat', { text: text.trim() });
  }

  sendLootRollChoice(rollId: string, choice: 'need' | 'greed' | 'pass'): void {
    this.room?.send('loot_roll_response', { rollId, choice });
  }

  // ── Moderation messages ───────────────────────────────────────────────────

  /** Submit a player abuse report for the named player in this zone. */
  sendReport(reportedName: string, reason?: string): void {
    if (!this.room || !reportedName.trim()) return;
    this.room.send('report_player', { reportedName: reportedName.trim(), reason: reason ?? '' });
  }

  // ── Crafting messages ─────────────────────────────────────────────────────

  /** Notify other zone players that this player just crafted an item. */
  sendCraftNotify(itemId: string, itemName: string): void {
    this.room?.send('craft_notify', { itemId, itemName });
  }

  // ── Emote messages ────────────────────────────────────────────────────────

  sendEmote(emoteId: EmoteId): void {
    this.room?.send('emote', { emoteId });
  }

  // ── Social messages ───────────────────────────────────────────────────────

  sendFriendRequest(targetName: string): void {
    this.room?.send('friend_request', { targetName });
  }

  sendFriendRespond(requesterName: string, accept: boolean): void {
    this.room?.send('friend_respond', { requesterName, accept });
  }

  sendFriendRemove(targetName: string): void {
    this.room?.send('friend_remove', { targetName });
  }

  sendBlockPlayer(targetName: string): void {
    this.room?.send('block_player', { targetName });
  }

  sendUnblockPlayer(targetName: string): void {
    this.room?.send('unblock_player', { targetName });
  }

  sendRequestFriendsList(): void {
    this.room?.send('friends_list', {});
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.room !== null;
  }

  async disconnect(): Promise<void> {
    // Cancel any in-flight reconnect attempts before leaving intentionally
    this.isReconnecting = false;
    this.stopPingLoop();
    this.stopReconnect();
    await this.room?.leave();
    this.room = null;
  }

  // ── Ping helpers ──────────────────────────────────────────────────────────

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingIntervalId = setInterval(() => {
      if (this.room) {
        this.room.send('ping', { t: Date.now() });
      }
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  // ── Reconnect helpers ─────────────────────────────────────────────────────

  private stopReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectLeft <= 0 || !this.isReconnecting) {
      this.isReconnecting = false;
      this.onDisconnected?.();
      return;
    }

    this.reconnectLeft--;

    this.reconnectTimer = setTimeout(async () => {
      if (!this.isReconnecting) return;
      try {
        const opts: Record<string, string> = {
          zoneId:     this.storedZoneId,
          playerName: this.storedPlayerName,
        };
        if (this.storedUserId) opts.userId = this.storedUserId;

        this.room = await this.client.joinOrCreate<any>('zone', opts);
        this.mySessionId = this.room.sessionId;
        this.setupStateListeners();
        this.startPingLoop();
        this.isReconnecting = false;
        console.log('[MP] Reconnected successfully');
        this.onReconnected?.();
      } catch {
        console.warn(`[MP] Reconnect attempt failed (${this.reconnectLeft} left)`);
        this.scheduleReconnect();
      }
    }, 3000);
  }
}
