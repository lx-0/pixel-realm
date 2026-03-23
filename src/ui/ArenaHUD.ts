/**
 * ArenaHUD — in-match heads-up display for PvP arena.
 *
 * Shows:
 *   - Opponent HP / mana bars (top-center area)
 *   - Local player HP / mana bars (bottom-center)
 *   - Match countdown timer (top-center)
 *   - Kill / death score (top corners)
 *   - Round indicator (currently timed single-round)
 *
 * Uses the 'ui_arena_hud' background image loaded in BootScene.
 */

import Phaser from 'phaser';
import { CANVAS, ARENA } from '../config/constants';
import type { ArenaInstance } from '../systems/ArenaManager';

interface Combatant {
  player: { id: string; name: string };
  hp:     number;
  mana:   number;
  kills:  number;
  deaths: number;
  team:   0 | 1;
}

const DEPTH = 50;

const BAR_W  = 80;
const BAR_H  = 5;

export class ArenaHUD {
  private scene:         Phaser.Scene;
  private localPlayerId: string;

  // Timer
  private timerText!:   Phaser.GameObjects.Text;

  // Team bars (top)
  private team0HpBg!:   Phaser.GameObjects.Rectangle;
  private team0HpFill!: Phaser.GameObjects.Rectangle;
  private team0MpFill!: Phaser.GameObjects.Rectangle;
  private team0Label!:  Phaser.GameObjects.Text;
  private team0KD!:     Phaser.GameObjects.Text;

  private team1HpBg!:   Phaser.GameObjects.Rectangle;
  private team1HpFill!: Phaser.GameObjects.Rectangle;
  private team1MpFill!: Phaser.GameObjects.Rectangle;
  private team1Label!:  Phaser.GameObjects.Text;
  private team1KD!:     Phaser.GameObjects.Text;

  // HUD backing image
  private hudImg?: Phaser.GameObjects.Image;

  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, _instance: ArenaInstance, localPlayerId: string) {
    this.scene         = scene;
    this.localPlayerId = localPlayerId;

    this.container = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);
    this.build();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private build(): void {
    const W = CANVAS.WIDTH;
    const cx = W / 2;

    // HUD background image
    if (this.scene.textures.exists('ui_arena_hud')) {
      this.hudImg = this.scene.add.image(cx, 12, 'ui_arena_hud')
        .setScrollFactor(0).setDepth(DEPTH - 1).setAlpha(0.85);
      this.container.add(this.hudImg);
    } else {
      // Fallback: dark strip
      const bg = this.scene.add.rectangle(cx, 12, W, 24, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(DEPTH - 1);
      this.container.add(bg);
    }

    // ── Match timer ────────────────────────────────────────────────────────
    this.timerText = this.scene.add.text(cx, 4, '3:00', {
      fontSize: '7px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.container.add(this.timerText);

    // ── Team 0 (left side) ─────────────────────────────────────────────────
    const t0x = 8;
    const barY = 13;

    this.team0Label = this.scene.add.text(t0x, barY - 7, 'YOU', {
      fontSize: '4px', color: '#88ccff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this.container.add(this.team0Label);

    this.team0HpBg   = this.scene.add.rectangle(t0x, barY, BAR_W, BAR_H, 0x330000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.team0HpFill = this.scene.add.rectangle(t0x, barY, BAR_W, BAR_H, 0x44aa44).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    const team0MpBg  = this.scene.add.rectangle(t0x, barY + BAR_H + 1, BAR_W, 3, 0x001133).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.team0MpFill = this.scene.add.rectangle(t0x, barY + BAR_H + 1, BAR_W, 3, 0x2255bb).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.team0KD     = this.scene.add.text(t0x, barY + BAR_H + 5, 'K:0 D:0', {
      fontSize: '4px', color: '#778899', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this.container.add(this.team0HpBg);
    this.container.add(this.team0HpFill);
    this.container.add(team0MpBg);
    this.container.add(this.team0MpFill);
    this.container.add(this.team0KD);

    // ── Team 1 (right side) ────────────────────────────────────────────────
    const t1x = W - BAR_W - 8;

    this.team1Label = this.scene.add.text(t1x + BAR_W, barY - 7, 'OPP', {
      fontSize: '4px', color: '#ff9999', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.container.add(this.team1Label);

    this.team1HpBg   = this.scene.add.rectangle(t1x, barY, BAR_W, BAR_H, 0x330000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.team1HpFill = this.scene.add.rectangle(t1x, barY, BAR_W, BAR_H, 0xcc3333).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    const team1MpBg  = this.scene.add.rectangle(t1x, barY + BAR_H + 1, BAR_W, 3, 0x001133).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.team1MpFill = this.scene.add.rectangle(t1x, barY + BAR_H + 1, BAR_W, 3, 0x2255bb).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.team1KD     = this.scene.add.text(t1x + BAR_W, barY + BAR_H + 5, 'K:0 D:0', {
      fontSize: '4px', color: '#778899', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.container.add(this.team1HpBg);
    this.container.add(this.team1HpFill);
    this.container.add(team1MpBg);
    this.container.add(this.team1MpFill);
    this.container.add(this.team1KD);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(remainingMs: number, combatants: Combatant[]): void {
    this.updateTimer(remainingMs);
    this.updateTeamBars(combatants);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private updateTimer(ms: number): void {
    const totalSec = Math.ceil(ms / 1000);
    const mins     = Math.floor(totalSec / 60);
    const secs     = totalSec % 60;
    const str      = `${mins}:${String(secs).padStart(2, '0')}`;
    this.timerText.setText(str);
    this.timerText.setColor(ms < 30_000 ? '#ff4444' : '#ffffff');
  }

  private updateTeamBars(combatants: Combatant[]): void {
    const team0 = combatants.filter(c => c.team === 0);
    const team1 = combatants.filter(c => c.team === 1);

    const avgHp   = (arr: Combatant[]) => arr.length ? arr.reduce((s, c) => s + c.hp,   0) / arr.length : 0;
    const avgMp   = (arr: Combatant[]) => arr.length ? arr.reduce((s, c) => s + c.mana, 0) / arr.length : 0;
    const sumKD   = (arr: Combatant[]) => ({ k: arr.reduce((s, c) => s + c.kills, 0), d: arr.reduce((s, c) => s + c.deaths, 0) });

    const pct0hp = avgHp(team0) / ARENA.ROUND_HP;
    const pct0mp = avgMp(team0) / ARENA.ROUND_MANA;
    const pct1hp = avgHp(team1) / ARENA.ROUND_HP;
    const pct1mp = avgMp(team1) / ARENA.ROUND_MANA;

    this.team0HpFill.setSize(Math.max(0, BAR_W * pct0hp), BAR_H);
    this.team0MpFill.setSize(Math.max(0, BAR_W * pct0mp), 3);
    this.team1HpFill.setSize(Math.max(0, BAR_W * pct1hp), BAR_H);
    this.team1MpFill.setSize(Math.max(0, BAR_W * pct1mp), 3);

    const kd0 = sumKD(team0);
    const kd1 = sumKD(team1);
    this.team0KD.setText(`K:${kd0.k} D:${kd0.d}`);
    this.team1KD.setText(`K:${kd1.k} D:${kd1.d}`);

    // Update team labels based on local player's team
    const localTeam = combatants.find(c => c.player.id === this.localPlayerId)?.team ?? 0;
    const myLabel  = localTeam === 0 ? 'YOU' : 'OPP';
    const oppLabel = localTeam === 0 ? 'OPP' : 'YOU';
    this.team0Label.setText(myLabel);
    this.team1Label.setText(oppLabel);
  }
}
