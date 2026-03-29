/**
 * DungeonEntrancePanel — shown when a player interacts with a dungeon entrance.
 *
 * Displays:
 *   - Dungeon tier selector (1 / 2 / 3) with difficulty description
 *   - Party readiness list (which party members are present and ready)
 *   - Cooldown timer if the player completed a dungeon recently
 *   - Enter / Cancel buttons
 *
 * Usage:
 *   panel = new DungeonEntrancePanel(scene);
 *   panel.onEnter = (tier) => { ... joinOrCreate dungeon room ... };
 *   panel.show({ userId, partyMembers: [...], cooldownRemainingMs });
 *   panel.hide();
 *
 * Shortcut: [G] to close when open.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

// ── Layout constants ───────────────────────────────────────────────────────────

const PANEL_W  = 180;
const PANEL_H  = 120;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 80;

const TIER_COLORS: Record<number, number> = {
  1: 0x44bb66,  // green  — Novice
  2: 0xddaa22,  // gold   — Champion
  3: 0xcc3355,  // red    — Legendary
  4: 0x9922ff,  // purple — Nightmare (endgame, level 40+)
};

const TIER_LABELS: Record<number, { name: string; description: string; minLevel: number }> = {
  1: { name: 'Tier I — Novice',      description: 'Beginner dungeon. Recommended level 3+.',      minLevel: 1  },
  2: { name: 'Tier II — Champion',   description: 'Challenging enemies and boss. Lvl 6+.',         minLevel: 6  },
  3: { name: 'Tier III — Legendary', description: 'Elite dungeon. For max-level parties. 10+.',    minLevel: 10 },
  4: { name: 'Tier IV — Nightmare',  description: 'Endgame dungeon. Random boss. Requires lvl 40.', minLevel: 40 },
};

const TOTAL_TIERS = 4;

const BTN_W = 38;
const BTN_H = 10;

export interface DungeonEntrancePanelOptions {
  userId: string;
  playerLevel: number;
  /** Party member names (including self). Empty array = solo. */
  partyMembers: Array<{ name: string; ready: boolean }>;
  /** Remaining cooldown in ms (0 = no cooldown). */
  cooldownRemainingMs: number;
}

export class DungeonEntrancePanel {
  private scene: Phaser.Scene;
  isOpen = false;

  // State
  private selectedTier = 1;
  private opts: DungeonEntrancePanelOptions | null = null;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;
  private cooldownRemaining = 0;

  // ── Game objects ──────────────────────────────────────────────────────────────

  private bg!:           Phaser.GameObjects.Rectangle;
  private border!:       Phaser.GameObjects.Rectangle;
  private titleText!:    Phaser.GameObjects.Text;

  // Tier buttons
  private tierBtns:      Phaser.GameObjects.Rectangle[] = [];
  private tierLabels:    Phaser.GameObjects.Text[] = [];

  // Info section
  private tierNameText!:  Phaser.GameObjects.Text;
  private tierDescText!:  Phaser.GameObjects.Text;
  private partyTitle!:    Phaser.GameObjects.Text;
  private partyLines:     Phaser.GameObjects.Text[] = [];
  private cooldownText!:  Phaser.GameObjects.Text;
  private cooldownBar!:   Phaser.GameObjects.Rectangle;
  private cooldownFill!:  Phaser.GameObjects.Rectangle;

  // Action buttons
  private enterBg!:      Phaser.GameObjects.Rectangle;
  private enterLabel!:   Phaser.GameObjects.Text;
  private cancelBg!:     Phaser.GameObjects.Rectangle;
  private cancelLabel!:  Phaser.GameObjects.Text;

  // Keyboard
  private escKey!: Phaser.Input.Keyboard.Key;

  // ── Callbacks ─────────────────────────────────────────────────────────────────

  /** Called when the player confirms dungeon entry with the selected tier. */
  onEnter?: (tier: number) => void;
  /** Called when the panel is dismissed without entering. */
  onCancel?: () => void;

  // ── Constructor ───────────────────────────────────────────────────────────────

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.build();
    this.hide();
  }

  // ── Build ─────────────────────────────────────────────────────────────────────

  private build(): void {
    const x = PANEL_X;
    const y = PANEL_Y;

    // Background
    this.border = this.scene.add
      .rectangle(x - 1, y - 1, PANEL_W + 2, PANEL_H + 2, 0x8855aa)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);

    this.bg = this.scene.add
      .rectangle(x, y, PANEL_W, PANEL_H, 0x110022, 0.95)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);

    // Title
    this.titleText = this.scene.add
      .text(x + PANEL_W / 2, y + 6, 'DUNGEON ENTRANCE', {
        fontSize: '6px', color: '#cc88ff', fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 2);

    // ── Tier selector ──────────────────────────────────────────────────────────
    const tierY = y + 18;
    const tierSpacing = (PANEL_W - 6) / TOTAL_TIERS;

    for (let i = 0; i < TOTAL_TIERS; i++) {
      const tier = i + 1;
      const bx = x + 3 + i * tierSpacing;
      const bw = tierSpacing - 2;

      const bg = this.scene.add
        .rectangle(bx, tierY, bw, 10, TIER_COLORS[tier], 0.3)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2)
        .setInteractive({ cursor: 'pointer' })
        .on('pointerdown', () => this.selectTier(tier))
        .on('pointerover', () => { if (this.selectedTier !== tier) bg.setAlpha(0.5); })
        .on('pointerout',  () => { if (this.selectedTier !== tier) bg.setAlpha(0.3); });

      const lbl = this.scene.add
        .text(bx + bw / 2, tierY + 5, `T${tier}`, {
          fontSize: '5px', color: '#ffffff', fontFamily: 'monospace',
        })
        .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 3);

      this.tierBtns.push(bg);
      this.tierLabels.push(lbl);
    }

    // ── Tier info ──────────────────────────────────────────────────────────────
    const infoY = tierY + 14;

    this.tierNameText = this.scene.add
      .text(x + 4, infoY, '', { fontSize: '5px', color: '#ffdd88', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(DEPTH + 2);

    this.tierDescText = this.scene.add
      .text(x + 4, infoY + 8, '', {
        fontSize: '4px', color: '#aaaaaa', fontFamily: 'monospace', wordWrap: { width: PANEL_W - 8 },
      })
      .setScrollFactor(0).setDepth(DEPTH + 2);

    // ── Party readiness ────────────────────────────────────────────────────────
    const partyY = infoY + 22;

    this.partyTitle = this.scene.add
      .text(x + 4, partyY, 'Party:', { fontSize: '4px', color: '#88ddff', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(DEPTH + 2);

    for (let i = 0; i < 4; i++) {
      const lbl = this.scene.add
        .text(x + 4, partyY + 6 + i * 7, '', { fontSize: '4px', color: '#cccccc', fontFamily: 'monospace' })
        .setScrollFactor(0).setDepth(DEPTH + 2);
      this.partyLines.push(lbl);
    }

    // ── Cooldown ───────────────────────────────────────────────────────────────
    const cdY = partyY + 34;

    this.cooldownText = this.scene.add
      .text(x + 4, cdY, '', { fontSize: '4px', color: '#ff8866', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(DEPTH + 2);

    this.cooldownBar = this.scene.add
      .rectangle(x + 4, cdY + 7, PANEL_W - 8, 3, 0x333333)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2);

    this.cooldownFill = this.scene.add
      .rectangle(x + 4, cdY + 7, 0, 3, 0xff4422)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 3);

    // ── Action buttons ─────────────────────────────────────────────────────────
    const btnY = y + PANEL_H - 16;
    const enterX = x + PANEL_W / 2 - BTN_W - 3;
    const cancelX = x + PANEL_W / 2 + 3;

    this.enterBg = this.scene.add
      .rectangle(enterX, btnY, BTN_W, BTN_H, 0x226622)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.confirmEnter())
      .on('pointerover', () => this.enterBg.setFillStyle(0x33aa33))
      .on('pointerout',  () => this.enterBg.setFillStyle(0x226622));

    this.enterLabel = this.scene.add
      .text(enterX + BTN_W / 2, btnY + BTN_H / 2, 'ENTER', {
        fontSize: '5px', color: '#aaffaa', fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 3);

    this.cancelBg = this.scene.add
      .rectangle(cancelX, btnY, BTN_W, BTN_H, 0x662222)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.closePanel())
      .on('pointerover', () => this.cancelBg.setFillStyle(0xaa3333))
      .on('pointerout',  () => this.cancelBg.setFillStyle(0x662222));

    this.cancelLabel = this.scene.add
      .text(cancelX + BTN_W / 2, btnY + BTN_H / 2, 'CANCEL', {
        fontSize: '5px', color: '#ffaaaa', fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 3);

    // Escape key
    if (this.scene.input.keyboard) {
      this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  show(opts: DungeonEntrancePanelOptions): void {
    this.opts = opts;
    this.cooldownRemaining = opts.cooldownRemainingMs;
    this.isOpen = true;

    this.setAllVisible(true);
    this.selectTier(1);
    this.refreshPartyDisplay();
    this.refreshCooldown();

    // Tick cooldown every second
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    if (this.cooldownRemaining > 0) {
      this.cooldownInterval = setInterval(() => {
        this.cooldownRemaining = Math.max(0, this.cooldownRemaining - 1000);
        this.refreshCooldown();
        if (this.cooldownRemaining === 0) {
          if (this.cooldownInterval) clearInterval(this.cooldownInterval);
        }
      }, 1000);
    }
  }

  hide(): void {
    this.isOpen = false;
    this.setAllVisible(false);
    if (this.cooldownInterval) { clearInterval(this.cooldownInterval); this.cooldownInterval = null; }
  }

  update(): void {
    if (!this.isOpen) return;
    if (this.escKey?.isDown) {
      this.closePanel();
    }
  }

  destroy(): void {
    this.hide();
    const all = [
      this.bg, this.border, this.titleText,
      ...this.tierBtns, ...this.tierLabels,
      this.tierNameText, this.tierDescText,
      this.partyTitle, ...this.partyLines,
      this.cooldownText, this.cooldownBar, this.cooldownFill,
      this.enterBg, this.enterLabel, this.cancelBg, this.cancelLabel,
    ];
    all.forEach(obj => obj?.destroy());
  }

  // ── Internal ──────────────────────────────────────────────────────────────────

  private selectTier(tier: number): void {
    this.selectedTier = tier;
    const info = TIER_LABELS[tier];

    for (let i = 0; i < TOTAL_TIERS; i++) {
      const t = i + 1;
      const selected = t === tier;
      this.tierBtns[i].setAlpha(selected ? 1.0 : 0.3);
      this.tierLabels[i].setColor(selected ? '#ffffff' : '#888888');
    }

    this.tierNameText.setText(info.name);
    this.tierDescText.setText(info.description);

    // Dim enter button if tier level too low
    const playerLevel = this.opts?.playerLevel ?? 1;
    const canEnter = playerLevel >= info.minLevel && this.cooldownRemaining === 0;
    this.enterBg.setFillStyle(canEnter ? 0x226622 : 0x333333);
    this.enterLabel.setColor(canEnter ? '#aaffaa' : '#666666');
  }

  private refreshPartyDisplay(): void {
    const members = this.opts?.partyMembers ?? [];
    const soloMode = members.length === 0;

    this.partyTitle.setText(soloMode ? 'Party: (solo)' : `Party: ${members.length}/4`);

    for (let i = 0; i < 4; i++) {
      if (soloMode || i >= members.length) {
        this.partyLines[i].setText('');
      } else {
        const m = members[i];
        const readyMark = m.ready ? '✓' : '○';
        const color = m.ready ? '#44ff88' : '#aaaaaa';
        this.partyLines[i].setText(`  ${readyMark} ${m.name}`).setColor(color);
      }
    }
  }

  private refreshCooldown(): void {
    const onCd = this.cooldownRemaining > 0;
    this.cooldownBar.setVisible(onCd);
    this.cooldownFill.setVisible(onCd);

    if (!onCd) {
      this.cooldownText.setText('Ready to enter!').setColor('#44ff88');
      // Re-enable enter button
      this.selectTier(this.selectedTier);
      return;
    }

    const totalMs = 3_600_000; // 1 hour default — matches DUNGEON_COOLDOWN_MS
    const fillFraction = Math.max(0, this.cooldownRemaining / totalMs);
    this.cooldownFill.setSize(Math.round(fillFraction * (PANEL_W - 8)), 3);

    const mins = Math.floor(this.cooldownRemaining / 60_000);
    const secs = Math.floor((this.cooldownRemaining % 60_000) / 1000);
    this.cooldownText.setText(
      `Cooldown: ${mins}m ${String(secs).padStart(2, '0')}s`,
    ).setColor('#ff8866');

    // Disable enter button while on cooldown
    this.enterBg.setFillStyle(0x333333);
    this.enterLabel.setColor('#666666');
  }

  private confirmEnter(): void {
    if (!this.opts) return;
    if (this.cooldownRemaining > 0) return;

    const info = TIER_LABELS[this.selectedTier];
    const playerLevel = this.opts.playerLevel ?? 1;
    if (playerLevel < info.minLevel) return;

    this.onEnter?.(this.selectedTier);
    this.hide();
  }

  private closePanel(): void {
    this.onCancel?.();
    this.hide();
  }

  private setAllVisible(visible: boolean): void {
    const all: Phaser.GameObjects.GameObject[] = [
      this.bg, this.border, this.titleText,
      ...this.tierBtns, ...this.tierLabels,
      this.tierNameText, this.tierDescText,
      this.partyTitle, ...this.partyLines,
      this.cooldownText, this.cooldownBar, this.cooldownFill,
      this.enterBg, this.enterLabel, this.cancelBg, this.cancelLabel,
    ];
    all.forEach(obj => (obj as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible?.(visible));
  }
}
