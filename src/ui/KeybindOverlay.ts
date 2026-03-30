/**
 * KeybindOverlay — fullscreen keyboard shortcut reference panel.
 *
 * Toggle with `?` or `F1` from any scene that launches it.
 * Displays all key bindings grouped by category in a pixel-art styled overlay.
 *
 * Usage:
 *   // In your scene's create():
 *   this.scene.launch(SCENES.KEYBIND_OVERLAY);
 *
 *   // Or toggle from an existing scene:
 *   KeybindOverlay.toggle(this);
 */

import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';

// ── Keybind data ──────────────────────────────────────────────────────────────

interface BindEntry {
  action: string;
  key:    string;
}

interface BindGroup {
  title:    string;
  color:    string;
  entries:  BindEntry[];
}

const KEYBIND_GROUPS: BindGroup[] = [
  {
    title: 'Movement',
    color: '#50e888',
    entries: [
      { action: 'Move',       key: 'W A S D' },
      { action: 'Sprint',     key: 'SHIFT' },
      { action: 'Dodge Roll', key: 'Q' },
      { action: 'Fast Travel', key: 'T (map)' },
    ],
  },
  {
    title: 'Combat',
    color: '#ff6666',
    entries: [
      { action: 'Attack',     key: 'SPACE' },
      { action: 'Skills 1–6', key: '1 – 6' },
      { action: 'Mute Audio', key: 'N' },
    ],
  },
  {
    title: 'UI / Navigation',
    color: '#ffd700',
    entries: [
      { action: 'Inventory',   key: 'I' },
      { action: 'Quest Log',   key: 'J' },
      { action: 'Skill Tree',  key: 'K' },
      { action: 'Crafting',    key: 'F' },
      { action: 'World Map',   key: 'M' },
      { action: 'Minimap',     key: 'TAB' },
      { action: 'Pause',       key: 'ESC' },
      { action: 'Settings',    key: 'ESC › Settings' },
      { action: 'This overlay', key: '? or F1' },
    ],
  },
  {
    title: 'Social',
    color: '#c080ff',
    entries: [
      { action: 'Chat',         key: 'ENTER' },
      { action: 'Player List',  key: 'P' },
      { action: 'Party',        key: 'O' },
      { action: 'Guild',        key: 'G' },
      { action: 'Leaderboard',  key: 'L' },
      { action: 'Achievements', key: 'H' },
    ],
  },
];

// ── Layout constants ──────────────────────────────────────────────────────────

const PANEL_W    = 290;
const PANEL_H    = 160;
const DEPTH      = 200;
const FONT       = 'monospace';
const COL_W      = 130; // width per two-column layout
const COL_GAP    = 10;  // gap between columns

export class KeybindOverlay extends Phaser.Scene {
  private keyF1!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENES.KEYBIND_OVERLAY, active: false });
  }

  create(): void {
    const cx = CANVAS.WIDTH  / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Backdrop ──────────────────────────────────────────────────────────────
    const backdrop = this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x000000, 0.75)
      .setDepth(DEPTH)
      .setInteractive(); // absorb clicks

    // ── Panel ─────────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, PANEL_W, PANEL_H, 0x060620, 0.96).setDepth(DEPTH + 1);

    const gfx = this.add.graphics().setDepth(DEPTH + 2);
    gfx.lineStyle(1, 0x50a8e8, 0.9);
    gfx.strokeRect(cx - PANEL_W / 2, cy - PANEL_H / 2, PANEL_W, PANEL_H);

    // ── Title bar ─────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy - PANEL_H / 2 + 7, PANEL_W, 14, 0x0a1a40, 1).setDepth(DEPTH + 1);
    this.add.text(cx, cy - PANEL_H / 2 + 7, 'KEYBOARD SHORTCUTS', {
      fontSize: '7px', color: '#ffd700', fontFamily: FONT,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);

    // Close hint
    this.add.text(cx + PANEL_W / 2 - 4, cy - PANEL_H / 2 + 5, '[F1 / ?]', {
      fontSize: '4px', color: '#556688', fontFamily: FONT,
    }).setOrigin(1, 0.5).setDepth(DEPTH + 2);

    // ── Two-column group layout ────────────────────────────────────────────────
    // Left column: groups 0 & 1, Right column: groups 2 & 3
    const startY = cy - PANEL_H / 2 + 18;
    const colX   = [cx - PANEL_W / 2 + 8, cx + COL_GAP];

    [[0, 1], [2, 3]].forEach((groupIndices, colIdx) => {
      let y = startY;
      const x = colX[colIdx];

      groupIndices.forEach(gi => {
        const group = KEYBIND_GROUPS[gi];

        // Group header
        this.add.text(x, y, group.title.toUpperCase(), {
          fontSize: '5px', color: group.color, fontFamily: FONT,
          stroke: '#000', strokeThickness: 1,
        }).setDepth(DEPTH + 2);
        y += 8;

        group.entries.forEach(e => {
          this.add.text(x + 2, y, e.action, {
            fontSize: '4px', color: '#99aacc', fontFamily: FONT,
          }).setDepth(DEPTH + 2);

          this.add.text(x + COL_W - 4, y, e.key, {
            fontSize: '4px', color: '#ffffff', fontFamily: FONT,
          }).setOrigin(1, 0).setDepth(DEPTH + 2);

          y += 6;
        });

        y += 4; // gap between groups
      });
    });

    // ── Close on ? / F1 / ESC / backdrop click ────────────────────────────────
    this.keyF1 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1);

    this.input.keyboard!.once('keydown-ESC', () => this.close());
    this.input.keyboard!.once('keydown-F1',  () => this.close());
    // '?' key (Shift+/) — raw keydown check
    this.input.keyboard!.on('keydown', (ev: KeyboardEvent) => {
      if (ev.key === '?') this.close();
    });

    backdrop.on('pointerdown', () => this.close());

    this.cameras.main.fadeIn(80, 0, 0, 0);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyF1)) {
      this.close();
    }
  }

  private close(): void {
    this.cameras.main.fadeOut(80, 0, 0, 0);
    this.time.delayedCall(80, () => this.scene.stop());
  }

  // ── Static helper — toggle from another scene ─────────────────────────────

  static toggle(caller: Phaser.Scene): void {
    const manager = caller.scene;
    if (manager.isActive(SCENES.KEYBIND_OVERLAY)) {
      manager.stop(SCENES.KEYBIND_OVERLAY);
    } else {
      manager.launch(SCENES.KEYBIND_OVERLAY);
    }
  }
}
