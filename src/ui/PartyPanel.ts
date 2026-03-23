/**
 * PartyPanel — party management HUD panel.
 *
 * Layout (fixed to camera, top-left below mini-map area):
 *   [Party header + loot mode toggle]
 *   [Member rows: name | leader crown | HP bar | mana bar | level]
 *   [Leave button]
 *
 * Controls:
 *   P — toggle panel open/closed
 *
 * When closed, shows a compact single-line party status if in a party.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { PartyState, PartyMember } from '../systems/MultiplayerClient';

// ── Layout constants ───────────────────────────────────────────────────────────

const PANEL_X  = CANVAS.WIDTH - 4;   // right-anchored
const PANEL_Y  = 70;                  // below the mini-map
const PANEL_W  = 90;
const ROW_H    = 20;
const BAR_W    = 36;
const BAR_H    = 3;
const DEPTH    = 52;

const COL_NAME  = PANEL_X - PANEL_W + 4;
const COL_BARS  = PANEL_X - PANEL_W + 32;
const COL_LEVEL = PANEL_X - 6;

export class PartyPanel {
  private scene:   Phaser.Scene;
  private isOpen   = false;
  private isInParty = false;

  // Current party state
  private partyState: PartyState | null = null;
  private mySessionId = '';

  // Status bar (shown even when closed)
  private statusBg!:   Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private pKey!:       Phaser.Input.Keyboard.Key;

  // Panel (shown when open + in party)
  private panelBg!:    Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private lootText!:   Phaser.GameObjects.Text;
  private memberRows:  MemberRow[] = [];

  // Callbacks
  onLeave?: () => void;
  onKick?:  (sessionId: string) => void;
  onToggleLootMode?: (mode: 'round_robin' | 'need_greed') => void;
  onInvitePlayer?: (sessionId: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.build();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private build(): void {
    // Compact status bar (always visible when in a party)
    this.statusBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y - 8, PANEL_W, 10, 0x001122, 0.7)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    this.statusText = this.scene.add
      .text(PANEL_X - PANEL_W + 3, PANEL_Y - 7, '[P] Party', {
        fontSize: '4px', color: '#88ddff', fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    // Full panel background
    this.panelBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y + 4, PANEL_W, ROW_H * 4 + 26, 0x000d1a, 0.85)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    this.headerText = this.scene.add
      .text(PANEL_X - PANEL_W + 3, PANEL_Y + 6, 'PARTY', {
        fontSize: '5px', color: '#88ddff', fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    this.lootText = this.scene.add
      .text(PANEL_X - 4, PANEL_Y + 6, 'loot: ?', {
        fontSize: '4px', color: '#aaaaaa', fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => {
        if (!this.partyState) return;
        const next = this.partyState.lootMode === 'round_robin' ? 'need_greed' : 'round_robin';
        this.onToggleLootMode?.(next);
      });

    // Pre-create member rows (max 4)
    for (let i = 0; i < 4; i++) {
      const y = PANEL_Y + 18 + i * ROW_H;
      const row = new MemberRow(this.scene, COL_NAME, y, BAR_W, BAR_H, DEPTH);
      row.setOnKick((sid) => this.onKick?.(sid));
      this.memberRows.push(row);
    }

    // P key
    const kb = this.scene.input.keyboard!;
    this.pKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  }

  // ── Update (called from GameScene.update) ──────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.pKey)) {
      this.isOpen = !this.isOpen;
      this.refresh();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setMySessionId(sid: string): void {
    this.mySessionId = sid;
  }

  applyPartyState(state: PartyState): void {
    this.partyState = state;
    this.isInParty  = true;
    this.refresh();
  }

  clearParty(): void {
    this.partyState  = null;
    this.isInParty   = false;
    this.isOpen      = false;
    this.refresh();
  }

  closeIfOpen(): boolean {
    if (this.isOpen) { this.isOpen = false; this.refresh(); return true; }
    return false;
  }

  // ── Internal refresh ───────────────────────────────────────────────────────

  private refresh(): void {
    if (!this.isInParty || !this.partyState) {
      // Not in a party — hide everything
      this.statusBg.setVisible(false);
      this.statusText.setVisible(false);
      this.panelBg.setVisible(false);
      this.headerText.setVisible(false);
      this.lootText.setVisible(false);
      this.memberRows.forEach(r => r.setVisible(false));
      return;
    }

    const party = this.partyState;
    const label = `[P] Party (${party.members.length}/4)`;
    this.statusText.setText(label);
    this.statusBg.setVisible(true);
    this.statusText.setVisible(true);

    const panelH = ROW_H * party.members.length + 26;
    this.panelBg.height = panelH;

    const lootLabel = party.lootMode === 'round_robin' ? 'loot: rr' : 'loot: ng';
    this.lootText.setText(lootLabel);

    const visible = this.isOpen;
    this.panelBg.setVisible(visible);
    this.headerText.setVisible(visible);
    this.lootText.setVisible(visible);

    const myMember = party.members.find(m => m.sessionId === this.mySessionId);
    const amLeader = myMember?.isLeader ?? false;

    for (let i = 0; i < 4; i++) {
      const row = this.memberRows[i];
      const member = party.members[i];
      if (member && visible) {
        row.applyMember(member, amLeader && !member.isLeader);
        row.setY(PANEL_Y + 18 + i * ROW_H);
        row.setVisible(true);
      } else {
        row.setVisible(false);
      }
    }
  }
}

// ── MemberRow ──────────────────────────────────────────────────────────────────

class MemberRow {
  private scene:    Phaser.Scene;
  private baseX:    number;
  private baseY:    number;
  private depth:    number;

  private nameTxt!:   Phaser.GameObjects.Text;
  private crownTxt!:  Phaser.GameObjects.Text;
  private hpBg!:      Phaser.GameObjects.Rectangle;
  private hpFill!:    Phaser.GameObjects.Rectangle;
  private manaBg!:    Phaser.GameObjects.Rectangle;
  private manaFill!:  Phaser.GameObjects.Rectangle;
  private levelTxt!:  Phaser.GameObjects.Text;
  private kickTxt!:   Phaser.GameObjects.Text;

  private barW: number;
  private barH: number;
  private sessionId = '';
  private onKickCb?: (sid: string) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, barW: number, barH: number, depth: number) {
    this.scene  = scene;
    this.baseX  = x;
    this.baseY  = y;
    this.barW   = barW;
    this.barH   = barH;
    this.depth  = depth;
    this.buildRow();
  }

  private buildRow(): void {
    const x = this.baseX;
    const y = this.baseY;
    const D = this.depth + 1;

    this.crownTxt = this.scene.add
      .text(x, y, '♦', { fontSize: '4px', color: '#ffcc00', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(D).setVisible(false);

    this.nameTxt = this.scene.add
      .text(x + 6, y, '', { fontSize: '4px', color: '#ccddee', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(D).setVisible(false);

    // HP bar
    const bx = COL_BARS;
    this.hpBg = this.scene.add
      .rectangle(bx, y + 7, this.barW, this.barH, 0x331111)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D).setVisible(false);
    this.hpFill = this.scene.add
      .rectangle(bx, y + 7, this.barW, this.barH, 0x22dd44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 1).setVisible(false);

    // Mana bar
    this.manaBg = this.scene.add
      .rectangle(bx, y + 12, this.barW, this.barH, 0x111133)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D).setVisible(false);
    this.manaFill = this.scene.add
      .rectangle(bx, y + 12, this.barW, this.barH, 0x3399ff)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 1).setVisible(false);

    this.levelTxt = this.scene.add
      .text(COL_LEVEL, y + 1, '', { fontSize: '4px', color: '#aabbcc', fontFamily: 'monospace' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(D).setVisible(false);

    this.kickTxt = this.scene.add
      .text(COL_LEVEL, y + 9, 'kick', { fontSize: '4px', color: '#ff6666', fontFamily: 'monospace' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(D).setVisible(false)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.onKickCb?.(this.sessionId));
  }

  setOnKick(cb: (sid: string) => void): void {
    this.onKickCb = cb;
  }

  setY(y: number): void {
    this.baseY = y;
    // Recalc absolute positions
    const abs = y;
    this.crownTxt.y = abs;
    this.nameTxt.y  = abs;
    this.hpBg.y     = abs + 7;
    this.hpFill.y   = abs + 7;
    this.manaBg.y   = abs + 12;
    this.manaFill.y = abs + 12;
    this.levelTxt.y = abs + 1;
    this.kickTxt.y  = abs + 9;
  }

  applyMember(m: PartyMember, canKick: boolean): void {
    this.sessionId = m.sessionId;
    this.crownTxt.setVisible(m.isLeader);
    const maxName = 10;
    this.nameTxt.setText(m.name.length > maxName ? m.name.slice(0, maxName) + '…' : m.name);
    const hpPct = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
    this.hpFill.scaleX = hpPct;
    this.hpFill.setFillStyle(hpPct > 0.5 ? 0x22dd44 : hpPct > 0.25 ? 0xffaa00 : 0xff2222);

    const manaPct = m.maxMana > 0 ? Math.max(0, Math.min(1, m.mana / m.maxMana)) : 0;
    this.manaFill.scaleX = manaPct;

    this.levelTxt.setText(`Lv${m.level}`);
    this.kickTxt.setVisible(canKick);
  }

  setVisible(v: boolean): void {
    this.crownTxt.setVisible(v && false);  // managed by applyMember
    this.nameTxt.setVisible(v);
    this.hpBg.setVisible(v);
    this.hpFill.setVisible(v);
    this.manaBg.setVisible(v);
    this.manaFill.setVisible(v);
    this.levelTxt.setVisible(v);
    if (!v) this.kickTxt.setVisible(false);
    if (!v) this.crownTxt.setVisible(false);
  }
}
