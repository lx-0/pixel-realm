import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import { SaveManager } from '../systems/SaveManager';
import { SKILL_BY_ID } from '../config/skills';
import type { GameOverData, SessionStats } from './GameScene';

type Tab = 'combat' | 'economy' | 'abilities';

/**
 * GameOverScene — full-screen result screen.
 * Shows victory or defeat depending on GameOverData.victory.
 * Expanded with 3 stats tabs: Combat, Economy, Abilities.
 * Routes back to LevelSelectScene instead of directly replaying.
 */
export class GameOverScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.GAME_OVER);
  }

  create(data: GameOverData): void {
    this.sfx = SoundManager.getInstance();
    const {
      kills = 0, level = 1, timeSecs = 0,
      zoneName = '', victory = false, score = 0, zoneId = '',
      sessionStats,
    } = data ?? {};

    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Background ───────────────────────────────────────────────────────────
    const bgColor = victory ? 0x050f05 : 0x0d0d0d;
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, bgColor);

    const tint = victory
      ? [0xffd700, 0xffe040, 0xffaa00, 0x44ff88]
      : [0xd42020, 0x5a0a0a, 0x888888];
    this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: CANVAS.WIDTH },
      y: CANVAS.HEIGHT + 4,
      speedY: { min: -12, max: -4 },
      speedX: { min: -2, max: 2 },
      scale: { start: 0.35, end: 0 },
      lifespan: { min: 5000, max: 8000 },
      tint,
      alpha: { start: 0.55, end: 0 },
      frequency: 380,
      quantity: 1,
    }).setDepth(1);

    // ── Title ─────────────────────────────────────────────────────────────────
    const titleStr = victory ? 'ZONE CLEARED!' : 'GAME OVER';
    const titleCol = victory ? '#ffd700'       : '#d42020';

    const title = this.add.text(cx, cy - 72, titleStr, {
      fontSize: '16px', color: titleCol, fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 600, ease: 'Power2' });

    if (zoneName) {
      this.add.text(cx, cy - 57, zoneName, {
        fontSize: '6px', color: '#aaaacc', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(10);
    }

    // ── Header stats (always visible) ─────────────────────────────────────────
    const mins = Math.floor(timeSecs / 60);
    const secs = String(timeSecs % 60).padStart(2, '0');
    const headerStats: [string, string][] = [
      ['Score',         String(score)],
      ['Enemies Slain', String(kills)],
      ['Level Reached', String(level)],
      ['Time',          `${mins}:${secs}`],
    ];

    const headerY = cy - 46;
    this.add.rectangle(cx, headerY + 12, 170, 36, 0x0a0a1e, 0.9).setDepth(5);
    const headerBorder = this.add.graphics().setDepth(6);
    headerBorder.lineStyle(1, victory ? 0xffd700 : 0x5a0a0a, 0.8);
    headerBorder.strokeRect(cx - 85, headerY - 6, 170, 36);

    headerStats.forEach(([label, value], i) => {
      const x0 = i < 2 ? cx - 80 : cx + 5;
      const y  = headerY + (i % 2) * 14;
      this.add.text(x0, y, label, { fontSize: '5px', color: '#888899', fontFamily: 'monospace' }).setDepth(10);
      this.add.text(x0 + 72, y, value, { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(1, 0).setDepth(10);
    });

    // ── Personal bests strip ─────────────────────────────────────────────────
    if (victory && zoneId) {
      const save  = SaveManager.load();
      const bests = save.zoneBests[zoneId];
      if (bests) {
        const bMins = Math.floor(bests.bestTimeSecs / 60);
        const bSecs = String(bests.bestTimeSecs % 60).padStart(2, '0');
        const bestStr = `Best: ${bMins}:${bSecs} | Kills: ${bests.mostKills} | Min DMG: ${bests.leastDmgTaken === -1 ? '—' : bests.leastDmgTaken}`;
        this.add.text(cx, headerY + 30, bestStr, {
          fontSize: '4px', color: '#ffdd88', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setDepth(10);
      }
    }

    // ── Expanded stats panel (tabs) ───────────────────────────────────────────
    if (sessionStats) {
      this.buildStatsPanel(cx, cy, victory, sessionStats, timeSecs);
    }

    // ── Buttons ───────────────────────────────────────────────────────────────
    const primaryLabel = victory ? '▶  Level Select' : '▶  Try Again';
    const primaryColor = victory ? '#44ff88'         : '#ffe040';

    const primaryBtn = this.makeButton(cx, cy + 80, primaryLabel, primaryColor);
    const menuBtn    = this.makeButton(cx, cy + 94, 'Main Menu', '#90d0f8');

    primaryBtn.on('pointerdown', () => {
      if (victory) this.goLevelSelect();
      else this.retry(zoneId);
    });
    menuBtn.on('pointerdown', () => this.goMenu());

    this.input.keyboard?.once('keydown-SPACE', () => {
      if (victory) this.goLevelSelect();
      else this.retry(zoneId);
    });
    this.input.keyboard?.once('keydown-ESC', () => this.goLevelSelect());

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ── Expanded stats panel ────────────────────────────────────────────────────

  private buildStatsPanel(
    cx: number, cy: number,
    victory: boolean,
    s: SessionStats,
    timeSecs: number,
  ): void {
    const TABS: Tab[] = ['combat', 'economy', 'abilities'];
    let activeTab: Tab = 'combat';

    const panelY   = cy + 16;
    const panelW   = 170;
    const panelH   = 52;
    const borderCol = victory ? 0x334422 : 0x332222;

    // Panel background
    this.add.rectangle(cx, panelY, panelW, panelH, 0x050510, 0.92).setDepth(5);
    const pBorder = this.add.graphics().setDepth(6);
    pBorder.lineStyle(1, borderCol, 0.9);
    pBorder.strokeRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH);

    // Tab buttons + content container
    const tabY     = panelY - panelH / 2 + 6;
    const tabW     = panelW / TABS.length;
    const tabBgs   = TABS.map((_tab, i) => {
      const tx = cx - panelW / 2 + tabW * i + tabW / 2;
      return this.add.rectangle(tx, tabY, tabW - 2, 10, 0x111122, 0.9).setDepth(7).setInteractive({ useHandCursor: true });
    });
    const tabLabels = TABS.map((tab, i) => {
      const tx = cx - panelW / 2 + tabW * i + tabW / 2;
      const label = tab.charAt(0).toUpperCase() + tab.slice(1);
      return this.add.text(tx, tabY, label, {
        fontSize: '5px', color: '#aaaacc', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(8);
    });

    // Content area — rebuilt on tab switch
    let contentObjs: Phaser.GameObjects.GameObject[] = [];

    const setActiveTab = (tab: Tab): void => {
      activeTab = tab;
      // Update tab visuals
      TABS.forEach((t, i) => {
        const active = t === tab;
        tabBgs[i].setFillStyle(active ? 0x223366 : 0x111122);
        tabLabels[i].setColor(active ? '#ffffff' : '#aaaacc');
      });
      // Destroy old content
      contentObjs.forEach(o => (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy());
      contentObjs = [];

      const rows = this.getTabRows(tab, s, timeSecs);
      const startY = panelY - panelH / 2 + 16;
      const cols   = Math.ceil(rows.length / 3);
      const colW   = panelW / cols;

      rows.forEach(([label, value], idx) => {
        const col   = Math.floor(idx / 3);
        const row   = idx % 3;
        const x0    = cx - panelW / 2 + col * colW + 4;
        const y     = startY + row * 11;
        const lbl = this.add.text(x0, y, label, { fontSize: '5px', color: '#8899aa', fontFamily: 'monospace' }).setDepth(10);
        const val = this.add.text(x0 + colW - 8, y, value, { fontSize: '5px', color: '#ddddff', fontFamily: 'monospace' }).setOrigin(1, 0).setDepth(10);
        contentObjs.push(lbl, val);
      });
    };

    TABS.forEach((t, i) => {
      tabBgs[i].on('pointerdown', () => {
        this.sfx.playMenuClick();
        setActiveTab(t);
      });
      tabBgs[i].on('pointerover', () => { if (activeTab !== t) tabBgs[i].setFillStyle(0x1a1a44); });
      tabBgs[i].on('pointerout',  () => { if (activeTab !== t) tabBgs[i].setFillStyle(0x111122); });
    });

    setActiveTab('combat');
  }

  private getTabRows(tab: Tab, s: SessionStats, timeSecs: number): [string, string][] {
    const secs = Math.max(1, timeSecs);
    switch (tab) {
      case 'combat': {
        const dps      = Math.round(s.damageDealt / secs);
        const critPct  = s.totalHits > 0 ? Math.round((s.critHits / s.totalHits) * 100) : 0;
        const dodgePct = s.dodgesAttempted > 0 ? Math.round((s.dodgesSuccessful / s.dodgesAttempted) * 100) : 0;
        return [
          ['DMG Dealt',  String(s.damageDealt)],
          ['DPS',        String(dps)],
          ['Highest Hit',String(s.highestHit)],
          ['DMG Taken',  String(s.damageTaken)],
          ['Crit %',     `${critPct}%`],
          ['Dodge %',    `${dodgePct}%`],
        ];
      }
      case 'economy':
        return [
          ['XP Gained',  String(s.xpGained)],
          ['Gold Earned',String(s.goldEarned)],
          ['Items Found',String(s.itemsLooted)],
          ['Healing',    String(s.healingReceived)],
        ];
      case 'abilities': {
        const entries = Object.entries(s.skillCasts);
        if (entries.length === 0) return [['No skills used', '']];
        return entries.map(([id, count]) => {
          const name = SKILL_BY_ID.get(id)?.name ?? id;
          return [name.length > 12 ? name.slice(0, 11) + '…' : name, String(count)] as [string, string];
        });
      }
    }
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  private makeButton(x: number, y: number, label: string, color: string): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontSize: '7px', color, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    btn.on('pointerover', () => { btn.setColor('#ffffff'); btn.setScale(1.07); });
    btn.on('pointerout',  () => { btn.setColor(color);    btn.setScale(1); });
    return btn;
  }

  private retry(zoneId: string): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.GAME, { zoneId }));
  }

  private goLevelSelect(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.LEVEL_SELECT));
  }

  private goMenu(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.MENU));
  }
}
