/**
 * ArenaSpectatorOverlay — HUD shown when watching a live arena match as spectator.
 *
 * Shows:
 *   - "SPECTATING" banner
 *   - Both teams' player names, HP bars, and K/D counters
 *   - Match timer (synced from scene)
 *   - Number of spectators watching
 *
 * Uses the 'ui_arena_spectator' background image.
 */

import Phaser from 'phaser';
import { CANVAS, ARENA } from '../config/constants';
import type { ArenaInstance } from '../systems/ArenaManager';

interface Combatant {
  player: { id: string; name: string };
  hp:     number;
  kills:  number;
  deaths: number;
  team:   0 | 1;
}

const DEPTH = 60;
const W     = CANVAS.WIDTH;
const H     = CANVAS.HEIGHT;
const BAR_W = 70;

export class ArenaSpectatorOverlay {
  private scene:    Phaser.Scene;
  private instance: ArenaInstance;
  private objects:  Phaser.GameObjects.GameObject[] = [];

  // Dynamic elements updated each frame
  private team0Bars: { hpFill: Phaser.GameObjects.Rectangle; kdText: Phaser.GameObjects.Text }[] = [];
  private team1Bars: { hpFill: Phaser.GameObjects.Rectangle; kdText: Phaser.GameObjects.Text }[] = [];
  private spectatorCountText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, instance: ArenaInstance) {
    this.scene    = scene;
    this.instance = instance;
    this.build();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private build(): void {
    // Top banner
    const bannerH = 14;
    const bannerBg = this.scene.add.rectangle(W / 2, 0, W, bannerH, 0x000000, 0.75)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH);
    this.objects.push(bannerBg);

    const bannerT = this.scene.add.text(W / 2, 2, '👁 SPECTATING', {
      fontSize: '5px', color: '#ffee44', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.objects.push(bannerT);

    this.spectatorCountText = this.scene.add.text(W - 6, 2, `👤${this.instance.spectators.length}`, {
      fontSize: '4px', color: '#aaaacc', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.objects.push(this.spectatorCountText);

    // Bottom HUD bar
    const bottomY  = H - 20;
    const bottomBg = this.scene.add.rectangle(W / 2, bottomY, W, 20, 0x000000, 0.75)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH);
    this.objects.push(bottomBg);

    // Team 0 (left)
    this.buildTeamBars(0, 4, bottomY + 2);
    // Team 1 (right)
    this.buildTeamBars(1, W - 4 - BAR_W, bottomY + 2);
  }

  private buildTeamBars(team: 0 | 1, startX: number, startY: number): void {
    const players = this.instance.players.filter((_, i) => {
      const isTeam0 = i < this.instance.players.length / 2;
      return team === 0 ? isTeam0 : !isTeam0;
    });

    const targetArr = team === 0 ? this.team0Bars : this.team1Bars;
    const col       = team === 0 ? 0x44aa44 : 0xcc3333;
    const textCol   = team === 0 ? '#88ccff' : '#ff9999';

    players.forEach((player, i) => {
      const y = startY + i * 8;

      const nameT = this.scene.add.text(startX, y, player.name.slice(0, 8), {
        fontSize: '4px', color: textCol, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
      }).setScrollFactor(0).setDepth(DEPTH + 1);
      this.objects.push(nameT);

      const hpBg   = this.scene.add.rectangle(startX, y + 5, BAR_W, 3, 0x330000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
      const hpFill = this.scene.add.rectangle(startX, y + 5, BAR_W, 3, col).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
      this.objects.push(hpBg, hpFill);

      const kdText = this.scene.add.text(startX + BAR_W + 2, y + 5, 'K:0 D:0', {
        fontSize: '3px', color: '#778899', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
      }).setScrollFactor(0).setDepth(DEPTH + 1);
      this.objects.push(kdText);

      targetArr.push({ hpFill, kdText });
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(combatants: Combatant[]): void {
    const team0 = combatants.filter(c => c.team === 0);
    const team1 = combatants.filter(c => c.team === 1);

    this.updateTeamBars(team0, this.team0Bars);
    this.updateTeamBars(team1, this.team1Bars);

    if (this.spectatorCountText) {
      this.spectatorCountText.setText(`👤${this.instance.spectators.length}`);
    }
  }

  private updateTeamBars(
    combatants: Combatant[],
    bars: { hpFill: Phaser.GameObjects.Rectangle; kdText: Phaser.GameObjects.Text }[],
  ): void {
    combatants.forEach((c, i) => {
      const b = bars[i];
      if (!b) return;
      const pct = c.hp / ARENA.ROUND_HP;
      b.hpFill.setSize(Math.max(0, BAR_W * pct), 3);
      b.kdText.setText(`K:${c.kills} D:${c.deaths}`);
    });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.objects.forEach(o => o.destroy());
    this.objects = [];
    this.team0Bars = [];
    this.team1Bars = [];
  }
}
