/**
 * SocialPanel — friend list and social panel HUD.
 *
 * Layout (fixed to camera, top-right, below PartyPanel):
 *   [FRIENDS header]
 *   [friend row: ● name  whisper / unfriend]
 *   ...
 *   [pending row: ⊕ name  accept / decline]
 *   [input bar for /add <name>]
 *
 * Controls:
 *   O — toggle panel open/closed
 *   Right-click a player name in zone → whisper/invite/block (via context menu)
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { FriendEntry } from '../systems/MultiplayerClient';

// ── Layout ─────────────────────────────────────────────────────────────────────

const PANEL_X  = CANVAS.WIDTH - 4;   // right-anchored
const PANEL_Y  = 130;                 // below party panel
const PANEL_W  = 92;
const ROW_H    = 11;
const DEPTH    = 52;
const MAX_ROWS = 8;

const COL_DOT  = PANEL_X - PANEL_W + 3;
const COL_NAME = PANEL_X - PANEL_W + 10;
const COL_ACT  = PANEL_X - 4;        // right-aligned action buttons

const COLOR_ONLINE  = '#44ee88';
const COLOR_OFFLINE = '#556677';
const COLOR_PENDING = '#ffcc44';
const COLOR_HEADER  = '#88ccff';
const COLOR_ACTION  = '#aaddff';
const COLOR_REMOVE  = '#ff7777';
const COLOR_ACCEPT  = '#66ff88';
const COLOR_DECLINE = '#ff6666';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FriendRow {
  dot:    Phaser.GameObjects.Text;
  name:   Phaser.GameObjects.Text;
  actA:   Phaser.GameObjects.Text;  // whisper | accept
  actB:   Phaser.GameObjects.Text;  // unfriend | decline
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export class SocialPanel {
  private scene:  Phaser.Scene;
  private isOpen  = false;

  private friends: FriendEntry[] = [];

  // Status bar
  private statusBg!:   Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private oKey!:       Phaser.Input.Keyboard.Key;

  // Full panel
  private panelBg!:    Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private rows:        FriendRow[] = [];
  private emptyText!:  Phaser.GameObjects.Text;

  // Add-friend input
  private inputBg!:    Phaser.GameObjects.Rectangle;
  private inputLabel!: Phaser.GameObjects.Text;
  private inputOpen    = false;
  private inputBuf     = '';
  private keyListener?: (e: KeyboardEvent) => void;

  // Context menu
  private ctxBg!:      Phaser.GameObjects.Rectangle;
  private ctxItems:    Phaser.GameObjects.Text[] = [];
  private ctxVisible   = false;
  private ctxTarget    = '';  // player name the context menu is for

  // Callbacks
  onWhisper?:          (targetName: string) => void;
  onPartyInvite?:      (sessionId: string) => void;  // needs sessionId lookup
  onFriendRequest?:    (targetName: string) => void;
  onFriendAccept?:     (requesterName: string) => void;
  onFriendDecline?:    (requesterName: string) => void;
  onFriendRemove?:     (targetName: string) => void;
  onBlockPlayer?:      (targetName: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.build();
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private build(): void {
    // Status bar (always visible)
    this.statusBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y - 8, PANEL_W, 10, 0x001122, 0.7)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    this.statusText = this.scene.add
      .text(PANEL_X - PANEL_W + 3, PANEL_Y - 7, '[O] Friends', {
        fontSize: '4px', color: COLOR_HEADER, fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // Full panel bg
    this.panelBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y + 4, PANEL_W, ROW_H * MAX_ROWS + 30, 0x000d1a, 0.85)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    this.headerText = this.scene.add
      .text(PANEL_X - PANEL_W + 3, PANEL_Y + 6, 'FRIENDS', {
        fontSize: '5px', color: COLOR_HEADER, fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    // Add-friend hint (right of header)
    const addHint = this.scene.add
      .text(PANEL_X - 4, PANEL_Y + 6, '[+add]', {
        fontSize: '4px', color: COLOR_ACTION, fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.openAddInput());
    // Store for visibility management
    (this as any)._addHint = addHint;

    // Empty label
    this.emptyText = this.scene.add
      .text(PANEL_X - PANEL_W + 3, PANEL_Y + 18, 'No friends yet.', {
        fontSize: '4px', color: '#445566', fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    // Pre-build rows
    for (let i = 0; i < MAX_ROWS; i++) {
      const y = PANEL_Y + 18 + i * ROW_H;
      const row = this.buildRow(y);
      this.rows.push(row);
    }

    // Add-friend input
    this.inputBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y + 4 + ROW_H * MAX_ROWS + 18, PANEL_W, 10, 0x001122, 0.8)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    this.inputLabel = this.scene.add
      .text(PANEL_X - PANEL_W + 3, PANEL_Y + 4 + ROW_H * MAX_ROWS + 19, '', {
        fontSize: '4px', color: '#ffffff', fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    // Context menu (shared, hidden until triggered)
    this.ctxBg = this.scene.add
      .rectangle(0, 0, 60, 36, 0x001122, 0.92)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(90)
      .setVisible(false);

    const ctxLabels = ['Whisper', 'Party invite', 'Block'];
    const ctxColors = [COLOR_ACTION, '#aaffaa', COLOR_REMOVE];
    for (let i = 0; i < ctxLabels.length; i++) {
      const t = this.scene.add
        .text(0, 0, ctxLabels[i], { fontSize: '4px', color: ctxColors[i], fontFamily: 'monospace' })
        .setScrollFactor(0)
        .setDepth(91)
        .setVisible(false)
        .setInteractive({ cursor: 'pointer' })
        .on('pointerdown', () => this.handleCtxAction(i));
      this.ctxItems.push(t);
    }

    // Dismiss context menu on click elsewhere
    this.scene.input.on('pointerdown', (_ptr: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      if (this.ctxVisible && !objs.some(o => this.ctxItems.includes(o as Phaser.GameObjects.Text))) {
        this.hideCtxMenu();
      }
    });

    // O key
    const kb = this.scene.input.keyboard!;
    this.oKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.O);
  }

  private buildRow(y: number): FriendRow {
    const D = DEPTH + 1;

    const dot = this.scene.add
      .text(COL_DOT, y, '●', { fontSize: '4px', color: COLOR_OFFLINE, fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(D).setVisible(false);

    const name = this.scene.add
      .text(COL_NAME, y, '', { fontSize: '4px', color: '#ccddee', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(D).setVisible(false);

    const actA = this.scene.add
      .text(COL_ACT, y, '', { fontSize: '4px', color: COLOR_ACCEPT, fontFamily: 'monospace' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(D).setVisible(false)
      .setInteractive({ cursor: 'pointer' });

    const actB = this.scene.add
      .text(COL_ACT, y + 5, '', { fontSize: '4px', color: COLOR_REMOVE, fontFamily: 'monospace' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(D).setVisible(false)
      .setInteractive({ cursor: 'pointer' });

    return { dot, name, actA, actB };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.oKey) && !this.inputOpen) {
      this.isOpen = !this.isOpen;
      this.refresh();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  applyFriends(friends: FriendEntry[]): void {
    this.friends = friends;
    if (this.isOpen) this.refresh();
  }

  /** Update a friend's online status without full refresh. */
  setFriendOnline(username: string, online: boolean): void {
    const f = this.friends.find(f => f.username === username);
    if (f) {
      f.online = online;
      if (this.isOpen) this.refresh();
    }
  }

  closeIfOpen(): boolean {
    if (this.inputOpen) { this.closeAddInput(false); return true; }
    if (this.ctxVisible) { this.hideCtxMenu(); return true; }
    if (this.isOpen) { this.isOpen = false; this.refresh(); return true; }
    return false;
  }

  /** Show context menu for a zone player (right-click). */
  showContextMenu(playerName: string, screenX: number, screenY: number): void {
    this.ctxTarget = playerName;
    const mx = Math.min(screenX, CANVAS.WIDTH - 64);
    const my = Math.min(screenY, CANVAS.HEIGHT - 40);
    this.ctxBg.setPosition(mx, my).setVisible(true);
    for (let i = 0; i < this.ctxItems.length; i++) {
      this.ctxItems[i].setPosition(mx + 3, my + 3 + i * 11).setVisible(true);
    }
    this.ctxVisible = true;
  }

  get active(): boolean {
    return this.inputOpen;
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  private refresh(): void {
    const addHint = (this as any)._addHint as Phaser.GameObjects.Text;

    const vis = this.isOpen;
    this.panelBg.setVisible(vis);
    this.headerText.setVisible(vis);
    addHint.setVisible(vis);

    if (!vis) {
      this.rows.forEach(r => this.hideRow(r));
      this.emptyText.setVisible(false);
      this.inputBg.setVisible(false);
      this.inputLabel.setVisible(false);
      return;
    }

    // Resize panel to fit rows
    const displayList = this.friends.slice(0, MAX_ROWS);
    const panelH = Math.max(ROW_H * Math.max(displayList.length, 1) + 30, 22);
    this.panelBg.height = panelH;

    if (displayList.length === 0) {
      this.emptyText.setVisible(true);
      this.rows.forEach(r => this.hideRow(r));
    } else {
      this.emptyText.setVisible(false);
      for (let i = 0; i < MAX_ROWS; i++) {
        const row = this.rows[i];
        const friend = displayList[i];
        if (!friend) { this.hideRow(row); continue; }

        const y = PANEL_Y + 18 + i * ROW_H;
        row.dot.y    = y;
        row.name.y   = y;
        row.actA.y   = y;
        row.actB.y   = y + 5;

        if (friend.status === 'accepted') {
          const dotColor = friend.online ? COLOR_ONLINE : COLOR_OFFLINE;
          row.dot.setStyle({ color: dotColor }).setVisible(true);
          const nameStr = friend.username.length > 10
            ? friend.username.slice(0, 9) + '…'
            : friend.username;
          row.name.setText(nameStr).setStyle({ color: '#ccddee' }).setVisible(true);

          // Actions: [w] whisper on top, [x] remove below
          row.actA.setText('w').setStyle({ color: COLOR_ACTION }).setVisible(friend.online);
          row.actB.setText('x').setStyle({ color: COLOR_REMOVE }).setVisible(true);

          // Wire callbacks (rebind each refresh — cheap for small lists)
          row.actA.off('pointerdown').on('pointerdown', () => {
            this.onWhisper?.(friend.username);
          });
          row.actB.off('pointerdown').on('pointerdown', () => {
            this.onFriendRemove?.(friend.username);
          });
        } else if (friend.status === 'pending' && !friend.iRequested) {
          // Incoming request
          row.dot.setStyle({ color: COLOR_PENDING }).setText('?').setVisible(true);
          const nameStr = friend.username.length > 8
            ? friend.username.slice(0, 7) + '…'
            : friend.username;
          row.name.setText(nameStr).setStyle({ color: COLOR_PENDING }).setVisible(true);

          row.actA.setText('✓').setStyle({ color: COLOR_ACCEPT }).setVisible(true);
          row.actB.setText('✗').setStyle({ color: COLOR_DECLINE }).setVisible(true);

          row.actA.off('pointerdown').on('pointerdown', () => {
            this.onFriendAccept?.(friend.username);
          });
          row.actB.off('pointerdown').on('pointerdown', () => {
            this.onFriendDecline?.(friend.username);
          });
        } else {
          // Outgoing pending request
          row.dot.setStyle({ color: COLOR_PENDING }).setText('…').setVisible(true);
          const nameStr = friend.username.length > 10
            ? friend.username.slice(0, 9) + '…'
            : friend.username;
          row.name.setText(nameStr).setStyle({ color: '#888899' }).setVisible(true);
          row.actA.setVisible(false);
          row.actB.setText('x').setStyle({ color: COLOR_REMOVE }).setVisible(true);
          row.actB.off('pointerdown').on('pointerdown', () => {
            this.onFriendRemove?.(friend.username);
          });
        }
      }
    }

    // Input bar
    this.inputBg.y    = PANEL_Y + 4 + ROW_H * Math.max(displayList.length, 1) + 18;
    this.inputLabel.y = this.inputBg.y + 1;
    const showInput = this.inputOpen;
    this.inputBg.setVisible(showInput);
    this.inputLabel.setVisible(showInput);
  }

  private hideRow(row: FriendRow): void {
    row.dot.setVisible(false);
    row.name.setVisible(false);
    row.actA.setVisible(false);
    row.actB.setVisible(false);
  }

  // ── Add-friend input ────────────────────────────────────────────────────────

  private openAddInput(): void {
    this.inputOpen = true;
    this.inputBuf  = '';
    this.inputBg.setVisible(true);
    this.inputLabel.setVisible(true).setText('+ ');

    this.keyListener = (e: KeyboardEvent) => this.onAddKey(e);
    window.addEventListener('keydown', this.keyListener, { capture: true });
  }

  private closeAddInput(send: boolean): void {
    if (!this.inputOpen) return;
    this.inputOpen = false;
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener, { capture: true });
      this.keyListener = undefined;
    }
    if (send && this.inputBuf.trim()) {
      this.onFriendRequest?.(this.inputBuf.trim());
    }
    this.inputBuf = '';
    this.refresh();
  }

  private onAddKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.stopPropagation();
      this.closeAddInput(true);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      this.closeAddInput(false);
    } else if (e.key === 'Backspace') {
      e.stopPropagation();
      this.inputBuf = this.inputBuf.slice(0, -1);
      this.inputLabel.setText('+ ' + this.inputBuf);
    } else if (e.key.length === 1 && this.inputBuf.length < 20) {
      e.stopPropagation();
      this.inputBuf += e.key;
      this.inputLabel.setText('+ ' + this.inputBuf);
    }
  }

  // ── Context menu ────────────────────────────────────────────────────────────

  private handleCtxAction(index: number): void {
    const name = this.ctxTarget;
    this.hideCtxMenu();
    if (!name) return;
    switch (index) {
      case 0: this.onWhisper?.(name); break;
      case 1: this.onPartyInvite?.(name); break;
      case 2: this.onBlockPlayer?.(name); break;
    }
  }

  private hideCtxMenu(): void {
    this.ctxBg.setVisible(false);
    this.ctxItems.forEach(t => t.setVisible(false));
    this.ctxVisible = false;
    this.ctxTarget  = '';
  }

  // ── Destroy ────────────────────────────────────────────────────────────────

  destroy(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener, { capture: true });
    }
    this.rows.forEach(r => {
      r.dot.destroy(); r.name.destroy(); r.actA.destroy(); r.actB.destroy();
    });
    this.statusBg.destroy();
    this.statusText.destroy();
    this.panelBg.destroy();
    this.headerText.destroy();
    this.emptyText.destroy();
    this.inputBg.destroy();
    this.inputLabel.destroy();
    this.ctxBg.destroy();
    this.ctxItems.forEach(t => t.destroy());
    ((this as any)._addHint as Phaser.GameObjects.Text)?.destroy();
  }
}
