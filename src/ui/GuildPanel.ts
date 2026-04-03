/**
 * GuildPanel — guild management UI.
 *
 * Press G to toggle. Escape to close.
 *
 * Without a guild:
 *   [Create Guild] form (name, tag, description, creation fee)
 *
 * In a guild:
 *   - Guild name + tag header
 *   - Roster list: member name, role badge, level, online indicator
 *   - Actions (leader/officer only): Invite, Kick, Promote, Demote
 *   - Leave button (non-leaders)
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const PANEL_W  = 200;
const PANEL_H  = 140;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 65;
const PAD      = 5;

// HTTP base — mirrors InventoryPanel pattern
const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

export interface GuildMember {
  playerId: string;
  username: string;
  role: 'leader' | 'officer' | 'member';
  level: number;
  isOnline: boolean;
}

export interface GuildData {
  id: string;
  name: string;
  tag: string;
  description: string;
  leaderId: string;
  members: GuildMember[];
}

const ROLE_COLOR: Record<string, string> = {
  leader:  '#ffd700',
  officer: '#88aaff',
  member:  '#aaaaaa',
};

export class GuildPanel {
  private scene:    Phaser.Scene;
  private _visible  = false;
  private gKey!:    Phaser.Input.Keyboard.Key;
  private container: Phaser.GameObjects.Container;

  // Callbacks wired up by GameScene
  onSendGuildChat?: (text: string) => void;

  // Resolved by GameScene after multiplayer join
  userId?: string;
  username?: string;

  // Current guild state (null = not in a guild)
  private guildData: GuildData | null = null;
  private myRole: 'leader' | 'officer' | 'member' | null = null;

  // Mutable input state for the create-guild form
  private createName = '';
  private createTag  = '';
  private createDesc = '';
  private focusField: 'name' | 'tag' | 'desc' | null = null;
  private keyListener?: (e: KeyboardEvent) => void;

  // Dynamic text nodes rebuilt on each show
  private dynObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(PANEL_X, PANEL_Y).setDepth(DEPTH).setScrollFactor(0);
    this.container.setVisible(false);
    this.gKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.gKey)) {
      this._visible ? this.hide() : this.show();
    }
  }

  closeIfOpen(): boolean {
    if (!this._visible) return false;
    this.hide();
    return true;
  }

  show(): void {
    this._visible = true;
    this.container.setVisible(true);
    this.rebuild();
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
    this.detachKeyListener();
  }

  /** Refresh guild data from server (called after create/invite/kick etc.). */
  async refresh(): Promise<void> {
    if (!this.userId) return;
    try {
      const infoRes = await fetch(`${SERVER_HTTP}/guild/player/${this.userId}`);
      const info = await infoRes.json() as { guildId: string; guildName: string; guildTag: string; role: string } | null;
      if (!info) {
        this.guildData = null;
        this.myRole    = null;
      } else {
        const rosterRes = await fetch(`${SERVER_HTTP}/guild/${info.guildId}`);
        this.guildData = await rosterRes.json() as GuildData;
        this.myRole = info.role as 'leader' | 'officer' | 'member';
      }
    } catch (_err) {
      // Network error — keep existing state
    }
    if (this._visible) this.rebuild();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private clearDyn(): void {
    this.dynObjects.forEach(o => o.destroy());
    this.dynObjects = [];
    this.container.removeAll(false);
  }

  private addText(x: number, y: number, text: string, color = '#cccccc', size = '5px'): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: size,
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 1,
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(t);
    this.container.add(t);
    return t;
  }

  private rebuild(): void {
    this.clearDyn();
    this.detachKeyListener();

    // Background
    const bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x000000, 0.85)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.dynObjects.push(bg);
    this.container.add(bg);

    // Border
    const border = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x334466, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH).setStrokeStyle(1, 0x334466, 0.9);
    this.dynObjects.push(border);
    this.container.add(border);

    // Title
    this.addText(PAD, PAD, '⚔ Guild', '#aaddff', '6px');
    this.addText(PANEL_W - PAD - 16, PAD, '[G/Esc]', '#445566', '4px');

    if (this.guildData) {
      this.buildRosterView();
    } else {
      this.buildCreateForm();
    }
  }

  // ── Create form ────────────────────────────────────────────────────────────

  private buildCreateForm(): void {
    let y = 18;
    this.addText(PAD, y, 'You are not in a guild.', '#aaaaaa', '4px'); y += 10;
    this.addText(PAD, y, 'Create one to get started.', '#888888', '4px'); y += 12;

    // Name field
    this.addText(PAD, y, 'Name:', '#cccccc', '4px'); y += 7;
    const nameBg = this.scene.add.rectangle(PAD, y, PANEL_W - PAD * 2, 9, 0x222244, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(nameBg); this.container.add(nameBg);
    const nameLabel = this.addText(PAD + 2, y + 1, this.createName || '_', this.focusField === 'name' ? '#ffffff' : '#aaaaaa', '4px');
    nameLabel.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.focusField = 'name'; this.attachKeyListener(); this.rebuild(); });
    y += 11;

    // Tag field
    this.addText(PAD, y, 'Tag (1-6 chars):', '#cccccc', '4px'); y += 7;
    const tagBg = this.scene.add.rectangle(PAD, y, PANEL_W - PAD * 2, 9, 0x222244, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(tagBg); this.container.add(tagBg);
    const tagLabel = this.addText(PAD + 2, y + 1, this.createTag || '_', this.focusField === 'tag' ? '#ffffff' : '#aaaaaa', '4px');
    tagLabel.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.focusField = 'tag'; this.attachKeyListener(); this.rebuild(); });
    y += 11;

    // Desc field
    this.addText(PAD, y, 'Description (optional):', '#cccccc', '4px'); y += 7;
    const descBg = this.scene.add.rectangle(PAD, y, PANEL_W - PAD * 2, 9, 0x222244, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(descBg); this.container.add(descBg);
    const descLabel = this.addText(PAD + 2, y + 1, this.createDesc || '_', this.focusField === 'desc' ? '#ffffff' : '#aaaaaa', '4px');
    descLabel.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.focusField = 'desc'; this.attachKeyListener(); this.rebuild(); });
    y += 12;

    // Fee note
    this.addText(PAD, y, 'Creation fee: 500 gold', '#ffcc44', '4px'); y += 10;

    // Create button
    const btnBg = this.scene.add.rectangle(PAD, y, 80, 12, 0x224488, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => btnBg.setFillStyle(0x3366aa))
      .on('pointerout',   () => btnBg.setFillStyle(0x224488))
      .on('pointerdown',  () => this.submitCreate());
    this.dynObjects.push(btnBg); this.container.add(btnBg);
    this.addText(PAD + 4, y + 2, 'Create Guild', '#ffffff', '4px');

    this.attachKeyListener();
  }

  private attachKeyListener(): void {
    if (this.keyListener) return;
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.focusField) return;
      if (e.key === 'Escape')     { this.focusField = null; this.detachKeyListener(); this.rebuild(); return; }
      if (e.key === 'Tab')        { this.cycleFocus(); this.rebuild(); return; }
      if (e.key === 'Backspace')  {
        if      (this.focusField === 'name') this.createName = this.createName.slice(0, -1);
        else if (this.focusField === 'tag')  this.createTag  = this.createTag.slice(0, -1);
        else                                  this.createDesc = this.createDesc.slice(0, -1);
        this.rebuild(); return;
      }
      if (e.key.length === 1) {
        if      (this.focusField === 'name' && this.createName.length < 40) this.createName += e.key;
        else if (this.focusField === 'tag'  && this.createTag.length  < 6)  this.createTag  += e.key.toUpperCase();
        else if (this.focusField === 'desc' && this.createDesc.length < 100) this.createDesc += e.key;
        this.rebuild();
      }
      e.stopPropagation();
    };
    window.addEventListener('keydown', this.keyListener, { capture: true });
  }

  private detachKeyListener(): void {
    if (!this.keyListener) return;
    window.removeEventListener('keydown', this.keyListener, { capture: true });
    this.keyListener = undefined;
  }

  private cycleFocus(): void {
    const order: Array<'name' | 'tag' | 'desc'> = ['name', 'tag', 'desc'];
    const idx = order.indexOf(this.focusField!);
    this.focusField = order[(idx + 1) % order.length];
  }

  private async submitCreate(): Promise<void> {
    if (!this.userId || !this.createName.trim() || !this.createTag.trim()) return;
    try {
      const res = await fetch(`${SERVER_HTTP}/guild/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          name: this.createName.trim(),
          tag: this.createTag.trim(),
          description: this.createDesc.trim(),
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        this.createName = ''; this.createTag = ''; this.createDesc = '';
        await this.refresh();
      } else {
        this.showError(data.error ?? 'Failed to create guild.');
      }
    } catch (_err) {
      this.showError('Network error.');
    }
  }

  private showError(msg: string): void {
    // Replace last text with error message temporarily
    const t = this.addText(PAD, PANEL_H - 14, msg, '#ff6666', '4px');
    this.scene.time.delayedCall(3000, () => t.destroy());
  }

  // ── Roster view ────────────────────────────────────────────────────────────

  private buildRosterView(): void {
    if (!this.guildData) return;
    const g = this.guildData;

    let y = 18;
    // Header: guild name + tag
    this.addText(PAD, y, `[${g.tag}] ${g.name}`, '#ffd700', '6px'); y += 10;
    if (g.description) {
      this.addText(PAD, y, g.description.slice(0, 40), '#888888', '4px'); y += 8;
    }

    // Actions row (leader/officer)
    if (this.myRole === 'leader' || this.myRole === 'officer') {
      const invBg = this.scene.add.rectangle(PAD, y, 55, 10, 0x224488, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerover',  () => invBg.setFillStyle(0x3366aa))
        .on('pointerout',   () => invBg.setFillStyle(0x224488))
        .on('pointerdown',  () => this.openInvitePrompt());
      this.dynObjects.push(invBg); this.container.add(invBg);
      this.addText(PAD + 3, y + 1, 'Invite Player', '#ffffff', '4px');
      y += 13;
    }

    // Roster list (scrollable via clipping — show up to 6 rows)
    this.addText(PAD, y, '── Members ──', '#555577', '4px'); y += 7;

    const sorted = [...g.members].sort((a, b) => {
      const order = { leader: 0, officer: 1, member: 2 };
      return order[a.role] - order[b.role];
    });

    const maxRows = Math.min(sorted.length, 5);
    for (let i = 0; i < maxRows; i++) {
      const m = sorted[i];
      const onlineDot = m.isOnline ? '●' : '○';
      const onlineColor = m.isOnline ? '#44ee44' : '#555555';
      const roleStr = m.role === 'leader' ? 'L' : m.role === 'officer' ? 'O' : 'M';

      this.addText(PAD, y + 1, onlineDot, onlineColor, '5px');
      this.addText(PAD + 7, y, `[${roleStr}] ${m.username}`, ROLE_COLOR[m.role] ?? '#cccccc', '4px');
      this.addText(PANEL_W - PAD - 22, y, `Lv${m.level}`, '#888888', '4px');

      // Kick button (leader/officer, not for self, not for leader)
      if ((this.myRole === 'leader' || this.myRole === 'officer')
          && m.username !== this.username
          && m.role !== 'leader') {
        const kickBg = this.scene.add.rectangle(PANEL_W - PAD - 8, y - 1, 10, 8, 0x882222, 1)
          .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => kickBg.setFillStyle(0xaa3333))
          .on('pointerout',  () => kickBg.setFillStyle(0x882222))
          .on('pointerdown', () => this.kickMember(m.playerId));
        this.dynObjects.push(kickBg); this.container.add(kickBg);
        this.addText(PANEL_W - PAD - 7, y, 'X', '#ffaaaa', '4px');
      }

      // Promote/demote (leader only)
      if (this.myRole === 'leader' && m.username !== this.username) {
        if (m.role === 'member') {
          const promBg = this.scene.add.rectangle(PANEL_W - PAD - 20, y - 1, 10, 8, 0x226622, 1)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => promBg.setFillStyle(0x338833))
            .on('pointerout',  () => promBg.setFillStyle(0x226622))
            .on('pointerdown', () => this.promoteOrDemote(m.playerId, 'promote'));
          this.dynObjects.push(promBg); this.container.add(promBg);
          this.addText(PANEL_W - PAD - 19, y, '▲', '#aaffaa', '4px');
        } else if (m.role === 'officer') {
          const demBg = this.scene.add.rectangle(PANEL_W - PAD - 20, y - 1, 10, 8, 0x886622, 1)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => demBg.setFillStyle(0xaa8833))
            .on('pointerout',  () => demBg.setFillStyle(0x886622))
            .on('pointerdown', () => this.promoteOrDemote(m.playerId, 'demote'));
          this.dynObjects.push(demBg); this.container.add(demBg);
          this.addText(PANEL_W - PAD - 19, y, '▼', '#ffddaa', '4px');
        }
      }

      y += 9;
    }

    if (sorted.length > 5) {
      this.addText(PAD, y, `+${sorted.length - 5} more...`, '#555577', '4px');
      y += 8;
    }

    // Leave button (non-leaders)
    if (this.myRole !== 'leader') {
      const leaveBg = this.scene.add.rectangle(PAD, PANEL_H - 16, 45, 10, 0x882222, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerover',  () => leaveBg.setFillStyle(0xaa3333))
        .on('pointerout',   () => leaveBg.setFillStyle(0x882222))
        .on('pointerdown',  () => this.leaveGuild());
      this.dynObjects.push(leaveBg); this.container.add(leaveBg);
      this.addText(PAD + 3, PANEL_H - 14, 'Leave Guild', '#ffaaaa', '4px');
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  private openInvitePrompt(): void {
    if (!this.guildData || !this.userId) return;
    const name = window.prompt('Enter username to invite:');
    if (!name?.trim()) return;
    fetch(`${SERVER_HTTP}/guild/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, targetUsername: name.trim(), guildId: this.guildData.id }),
    })
      .then(r => r.json() as Promise<{ success?: boolean; error?: string }>)
      .then(data => {
        if (data.success) this.refresh();
        else this.showError(data.error ?? 'Invite failed.');
      })
      .catch(() => this.showError('Network error.'));
  }

  private kickMember(targetPlayerId: string): void {
    if (!this.guildData || !this.userId) return;
    fetch(`${SERVER_HTTP}/guild/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, targetPlayerId, guildId: this.guildData.id }),
    })
      .then(r => r.json() as Promise<{ success?: boolean; error?: string }>)
      .then(data => { if (data.success) this.refresh(); else this.showError(data.error ?? 'Kick failed.'); })
      .catch(() => this.showError('Network error.'));
  }

  private promoteOrDemote(targetPlayerId: string, action: 'promote' | 'demote'): void {
    if (!this.guildData || !this.userId) return;
    fetch(`${SERVER_HTTP}/guild/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, targetPlayerId, guildId: this.guildData.id }),
    })
      .then(r => r.json() as Promise<{ success?: boolean; error?: string }>)
      .then(data => { if (data.success) this.refresh(); else this.showError(data.error ?? `${action} failed.`); })
      .catch(() => this.showError('Network error.'));
  }

  private leaveGuild(): void {
    if (!this.userId) return;
    fetch(`${SERVER_HTTP}/guild/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId }),
    })
      .then(r => r.json() as Promise<{ success?: boolean; error?: string }>)
      .then(data => { if (data.success) this.refresh(); else this.showError(data.error ?? 'Leave failed.'); })
      .catch(() => this.showError('Network error.'));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  destroy(): void {
    this.detachKeyListener();
    this.clearDyn();
    this.container.destroy();
  }
}
