/**
 * ArenaResultsPanel — victory/defeat screen shown at the end of an arena match.
 *
 * Displays:
 *   - Victory / Defeat splash (bg_arena_victory / bg_arena_defeat)
 *   - Rating change (±N points)
 *   - New rating and tier
 *   - K/D summary
 *   - Continue button → back to Menu
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import { getTier, getTierLabel } from '../systems/ArenaManager';
import type { ArenaResultData } from '../scenes/ArenaScene';

const DEPTH = 90;
const W     = CANVAS.WIDTH;
const H     = CANVAS.HEIGHT;

export class ArenaResultsPanel {
  private scene:   Phaser.Scene;
  private result:  ArenaResultData;
  private objects: Phaser.GameObjects.GameObject[] = [];

  onContinue?: () => void;

  constructor(scene: Phaser.Scene, result: ArenaResultData) {
    this.scene  = scene;
    this.result = result;
  }

  show(): void {
    const r = this.result;

    // ── Background splash ──────────────────────────────────────────────────
    const bgKey = r.won ? 'bg_arena_victory' : 'bg_arena_defeat';
    if (this.scene.textures.exists(bgKey)) {
      const bg = this.scene.add.image(W / 2, H / 2, bgKey)
        .setScrollFactor(0).setDepth(DEPTH).setAlpha(0.92);
      this.objects.push(bg);
    } else {
      const bg = this.scene.add.rectangle(W / 2, H / 2, W, H, r.won ? 0x002200 : 0x220000, 0.92)
        .setScrollFactor(0).setDepth(DEPTH);
      this.objects.push(bg);
    }

    // ── Result panel ──────────────────────────────────────────────────────
    const panelW = 160;
    const panelH = 110;
    const px     = (W - panelW) / 2;
    const py     = (H - panelH) / 2;

    const panel = this.scene.add.rectangle(px, py, panelW, panelH, 0x000000, 0.82)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    const border = this.scene.add.rectangle(px, py, panelW, panelH, 0, 0)
      .setOrigin(0, 0).setStrokeStyle(2, r.won ? 0x44ff44 : 0xff4444, 1)
      .setScrollFactor(0).setDepth(DEPTH + 1);
    this.objects.push(panel, border);

    const addText = (x: number, y: number, str: string, col = '#cccccc', size = '5px') => {
      const t = this.scene.add.text(px + x, py + y, str, {
        fontSize: size, color: col, fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(DEPTH + 2);
      this.objects.push(t);
      return t;
    };

    // Title
    const titleCol = r.won ? '#44ff44' : '#ff4444';
    const title    = r.won ? '⚔ VICTORY!' : '✗ DEFEAT';
    addText(panelW / 2, 8, title, titleCol, '10px').setOrigin(0.5, 0);

    // Separator
    const sep = this.scene.add.rectangle(px + 8, py + 26, panelW - 16, 1, r.won ? 0x44ff44 : 0xff4444, 0.5)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2);
    this.objects.push(sep);

    // Rating change
    const tier    = getTier(r.newRating);
    const tierLbl = getTierLabel(tier);
    const deltaStr = r.ratingDelta >= 0 ? `+${r.ratingDelta}` : `${r.ratingDelta}`;
    const deltaCol = r.ratingDelta >= 0 ? '#66ff66' : '#ff6666';
    addText(8, 32, `Rating: ${r.newRating}`, '#aaddff', '5px');
    addText(panelW - 8, 32, deltaStr, deltaCol, '5px').setOrigin(1, 0);
    addText(8, 42, `Tier: ${tierLbl}`, '#ffddaa', '5px');

    // K / D
    addText(8, 56, `Kills:   ${r.kills}`, '#cccccc', '5px');
    addText(8, 66, `Deaths:  ${r.deaths}`, '#cccccc', '5px');

    // Separator 2
    const sep2 = this.scene.add.rectangle(px + 8, py + 80, panelW - 16, 1, 0x334455, 0.6)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2);
    this.objects.push(sep2);

    // Continue button
    const btnW   = 70;
    const btnH   = 13;
    const btnX   = (panelW - btnW) / 2;
    const btnY   = 85;
    const btnBg  = this.scene.add.rectangle(px + btnX, py + btnY, btnW, btnH, 0x223344, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2)
      .setStrokeStyle(1, 0x4488cc, 1)
      .setInteractive({ useHandCursor: true });
    const btnT   = this.scene.add.text(px + btnX + btnW / 2, py + btnY + 3, 'Continue', {
      fontSize: '5px', color: '#88ccff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true });

    this.objects.push(btnBg, btnT);

    const onContinue = () => this.onContinue?.();
    btnBg.on('pointerdown', onContinue);
    btnT.on('pointerdown', onContinue);
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x334455));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x223344));

    // Animate in
    this.objects.forEach(o => {
      if (o instanceof Phaser.GameObjects.GameObject && 'setAlpha' in o) {
        (o as Phaser.GameObjects.Image).setAlpha(0);
      }
    });
    this.scene.tweens.add({
      targets:  this.objects.filter(o => 'setAlpha' in o),
      alpha:    1,
      duration: 400,
      ease:     'Power2',
    });
  }

  destroy(): void {
    this.objects.forEach(o => o.destroy());
    this.objects = [];
  }
}
