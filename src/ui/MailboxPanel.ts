/**
 * MailboxPanel — in-game mailbox UI.
 *
 * Press M to toggle. Two tabs:
 *   Inbox  — list of received mail (unread bold), click to read, claim attachments, delete
 *   Send   — compose form: recipient, subject, body, optional gold attachment
 *
 * Also renders a notification history tab (bell icon):
 *   Notifications — recent system/event notifications with read/unread state
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const PANEL_W  = 240;
const PANEL_H  = 180;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 68;
const PAD      = 6;

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

// ── Types ─────────────────────────────────────────────────────────────────────

interface MailItem {
  id: string;
  senderName: string;
  subject: string;
  body: string;
  attachmentGold: number;
  attachmentItemId: string | null;
  attachmentQty: number;
  isRead: boolean;
  attachmentClaimed: boolean;
  sentAt: string;
  expiresAt: string;
}

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

type Tab = 'inbox' | 'send' | 'notifications';

export class MailboxPanel {
  private scene:      Phaser.Scene;
  private _visible    = false;
  private mKey!:      Phaser.Input.Keyboard.Key;
  private container:  Phaser.GameObjects.Container;
  private dynObjects: Phaser.GameObjects.GameObject[] = [];

  userId?:   string;
  username?: string;

  /** Toast callback — GameScene wires this to NotificationToast.show() */
  onShowToast?: (title: string, body: string, kind?: string) => void;
  /** Called when unread count changes so HUD badge can update. */
  onUnreadCountChanged?: (count: number) => void;

  private tab: Tab = 'inbox';
  private inbox: MailItem[]             = [];
  private notifications: NotificationItem[] = [];
  private selectedMail: MailItem | null = null;
  private unreadMailCount  = 0;
  private unreadNoteCount  = 0;

  // Send-form state
  private sendTo      = '';
  private sendSubject = '';
  private sendBody    = '';
  private sendGold    = '';
  private focusField: 'to' | 'subject' | 'body' | 'gold' | null = null;
  private keyListener?: (e: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(PANEL_X, PANEL_Y).setDepth(DEPTH).setScrollFactor(0);
    this.container.setVisible(false);
    this.mKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
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
    this.refresh();
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
    this.detachKeyListener();
    this.selectedMail = null;
  }

  /** Show a specific tab — called externally (e.g. from HUD badge click). */
  showTab(tab: Tab): void {
    this.tab = tab;
    if (!this._visible) this.show();
    else this.rebuild();
  }

  /** Poll unread counts without opening the panel. */
  async pollUnread(): Promise<void> {
    if (!this.userId) return;
    try {
      const [mRes, nRes] = await Promise.all([
        fetch(`${SERVER_HTTP}/mailbox/${this.userId}/unread-count`),
        fetch(`${SERVER_HTTP}/notifications/${this.userId}/unread-count`),
      ]);
      if (mRes.ok) {
        const { count } = await mRes.json() as { count: number };
        this.unreadMailCount = count;
      }
      if (nRes.ok) {
        const { count } = await nRes.json() as { count: number };
        this.unreadNoteCount = count;
      }
      this.onUnreadCountChanged?.(this.unreadMailCount + this.unreadNoteCount);
    } catch { /* non-fatal */ }
  }

  destroy(): void {
    this.detachKeyListener();
    this.clearDyn();
    this.container.destroy();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private async refresh(): Promise<void> {
    if (!this.userId) { this.rebuild(); return; }
    try {
      if (this.tab === 'inbox' || this.tab === 'send') {
        const res = await fetch(`${SERVER_HTTP}/mailbox/${this.userId}`);
        if (res.ok) this.inbox = await res.json() as MailItem[];
      }
      if (this.tab === 'notifications') {
        const [notesRes] = await Promise.all([
          fetch(`${SERVER_HTTP}/notifications/${this.userId}`),
        ]);
        if (notesRes.ok) this.notifications = await notesRes.json() as NotificationItem[];
      }
      await this.pollUnread();
    } catch { /* non-fatal */ }
    this.rebuild();
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private clearDyn(): void {
    this.dynObjects.forEach((o) => o.destroy());
    this.dynObjects = [];
    this.container.removeAll(false);
  }

  private txt(x: number, y: number, text: string, color = '#cccccc', size = '5px'): Phaser.GameObjects.Text {
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

  private btn(
    x: number, y: number, w: number, h: number,
    label: string, color: number, onClick: () => void,
  ): void {
    const bg = this.scene.add.rectangle(x, y, w, h, color, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setAlpha(0.8))
      .on('pointerout',  () => bg.setAlpha(1))
      .on('pointerdown', onClick);
    this.dynObjects.push(bg); this.container.add(bg);
    const lbl = this.txt(x + 3, y + (h > 10 ? 2 : 1), label, '#ffffff', '4px');
    lbl.setDepth(DEPTH + 2);
  }

  private rebuild(): void {
    this.clearDyn();
    this.detachKeyListener();

    // Background
    const bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x000000, 0.88)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.dynObjects.push(bg); this.container.add(bg);
    const border = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x334466, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH).setStrokeStyle(1, 0x334466, 0.9);
    this.dynObjects.push(border); this.container.add(border);

    // Title row
    this.txt(PAD, PAD, '✉ Mailbox', '#aaddff', '6px');
    this.txt(PANEL_W - PAD - 20, PAD, '[M/Esc]', '#445566', '4px');

    // Tab bar
    const TABS: { id: Tab; label: string; badge: number }[] = [
      { id: 'inbox',         label: 'Inbox',         badge: this.unreadMailCount },
      { id: 'send',          label: 'Send',          badge: 0 },
      { id: 'notifications', label: 'Notifications', badge: this.unreadNoteCount },
    ];
    let tx = PAD;
    for (const t of TABS) {
      const active = this.tab === t.id;
      const tabW   = t.id === 'notifications' ? 78 : 44;
      const tabBg  = this.scene.add.rectangle(tx, 14, tabW, 10, active ? 0x224488 : 0x111122, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.tab = t.id; this.selectedMail = null; this.refresh(); });
      this.dynObjects.push(tabBg); this.container.add(tabBg);
      const badge = t.badge > 0 ? ` (${t.badge})` : '';
      const lbl = this.txt(tx + 2, 15, `${t.label}${badge}`, active ? '#ffffff' : '#778899', '4px');
      lbl.setDepth(DEPTH + 2);
      tx += tabW + 2;
    }

    // Divider
    const div = this.scene.add.rectangle(0, 26, PANEL_W, 1, 0x334466, 0.6)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(div); this.container.add(div);

    switch (this.tab) {
      case 'inbox':         this.buildInbox(); break;
      case 'send':          this.buildSendForm(); break;
      case 'notifications': this.buildNotifications(); break;
    }
  }

  // ── Inbox tab ─────────────────────────────────────────────────────────────

  private buildInbox(): void {
    if (!this.userId) {
      this.txt(PAD, 36, 'Not logged in.', '#888888', '4px');
      return;
    }

    if (this.selectedMail) {
      this.buildMailDetail(this.selectedMail);
      return;
    }

    if (this.inbox.length === 0) {
      this.txt(PAD, 36, 'Your mailbox is empty.', '#778899', '4px');
      return;
    }

    let y = 30;
    const maxRows = Math.min(this.inbox.length, 6);
    for (let i = 0; i < maxRows; i++) {
      const mail = this.inbox[i];
      const color = mail.isRead ? '#778899' : '#ffffff';
      const prefix = mail.isRead ? '  ' : '● ';
      const hasAttach = (mail.attachmentGold > 0 || mail.attachmentItemId) && !mail.attachmentClaimed;
      const attachStr = hasAttach ? ' 📎' : '';
      const label = `${prefix}[${mail.senderName.slice(0, 10)}] ${mail.subject.slice(0, 22)}${attachStr}`;

      const rowBg = this.scene.add.rectangle(PAD, y - 1, PANEL_W - PAD * 2, 11, 0x0a0a1a, 0)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => rowBg.setFillStyle(0x1a2233))
        .on('pointerout',  () => rowBg.setFillStyle(0x0a0a1a))
        .on('pointerdown', () => { this.openMail(mail); });
      this.dynObjects.push(rowBg); this.container.add(rowBg);
      this.txt(PAD + 2, y, label, color, '4px');
      y += 13;
    }

    if (this.inbox.length > maxRows) {
      this.txt(PAD, y, `+${this.inbox.length - maxRows} more…`, '#445566', '4px');
    }
  }

  private async openMail(mail: MailItem): Promise<void> {
    this.selectedMail = mail;
    if (!mail.isRead && this.userId) {
      fetch(`${SERVER_HTTP}/mail/read/${mail.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId }),
      }).catch(() => {/* non-fatal */});
      mail.isRead = true;
      this.unreadMailCount = Math.max(0, this.unreadMailCount - 1);
      this.onUnreadCountChanged?.(this.unreadMailCount + this.unreadNoteCount);
    }
    this.rebuild();
  }

  private buildMailDetail(mail: MailItem): void {
    let y = 30;
    this.btn(PAD, y - 2, 28, 8, '← Back', 0x334466, () => {
      this.selectedMail = null; this.rebuild();
    });
    y += 12;

    this.txt(PAD, y, `From: ${mail.senderName}`, '#aaddff', '5px'); y += 9;
    this.txt(PAD, y, `Subj: ${mail.subject.slice(0, 38)}`, '#cccccc', '5px'); y += 9;

    // Body (word-wrap at 38 chars)
    const lines = this.wrapText(mail.body, 38);
    for (const line of lines.slice(0, 4)) {
      this.txt(PAD, y, line, '#aaaaaa', '4px'); y += 7;
    }

    // Attachment
    if (mail.attachmentGold > 0 || mail.attachmentItemId) {
      y += 2;
      const claimed = mail.attachmentClaimed;
      const attStr = mail.attachmentGold > 0
        ? `${mail.attachmentGold}g attached`
        : `Item x${mail.attachmentQty} attached`;
      this.txt(PAD, y, claimed ? `[Claimed] ${attStr}` : `📎 ${attStr}`, claimed ? '#556677' : '#ffd700', '4px');
      if (!claimed && this.userId) {
        this.btn(PANEL_W - PAD - 45, y - 2, 42, 9, 'Claim', 0x226644, () => {
          this.claimAttachment(mail);
        });
      }
      y += 12;
    }

    // Delete button
    this.btn(PAD, PANEL_H - 16, 30, 10, 'Delete', 0x882222, () => {
      this.deleteMail(mail);
    });
  }

  private claimAttachment(mail: MailItem): void {
    if (!this.userId) return;
    fetch(`${SERVER_HTTP}/mail/claim/${mail.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId }),
    })
      .then((r) => r.json() as Promise<{ success?: boolean; error?: string }>)
      .then((data) => {
        if (data.success) {
          mail.attachmentClaimed = true;
          this.onShowToast?.('Attachment Claimed', 'Added to your inventory/wallet.', 'auction_sold');
          this.rebuild();
        } else {
          this.showError(data.error ?? 'Claim failed.');
        }
      })
      .catch(() => this.showError('Network error.'));
  }

  private deleteMail(mail: MailItem): void {
    if (!this.userId) return;
    // Note: Express .delete() reads body differently — use query param workaround
    fetch(`${SERVER_HTTP}/mail/${mail.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId }),
    })
      .then(() => {
        this.inbox = this.inbox.filter((m) => m.id !== mail.id);
        this.selectedMail = null;
        this.rebuild();
      })
      .catch(() => this.showError('Delete failed.'));
  }

  // ── Send tab ──────────────────────────────────────────────────────────────

  private buildSendForm(): void {
    let y = 32;

    const fields: Array<{ label: string; key: 'to' | 'subject' | 'body' | 'gold'; value: string; max: number }> = [
      { label: 'To:',      key: 'to',      value: this.sendTo,      max: 20 },
      { label: 'Subject:', key: 'subject', value: this.sendSubject, max: 60 },
      { label: 'Message:', key: 'body',    value: this.sendBody,    max: 200 },
      { label: 'Gold:',    key: 'gold',    value: this.sendGold,    max: 8 },
    ];

    for (const f of fields) {
      this.txt(PAD, y, f.label, '#cccccc', '4px'); y += 7;
      const fieldBg = this.scene.add.rectangle(PAD, y, PANEL_W - PAD * 2, 9, 0x111133, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
      this.dynObjects.push(fieldBg); this.container.add(fieldBg);
      const active = this.focusField === f.key;
      const lbl = this.txt(PAD + 2, y + 1, (f.value || '_').slice(-32), active ? '#ffffff' : '#778899', '4px');
      lbl.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.focusField = f.key;
          this.attachKeyListener();
          this.rebuild();
        });
      y += 12;
    }

    // Send button
    this.btn(PAD, y + 2, 40, 11, 'Send Mail', 0x224488, () => this.submitSend());
    this.attachKeyListener();
  }

  private attachKeyListener(): void {
    if (this.keyListener) return;
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.focusField) return;
      if (e.key === 'Escape')    { this.focusField = null; this.detachKeyListener(); this.rebuild(); return; }
      if (e.key === 'Tab')       { this.cycleFocus(); this.rebuild(); return; }
      if (e.key === 'Backspace') {
        if      (this.focusField === 'to')      this.sendTo      = this.sendTo.slice(0, -1);
        else if (this.focusField === 'subject') this.sendSubject = this.sendSubject.slice(0, -1);
        else if (this.focusField === 'body')    this.sendBody    = this.sendBody.slice(0, -1);
        else                                     this.sendGold    = this.sendGold.slice(0, -1);
        this.rebuild(); return;
      }
      if (e.key.length === 1) {
        if      (this.focusField === 'to'      && this.sendTo.length      < 20)  this.sendTo      += e.key;
        else if (this.focusField === 'subject' && this.sendSubject.length < 60)  this.sendSubject += e.key;
        else if (this.focusField === 'body'    && this.sendBody.length    < 200) this.sendBody    += e.key;
        else if (this.focusField === 'gold'    && this.sendGold.length    < 8 && /\d/.test(e.key)) this.sendGold += e.key;
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
    const order: Array<'to' | 'subject' | 'body' | 'gold'> = ['to', 'subject', 'body', 'gold'];
    const idx = order.indexOf(this.focusField!);
    this.focusField = order[(idx + 1) % order.length];
  }

  private async submitSend(): Promise<void> {
    if (!this.userId || !this.sendTo.trim() || !this.sendSubject.trim()) {
      this.showError('Recipient and subject required.');
      return;
    }

    // Look up recipient by username — use the social endpoint pattern
    try {
      // First resolve recipient id via player lookup
      const lookupRes = await fetch(`${SERVER_HTTP}/players/by-name/${encodeURIComponent(this.sendTo.trim())}`);
      if (!lookupRes.ok) {
        this.showError('Player not found.');
        return;
      }
      const { id: recipientId } = await lookupRes.json() as { id: string };

      const goldVal = parseInt(this.sendGold, 10) || 0;
      const res = await fetch(`${SERVER_HTTP}/mail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: this.userId,
          senderName: this.username ?? 'Unknown',
          recipientId,
          subject: this.sendSubject.trim(),
          body: this.sendBody.trim(),
          attachmentGold: goldVal,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        this.sendTo = ''; this.sendSubject = ''; this.sendBody = ''; this.sendGold = '';
        this.focusField = null;
        this.onShowToast?.('Mail Sent', `To: ${this.sendTo}`, 'mail');
        this.tab = 'inbox';
        this.refresh();
      } else {
        this.showError(data.error ?? 'Send failed.');
      }
    } catch (_err) {
      this.showError('Network error.');
    }
  }

  // ── Notifications tab ─────────────────────────────────────────────────────

  private buildNotifications(): void {
    if (!this.userId) {
      this.txt(PAD, 36, 'Not logged in.', '#888888', '4px');
      return;
    }

    if (this.notifications.length === 0) {
      this.txt(PAD, 36, 'No notifications yet.', '#778899', '4px');
      return;
    }

    // Mark all as read when tab is opened
    if (this.unreadNoteCount > 0) {
      fetch(`${SERVER_HTTP}/notifications/${this.userId}/read-all`, { method: 'POST' })
        .catch(() => {/* non-fatal */});
      this.unreadNoteCount = 0;
      this.onUnreadCountChanged?.(this.unreadMailCount);
    }

    let y = 30;
    const maxRows = Math.min(this.notifications.length, 7);
    for (let i = 0; i < maxRows; i++) {
      const note = this.notifications[i];
      const color = note.isRead ? '#556677' : '#aaddff';
      const prefix = note.isRead ? '  ' : '● ';
      const label = `${prefix}${note.title.slice(0, 30)}`;
      this.txt(PAD + 2, y, label, color, '4px');
      if (note.body) {
        this.txt(PAD + 10, y + 6, note.body.slice(0, 36), '#667788', '3px');
        y += 14;
      } else {
        y += 9;
      }
    }

    if (this.notifications.length > maxRows) {
      this.txt(PAD, y, `+${this.notifications.length - maxRows} more…`, '#445566', '4px');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private showError(msg: string): void {
    const t = this.txt(PAD, PANEL_H - 14, msg, '#ff6666', '4px');
    this.scene.time.delayedCall(3000, () => t.destroy());
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if ((line + word).length > maxChars) {
        lines.push(line.trimEnd());
        line = '';
      }
      line += word + ' ';
    }
    if (line.trim()) lines.push(line.trimEnd());
    return lines;
  }
}
