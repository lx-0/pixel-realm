/**
 * ChatOverlay — zone chat panel built with Phaser GameObjects.
 *
 * Layout (fixed to camera, bottom-left):
 *   [message history, up to MAX_VISIBLE lines]
 *   [input bar when active]
 *
 * Controls:
 *   T         — open chat (zone message)
 *   /w Name   — whisper prefix; e.g. type /w Hero hello
 *   Enter     — send
 *   Escape    — close without sending
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const PANEL_X    = 4;
const PANEL_Y    = CANVAS.HEIGHT - 44;   // anchored above bottom bar
const PANEL_W    = 160;
const LINE_H     = 7;
const MAX_VISIBLE = 5;
const MSG_TTL_MS  = 8000;                // messages fade after 8 s
const BLINK_MS    = 500;                 // cursor blink interval

interface ChatEntry {
  text:      string;
  color:     string;
  addedAt:   number;
  label:     Phaser.GameObjects.Text;
}

export class ChatOverlay {
  private scene: Phaser.Scene;
  private entries: ChatEntry[] = [];

  // Input state
  private isOpen   = false;
  private inputBuf = '';                 // current typed characters
  private cursorOn = true;

  // Phaser objects
  private bg!:          Phaser.GameObjects.Rectangle;
  private inputBg!:     Phaser.GameObjects.Rectangle;
  private inputLabel!:  Phaser.GameObjects.Text;
  private tKey!:        Phaser.Input.Keyboard.Key;

  private blinkTimer   = 0;
  private keyListener?: (event: KeyboardEvent) => void;

  /** Called when the user presses Enter with a non-empty message. */
  onSend?: (text: string, whisperTo?: string) => void;
  /** Called when the user sends a guild chat message (/g prefix). */
  onGuildSend?: (text: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.build();
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private build(): void {
    const Z = 50;

    // Message history backdrop
    this.bg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, LINE_H * MAX_VISIBLE + 2, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(Z);

    // Input backdrop (hidden until active)
    this.inputBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y + LINE_H * MAX_VISIBLE + 2, PANEL_W, 10, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(Z)
      .setVisible(false);

    this.inputLabel = this.scene.add
      .text(PANEL_X + 2, PANEL_Y + LINE_H * MAX_VISIBLE + 3, '', {
        fontSize: '5px', color: '#ffffff', fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(Z + 1)
      .setVisible(false);

    // Keys
    const kb = this.scene.input.keyboard!;
    this.tKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.T);
  }

  // ── Update (called from GameScene.update) ─────────────────────────────────

  update(delta: number): void {
    this.expireOldMessages();

    if (this.isOpen) {
      this.blinkTimer += delta;
      if (this.blinkTimer >= BLINK_MS) {
        this.blinkTimer = 0;
        this.cursorOn   = !this.cursorOn;
      }
      this.refreshInputLabel();
    } else {
      // T opens chat
      if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
        this.openInput();
      }
    }
  }

  // ── Input mode ────────────────────────────────────────────────────────────

  openInput(): void {
    this.isOpen   = true;
    this.inputBuf = '';
    this.cursorOn = true;
    this.blinkTimer = 0;
    this.inputBg.setVisible(true);
    this.inputLabel.setVisible(true);

    // Show background while typing
    this.bg.setFillStyle(0x000000, 0.5);

    // Listen for keydown events to capture typed characters
    this.keyListener = (event: KeyboardEvent) => this.onKeyDown(event);
    window.addEventListener('keydown', this.keyListener, { capture: true });
  }

  private closeInput(send: boolean): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.inputBg.setVisible(false);
    this.inputLabel.setVisible(false);
    this.bg.setFillStyle(0x000000, 0);

    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener, { capture: true });
      this.keyListener = undefined;
    }

    if (send && this.inputBuf.trim()) {
      this.dispatchSend(this.inputBuf.trim());
    }
    this.inputBuf = '';
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen) return;

    if (event.key === 'Enter') {
      event.stopPropagation();
      this.closeInput(true);
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeInput(false);
      return;
    }
    if (event.key === 'Backspace') {
      event.stopPropagation();
      this.inputBuf = this.inputBuf.slice(0, -1);
      return;
    }
    // Accept printable characters
    if (event.key.length === 1 && this.inputBuf.length < 140) {
      event.stopPropagation();
      this.inputBuf += event.key;
    }
  }

  private dispatchSend(raw: string): void {
    // Guild chat: /g message
    const guildMatch = raw.match(/^\/g\s+(.+)$/i);
    if (guildMatch) {
      this.onGuildSend?.(guildMatch[1].trim());
      return;
    }
    // Whisper syntax: /w PlayerName message
    const whisperMatch = raw.match(/^\/w\s+(\S+)\s+(.+)$/i);
    if (whisperMatch) {
      this.onSend?.(whisperMatch[2].trim(), whisperMatch[1]);
    } else {
      this.onSend?.(raw);
    }
  }

  private refreshInputLabel(): void {
    const prefix = '> ';
    const cursor = this.cursorOn ? '█' : ' ';
    this.inputLabel.setText(prefix + this.inputBuf + cursor);
  }

  // ── Message display ───────────────────────────────────────────────────────

  addMessage(text: string, color = '#dddddd'): void {
    // Cap history
    if (this.entries.length >= MAX_VISIBLE * 2) {
      const old = this.entries.shift();
      old?.label.destroy();
    }

    const y = PANEL_Y + (MAX_VISIBLE - 1) * LINE_H;
    const label = this.scene.add
      .text(PANEL_X + 2, y, text, {
        fontSize: '4px', color, fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 1,
        wordWrap: { width: PANEL_W - 4, useAdvancedWrap: false },
      })
      .setScrollFactor(0)
      .setDepth(51);

    this.entries.push({ text, color, addedAt: this.scene.time.now, label });
    this.repositionLabels();
  }

  private repositionLabels(): void {
    const visible = this.entries.slice(-MAX_VISIBLE);
    visible.forEach((entry, i) => {
      const yPos = PANEL_Y + i * LINE_H;
      entry.label.y = yPos;
    });
    // Hide entries that are off the visible window
    this.entries.slice(0, -MAX_VISIBLE).forEach(e => e.label.setVisible(false));
    this.entries.slice(-MAX_VISIBLE).forEach(e => e.label.setVisible(true));
  }

  private expireOldMessages(): void {
    const now = this.scene.time.now;
    let changed = false;
    this.entries = this.entries.filter(e => {
      if (now - e.addedAt > MSG_TTL_MS) {
        e.label.destroy();
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) this.repositionLabels();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** True while the chat input box is open — GameScene should suppress attacks. */
  get active(): boolean {
    return this.isOpen;
  }

  destroy(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener, { capture: true });
    }
    this.entries.forEach(e => e.label.destroy());
    this.bg.destroy();
    this.inputBg.destroy();
    this.inputLabel.destroy();
  }
}
