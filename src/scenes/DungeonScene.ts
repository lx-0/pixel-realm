/**
 * DungeonScene — procedural dungeon gameplay scene.
 *
 * Connects to a Colyseus DungeonRoom and renders:
 *   - Procedurally colored rooms (palette per room type)
 *   - Players and enemies synced from server state
 *   - Dungeon HUD (room progress, boss HP bar, wave indicator)
 *   - Completion/exit flow back to GameScene
 *
 * Entry: scene.start(SCENES.DUNGEON, DungeonSceneData)
 * Exit:  returns to GameScene with zoneId preserved.
 */

import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { MultiplayerClient } from '../systems/MultiplayerClient';

// ── Data contracts ─────────────────────────────────────────────────────────────

export interface DungeonSceneData {
  tier:        number;
  playerName:  string;
  userId?:     string;
  token?:      string;
  returnZone?: string; // zone to return to on exit
  playerLevel: number;
}

// ── Room palettes ─────────────────────────────────────────────────────────────

const ROOM_PALETTES: Record<string, { bg: number; floor: number; wall: number; accent: number }> = {
  spawn:    { bg: 0x0a0a14, floor: 0x1a1a2e, wall: 0x0d0d1a, accent: 0x4488cc },
  combat:   { bg: 0x140808, floor: 0x2a1010, wall: 0x1a0808, accent: 0xcc4422 },
  arena:    { bg: 0x140a04, floor: 0x2a1a08, wall: 0x1a0e04, accent: 0xdd8833 },
  elite:    { bg: 0x100414, floor: 0x200828, wall: 0x140414, accent: 0xaa44cc },
  treasure: { bg: 0x0a0e04, floor: 0x1a2208, wall: 0x0e1504, accent: 0xaacc22 },
  boss:     { bg: 0x0e0404, floor: 0x200808, wall: 0x140404, accent: 0xff2244 },
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  spawn:    'Entry Hall',
  combat:   'Combat Chamber',
  arena:    'Arena Gauntlet',
  elite:    'Elite Chamber',
  treasure: 'Treasure Vault',
  boss:     'Boss Chamber',
};

const TIER_NAMES: Record<number, string> = {
  1: 'Novice',
  2: 'Champion',
  3: 'Legendary',
  4: 'Nightmare',
};

// ── Enemy type colors (matches client constants.ts ENEMY_TYPES) ───────────────

const ENEMY_COLORS: Record<string, number> = {
  slime:        0x44dd44,
  mushroom:     0xcc8844,
  beetle:       0x884422,
  bandit:       0xcc4444,
  wraith:       0x8844dd,
  archer:       0xcc8822,
  golem:        0x888888,
  raider:       0xcc6644,
  wisp:         0x44ccff,
  crystal_golem: 0x88ddff,
  frost_wolf:   0xaaddff,
  ice_elemental:0x44aaff,
  deep_angler:  0x334488,
  rift_walker:  0x8844cc,
  eclipse_knight: 0x554466,
  shattered_golem: 0x997755,
  elemental_amalgam: 0xdd6633,
  nexus_guardian: 0x4488dd,
  twilight_sentinel: 0xaa55ff,
  spire_sentinel: 0xffdd44,
  // Boss types
  dungeon_keeper: 0xddaa44,
  shadow_warden:  0x446688,
  abyssal_overlord: 0xcc4466,
  abyssal_kraken_lord: 0x224466,
  ancient_dracolich: 0xaaaa44,
  void_architect: 0x8844aa,
  the_unmaker:    0xcc2244,
  nexus_overseer: 0x4466cc,
  astral_sovereign: 0x88ccff,
};

// ── DungeonScene ──────────────────────────────────────────────────────────────

export class DungeonScene extends Phaser.Scene {

  private data_!: DungeonSceneData;

  // Colyseus room (may be null in solo fallback)
  private dungeonRoom: import('colyseus.js').Room | null = null;
  private mp: MultiplayerClient | null = null;
  private mySessionId = '';

  // Dungeon state (synced from server)
  private currentRoom  = 0;
  private totalRooms   = 7;
  private roomType     = 'spawn';
  private dungeonState = 'preparing';
  private bossType     = '';
  private bossPhase    = 0;
  private enemiesAlive = 0;
  private tier         = 1;

  // Sprites
  private playerSprites  = new Map<string, Phaser.GameObjects.Rectangle>();
  private playerLabels   = new Map<string, Phaser.GameObjects.Text>();
  private enemySprites   = new Map<string, Phaser.GameObjects.Rectangle>();
  private projSprites    = new Map<string, Phaser.GameObjects.Arc>();

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // HUD
  private hudRoomText!: Phaser.GameObjects.Text;
  private hudTypeText!: Phaser.GameObjects.Text;
  private hudEnemiesText!: Phaser.GameObjects.Text;
  private bossHpBarBg!: Phaser.GameObjects.Rectangle;
  private bossHpBarFill!: Phaser.GameObjects.Rectangle;
  private bossHpLabel!: Phaser.GameObjects.Text;
  private arenaWaveText!: Phaser.GameObjects.Text;
  private noticeText!: Phaser.GameObjects.Text;

  // World
  private bgRect!: Phaser.GameObjects.Rectangle;
  private floorGraphics!: Phaser.GameObjects.Graphics;
  private wallGraphics!: Phaser.GameObjects.Graphics;

  // Player state
  private localPlayerX    = 160;
  private localPlayerY    = 90;
  private lastSentX       = -1;
  private lastSentY       = -1;
  private lastMoveAt      = 0;
  private lastAttackAt    = 0;
  private bonusXp         = 0;

  constructor() {
    super(SCENES.DUNGEON);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(data: DungeonSceneData) {
    this.data_      = data;
    this.tier       = data.tier ?? 1;
    this.dungeonRoom = null;
    this.mySessionId = '';
    this.playerSprites.clear();
    this.playerLabels.clear();
    this.enemySprites.clear();
    this.projSprites.clear();
    this.bonusXp = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');

    this.buildRoomVisuals('spawn');
    this.createHUD();
    this.setupInput();

    // Attempt server connection
    this.connectToServer();

    // Show connecting notice
    this.showNotice(`Connecting to Tier ${this.tier} dungeon...`);
  }

  update() {
    if (this.dungeonState === 'complete' || this.dungeonState === 'preparing') return;
    this.sendMoveIfChanged();
  }

  // ── Server Connection ─────────────────────────────────────────────────────

  private async connectToServer() {
    try {
      this.mp = new MultiplayerClient();
      this.dungeonRoom = await this.mp.joinDungeon(
        this.tier,
        this.data_.playerName,
        this.data_.userId,
        this.data_.token,
      );

      if (!this.dungeonRoom) {
        this.showNotice('Server unavailable — running solo sim');
        this.startSoloSim();
        return;
      }

      this.mySessionId = this.dungeonRoom.sessionId;
      this.setupRoomListeners(this.dungeonRoom);
      this.showNotice(`Waiting for party... (${TIER_NAMES[this.tier] ?? `T${this.tier}`})`);
    } catch (err) {
      console.warn('[DungeonScene] Connection failed:', (err as Error).message);
      this.showNotice('Solo dungeon (offline)');
      this.startSoloSim();
    }
  }

  private setupRoomListeners(room: import('colyseus.js').Room) {
    const state = room.state;

    // ── State sync ──────────────────────────────────────────────────────────
    state.onChange(() => {
      this.currentRoom  = state.currentRoom  ?? this.currentRoom;
      this.totalRooms   = state.totalRooms   ?? this.totalRooms;
      this.roomType     = state.roomType     ?? this.roomType;
      this.dungeonState = state.dungeonState ?? this.dungeonState;
      this.bossType     = state.bossType     ?? this.bossType;
      this.bossPhase    = state.bossPhase    ?? this.bossPhase;
      this.enemiesAlive = state.enemiesAlive ?? this.enemiesAlive;
      this.updateHUD();
    });

    state.players?.onAdd?.((player: any, sid: string) => {
      const r = this.add.rectangle(player.x * 2, player.y * 2, 10, 14, 0x44aaff).setDepth(10);
      const lbl = this.add.text(player.x * 2, player.y * 2 - 12, player.name ?? 'Hero', {
        fontSize: '4px', color: '#88ddff', fontFamily: 'monospace',
      }).setOrigin(0.5, 1).setDepth(11);
      this.playerSprites.set(sid, r);
      this.playerLabels.set(sid, lbl);

      player.onChange?.(() => {
        const px = player.x * 2, py = player.y * 2;
        r.setPosition(px, py);
        lbl.setPosition(px, py - 12);
        // HP/mana not locally tracked in this scene
      });
    });

    state.players?.onRemove?.((_: any, sid: string) => {
      this.playerSprites.get(sid)?.destroy();
      this.playerLabels.get(sid)?.destroy();
      this.playerSprites.delete(sid);
      this.playerLabels.delete(sid);
    });

    state.enemies?.onAdd?.((enemy: any, id: string) => {
      if (enemy.aiState === 'dead') return;
      const color = ENEMY_COLORS[enemy.type] ?? 0xdd4422;
      const r = this.add.rectangle(enemy.x * 2, enemy.y * 2, 12, 12, color).setDepth(9);
      this.enemySprites.set(id, r);

      enemy.onChange?.(() => {
        if (enemy.aiState === 'dead') {
          r.setAlpha(0); return;
        }
        r.setPosition(enemy.x * 2, enemy.y * 2);
      });
    });

    state.enemies?.onRemove?.((_: any, id: string) => {
      this.enemySprites.get(id)?.destroy();
      this.enemySprites.delete(id);
    });

    state.projectiles?.onAdd?.((proj: any, id: string) => {
      const arc = this.add.circle(proj.x * 2, proj.y * 2, 3, 0xff8844).setDepth(8);
      this.projSprites.set(id, arc);

      proj.onChange?.(() => arc.setPosition(proj.x * 2, proj.y * 2));
    });

    state.projectiles?.onRemove?.((_: any, id: string) => {
      this.projSprites.get(id)?.destroy();
      this.projSprites.delete(id);
    });

    // ── Room messages ───────────────────────────────────────────────────────
    room.onMessage('dungeon_start', (data: any) => {
      this.showNotice(`Dungeon started! Party: ${data.partySize}`);
      this.time.delayedCall(2000, () => this.hideNotice());
    });

    room.onMessage('room_enter', (data: any) => {
      this.currentRoom = data.room;
      this.totalRooms  = data.total;
      this.roomType    = data.type;
      this.buildRoomVisuals(data.type);
      this.showNotice(`Room ${data.room + 1}/${data.total}: ${ROOM_TYPE_LABELS[data.type] ?? data.type}`);
      this.time.delayedCall(2500, () => this.hideNotice());
      this.updateHUD();

      if (data.type === 'boss') {
        this.cameras.main.flash(300, 200, 0, 0);
        this.showNotice(`BOSS: ${this.bossType.replace(/_/g, ' ').toUpperCase()}`);
        this.time.delayedCall(3000, () => this.hideNotice());
      }
    });

    room.onMessage('room_cleared', () => {
      this.showNotice('Room cleared!');
      this.time.delayedCall(1500, () => this.hideNotice());
    });

    room.onMessage('arena_wave', (data: any) => {
      this.arenaWaveText.setText(`Wave ${data.wave}/${data.maxWaves}`).setVisible(true);
      this.showNotice(`Arena Wave ${data.wave}/${data.maxWaves}!`);
      this.time.delayedCall(2000, () => this.hideNotice());
    });

    room.onMessage('elite_room_enter', (data: any) => {
      this.showNotice(`Elite Chamber — ${data.count} Elite ${data.count > 1 ? 'enemies' : 'enemy'}!`);
      this.time.delayedCall(2500, () => this.hideNotice());
    });

    room.onMessage('boss_enter', (data: any) => {
      this.bossType = data.bossType;
      this.showBossHpBar(data.bossHp, data.bossHp);
    });

    room.onMessage('boss_phase', (data: any) => {
      this.bossPhase = data.phase;
      this.cameras.main.shake(300, 0.012);
      this.showNotice(`PHASE ${data.phase}: ${data.label.toUpperCase()}!`);
      this.time.delayedCall(2500, () => this.hideNotice());
    });

    room.onMessage('dungeon_bonus_xp', (data: any) => {
      this.bonusXp = data.amount;
    });

    room.onMessage('dungeon_complete', (_data: unknown) => {
      this.dungeonState = 'complete';
      this.hideBossHpBar();
      this.cameras.main.flash(500, 100, 220, 100);
      this.showNotice(`Dungeon Complete!\n+${this.bonusXp} Bonus XP`);
      this.time.delayedCall(4000, () => this.returnToGame());
    });

    room.onMessage('loot_drop', (data: any) => {
      const items: string[] = data.items ?? [];
      this.showNotice(`Loot: ${items.join(', ')}`);
      this.time.delayedCall(2500, () => this.hideNotice());
    });

    room.onMessage('achievements_unlocked', (data: any) => {
      const names = (data.achievements as any[]).map(a => a.title).join(', ');
      this.showNotice(`Achievement: ${names}!`);
      this.time.delayedCall(3500, () => this.hideNotice());
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private setupInput() {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => this.sendAttack());
    this.input.keyboard.on('keydown-ESC',   () => this.returnToGame());
  }

  private sendMoveIfChanged() {
    const SPEED = 80;
    const dt    = 1 / 60;
    let moved   = false;
    const now   = Date.now();

    if (this.cursors?.left?.isDown)  { this.localPlayerX -= SPEED * dt; moved = true; }
    if (this.cursors?.right?.isDown) { this.localPlayerX += SPEED * dt; moved = true; }
    if (this.cursors?.up?.isDown)    { this.localPlayerY -= SPEED * dt; moved = true; }
    if (this.cursors?.down?.isDown)  { this.localPlayerY += SPEED * dt; moved = true; }

    this.localPlayerX = Math.max(20, Math.min(300, this.localPlayerX));
    this.localPlayerY = Math.max(10, Math.min(170, this.localPlayerY));

    if (moved || (now - this.lastMoveAt > 100 && (this.localPlayerX !== this.lastSentX || this.localPlayerY !== this.lastSentY))) {
      this.dungeonRoom?.send('move', {
        x: this.localPlayerX, y: this.localPlayerY,
        facingX: this.cursors?.right?.isDown ? 1 : -1,
        facingY: 0,
      });
      this.lastSentX  = this.localPlayerX;
      this.lastSentY  = this.localPlayerY;
      this.lastMoveAt = now;
    }

    // Update local player sprite position
    const localSprite = this.playerSprites.get(this.mySessionId);
    if (localSprite) localSprite.setPosition(this.localPlayerX * 2, this.localPlayerY * 2);
  }

  private sendAttack() {
    if (Date.now() - this.lastAttackAt < 500) return;
    this.lastAttackAt = Date.now();
    this.dungeonRoom?.send('attack');
  }

  // ── Room Visuals ──────────────────────────────────────────────────────────

  private buildRoomVisuals(roomType: string) {
    const palette = ROOM_PALETTES[roomType] ?? ROOM_PALETTES['combat'];
    const W = CANVAS.WIDTH;
    const H = CANVAS.HEIGHT;
    const WALL = 24;

    this.bgRect?.destroy();
    this.floorGraphics?.destroy();
    this.wallGraphics?.destroy();

    this.bgRect = this.add.rectangle(W / 2, H / 2, W, H, palette.bg).setDepth(0);

    const fg = this.add.graphics().setDepth(1);
    // Floor
    fg.fillStyle(palette.floor);
    fg.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    // Floor detail lines
    fg.lineStyle(1, palette.accent, 0.08);
    for (let x = WALL; x < W - WALL; x += 16) fg.lineBetween(x, WALL, x, H - WALL);
    for (let y = WALL; y < H - WALL; y += 16) fg.lineBetween(WALL, y, W - WALL, y);
    // Corner accents
    fg.lineStyle(1, palette.accent, 0.6);
    fg.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    this.floorGraphics = fg;

    const wg = this.add.graphics().setDepth(2);
    wg.fillStyle(palette.wall);
    wg.fillRect(0, 0, W, WALL);
    wg.fillRect(0, H - WALL, W, WALL);
    wg.fillRect(0, WALL, WALL, H - WALL * 2);
    wg.fillRect(W - WALL, WALL, WALL, H - WALL * 2);
    // Wall edge highlight
    wg.lineStyle(1, palette.accent, 0.4);
    wg.strokeRect(1, 1, W - 2, H - 2);
    this.wallGraphics = wg;

    this.cameras.main.setBackgroundColor(`#${palette.bg.toString(16).padStart(6, '0')}`);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private createHUD() {
    const sf = 0; // scrollFactor
    const d  = 50;

    // Room progress
    this.hudRoomText = this.add.text(4, 4,
      `Room 0/${this.totalRooms} — Tier ${TIER_NAMES[this.tier] ?? this.tier}`,
      { fontSize: '5px', color: '#aaaaaa', fontFamily: 'monospace' },
    ).setScrollFactor(sf).setDepth(d);

    this.hudTypeText = this.add.text(4, 12, '',
      { fontSize: '5px', color: '#cccccc', fontFamily: 'monospace' },
    ).setScrollFactor(sf).setDepth(d);

    this.hudEnemiesText = this.add.text(4, 20, '',
      { fontSize: '4px', color: '#ff8866', fontFamily: 'monospace' },
    ).setScrollFactor(sf).setDepth(d);

    // Arena wave indicator
    this.arenaWaveText = this.add.text(CANVAS.WIDTH / 2, 6, '',
      { fontSize: '5px', color: '#ffaa44', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(d).setVisible(false);

    // Boss HP bar
    const bw = CANVAS.WIDTH - 40;
    const bx = 20;
    const by = CANVAS.HEIGHT - 14;
    this.bossHpBarBg = this.add.rectangle(bx, by, bw, 5, 0x330000)
      .setOrigin(0, 0).setScrollFactor(sf).setDepth(d).setVisible(false);
    this.bossHpBarFill = this.add.rectangle(bx, by, bw, 5, 0xff2244)
      .setOrigin(0, 0).setScrollFactor(sf).setDepth(d + 1).setVisible(false);
    this.bossHpLabel = this.add.text(CANVAS.WIDTH / 2, by - 8, '',
      { fontSize: '4px', color: '#ff8888', fontFamily: 'monospace' },
    ).setOrigin(0.5, 1).setScrollFactor(sf).setDepth(d + 1).setVisible(false);

    // Notice text (center of screen)
    this.noticeText = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, '',
      {
        fontSize: '8px', color: '#ffffff', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2, align: 'center',
      },
    ).setOrigin(0.5).setScrollFactor(sf).setDepth(d + 5).setVisible(false);

    // ESC hint
    this.add.text(CANVAS.WIDTH - 4, 4, '[ESC] Exit',
      { fontSize: '4px', color: '#666666', fontFamily: 'monospace' },
    ).setOrigin(1, 0).setScrollFactor(sf).setDepth(d);
  }

  private updateHUD() {
    this.hudRoomText.setText(`Room ${this.currentRoom + 1}/${this.totalRooms} — ${TIER_NAMES[this.tier] ?? `T${this.tier}`}`);
    this.hudTypeText.setText(ROOM_TYPE_LABELS[this.roomType] ?? this.roomType);
    if (this.enemiesAlive > 0) {
      this.hudEnemiesText.setText(`Enemies: ${this.enemiesAlive}`);
    } else {
      this.hudEnemiesText.setText('');
    }
    if (this.roomType !== 'arena') this.arenaWaveText.setVisible(false);
  }

  private showBossHpBar(current: number, max: number) {
    const bw = CANVAS.WIDTH - 40;
    const fill = max > 0 ? Math.max(0, current / max) : 0;
    this.bossHpBarBg.setVisible(true);
    this.bossHpBarFill.setSize(Math.round(bw * fill), this.bossHpBarFill.height).setVisible(true);
    this.bossHpLabel.setText(
      `${this.bossType.replace(/_/g, ' ').toUpperCase()} — HP ${current}/${max}`,
    ).setVisible(true);
  }

  private hideBossHpBar() {
    this.bossHpBarBg.setVisible(false);
    this.bossHpBarFill.setVisible(false);
    this.bossHpLabel.setVisible(false);
  }

  private showNotice(msg: string) {
    this.noticeText.setText(msg).setVisible(true).setAlpha(1);
  }

  private hideNotice() {
    this.tweens.add({
      targets: this.noticeText,
      alpha: 0,
      duration: 400,
      onComplete: () => this.noticeText.setVisible(false),
    });
  }

  // ── Solo Simulation (offline fallback) ────────────────────────────────────

  /**
   * Simple solo sim: walk through a fixed 7-room sequence, auto-clearing each room.
   * No real combat — just demonstrates the dungeon flow without a server.
   */
  private startSoloSim() {
    const rooms: string[] = ['spawn', 'combat', 'arena', 'elite', 'treasure', 'boss'];
    let idx = 0;

    const advanceRoom = () => {
      if (idx >= rooms.length) {
        this.dungeonState = 'complete';
        this.showNotice('Dungeon Complete! (solo sim)');
        this.time.delayedCall(3000, () => this.returnToGame());
        return;
      }
      const type = rooms[idx];
      this.roomType = type;
      this.currentRoom = idx;
      this.totalRooms = rooms.length;
      this.buildRoomVisuals(type);
      this.showNotice(`Room ${idx + 1}/${rooms.length}: ${ROOM_TYPE_LABELS[type] ?? type}`);
      idx++;
      this.time.delayedCall(type === 'boss' ? 5000 : 3000, advanceRoom);
    };

    this.dungeonState = 'room_active';
    this.time.delayedCall(1000, advanceRoom);
  }

  // ── Exit ──────────────────────────────────────────────────────────────────

  private returnToGame() {
    this.dungeonRoom?.leave();
    this.dungeonRoom = null;
    this.cameras.main.fadeOut(600, 0, 0, 0, () => {
      this.scene.start(SCENES.GAME, {
        zoneId: this.data_.returnZone ?? 'zone10',
        playerName: this.data_.playerName,
        userId: this.data_.userId,
      });
    });
  }
}
