/**
 * WorldBossPanel — world boss announcement and status panel.
 *
 * Shows:
 *   - Server-wide announcement banner when a world boss is incoming or active
 *   - Countdown timer until spawn / time remaining
 *   - Boss HP bar (synced via world_boss_event messages from ZoneRoom)
 *   - "Join Fight" button to enter the WorldBossScene
 *   - Recent boss history (last defeated / expired)
 *
 * Receives real-time updates via:
 *   world_boss_event { type: "world_boss_incoming" | "world_boss_spawned" | "boss_defeated" | "boss_expired" }
 *
 * This panel is always mounted in UIScene / GameScene and can be shown/hidden.
 * Press B to toggle it.
 */

import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';

// ── Layout ─────────────────────────────────────────────────────────────────────

const PANEL_W  = 260;
const PANEL_H  = 160;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2 - 10;
const DEPTH    = 85;
const PAD      = 8;

// ── Colours ────────────────────────────────────────────────────────────────────

const COL_BG        = 0x0e0406;
const COL_BORDER    = 0xcc3344;
const COL_HEADER    = 0x1a0408;
const COL_WHITE     = '#ffffff';
const COL_GREY      = '#888888';
const COL_RED       = '#ff4455';
const COL_GOLD      = '#ffdd44';
const COL_BLUE      = '#88ccff';
const COL_HP_ACTIVE = 0xdd3322;
const COL_HP_BG     = 0x330a08;

// ── Boss display names ─────────────────────────────────────────────────────────

const BOSS_FLAVOR: Record<string, { color: string; icon: string }> = {
  storm_titan:       { color: '#88ccff', icon: '⚡' },
  ancient_dracolich: { color: '#ddcc44', icon: '☠' },
  void_herald:       { color: '#cc44ff', icon: '✦' },
};

// ── WorldBossPanel ─────────────────────────────────────────────────────────────

export interface WorldBossEventPayload {
  type: string;
  bossId?: string;
  bossName?: string;
  maxHp?: number;
  currentHp?: number;
  spawnsAt?: number;
  zoneId?: string;
  roomId?: string;
  description?: string;
  topContributors?: Array<{ username: string; damageDealt: number; tier: string }>;
  totalParticipants?: number;
}

export class WorldBossPanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible    = false;
  private bKey!:     Phaser.Input.Keyboard.Key;

  // Current boss state
  private bossId    = '';
  private bossName  = '';
  private bossMaxHp = 0;
  private bossHp    = 0;
  private spawnsAt  = 0;
  private roomId    = '';
  private eventType = ''; // 'incoming' | 'active' | 'defeated' | 'expired' | ''

  // UI elements
  private bg!:          Phaser.GameObjects.Rectangle;
  private border!:      Phaser.GameObjects.Rectangle;
  private headerBg!:    Phaser.GameObjects.Rectangle;
  private titleText!:   Phaser.GameObjects.Text;
  private bossText!:    Phaser.GameObjects.Text;
  private hpBarBg!:     Phaser.GameObjects.Rectangle;
  private hpBar!:       Phaser.GameObjects.Rectangle;
  private hpLabel!:     Phaser.GameObjects.Text;
  private statusText!:  Phaser.GameObjects.Text;
  private timerText!:   Phaser.GameObjects.Text;
  private joinBtn!:     Phaser.GameObjects.Rectangle;
  private joinLabel!:   Phaser.GameObjects.Text;
  private closeBtn!:    Phaser.GameObjects.Text;
  private descText!:    Phaser.GameObjects.Text;

  // Pulse tween
  private borderTween: Phaser.Tweens.Tween | null = null;

  /** Called when player clicks "Join Fight". */
  public onJoinFight?: (data: {
    roomId: string; instanceId: string; bossId: string; bossName: string; maxHp: number;
  }) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);

    this.buildLayout();

    if (scene.input.keyboard) {
      this.bKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this.visible; }

  /** Open the panel. */
  open(): void {
    this.visible = true;
    this.container.setVisible(true);
    this.refreshLayout();
  }

  /** Close the panel. */
  close(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    this.visible ? this.close() : this.open();
  }

  /** Call once per frame from GameScene.update(). */
  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.bKey)) {
      this.toggle();
    }

    if (!this.visible) return;

    // Live countdown
    const now = Date.now();
    if (this.eventType === 'incoming' && this.spawnsAt > 0) {
      const remaining = Math.max(0, this.spawnsAt - now);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      this.timerText.setText(`Spawning in ${mins}:${secs.toString().padStart(2, '0')}`);
    }
  }

  /**
   * Handle a world_boss_event message from ZoneRoom.
   * Called from GameScene when it receives world_boss_event messages.
   */
  handleEvent(payload: WorldBossEventPayload): void {
    const { type } = payload;

    if (type === 'world_boss_incoming') {
      this.bossId    = payload.bossId ?? '';
      this.bossName  = payload.bossName ?? 'World Boss';
      this.bossMaxHp = payload.maxHp ?? 0;
      this.bossHp    = payload.maxHp ?? 0;
      this.spawnsAt  = payload.spawnsAt ?? 0;
      this.roomId    = '';
      this.eventType = 'incoming';
      this.open();

    } else if (type === 'world_boss_spawned') {
      this.bossId    = payload.bossId ?? this.bossId;
      this.bossName  = payload.bossName ?? this.bossName;
      this.bossMaxHp = payload.maxHp ?? this.bossMaxHp;
      this.bossHp    = payload.maxHp ?? this.bossHp;
      this.roomId    = payload.roomId ?? '';
      this.eventType = 'active';
      this.open();
      // Pulse the border to draw attention
      this.startBorderPulse();

    } else if (type === 'boss_defeated') {
      this.eventType = 'defeated';
      this.bossHp = 0;
      this.refreshLayout();

    } else if (type === 'boss_expired') {
      this.eventType = 'expired';
      this.bossHp = 0;
      this.refreshLayout();
    }

    if (this.visible) this.refreshLayout();
  }

  /** Update HP from a boss_hit broadcast (if tracking in panel). */
  updateHp(currentHp: number): void {
    this.bossHp = currentHp;
    if (this.visible) this.updateHPBar();
  }

  destroy(): void {
    this.borderTween?.stop();
    this.container.destroy();
  }

  // ── Layout ─────────────────────────────────────────────────────────────────────

  private buildLayout(): void {
    const x = PANEL_X;
    const y = PANEL_Y;

    // Background
    this.bg = this.scene.add.rectangle(x + PANEL_W / 2, y + PANEL_H / 2, PANEL_W, PANEL_H, COL_BG);
    this.border = this.scene.add.rectangle(x + PANEL_W / 2, y + PANEL_H / 2, PANEL_W + 2, PANEL_H + 2, COL_BORDER)
      .setFillStyle(0, 0).setStrokeStyle(2, COL_BORDER);
    this.headerBg = this.scene.add.rectangle(x + PANEL_W / 2, y + 10, PANEL_W, 20, COL_HEADER);

    // Title
    this.titleText = this.scene.add.text(x + PANEL_W / 2, y + 10, '⚔ WORLD BOSS EVENT', {
      fontSize: '11px', color: COL_RED, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Boss name
    this.bossText = this.scene.add.text(x + PANEL_W / 2, y + 28, '', {
      fontSize: '14px', color: COL_WHITE, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Description
    this.descText = this.scene.add.text(x + PAD, y + 44, '', {
      fontSize: '8px', color: COL_GREY, fontFamily: 'monospace', wordWrap: { width: PANEL_W - PAD * 2 },
    }).setOrigin(0, 0);

    // HP bar
    this.hpBarBg = this.scene.add.rectangle(x + PANEL_W / 2, y + 80, PANEL_W - PAD * 2, 10, COL_HP_BG)
      .setOrigin(0.5);
    this.hpBar = this.scene.add.rectangle(
      x + PAD, y + 80, PANEL_W - PAD * 2, 10, COL_HP_ACTIVE,
    ).setOrigin(0, 0.5);
    this.hpLabel = this.scene.add.text(x + PANEL_W / 2, y + 91, '', {
      fontSize: '8px', color: COL_GREY, fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Status
    this.statusText = this.scene.add.text(x + PANEL_W / 2, y + 103, '', {
      fontSize: '10px', color: COL_GOLD, fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Timer
    this.timerText = this.scene.add.text(x + PANEL_W / 2, y + 115, '', {
      fontSize: '9px', color: COL_BLUE, fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Join Fight button
    const btnW = 100;
    const btnX = x + PANEL_W / 2 - btnW / 2;
    const btnY = y + PANEL_H - 26;
    this.joinBtn = this.scene.add.rectangle(btnX + btnW / 2, btnY + 8, btnW, 18, 0x8b0000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleJoin())
      .on('pointerover', () => this.joinBtn.setFillStyle(0xcc0022))
      .on('pointerout',  () => this.joinBtn.setFillStyle(0x8b0000));
    this.joinLabel = this.scene.add.text(btnX + btnW / 2, btnY + 8, 'JOIN FIGHT', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Close button
    this.closeBtn = this.scene.add.text(x + PANEL_W - 4, y + 3, '✕', {
      fontSize: '10px', color: COL_GREY, fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.close());
    this.closeBtn.on('pointerover', () => this.closeBtn.setColor('#ffffff'));
    this.closeBtn.on('pointerout',  () => this.closeBtn.setColor(COL_GREY));

    // Add all to container
    this.container.add([
      this.bg, this.border, this.headerBg, this.titleText, this.bossText,
      this.descText, this.hpBarBg, this.hpBar, this.hpLabel,
      this.statusText, this.timerText, this.joinBtn, this.joinLabel, this.closeBtn,
    ]);
  }

  private refreshLayout(): void {
    const flavor = BOSS_FLAVOR[this.bossId] ?? { color: '#ff4455', icon: '⚔' };

    // Boss name with icon + flavor color
    this.bossText.setText(`${flavor.icon} ${this.bossName}`);
    this.bossText.setColor(flavor.color);

    // HP bar
    this.updateHPBar();

    // Status text
    const statusMap: Record<string, string> = {
      incoming: 'Preparing to invade!',
      active:   '⚔ NOW ACTIVE — Join the fight!',
      defeated: '✓ Defeated — well done, heroes!',
      expired:  '✗ Retreated — not enough warriors.',
      '':       '',
    };
    this.statusText.setText(statusMap[this.eventType] ?? '');

    // Timer
    if (this.eventType === 'active') {
      this.timerText.setText('Boss is live!');
    } else if (this.eventType === 'defeated' || this.eventType === 'expired') {
      this.timerText.setText('Next boss incoming soon...');
    }

    // Join button visibility
    const canJoin = this.eventType === 'active' && !!this.roomId;
    this.joinBtn.setVisible(canJoin);
    this.joinLabel.setVisible(canJoin);
  }

  private updateHPBar(): void {
    const pct = this.bossMaxHp > 0
      ? Math.max(0, Math.min(1, this.bossHp / this.bossMaxHp))
      : 0;
    const maxW = PANEL_W - PAD * 2;
    this.hpBar.width = Math.max(2, maxW * pct);

    const hpK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
    this.hpLabel.setText(
      this.bossMaxHp > 0 ? `${hpK(this.bossHp)} / ${hpK(this.bossMaxHp)} HP` : '',
    );
  }

  private startBorderPulse(): void {
    this.borderTween?.stop();
    this.borderTween = this.scene.tweens.add({
      targets: this.border,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: 6,
      onComplete: () => { this.border.setAlpha(1); },
    });
  }

  private handleJoin(): void {
    if (!this.roomId || this.eventType !== 'active') return;
    this.onJoinFight?.({
      roomId: this.roomId,
      instanceId: '', // will be resolved from room state on join
      bossId: this.bossId,
      bossName: this.bossName,
      maxHp: this.bossMaxHp,
    });
  }
}
