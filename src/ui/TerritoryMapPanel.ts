/**
 * TerritoryMapPanel — guild territory wars map overlay.
 *
 * Press T to toggle. Escape to close.
 *
 * Shows all 6 contestable territories on a stylised world map:
 *   - Territory name, owner guild tag (or "Unclaimed")
 *   - Colour-coded zone indicator: friendly (green), enemy (red), contested (yellow), neutral (grey)
 *   - Active war timer if a war window is open
 *   - XP/drop bonus for each territory
 *   - "Declare War" button (guild leaders only) — opens WarDeclarationPanel
 *   - Guild buff summary at the bottom (total XP/drop bonus from owned territories)
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import { TERRITORIES, type TerritoryDef } from '../config/territory';
import { TerritoryManager, type TerritoryInfo } from '../systems/TerritoryManager';

const PANEL_W = 580;
const PANEL_H = 340;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 70;
const PAD     = 10;

const COL_NEUTRAL   = 0x888888;
const COL_FRIENDLY  = 0x44cc66;
const COL_ENEMY     = 0xcc4444;
const COL_CONTESTED = 0xddaa22;

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

export class TerritoryMapPanel {
  private scene:   Phaser.Scene;
  private _visible = false;
  private bKey!:   Phaser.Input.Keyboard.Key;  // B = battles map
  private escKey!: Phaser.Input.Keyboard.Key;

  private container!:    Phaser.GameObjects.Container;
  private bg!:           Phaser.GameObjects.Rectangle;
  private titleText!:    Phaser.GameObjects.Text;
  private closeBtn!:     Phaser.GameObjects.Text;
  private buffText!:     Phaser.GameObjects.Text;
  private statusText!:   Phaser.GameObjects.Text;

  // Per-territory game objects
  private zoneObjects: Phaser.GameObjects.Container[] = [];

  // Context
  userId    = "";   // set by GameScene after login
  private guildId   = "";
  private guildRole = "";
  private mgr!:     TerritoryManager;

  // Pending war declaration — includes ownerName so caller can show it without re-fetching
  onDeclareWar?: (territoryId: string, territoryName: string, ownerName: string | null) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mgr   = TerritoryManager.getInstance(SERVER_HTTP);
  }

  create(): void {
    const kbd = this.scene.input.keyboard!;
    this.bKey   = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.escKey = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.container = this.scene.add.container(PANEL_X, PANEL_Y).setDepth(DEPTH).setVisible(false);

    // Background
    this.bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x111122, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x4455aa);
    this.container.add(this.bg);

    // Title
    this.titleText = this.scene.add.text(PANEL_W / 2, PAD + 2, 'TERRITORY MAP', {
      fontSize: '9px', color: '#aaddff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.container.add(this.titleText);

    // Close button
    this.closeBtn = this.scene.add.text(PANEL_W - PAD, PAD, '[X]', {
      fontSize: '7px', color: '#ff6666', fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.hide());
    this.container.add(this.closeBtn);

    // Buff summary (bottom strip)
    this.buffText = this.scene.add.text(PAD, PANEL_H - PAD - 8, '', {
      fontSize: '7px', color: '#88ffaa', fontFamily: 'monospace',
    }).setOrigin(0, 1);
    this.container.add(this.buffText);

    // Status / feedback line
    this.statusText = this.scene.add.text(PANEL_W / 2, PANEL_H - PAD - 8, '', {
      fontSize: '7px', color: '#ffdd88', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);
    this.container.add(this.statusText);

    // Legend
    this._buildLegend();
  }

  private _buildLegend(): void {
    const legendItems: Array<{ color: number; label: string }> = [
      { color: COL_FRIENDLY,  label: 'Your guild' },
      { color: COL_ENEMY,     label: 'Enemy'      },
      { color: COL_CONTESTED, label: 'Contested'  },
      { color: COL_NEUTRAL,   label: 'Unclaimed'  },
    ];
    let lx = PANEL_W - PAD;
    for (let i = legendItems.length - 1; i >= 0; i--) {
      const item = legendItems[i];
      const label = this.scene.add.text(lx, PANEL_H - PAD - 8, item.label, {
        fontSize: '6px', color: '#' + item.color.toString(16).padStart(6, '0'), fontFamily: 'monospace',
      }).setOrigin(1, 1);
      this.container.add(label);
      lx -= label.width + 14;
      const dot = this.scene.add.rectangle(lx + 4, PANEL_H - PAD - 12, 6, 6, item.color)
        .setOrigin(0.5, 0.5);
      this.container.add(dot);
      lx -= 12;
    }
  }

  setContext(playerId: string, guildId: string, guildRole: string): void {
    this.guildId   = guildId;
    this.guildRole = guildRole;
    this.mgr.setPlayer(playerId, guildId);
  }

  update(_delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.bKey)) {
      this._visible ? this.hide() : this.show();
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && this._visible) {
      this.hide();
    }
  }

  /** Close the panel if it is open. Returns true if it was open (for ESC chain). */
  closeIfOpen(): boolean {
    if (this._visible) { this.hide(); return true; }
    return false;
  }

  async show(): Promise<void> {
    // Auto-fetch guild context from server if userId is set but guildId not yet known
    if (this.userId && !this.guildId) {
      try {
        const res = await fetch(`${SERVER_HTTP}/guild/player/${this.userId}`);
        if (res.ok) {
          const info = await res.json() as { guildId?: string; role?: string } | null;
          if (info?.guildId) {
            this.guildId   = info.guildId;
            this.guildRole = info.role ?? 'member';
            this.mgr.setPlayer(this.userId, this.guildId);
          }
        }
      } catch { /* non-fatal */ }
    }
    this._visible = true;
    this.container.setVisible(true);
    this.statusText.setText('Loading...');
    await this._refresh();
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
  }

  get visible(): boolean { return this._visible; }

  private async _refresh(): Promise<void> {
    const [territories, buffs] = await Promise.all([
      this.mgr.fetchTerritories(true),
      this.mgr.fetchGuildBuffs(),
    ]);

    this.statusText.setText('');

    // Buff summary
    if (buffs.territories.length > 0) {
      this.buffText.setText(
        `Your territories: ${buffs.territories.length}  |  +${buffs.xpBonusPct}% XP  |  +${buffs.dropBonusPct}% Drop`
      );
    } else {
      this.buffText.setText('Claim territories to earn XP and drop bonuses!');
    }

    // Destroy old zone objects
    this.zoneObjects.forEach((c) => c.destroy());
    this.zoneObjects = [];

    // Render each territory
    for (const def of TERRITORIES) {
      const info = territories.find((t) => t.id === def.id);
      const zoneContainer = this._buildZoneNode(def, info ?? null);
      this.container.add(zoneContainer);
      this.zoneObjects.push(zoneContainer);
    }
  }

  private _buildZoneNode(def: TerritoryDef, info: TerritoryInfo | null): Phaser.GameObjects.Container {
    // Offset within the panel content area (title takes ~20px)
    const cx = def.mapX * (PANEL_W / CANVAS.WIDTH);
    const cy = 20 + def.mapY * ((PANEL_H - 40) / CANVAS.HEIGHT);

    const isOwned     = info?.ownerGuildId === this.guildId;
    const isContested = !!(info?.activeWar && (info.activeWar.status === "active" || info.activeWar.status === "pending"));
    const isEnemy     = !!(info?.ownerGuildId && info.ownerGuildId !== this.guildId);
    const tintColor   = isContested  ? COL_CONTESTED
                      : isOwned      ? COL_FRIENDLY
                      : isEnemy      ? COL_ENEMY
                      :                COL_NEUTRAL;

    const c = this.scene.add.container(cx, cy);

    // Zone circle
    const circle = this.scene.add.circle(0, 0, 16, tintColor, 0.3)
      .setStrokeStyle(1, tintColor);
    c.add(circle);

    // Territory icon (use territory flag asset)
    if (this.scene.textures.exists('icon_territory_flag_planted')) {
      const icon = this.scene.add.image(0, 0, 'icon_territory_flag_planted')
        .setScale(1)
        .setTint(tintColor);
      c.add(icon);
    }

    // Territory name
    const nameText = this.scene.add.text(0, 20, def.name, {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0);
    c.add(nameText);

    // Owner tag / "Unclaimed"
    const ownerLabel = info?.ownerGuildTag
      ? `[${info.ownerGuildTag}]`
      : 'Unclaimed';
    const ownerText = this.scene.add.text(0, 28, ownerLabel, {
      fontSize: '6px',
      color: isOwned ? '#88ffaa' : isEnemy ? '#ff8888' : '#888888',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0);
    c.add(ownerText);

    // Bonus text
    const bonusText = this.scene.add.text(0, -22, `+${def.xpBonusPct}%XP  +${def.dropBonusPct}%Drop`, {
      fontSize: '5px', color: '#ffdd88', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5, 1);
    c.add(bonusText);

    // Active war indicator
    if (isContested && info?.activeWar) {
      const war = info.activeWar;
      const isWarWindow = war.status === "active";
      const warLabel = isWarWindow
        ? `WAR: ${war.attackerPoints}v${war.defenderPoints}`
        : `War pending`;
      const warText = this.scene.add.text(0, 36, warLabel, {
        fontSize: '6px', color: '#ffdd00', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5, 0);
      c.add(warText);
    }

    // Declare War button (leader only, not already owned by us, no active war)
    const canDeclare = this.guildRole === 'leader' && !isOwned && !isContested;
    if (canDeclare) {
      const btn = this.scene.add.text(0, isContested ? 44 : 36, '[Declare War]', {
        fontSize: '6px', color: '#ff9944', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      btn.on('pointerover',  () => btn.setColor('#ffcc66'));
      btn.on('pointerout',   () => btn.setColor('#ff9944'));
      btn.on('pointerdown',  () => {
        this.onDeclareWar?.(def.id, def.name, info?.ownerGuildName ?? null);
      });
      c.add(btn);
    }

    // Hover tooltip
    circle.setInteractive({ useHandCursor: false });
    circle.on('pointerover', () => {
      this.statusText.setText(`${def.name}: ${def.description}`);
    });
    circle.on('pointerout', () => {
      this.statusText.setText('');
    });

    return c;
  }
}
