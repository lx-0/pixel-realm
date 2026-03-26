/**
 * WarDeclarationPanel — war declaration confirmation dialog.
 *
 * Shown when a guild leader clicks "Declare War" on a territory in TerritoryMapPanel.
 *
 * Displays:
 *   - Target territory name + current owner
 *   - Next war window time (UTC)
 *   - Warning if guild is already in a war
 *   - [Confirm] / [Cancel] buttons
 *
 * On confirm: calls TerritoryManager.declareWar() and shows result.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import { TerritoryManager } from '../systems/TerritoryManager';
import { WAR_WINDOW_HOURS_UTC, WAR_WINDOW_DURATION_MS } from '../config/territory';

const PANEL_W = 220;
const PANEL_H = 120;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 80; // above TerritoryMapPanel
const PAD     = 8;

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

/** Compute next war window from now (client-side preview). */
function nextWarWindowLabel(): string {
  const now    = Date.now();
  const todayMidnight = (() => {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  })();

  for (let day = 0; day <= 1; day++) {
    for (const hour of WAR_WINDOW_HOURS_UTC) {
      const start = todayMidnight + day * 86_400_000 + hour * 3_600_000;
      const end   = start + WAR_WINDOW_DURATION_MS;
      if (end > now) {
        const startDate = new Date(start);
        const endDate   = new Date(end);
        const fmt = (d: Date) => `${d.getUTCHours().toString().padStart(2,'0')}:00 UTC`;
        return `${fmt(startDate)} – ${fmt(endDate)}`;
      }
    }
  }
  return "TBD";
}

export class WarDeclarationPanel {
  private scene:   Phaser.Scene;
  private _visible = false;
  private mgr!:    TerritoryManager;

  private container!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!:  Phaser.GameObjects.Text;
  private windowText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private confirmBtn!: Phaser.GameObjects.Text;
  private cancelBtn!:  Phaser.GameObjects.Text;

  private pendingTerritoryId   = "";

  onClosed?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mgr   = TerritoryManager.getInstance(SERVER_HTTP);
  }

  create(): void {
    this.container = this.scene.add.container(PANEL_X, PANEL_Y).setDepth(DEPTH).setVisible(false);

    // Background overlay
    const overlay = this.scene.add.rectangle(
      -(CANVAS.WIDTH / 2 - PANEL_W / 2),
      -(CANVAS.HEIGHT / 2 - PANEL_H / 2),
      CANVAS.WIDTH, CANVAS.HEIGHT,
      0x000000, 0.5,
    ).setOrigin(0, 0).setInteractive(); // swallow clicks behind panel
    this.container.add(overlay);

    // Panel bg
    const bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x1a0a00, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xaa4400);
    this.container.add(bg);

    // War banner icon
    if (this.scene.textures.exists('icon_territory_beacon')) {
      const icon = this.scene.add.image(PANEL_W / 2, 20, 'icon_territory_beacon')
        .setScale(1.5)
        .setTint(0xff6633);
      this.container.add(icon);
    }

    // Title
    this.titleText = this.scene.add.text(PANEL_W / 2, PAD, 'DECLARE TERRITORY WAR', {
      fontSize: '8px', color: '#ff9944', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.container.add(this.titleText);

    // Body text (territory + owner)
    this.bodyText = this.scene.add.text(PAD, 30, '', {
      fontSize: '7px', color: '#ffffff', fontFamily: 'monospace', wordWrap: { width: PANEL_W - PAD * 2 },
    }).setOrigin(0, 0);
    this.container.add(this.bodyText);

    // War window time
    this.windowText = this.scene.add.text(PAD, 55, '', {
      fontSize: '6px', color: '#ffdd88', fontFamily: 'monospace',
    }).setOrigin(0, 0);
    this.container.add(this.windowText);

    // Status line
    this.statusText = this.scene.add.text(PANEL_W / 2, 72, '', {
      fontSize: '6px', color: '#ff4444', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5, 0);
    this.container.add(this.statusText);

    // Confirm button
    this.confirmBtn = this.scene.add.text(PANEL_W / 2 - 30, PANEL_H - PAD - 10, '[Declare War]', {
      fontSize: '7px', color: '#ff6622', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.confirmBtn.on('pointerover',  () => this.confirmBtn.setColor('#ffaa55'));
    this.confirmBtn.on('pointerout',   () => this.confirmBtn.setColor('#ff6622'));
    this.confirmBtn.on('pointerdown',  () => this._onConfirm());
    this.container.add(this.confirmBtn);

    // Cancel button
    this.cancelBtn = this.scene.add.text(PANEL_W / 2 + 40, PANEL_H - PAD - 10, '[Cancel]', {
      fontSize: '7px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.cancelBtn.on('pointerover',  () => this.cancelBtn.setColor('#cccccc'));
    this.cancelBtn.on('pointerout',   () => this.cancelBtn.setColor('#aaaaaa'));
    this.cancelBtn.on('pointerdown',  () => this._close());
    this.container.add(this.cancelBtn);
  }

  showForTerritory(territoryId: string, territoryName: string, ownerName: string | null): void {
    this.pendingTerritoryId   = territoryId;

    const ownerLine = ownerName ? `Currently held by: ${ownerName}` : `Territory is Unclaimed`;
    this.bodyText.setText(`Target: ${territoryName}\n${ownerLine}`);
    this.windowText.setText(`War window: ${nextWarWindowLabel()}`);
    this.statusText.setText('');
    this.confirmBtn.setInteractive({ useHandCursor: true }).setColor('#ff6622');

    this._visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
  }

  get visible(): boolean { return this._visible; }

  private async _onConfirm(): Promise<void> {
    if (!this.pendingTerritoryId) return;

    // Disable button during request
    this.confirmBtn.disableInteractive().setColor('#888888');
    this.statusText.setText('Sending declaration...').setColor('#ffdd88');

    const result = await this.mgr.declareWar(this.pendingTerritoryId);

    if (result.success) {
      const startLabel = result.windowStart
        ? `${result.windowStart.getUTCHours().toString().padStart(2,'0')}:00 UTC`
        : 'soon';
      this.statusText.setText(`War declared! Begins at ${startLabel}`).setColor('#88ff88');
      // Auto-close after 2 seconds
      this.scene.time.delayedCall(2000, () => this._close());
    } else {
      this.statusText.setText(result.error ?? 'Failed to declare war.').setColor('#ff4444');
      // Re-enable button
      this.confirmBtn.setInteractive({ useHandCursor: true }).setColor('#ff6622');
    }
  }

  private _close(): void {
    this.hide();
    this.onClosed?.();
  }
}
