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

export interface ClientQuestDialogue {
  greeting: string;
  acceptance: string;
  completion: string;
}

export interface ClientQuest {
  id: string;
  zoneId: string;
  questType: string;
  title: string;
  description: string;
  objectives: ClientQuestObjective[];
  rewards: ClientQuestReward;
  dialogue: ClientQuestDialogue;
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

  // ── Callbacks set by GameScene ────────────────────────────────────────────

  onWaveStateChange?: (wave: number, waveState: string) => void;
  onEnemyRemoved?: (id: string) => void;
  onDisconnected?: () => void;
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

  // Crafting callbacks
  /** Called when another player in the zone crafts an item. */
  onCraftEvent?: (playerName: string, itemName: string) => void;
  /** Called when the local player receives crafting material drops after a kill. */
  onLootDrop?: (items: string[]) => void;

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
    try {
      const opts: Record<string, string> = { zoneId, playerName };
      if (userId) opts.userId = userId;

      this.room = await this.client.joinOrCreate<any>('zone', opts);
      this.mySessionId = this.room.sessionId;

      this.setupStateListeners();
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

    // ── Crafting messages ─────────────────────────────────────────────────
    room.onMessage('craft_event', (msg: { playerName: string; itemName: string }) => {
      this.onCraftEvent?.(msg.playerName, msg.itemName);
    });
    room.onMessage('loot_drop', (msg: { items: string[] }) => {
      this.onLootDrop?.(msg.items);
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

    // ── Connection events ────────────────────────────────────────────────
    room.onLeave(() => {
      console.warn('[MP] Left room');
      this.room = null;
      this.onDisconnected?.();
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

  // ── Crafting messages ─────────────────────────────────────────────────────

  /** Notify other zone players that this player just crafted an item. */
  sendCraftNotify(itemId: string, itemName: string): void {
    this.room?.send('craft_notify', { itemId, itemName });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.room !== null;
  }

  async disconnect(): Promise<void> {
    await this.room?.leave();
    this.room = null;
  }
}
