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

  // ── Helpers ───────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.room !== null;
  }

  async disconnect(): Promise<void> {
    await this.room?.leave();
    this.room = null;
  }
}
