import Phaser from 'phaser';
import { CANVAS, SCENES, ZONES, ZoneConfig } from '../config/constants';
import { SaveManager } from '../systems/SaveManager';
import { SoundManager } from '../systems/SoundManager';

/**
 * LevelSelectScene — zone picker.
 * Shows all zones; unlocked ones are clickable, locked ones are dimmed.
 */
export class LevelSelectScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.LEVEL_SELECT);
  }

  create(): void {
    this.sfx = SoundManager.getInstance();
    this.sfx.startZoneMusic('menu');
    const save = SaveManager.load();
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x0a0a1e);

    // Floating particle bg
    this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: CANVAS.WIDTH },
      y: CANVAS.HEIGHT + 4,
      speedY: { min: -14, max: -5 },
      speedX: { min: -3, max: 3 },
      scale: { start: 0.35, end: 0 },
      lifespan: { min: 5000, max: 8000 },
      tint: [0x50a8e8, 0x9050e0, 0xffe040, 0xffffff],
      alpha: { start: 0.5, end: 0 },
      frequency: 350,
      quantity: 1,
    }).setDepth(0);

    // ── Header ──────────────────────────────────────────────────────────────
    this.add.text(cx, 10, 'SELECT ZONE', {
      fontSize: '10px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(10);

    // Player info bar
    this.add.rectangle(cx, 22, CANVAS.WIDTH, 12, 0x0d0d2a, 0.85).setDepth(9);
    this.add.text(8, 17, `Lv.${save.playerLevel}`, {
      fontSize: '5px', color: '#ffe040', fontFamily: 'monospace',
    }).setDepth(10);
    this.add.text(50, 17, `XP: ${save.playerXP}`, {
      fontSize: '5px', color: '#aaaacc', fontFamily: 'monospace',
    }).setDepth(10);
    this.add.text(CANVAS.WIDTH - 8, 17, `Kills: ${save.totalKills}`, {
      fontSize: '5px', color: '#aaaacc', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(10);

    // ── Zone cards ──────────────────────────────────────────────────────────
    const cardW = 128;
    const cardH = 54;
    const cols  = 2;
    const padX  = (CANVAS.WIDTH  - cols * cardW) / (cols + 1);
    const padY  = 14;
    const startY = 34;

    ZONES.forEach((zone, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x   = padX + col * (cardW + padX) + cardW / 2;
      const y   = startY + row * (cardH + padY) + cardH / 2;

      const unlocked = save.unlockedZones.includes(zone.id);
      this.buildZoneCard(x, y, cardW, cardH, zone, unlocked, save.highScores[zone.id] ?? 0);
    });

    // ── Footer ──────────────────────────────────────────────────────────────
    this.add.text(cx, CANVAS.HEIGHT - 4, 'ESC — Back to Menu', {
      fontSize: '4px', color: '#444466', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(10);

    if (save.completedGame) {
      const creditsBtn = this.add.text(cx, CANVAS.HEIGHT - 10, '▶ View Credits', {
        fontSize: '5px', color: '#ffd700', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 1).setDepth(10).setInteractive({ useHandCursor: true });
      creditsBtn.on('pointerover', () => creditsBtn.setColor('#ffffff'));
      creditsBtn.on('pointerout',  () => creditsBtn.setColor('#ffd700'));
      creditsBtn.on('pointerdown', () => this.goCredits());
    }

    this.input.keyboard?.once('keydown-ESC', () => this.goMenu());
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private buildZoneCard(
    cx: number, cy: number,
    w: number, h: number,
    zone: ZoneConfig,
    unlocked: boolean,
    highScore: number,
  ): void {
    const alpha = unlocked ? 1 : 0.38;

    // Card background
    const bg = this.add.rectangle(cx, cy, w, h, zone.bgColor, 0.9)
      .setDepth(10).setAlpha(alpha);

    // Accent border
    const border = this.add.graphics().setDepth(11).setAlpha(alpha);
    border.lineStyle(1, zone.accentColor, unlocked ? 0.9 : 0.3);
    border.strokeRect(cx - w / 2, cy - h / 2, w, h);

    // Zone number badge
    const zoneNum = ZONES.indexOf(zone) + 1;
    this.add.rectangle(cx - w / 2 + 10, cy - h / 2 + 8, 14, 14, zone.accentColor, 0.8)
      .setDepth(12).setAlpha(alpha);
    this.add.text(cx - w / 2 + 10, cy - h / 2 + 8, String(zoneNum), {
      fontSize: '7px', color: '#000000', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(13).setAlpha(alpha);

    // Zone name
    this.add.text(cx - w / 2 + 21, cy - h / 2 + 4, zone.name, {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 1,
    }).setDepth(12).setAlpha(alpha);

    // Biome tag
    this.add.text(cx - w / 2 + 21, cy - h / 2 + 12, zone.biome, {
      fontSize: '4px', color: '#888899', fontFamily: 'monospace',
    }).setDepth(12).setAlpha(alpha);

    // Description
    this.add.text(cx - w / 2 + 6, cy - h / 2 + 24, zone.description, {
      fontSize: '4px', color: '#aaaacc', fontFamily: 'monospace',
      wordWrap: { width: w - 10 },
    }).setDepth(12).setAlpha(alpha);

    // High score / lock indicator
    if (unlocked) {
      const scoreStr = highScore > 0 ? `Best: ${highScore}` : 'Not yet cleared';
      this.add.text(cx + w / 2 - 4, cy + h / 2 - 4, scoreStr, {
        fontSize: '4px', color: '#ffcc44', fontFamily: 'monospace',
      }).setOrigin(1, 1).setDepth(12);
    } else {
      this.add.text(cx, cy + h / 2 - 8, '🔒 Clear previous zone to unlock', {
        fontSize: '4px', color: '#666677', fontFamily: 'monospace',
      }).setOrigin(0.5, 1).setDepth(12);
    }

    // Min level indicator
    this.add.text(cx - w / 2 + 6, cy + h / 2 - 4, `Lv.${zone.minPlayerLevel}+`, {
      fontSize: '4px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0, 1).setDepth(12).setAlpha(alpha);

    if (!unlocked) return;

    // Hover + click handling
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(zone.accentColor, 0.18);
      border.clear();
      border.lineStyle(1, zone.accentColor, 1.0);
      border.strokeRect(cx - w / 2, cy - h / 2, w, h);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(zone.bgColor, 0.9);
      border.clear();
      border.lineStyle(1, zone.accentColor, 0.9);
      border.strokeRect(cx - w / 2, cy - h / 2, w, h);
    });
    bg.on('pointerdown', () => this.startZone(zone.id));
  }

  private startZone(zoneId: string): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.GAME, { zoneId }));
  }

  private goMenu(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.MENU));
  }

  private goCredits(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.CREDITS));
  }
}
