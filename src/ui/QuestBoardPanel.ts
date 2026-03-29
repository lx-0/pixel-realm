/**
 * QuestBoardPanel — parchment-style town quest board showing LLM-generated quests.
 *
 * Press B (or interact with the Quest Board object) to open.
 *
 * Features:
 *  - Scroll/parchment frame per quest entry (ui_frame_quest_scroll art)
 *  - Quest type icon, title, reward summary, difficulty stars
 *  - "Take Quest" button to immediately accept a quest via the server
 *  - "Refresh" button — respects a per-board daily-reset cooldown
 *  - Daily-reset badge: shows time until next board refresh
 *
 * Connects to GET /quests/board?zoneId=X (returns ClientQuest[]).
 * Quest acceptance goes to the existing onAccept callback so GameScene handles it.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { ClientQuest } from '../systems/MultiplayerClient';

const PANEL_W  = 220;
const PANEL_H  = 180;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 78;
const PAD      = 5;

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

const RARITY_STARS: Record<string, string> = {
  easy:   '★☆☆',
  medium: '★★☆',
  hard:   '★★★',
};

const QUEST_TYPE_COLORS: Record<string, string> = {
  kill:    '#ee8888',
  collect: '#88ccff',
  escort:  '#aaffaa',
  fetch:   '#ffdd88',
  explore: '#cc99ff',
  lore:    '#ffaadd',
};

/** Daily-reset board cooldown key in localStorage. */
const BOARD_REFRESH_KEY = 'pr_questboard_next_refresh';
const BOARD_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class QuestBoardPanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bKey!:     Phaser.Input.Keyboard.Key;

  private visible       = false;
  private loading       = false;
  private quests:       ClientQuest[] = [];
  private selectedIdx   = -1;
  private feedback      = '';
  private zoneId        = '';

  /** Called when the player takes a quest from the board. */
  onAccept?: (quest: ClientQuest) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.bKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.rebuild();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.bKey)) {
      this.toggle();
    }
  }

  show(zoneId = ''): void {
    this.zoneId   = zoneId;
    this.visible  = true;
    this.feedback = '';
    this.selectedIdx = -1;
    this.container.setVisible(true);
    this.fetchQuests();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  get isVisible(): boolean { return this.visible; }

  destroy(): void { this.container.destroy(true); }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  private toggle(): void { this.visible ? this.hide() : this.show(this.zoneId); }

  private async fetchQuests(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.rebuild();
    try {
      const params = this.zoneId ? `?zoneId=${encodeURIComponent(this.zoneId)}` : '';
      const r = await fetch(`${SERVER_HTTP}/quests/board${params}`);
      if (r.ok) {
        this.quests = await r.json() as ClientQuest[];
      }
    } catch { /* server offline — quests stays empty */ }
    this.loading = false;
    // Mark last-refresh time
    localStorage.setItem(BOARD_REFRESH_KEY, String(Date.now() + BOARD_REFRESH_INTERVAL_MS));
    if (this.visible) this.rebuild();
  }

  // ── Take quest ────────────────────────────────────────────────────────────

  private takeQuest(quest: ClientQuest): void {
    this.onAccept?.(quest);
    this.feedback = `✦ Accepted: ${quest.title}`;
    this.selectedIdx = -1;
    this.rebuild();
  }

  // ── Rebuild ───────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    // Background — use parchment panel if available
    if (this.scene.textures.exists('ui_panel_quest_board')) {
      const bg = this.scene.add.image(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, 'ui_panel_quest_board')
        .setDisplaySize(PANEL_W, PANEL_H).setScrollFactor(0).setOrigin(0.5);
      this.container.add(bg);
    } else {
      const bg = this.scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x1a1208, 0.94)
        .setOrigin(0, 0).setScrollFactor(0);
      const border = this.scene.add.graphics().setScrollFactor(0);
      border.lineStyle(1, 0x886633, 0.9);
      border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
      this.container.add([bg, border]);
    }

    // Title
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PAD,
        '📋 Quest Board',
        { fontSize: '5px', color: '#ddbb77', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0).setScrollFactor(0),
    );

    // Daily reset countdown
    const nextRefresh = parseInt(localStorage.getItem(BOARD_REFRESH_KEY) ?? '0', 10);
    const msLeft = nextRefresh - Date.now();
    const resetLabel = msLeft > 0
      ? `Next refresh: ${this.formatCountdown(msLeft)}`
      : 'Board refreshes daily';
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + 12,
        resetLabel,
        { fontSize: '3px', color: '#887755', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0).setScrollFactor(0),
    );

    const contentY = PANEL_Y + 20;

    if (this.loading) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, contentY + 20, 'Loading quests…',
          { fontSize: '4px', color: '#888877', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0).setScrollFactor(0),
      );
    } else if (this.quests.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, contentY + 20,
          'No quests available.\nCheck back tomorrow!',
          { fontSize: '4px', color: '#887766', fontFamily: 'monospace', align: 'center' },
        ).setOrigin(0.5, 0).setScrollFactor(0),
      );
    } else {
      this.renderQuestList(contentY);
    }

    // Feedback
    if (this.feedback) {
      const fColor = this.feedback.startsWith('✦') ? '#88ff88' : '#ffaaaa';
      this.container.add(
        this.scene.add.text(PANEL_X + PAD, PANEL_Y + PANEL_H - 12, this.feedback,
          { fontSize: '3px', color: fColor, fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );
    }

    // Refresh button (bottom-right)
    const canRefresh = (parseInt(localStorage.getItem(BOARD_REFRESH_KEY) ?? '0', 10) - Date.now()) <= 0;
    const refreshColor = canRefresh ? 0x223344 : 0x111111;
    const refreshBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 32, PANEL_Y + PANEL_H - 14, 32, 9, refreshColor, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: canRefresh });
    const refreshTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 16, PANEL_Y + PANEL_H - 10, 'Refresh',
      { fontSize: '3px', color: canRefresh ? '#aaddff' : '#445566', fontFamily: 'monospace' },
    ).setOrigin(0.5).setScrollFactor(0);
    if (canRefresh) refreshBtn.on('pointerup', () => this.fetchQuests());
    this.container.add([refreshBtn, refreshTxt]);

    // Close hint
    this.container.add(
      this.scene.add.text(PANEL_X + PAD, PANEL_Y + PANEL_H - 5, '[B/Esc]',
        { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  private renderQuestList(startY: number): void {
    const SCROLL_H  = 36; // height of each quest scroll entry
    const SCROLL_W  = PANEL_W - PAD * 2;
    const GAP       = 3;
    const maxVisible = 3;

    this.quests.slice(0, maxVisible).forEach((quest, i) => {
      const qy         = startY + i * (SCROLL_H + GAP);
      const isSelected = this.selectedIdx === i;
      const typeColor  = QUEST_TYPE_COLORS[quest.questType] ?? '#ccbbaa';

      // Scroll frame background
      if (this.scene.textures.exists('ui_frame_quest_scroll')) {
        const scrollBg = this.scene.add.image(PANEL_X + PAD + SCROLL_W / 2, qy + SCROLL_H / 2, 'ui_frame_quest_scroll')
          .setDisplaySize(SCROLL_W, SCROLL_H).setScrollFactor(0).setInteractive({ useHandCursor: true });
        scrollBg.on('pointerup', () => {
          this.selectedIdx = (this.selectedIdx === i) ? -1 : i;
          this.rebuild();
        });
        this.container.add(scrollBg);
        if (isSelected) {
          const selBorder = this.scene.add.graphics().setScrollFactor(0);
          selBorder.lineStyle(1, 0xddbb77, 0.9);
          selBorder.strokeRect(PANEL_X + PAD, qy, SCROLL_W, SCROLL_H);
          this.container.add(selBorder);
        }
      } else {
        const scrollBg = this.scene.add.rectangle(PANEL_X + PAD, qy, SCROLL_W, SCROLL_H,
          isSelected ? 0x2a1e10 : 0x1a1208, 0.9)
          .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
        if (isSelected) scrollBg.setStrokeStyle(1, 0xddbb77, 0.9);
        scrollBg.on('pointerup', () => {
          this.selectedIdx = (this.selectedIdx === i) ? -1 : i;
          this.rebuild();
        });
        this.container.add(scrollBg);
      }

      // Quest type badge
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 2, qy + 2,
          quest.questType.toUpperCase(),
          { fontSize: '3px', color: typeColor, fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      // Difficulty stars
      const difficulty = (quest as any).difficulty as string | undefined;
      const stars = RARITY_STARS[difficulty ?? 'medium'] ?? '★★☆';
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + SCROLL_W - 2, qy + 2,
          stars,
          { fontSize: '3px', color: '#ffcc44', fontFamily: 'monospace' },
        ).setOrigin(1, 0).setScrollFactor(0),
      );

      // Title
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 2, qy + 9,
          quest.title.slice(0, 38),
          { fontSize: '4px', color: '#ddbb77', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      // Reward summary
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 2, qy + 17,
          `${quest.rewards.gold}g  ${quest.rewards.xp}xp`,
          { fontSize: '3px', color: '#aabb88', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      // Description snippet (only when selected)
      if (isSelected) {
        const desc = quest.description.slice(0, 60) + (quest.description.length > 60 ? '…' : '');
        this.container.add(
          this.scene.add.text(PANEL_X + PAD + 2, qy + 24,
            desc,
            { fontSize: '3px', color: '#998877', fontFamily: 'monospace',
              wordWrap: { width: SCROLL_W - 50 } },
          ).setScrollFactor(0),
        );

        // Take Quest button
        const takeBtn = this.scene.add.rectangle(PANEL_X + PAD + SCROLL_W - 50, qy + 24, 48, 10, 0x224422, 0.9)
          .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
        const takeTxt = this.scene.add.text(PANEL_X + PAD + SCROLL_W - 26, qy + 29,
          'Take Quest',
          { fontSize: '3px', color: '#88ff88', fontFamily: 'monospace' },
        ).setOrigin(0.5).setScrollFactor(0);
        takeBtn.on('pointerup', () => this.takeQuest(quest));
        this.container.add([takeBtn, takeTxt]);
      }
    });
  }

  private formatCountdown(ms: number): string {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }
}
