/**
 * TradeWindow — direct player-to-player trade UI.
 *
 * Flow:
 *   1. Player right-clicks another player → TradeWindow.requestTrade(targetSessionId, targetName).
 *   2. Target receives an invite notification and can accept/decline.
 *   3. Both sides see a two-column window: left = "Your Offer", right = "Their Offer".
 *   4. Each player adds items from inventory and/or specifies gold.
 *   5. Both press Confirm → server executes the atomic trade.
 *
 * The GameScene wires up MultiplayerClient callbacks into this class.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { MultiplayerClient, TradeOffer, TradeOfferItem } from '../systems/MultiplayerClient';
import type { InventoryItem } from './InventoryPanel';

const PANEL_W  = 220;
const PANEL_H  = 150;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 90;
const PAD      = 4;

const HALF_W   = (PANEL_W - PAD * 3) / 2;

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

const RARITY_COLOR: Record<string, number> = {
  common:    0xaaaaaa,
  uncommon:  0x44cc44,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xff8800,
};

type TradePhase =
  | 'idle'
  | 'invite_sent'      // waiting for counterpart to accept
  | 'invite_received'  // we got an invite, awaiting our response
  | 'offer'            // both accepted — composing offers
  | 'awaiting_confirm' // we confirmed, waiting for other side
  | 'done';

export class TradeWindow {
  private scene:     Phaser.Scene;
  private mp:        MultiplayerClient;
  private container: Phaser.GameObjects.Container;

  private phase: TradePhase = 'idle';

  // Current trade partner info
  private partnerName = '';

  // Our offer (editable)
  private myOfferItems: TradeOfferItem[] = [];
  private myOfferGold   = 0;

  // Partner's offer (read-only mirror from server)
  private theirOffer: TradeOffer = { items: [], gold: 0 };

  // Inventory loaded from server for item selection
  private inventory: InventoryItem[] = [];

  // UI state
  private statusMsg = '';

  constructor(scene: Phaser.Scene, mp: MultiplayerClient) {
    this.scene = scene;
    this.mp    = mp;

    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);

    this.setupCallbacks();
    this.rebuild();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  get isVisible(): boolean {
    return this.container.visible;
  }

  closeIfOpen(): boolean {
    if (this.container.visible) {
      this.hide();
      return true;
    }
    return false;
  }

  /** Initiate a trade request to another player. */
  requestTrade(targetSessionId: string, targetName: string): void {
    if (this.phase !== 'idle') return;
    this.partnerName = targetName;
    this.phase       = 'invite_sent';
    this.statusMsg   = `Waiting for ${targetName} to accept…`;
    this.mp.sendTradeRequest(targetSessionId);
    this.show();
  }

  /** Called when we receive an invite from another player. */
  receiveInvite(_fromSessionId: string, fromName: string): void {
    if (this.phase !== 'idle') {
      // Already busy — auto-decline
      this.mp.sendTradeRespond(false);
      return;
    }
    this.partnerName = fromName;
    this.phase       = 'invite_received';
    this.statusMsg   = `${fromName} wants to trade!`;
    this.show();
  }

  hide(): void {
    if (this.phase !== 'idle') {
      this.mp.sendTradeCancel();
    }
    this.reset();
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  // ── MultiplayerClient callbacks ───────────────────────────────────────────

  private setupCallbacks(): void {
    this.mp.onTradeInvited = (fromSessionId, fromName) => {
      this.receiveInvite(fromSessionId!, fromName);
    };

    this.mp.onTradePending = (_withSessionId) => {
      // Already shown via requestTrade
    };

    this.mp.onTradeAccepted = (_withSessionId) => {
      this.phase = 'offer';
      this.statusMsg = 'Build your offer. Press Confirm when ready.';
      this.fetchInventory();
      this.rebuild();
    };

    this.mp.onTradeDeclined = () => {
      this.statusMsg = `${this.partnerName} declined the trade.`;
      this.phase = 'done';
      this.rebuild();
      this.scene.time.delayedCall(2000, () => this.hide());
    };

    this.mp.onTradeCancelled = (reason) => {
      this.statusMsg = reason;
      this.phase = 'done';
      this.rebuild();
      this.scene.time.delayedCall(2000, () => this.hide());
    };

    this.mp.onTradeOfferUpdated = (offer, _fromInitiator) => {
      this.theirOffer = offer;
      this.rebuild();
    };

    this.mp.onTradeAwaitingConfirm = () => {
      this.phase = 'awaiting_confirm';
      this.statusMsg = 'Waiting for other player to confirm…';
      this.rebuild();
    };

    this.mp.onTradeUnconfirmed = () => {
      this.phase = 'offer';
      this.statusMsg = 'Other player un-confirmed. Review the offer.';
      this.rebuild();
    };

    this.mp.onTradeComplete = () => {
      this.statusMsg = '✦ Trade complete!';
      this.phase = 'done';
      this.rebuild();
      this.scene.time.delayedCall(2000, () => this.hide());
    };

    this.mp.onTradeError = (message) => {
      this.statusMsg = `Error: ${message}`;
      this.phase = 'done';
      this.rebuild();
      this.scene.time.delayedCall(2500, () => this.hide());
    };
  }

  // ── Inventory fetch ───────────────────────────────────────────────────────

  private fetchInventory(): void {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) return;
    fetch(`${SERVER_HTTP}/inventory/${userId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: InventoryItem[]) => {
        this.inventory = data;
        if (this.container.visible) this.rebuild();
      })
      .catch(() => {/* ignore */});
  }

  // ── Offer management ──────────────────────────────────────────────────────

  private addItemToOffer(invItem: InventoryItem): void {
    const existing = this.myOfferItems.find((i) => i.inventoryId === invItem.id);
    if (existing) {
      if (existing.quantity < invItem.quantity) existing.quantity++;
    } else {
      this.myOfferItems.push({
        inventoryId: invItem.id,
        itemId:      invItem.item.id,
        quantity:    1,
      });
    }
    this.pushOffer();
    this.rebuild();
  }

  private removeItemFromOffer(inventoryId: string): void {
    this.myOfferItems = this.myOfferItems.filter((i) => i.inventoryId !== inventoryId);
    this.pushOffer();
    this.rebuild();
  }

  private pushOffer(): void {
    this.mp.sendTradeOffer(this.myOfferItems, this.myOfferGold);
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  private show(): void {
    this.container.setVisible(true);
    this.rebuild();
  }

  private reset(): void {
    this.phase        = 'idle';
    this.partnerName  = '';
    this.myOfferItems = [];
    this.myOfferGold  = 0;
    this.theirOffer   = { items: [], gold: 0 };
    this.inventory    = [];
    this.statusMsg    = '';
  }

  private rebuild(): void {
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.88)
      .setOrigin(0, 0).setScrollFactor(0);
    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x664422, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    const header = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + 4,
      `Trade${this.partnerName ? ` with ${this.partnerName}` : ''}`,
      { fontSize: '5px', color: '#ffcc88', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(0);

    this.container.add([bg, border, header]);

    const bodyY = PANEL_Y + 15;

    // Phase-specific rendering
    switch (this.phase) {
      case 'invite_sent':
        this.renderStatus(bodyY);
        this.renderCancelButton(PANEL_Y + PANEL_H - 14);
        break;

      case 'invite_received':
        this.renderStatus(bodyY);
        this.renderInviteButtons(PANEL_Y + PANEL_H - 20);
        break;

      case 'offer':
      case 'awaiting_confirm':
        this.renderOfferColumns(bodyY);
        this.renderStatus(PANEL_Y + PANEL_H - 22);
        this.renderOfferButtons(PANEL_Y + PANEL_H - 14);
        break;

      case 'done':
        this.renderStatus(bodyY);
        break;

      default:
        break;
    }

    this.container.setDepth(DEPTH);
  }

  private renderStatus(y: number): void {
    if (!this.statusMsg) return;
    this.container.add(
      this.scene.add.text(
        PANEL_X + PANEL_W / 2, y,
        this.statusMsg,
        { fontSize: '4px', color: '#aaddff', fontFamily: 'monospace', wordWrap: { width: PANEL_W - PAD * 2 } },
      ).setOrigin(0.5, 0).setScrollFactor(0),
    );
  }

  private renderInviteButtons(y: number): void {
    // Accept
    const acceptBg = this.scene.add.rectangle(PANEL_X + PAD, y, 50, 10, 0x226622, 0.9).setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const acceptTxt = this.scene.add.text(PANEL_X + PAD + 25, y + 5, 'Accept', { fontSize: '4px', color: '#88ff88', fontFamily: 'monospace' }).setOrigin(0.5).setScrollFactor(0);
    acceptBg.on('pointerup', () => {
      this.mp.sendTradeRespond(true);
      this.phase = 'offer';
      this.statusMsg = 'Build your offer. Press Confirm when ready.';
      this.fetchInventory();
      this.rebuild();
    });

    // Decline
    const declineBg = this.scene.add.rectangle(PANEL_X + PAD + 58, y, 50, 10, 0x662222, 0.9).setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const declineTxt = this.scene.add.text(PANEL_X + PAD + 58 + 25, y + 5, 'Decline', { fontSize: '4px', color: '#ff8888', fontFamily: 'monospace' }).setOrigin(0.5).setScrollFactor(0);
    declineBg.on('pointerup', () => {
      this.mp.sendTradeRespond(false);
      this.hide();
    });

    this.container.add([acceptBg, acceptTxt, declineBg, declineTxt]);
  }

  private renderCancelButton(y: number): void {
    const btn = this.scene.add.rectangle(PANEL_X + PANEL_W / 2 - 25, y, 50, 10, 0x553333, 0.9).setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const txt = this.scene.add.text(PANEL_X + PANEL_W / 2, y + 5, 'Cancel', { fontSize: '4px', color: '#ffaaaa', fontFamily: 'monospace' }).setOrigin(0.5).setScrollFactor(0);
    btn.on('pointerup', () => this.hide());
    this.container.add([btn, txt]);
  }

  private renderOfferColumns(y: number): void {
    const colW  = HALF_W;
    const leftX = PANEL_X + PAD;
    const rightX = PANEL_X + PAD * 2 + colW;

    // Column headers
    this.container.add([
      this.scene.add.text(leftX + colW / 2, y, 'Your Offer', { fontSize: '4px', color: '#ffcc88', fontFamily: 'monospace' }).setOrigin(0.5, 0).setScrollFactor(0),
      this.scene.add.text(rightX + colW / 2, y, 'Their Offer', { fontSize: '4px', color: '#aaddff', fontFamily: 'monospace' }).setOrigin(0.5, 0).setScrollFactor(0),
    ]);

    const itemY = y + 8;
    const rowH  = 8;

    // My offer items (clickable to remove)
    this.myOfferItems.slice(0, 6).forEach((offerItem, i) => {
      const inv = this.inventory.find((iv) => iv.id === offerItem.inventoryId);
      const label = inv ? `${inv.item.name} x${offerItem.quantity}` : `item x${offerItem.quantity}`;
      const row = this.scene.add.text(leftX, itemY + i * rowH, label, {
        fontSize: '3px', color: '#dddddd', fontFamily: 'monospace',
      }).setScrollFactor(0).setInteractive();
      row.on('pointerover', () => row.setColor('#ffaaaa'));
      row.on('pointerout',  () => row.setColor('#dddddd'));
      row.on('pointerup',   () => { this.removeItemFromOffer(offerItem.inventoryId); });
      this.container.add(row);
    });

    // Gold offered
    const goldY = itemY + 6 * rowH;
    this.container.add(
      this.scene.add.text(leftX, goldY, `Gold: ${this.myOfferGold}g`, { fontSize: '3px', color: '#ffd700', fontFamily: 'monospace' }).setScrollFactor(0),
    );

    // Their offer items
    this.theirOffer.items.slice(0, 6).forEach((ti, i) => {
      this.container.add(
        this.scene.add.text(rightX, itemY + i * rowH, `${ti.itemId} x${ti.quantity}`, {
          fontSize: '3px', color: '#aaaaaa', fontFamily: 'monospace',
        }).setScrollFactor(0),
      );
    });
    this.container.add(
      this.scene.add.text(rightX, goldY, `Gold: ${this.theirOffer.gold}g`, { fontSize: '3px', color: '#ffd700', fontFamily: 'monospace' }).setScrollFactor(0),
    );

    // Divider
    const divG = this.scene.add.graphics().setScrollFactor(0);
    divG.lineStyle(1, 0x664422, 0.6);
    divG.lineBetween(PANEL_X + PANEL_W / 2, y, PANEL_X + PANEL_W / 2, y + 7 * rowH + 2);
    this.container.add(divG);

    // Inventory picker (below columns)
    const pickerY = goldY + 8;
    const hintTxt = this.scene.add.text(leftX, pickerY, 'Inv:', { fontSize: '3px', color: '#667788', fontFamily: 'monospace' }).setScrollFactor(0);
    this.container.add(hintTxt);

    const maxShow = Math.min(this.inventory.length, 5);
    this.inventory.slice(0, maxShow).forEach((inv, i) => {
      const rc = RARITY_COLOR[inv.item.rarity] ?? RARITY_COLOR.common;
      const txt = this.scene.add.text(
        leftX + 14 + i * 22, pickerY,
        inv.item.name.slice(0, 3),
        { fontSize: '3px', color: `#${rc.toString(16).padStart(6, '0')}`, fontFamily: 'monospace' },
      ).setScrollFactor(0).setInteractive();
      txt.on('pointerup', () => this.addItemToOffer(inv));
      txt.on('pointerover', () => txt.setAlpha(0.7));
      txt.on('pointerout',  () => txt.setAlpha(1));
      this.container.add(txt);
    });
  }

  private renderOfferButtons(y: number): void {
    const isConfirmed = this.phase === 'awaiting_confirm';

    // Confirm / Un-confirm
    const confirmColor = isConfirmed ? 0x334433 : 0x226622;
    const confirmLabel = isConfirmed ? 'Confirmed ✓' : 'Confirm';
    const confirmBg = this.scene.add.rectangle(PANEL_X + PAD, y, 60, 10, confirmColor, 0.9).setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const confirmTxt = this.scene.add.text(PANEL_X + PAD + 30, y + 5, confirmLabel, { fontSize: '4px', color: '#88ff88', fontFamily: 'monospace' }).setOrigin(0.5).setScrollFactor(0);
    confirmBg.on('pointerup', () => {
      if (isConfirmed) {
        this.mp.sendTradeConfirm(false);
        this.phase = 'offer';
        this.statusMsg = '';
      } else {
        this.mp.sendTradeConfirm(true);
        this.phase = 'awaiting_confirm';
        this.statusMsg = 'Waiting for other player to confirm…';
      }
      this.rebuild();
    });

    // Cancel
    const cancelBg = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 50, y, 50, 10, 0x553333, 0.9).setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const cancelTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 25, y + 5, 'Cancel', { fontSize: '4px', color: '#ffaaaa', fontFamily: 'monospace' }).setOrigin(0.5).setScrollFactor(0);
    cancelBg.on('pointerup', () => this.hide());

    this.container.add([confirmBg, confirmTxt, cancelBg, cancelTxt]);
  }
}
