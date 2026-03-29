/**
 * WorldBossScene — world boss encounter gameplay scene.
 *
 * Connects to a Colyseus WorldBossRoom and renders:
 *   - Dramatic boss arena background (endgame zone palette)
 *   - Boss health bar + phase indicators
 *   - Player attack input → damage messages to server
 *   - Contribution leaderboard sidebar
 *   - Victory / expiry splash screen
 *   - Return to GameScene on exit
 *
 * Entry: scene.start(SCENES.WORLD_BOSS, WorldBossSceneData)
 * Exit:  returns to GameScene with zoneId preserved.
 */

import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { MultiplayerClient } from '../systems/MultiplayerClient';

// ── Data contracts ─────────────────────────────────────────────────────────────

export interface WorldBossSceneData {
  roomId:       string;
  instanceId:   string;
  bossId:       string;
  bossName:     string;
  maxHp:        number;
  playerName:   string;
  userId?:      string;
  token?:       string;
  returnZone?:  string;
  playerLevel:  number;
}

// ── Visual constants ───────────────────────────────────────────────────────────

const BOSS_COLORS: Record<string, { primary: number; secondary: number; bg: number }> = {
  storm_titan:       { primary: 0x88ccff, secondary: 0x4499dd, bg: 0x050a14 },
  ancient_dracolich: { primary: 0xddcc44, secondary: 0x997722, bg: 0x0a0a04 },
  void_herald:       { primary: 0xcc44ff, secondary: 0x7722aa, bg: 0x08040e },
};

const DEFAULT_BOSS_COLOR = { primary: 0xff4444, secondary: 0xaa2222, bg: 0x0e0404 };

// HP bar colors by phase
const PHASE_HP_COLORS = [0x44dd44, 0xddcc22, 0xff4422];

// ── WorldBossScene ─────────────────────────────────────────────────────────────

export class WorldBossScene extends Phaser.Scene {
  private sceneData!: WorldBossSceneData;

  // Colyseus room
  private bossRoom: import('colyseus.js').Room | null = null;
  private mp: MultiplayerClient | null = null;
  private mySessionId = '';

  // Boss state (synced from server)
  private currentHp = 0;
  private maxHp = 1;
  private bossPhase = 1;
  private roomState = 'waiting';
  private spawnsAt = 0;
  private expiresAt = 0;
  private participantCount = 0;

  // UI elements
  private bossSprite!: Phaser.GameObjects.Rectangle;
  private bossGlow!: Phaser.GameObjects.Arc;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private bossNameText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private participantsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private attackButton!: Phaser.GameObjects.Rectangle;
  private attackLabel!: Phaser.GameObjects.Text;
  private leaderboardContainer!: Phaser.GameObjects.Container;
  private resultOverlay!: Phaser.GameObjects.Container;

  // Input tracking
  private lastAttackTime = 0;
  private readonly ATTACK_COOLDOWN = 500;
  private attackCooldownBar!: Phaser.GameObjects.Rectangle;
  private attackCooldownBg!: Phaser.GameObjects.Rectangle;

  // Hit flash tweens
  private bossTween: Phaser.Tweens.Tween | null = null;

  // Leaderboard data (top 5 shown in-scene)
  private leaderboard: Array<{ username: string; damage: number; tier: string }> = [];

  constructor() {
    super({ key: 'WorldBossScene' });
  }

  // ── init ──────────────────────────────────────────────────────────────────────

  init(data: WorldBossSceneData): void {
    this.sceneData = data;
    this.currentHp = data.maxHp;
    this.maxHp = data.maxHp;
  }

  // ── create ────────────────────────────────────────────────────────────────────

  create(): void {
    const { width, height } = this.scale;
    const colors = BOSS_COLORS[this.sceneData.bossId] ?? DEFAULT_BOSS_COLOR;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, colors.bg).setDepth(0);

    // Grid lines for atmosphere
    this.drawArenaGrid(colors.primary);

    // Boss visual
    this.buildBossVisual(width, height, colors);

    // HUD
    this.buildHUD(width, height, colors);

    // Attack button
    this.buildAttackButton(width, height, colors);

    // Leaderboard sidebar
    this.buildLeaderboard(width, height);

    // Exit button
    this.buildExitButton(width, height);

    // Connect to room
    this.connectToRoom();

    // Keyboard shortcut: Space to attack
    this.input.keyboard?.on('keydown-SPACE', () => this.triggerAttack());
  }

  // ── update ────────────────────────────────────────────────────────────────────

  update(_time: number, _delta: number): void {
    // Update attack cooldown bar
    const now = Date.now();
    const elapsed = now - this.lastAttackTime;
    const pct = Math.min(1, elapsed / this.ATTACK_COOLDOWN);
    const barWidth = 80;
    this.attackCooldownBar.width = barWidth * pct;

    // Update countdown timer
    if (this.roomState === 'waiting' && this.spawnsAt > 0) {
      const remaining = Math.max(0, this.spawnsAt - now);
      const secs = Math.ceil(remaining / 1000);
      this.timerText.setText(`Spawning in ${secs}s`);
    } else if (this.roomState === 'active' && this.expiresAt > 0) {
      const remaining = Math.max(0, this.expiresAt - now);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')} remaining`);
    }
  }

  // ── Visual builders ────────────────────────────────────────────────────────────

  private drawArenaGrid(accentColor: number): void {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(1).setAlpha(0.08);
    g.lineStyle(1, accentColor);
    for (let x = 0; x < width; x += 32) {
      g.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 32) {
      g.lineBetween(0, y, width, y);
    }
  }

  private buildBossVisual(width: number, height: number, colors: typeof DEFAULT_BOSS_COLOR): void {
    const bx = width / 2;
    const by = height * 0.38;

    // Glow aura
    this.bossGlow = this.add.arc(bx, by, 56, 0, 360, false, colors.secondary, 0.3)
      .setDepth(3);

    // Boss body (stylized rectangle stand-in)
    this.bossSprite = this.add.rectangle(bx, by, 72, 72, colors.primary)
      .setDepth(4);

    // Pulsing animation
    this.tweens.add({
      targets: [this.bossSprite, this.bossGlow],
      scaleX: 1.06,
      scaleY: 1.06,
      alpha: { from: 1, to: 0.85 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildHUD(width: number, height: number, colors: typeof DEFAULT_BOSS_COLOR): void {
    const hpBarY = height * 0.62;
    const barW = Math.min(320, width - 40);
    const barX = width / 2 - barW / 2;

    // Boss name
    this.bossNameText = this.add.text(width / 2, height * 0.55, this.sceneData.bossName, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // Phase label
    this.phaseText = this.add.text(width / 2, height * 0.59, 'Phase I', {
      fontSize: '12px',
      color: '#aaffaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    // HP bar background
    this.hpBarBg = this.add.rectangle(barX + barW / 2, hpBarY, barW, 16, 0x220000)
      .setOrigin(0.5).setDepth(9);
    this.add.rectangle(barX + barW / 2, hpBarY, barW + 2, 18, 0x666666)
      .setOrigin(0.5).setDepth(8);

    // HP bar fill
    this.hpBar = this.add.rectangle(barX, hpBarY, barW, 16, PHASE_HP_COLORS[0])
      .setOrigin(0, 0.5).setDepth(10);

    // HP text
    this.hpText = this.add.text(width / 2, hpBarY + 14, '', {
      fontSize: '10px',
      color: '#cccccc',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);

    // Status / participants
    this.statusText = this.add.text(width / 2, height * 0.67, 'Waiting for boss...', {
      fontSize: '13px',
      color: '#ffdd88',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.participantsText = this.add.text(width / 2, height * 0.71, '', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.timerText = this.add.text(width / 2, height * 0.74, '', {
      fontSize: '11px',
      color: '#88ddff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.updateHPBar();
  }

  private buildAttackButton(width: number, height: number, colors: typeof DEFAULT_BOSS_COLOR): void {
    const bx = width / 2;
    const by = height * 0.83;

    // Cooldown bar bg
    this.attackCooldownBg = this.add.rectangle(bx, by - 22, 80, 4, 0x333333)
      .setOrigin(0.5).setDepth(10);
    this.attackCooldownBar = this.add.rectangle(bx - 40, by - 22, 80, 4, colors.primary)
      .setOrigin(0, 0.5).setDepth(11);

    // Button
    this.attackButton = this.add.rectangle(bx, by, 120, 36, colors.secondary)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.triggerAttack())
      .on('pointerover', () => this.attackButton.setAlpha(0.85))
      .on('pointerout',  () => this.attackButton.setAlpha(1));

    this.attackLabel = this.add.text(bx, by, 'ATTACK  [Space]', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11);
  }

  private buildLeaderboard(width: number, height: number): void {
    this.leaderboardContainer = this.add.container(width - 110, height * 0.4).setDepth(10);

    const bg = this.add.rectangle(0, 0, 110, 140, 0x000000, 0.6);
    const title = this.add.text(0, -58, 'TOP DAMAGE', {
      fontSize: '9px', color: '#ffdd88', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.leaderboardContainer.add([bg, title]);
    this.refreshLeaderboard();
  }

  private buildExitButton(width: number, height: number): void {
    const btn = this.add.text(width - 8, 8, '✕ Exit', {
      fontSize: '11px', color: '#888888', fontFamily: 'monospace',
      backgroundColor: '#111111', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0).setDepth(20).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.exitScene());
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#888888'));
  }

  // ── Room connection ────────────────────────────────────────────────────────────

  private connectToRoom(): void {
    this.mp = new MultiplayerClient();
    this.mp.connect().then(() => {
      return this.mp!.joinById(this.sceneData.roomId, {
        token: this.sceneData.token,
      });
    }).then((room) => {
      this.bossRoom = room;
      this.mySessionId = room.sessionId;

      room.onMessage('boss_state',    (msg) => this.onBossState(msg));
      room.onMessage('boss_spawn',    (msg) => this.onBossSpawn(msg));
      room.onMessage('boss_hit',      (msg) => this.onBossHit(msg));
      room.onMessage('phase_change',  (msg) => this.onPhaseChange(msg));
      room.onMessage('boss_defeated', (msg) => this.onBossDefeated(msg));
      room.onMessage('boss_expired',  (msg) => this.onBossExpired(msg));
      room.onMessage('loot_grant',    (msg) => this.onLootGrant(msg));

    }).catch((err) => {
      console.warn('[WorldBossScene] Failed to connect to room:', err);
      this.statusText?.setText('Connection failed — spectator mode');
    });
  }

  // ── Attack ────────────────────────────────────────────────────────────────────

  private triggerAttack(): void {
    if (this.roomState !== 'active') return;
    const now = Date.now();
    if (now - this.lastAttackTime < this.ATTACK_COOLDOWN) return;

    this.lastAttackTime = now;

    // Calculate damage based on player level
    const baseDamage = 10 + (this.sceneData.playerLevel ?? 1) * 5;
    const variance = Math.floor(Math.random() * baseDamage * 0.2);
    const damage = baseDamage + variance;

    this.bossRoom?.send('attack', { damage });

    // Local visual feedback
    this.flashAttack();
  }

  private flashAttack(): void {
    if (this.bossTween) this.bossTween.stop();
    this.bossTween = this.tweens.add({
      targets: this.bossSprite,
      alpha: 0.4,
      duration: 60,
      yoyo: true,
      onComplete: () => { this.bossSprite.setAlpha(1); },
    });
  }

  // ── Server message handlers ────────────────────────────────────────────────────

  private onBossState(msg: {
    bossHp: number; bossMaxHp: number; bossPhase: number;
    roomState: string; spawnsAt: number; expiresAt: number; participantCount: number;
  }): void {
    this.currentHp  = msg.bossHp;
    this.maxHp      = msg.bossMaxHp;
    this.bossPhase  = msg.bossPhase;
    this.roomState  = msg.roomState;
    this.spawnsAt   = msg.spawnsAt;
    this.expiresAt  = msg.expiresAt;
    this.participantCount = msg.participantCount;
    this.updateHPBar();
    this.updateStatus();
  }

  private onBossSpawn(msg: { bossName: string; maxHp: number; phase: number }): void {
    this.roomState = 'active';
    this.maxHp = msg.maxHp;
    this.currentHp = msg.maxHp;
    this.bossPhase = msg.phase;
    this.updateHPBar();
    this.updateStatus();
    this.statusText.setText('Boss is active! Attack!');
    this.cameras.main.shake(300, 0.012);
  }

  private onBossHit(msg: {
    playerId: string; damage: number; currentHp: number; maxHp: number; phase: number;
  }): void {
    this.currentHp = msg.currentHp;
    this.maxHp     = msg.maxHp;
    this.bossPhase = msg.phase;
    this.updateHPBar();

    // Small camera shake on hits
    if (msg.damage >= 50) {
      this.cameras.main.shake(80, 0.004);
    }
  }

  private onPhaseChange(msg: { phase: number }): void {
    this.bossPhase = msg.phase;
    this.updateHPBar();
    const labels = ['', 'Phase I', 'Phase II ⚡', 'Phase III ☠'];
    this.phaseText.setText(labels[msg.phase] ?? `Phase ${msg.phase}`);

    // Flash the phase indicator
    this.tweens.add({
      targets: this.phaseText,
      scaleX: 1.4, scaleY: 1.4,
      duration: 250,
      yoyo: true,
    });

    this.cameras.main.shake(500, 0.018);
  }

  private onBossDefeated(msg: {
    bossName: string;
    topContributors: Array<{ username: string; damageDealt: number; tier: string }>;
    totalParticipants: number;
  }): void {
    this.roomState = 'defeated';
    this.currentHp = 0;
    this.updateHPBar();
    this.showResultOverlay(true, msg.topContributors, msg.totalParticipants);
    this.cameras.main.shake(600, 0.025);
  }

  private onBossExpired(_msg: { bossId: string }): void {
    this.roomState = 'expired';
    this.currentHp = 0;
    this.updateHPBar();
    this.showResultOverlay(false, [], this.participantCount);
  }

  private onLootGrant(msg: { playerId: string; gold: number; xp: number; tier: string }): void {
    if (msg.playerId !== this.sceneData.userId) return;

    const tierColors: Record<string, string> = {
      gold: '#ffdd44', silver: '#cccccc', bronze: '#cc8844',
    };
    const color = tierColors[msg.tier] ?? '#ffffff';

    const { width, height } = this.scale;
    const loot = this.add.text(width / 2, height * 0.48, `+${msg.gold}g  +${msg.xp} XP  [${msg.tier.toUpperCase()}]`, {
      fontSize: '14px', color, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: loot,
      y: loot.y - 30,
      alpha: 0,
      duration: 2500,
      onComplete: () => loot.destroy(),
    });
  }

  // ── UI update helpers ──────────────────────────────────────────────────────────

  private updateHPBar(): void {
    if (!this.hpBar) return;
    const pct = Math.max(0, Math.min(1, this.currentHp / Math.max(1, this.maxHp)));
    const maxBarWidth = this.hpBarBg?.width ?? 320;
    this.hpBar.width = Math.max(2, maxBarWidth * pct);

    const phaseColor = PHASE_HP_COLORS[Math.max(0, this.bossPhase - 1)] ?? PHASE_HP_COLORS[0];
    this.hpBar.setFillStyle(phaseColor);

    const hpK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
    this.hpText?.setText(`${hpK(this.currentHp)} / ${hpK(this.maxHp)} HP`);

    const labels = ['', 'Phase I', 'Phase II', 'Phase III'];
    this.phaseText?.setText(labels[this.bossPhase] ?? `Phase ${this.bossPhase}`);
  }

  private updateStatus(): void {
    const stateLabels: Record<string, string> = {
      waiting:  'Waiting for boss...',
      active:   '⚔ Boss is active!',
      defeated: '✓ Boss defeated!',
      expired:  '✗ Boss retreated.',
    };
    this.statusText?.setText(stateLabels[this.roomState] ?? this.roomState);
    this.participantsText?.setText(
      this.participantCount > 0 ? `${this.participantCount} warriors fighting` : '',
    );
  }

  private refreshLeaderboard(): void {
    // Remove old entries (keep bg + title = first 2 children)
    while (this.leaderboardContainer.length > 2) {
      const last = this.leaderboardContainer.getAt(this.leaderboardContainer.length - 1);
      if (last instanceof Phaser.GameObjects.GameObject) {
        (last as Phaser.GameObjects.Text).destroy();
      }
      this.leaderboardContainer.removeLast();
    }

    const tierColors: Record<string, string> = {
      gold: '#ffdd44', silver: '#cccccc', bronze: '#cc8844',
    };

    this.leaderboard.slice(0, 5).forEach((entry, i) => {
      const color = tierColors[entry.tier] ?? '#ffffff';
      const dmgK = entry.damage >= 1000 ? `${(entry.damage / 1000).toFixed(1)}k` : `${entry.damage}`;
      const txt = this.add.text(0, -40 + i * 20,
        `${i + 1}. ${entry.username.slice(0, 8).padEnd(8)} ${dmgK}`, {
          fontSize: '9px', color, fontFamily: 'monospace',
        }).setOrigin(0.5);
      this.leaderboardContainer.add(txt);
    });
  }

  private showResultOverlay(
    victory: boolean,
    topContributors: Array<{ username: string; damageDealt: number; tier: string }>,
    totalParticipants: number,
  ): void {
    const { width, height } = this.scale;

    this.resultOverlay = this.add.container(width / 2, height / 2).setDepth(30);

    const bg = this.add.rectangle(0, 0, 300, 200, 0x000000, 0.85);
    const titleColor = victory ? '#ffdd44' : '#cc4444';
    const titleText  = victory ? '⚔ BOSS DEFEATED!' : '✗ BOSS RETREATED';

    const title = this.add.text(0, -80, titleText, {
      fontSize: '18px', color: titleColor, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const sub = this.add.text(0, -55, `${totalParticipants} warriors participated`, {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.resultOverlay.add([bg, title, sub]);

    if (victory && topContributors.length > 0) {
      const mvpLabel = this.add.text(0, -30, 'Top Contributors:', {
        fontSize: '11px', color: '#88ddff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.resultOverlay.add(mvpLabel);

      const tierColors: Record<string, string> = {
        gold: '#ffdd44', silver: '#cccccc', bronze: '#cc8844',
      };
      topContributors.forEach((c, i) => {
        const color = tierColors[c.tier] ?? '#ffffff';
        const dmgK = c.damageDealt >= 1000 ? `${(c.damageDealt / 1000).toFixed(1)}k` : `${c.damageDealt}`;
        const entry = this.add.text(0, -10 + i * 18, `${i + 1}. ${c.username}  ${dmgK} dmg`, {
          fontSize: '10px', color, fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.resultOverlay.add(entry);
      });
    }

    // Auto-exit after 8 seconds
    const exitBtn = this.add.text(0, 80, '[ Click to Exit ]', {
      fontSize: '12px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    exitBtn.on('pointerdown', () => this.exitScene());
    this.resultOverlay.add(exitBtn);

    this.time.delayedCall(8000, () => this.exitScene());
  }

  // ── Exit ───────────────────────────────────────────────────────────────────────

  private exitScene(): void {
    this.bossRoom?.leave();
    this.mp?.disconnect();
    const returnZone = this.sceneData.returnZone ?? 'zone3';
    this.scene.start(SCENES.GAME, { zoneId: returnZone });
  }

  shutdown(): void {
    this.bossRoom?.leave();
    this.mp?.disconnect();
    this.input.keyboard?.off('keydown-SPACE');
  }
}
