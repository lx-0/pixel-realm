import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import { SaveManager, NUM_SLOTS, type SlotMeta } from '../systems/SaveManager';
import type { GameScene } from './GameScene';

/**
 * PauseScene — overlay that runs in parallel with (paused) GameScene.
 * Launched via scene.launch(); resumes GameScene on dismiss.
 * Includes SFX/BGM volume controls and 3-slot save/load.
 */
export class PauseScene extends Phaser.Scene {
  private sfx!: SoundManager;

  // Save/load slot UI
  private slotTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SCENES.PAUSE);
  }

  create(_data: { zoneId?: string }): void {
    this.sfx = SoundManager.getInstance();
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Panel dimensions ─────────────────────────────────────────────────────
    const panelW = 160;
    const panelH = 202;
    const panelCy = cy + 4;

    // ── Semi-transparent overlay ─────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x000000, 0.65).setDepth(0);

    // ── Panel bg + border ────────────────────────────────────────────────────
    this.add.rectangle(cx, panelCy, panelW, panelH, 0x0a0a2e, 0.92).setDepth(1);
    const border = this.add.graphics().setDepth(2);
    border.lineStyle(1, 0x50a8e8, 0.8);
    border.strokeRect(cx - panelW / 2, panelCy - panelH / 2, panelW, panelH);

    // ── Title ────────────────────────────────────────────────────────────────
    const topY = panelCy - panelH / 2 + 8;
    this.add
      .text(cx, topY, '— PAUSED —', {
        fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      })
      .setOrigin(0.5).setDepth(3);

    // ── Buttons ──────────────────────────────────────────────────────────────
    let y = topY + 18;
    const resumeBtn   = this.makeButton(cx, y, 'Resume  (ESC)', '#ffe040'); y += 14;
    const settingsBtn = this.makeButton(cx, y, '⚙ Settings',    '#90d0f8'); y += 14;
    const menuBtn     = this.makeButton(cx, y, 'Main Menu',      '#cc8888'); y += 14;

    resumeBtn.on('pointerdown',   () => this.resume());
    settingsBtn.on('pointerdown', () => this.openSettings());
    menuBtn.on('pointerdown',     () => this.goMenu());

    // ── Audio section ─────────────────────────────────────────────────────────
    this.addSeparator(cx, y + 2); y += 10;
    this.add.text(cx, y, 'AUDIO', {
      fontSize: '5px', color: '#88bbdd', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(3); y += 10;

    this.makeVolumeRow(cx, y, 'SFX',
      () => this.sfx.sfxVolume,
      (v) => { this.sfx.sfxVolume = v; },
    ); y += 14;
    this.makeVolumeRow(cx, y, 'BGM',
      () => this.sfx.musicVolume,
      (v) => { this.sfx.musicVolume = v; },
    ); y += 16;

    // ── Save / Load section ───────────────────────────────────────────────────
    this.addSeparator(cx, y); y += 8;
    this.add.text(cx, y, 'SAVE / LOAD', {
      fontSize: '5px', color: '#88bbdd', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(3); y += 10;

    const slotMetas = SaveManager.listSlots();
    for (let i = 0; i < NUM_SLOTS; i++) {
      this.buildSlotRow(cx, y, i, slotMetas[i]); y += 20;
    }

    // ── ESC to resume ─────────────────────────────────────────────────────────
    this.input.keyboard!.on('keydown-ESC', () => {
      if (!this.scene.isActive(SCENES.SETTINGS)) this.resume();
    });

    // Fade in overlay
    this.cameras.main.fadeIn(120, 0, 0, 0);
  }

  // ── Slot row ──────────────────────────────────────────────────────────────

  private buildSlotRow(
    cx: number, y: number,
    slotIndex: number,
    meta: SlotMeta | null,
  ): void {
    const label = slotIndex === 0 ? 'AUTO' : `S${slotIndex}`;
    const labelColor = slotIndex === 0 ? '#ffcc44' : '#aaaaff';

    this.add.text(cx - 72, y, label, {
      fontSize: '5px', color: labelColor, fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setDepth(3);

    // Slot info
    const infoStr = meta ? this.formatSlotMeta(meta) : '— empty —';
    const infoColor = meta ? '#ccddcc' : '#445566';
    const infoText = this.add.text(cx - 52, y, infoStr, {
      fontSize: '5px', color: infoColor, fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setDepth(3);
    this.slotTexts[slotIndex] = infoText;

    // Save button
    const saveBtn = this.makeSmallButton(cx + 36, y, '[S]', '#50e898');
    saveBtn.on('pointerdown', () => this.saveToSlot(slotIndex));

    // Load button
    const loadBtn = this.makeSmallButton(cx + 54, y, '[L]', meta ? '#50a8e8' : '#334455');
    if (meta) {
      loadBtn.on('pointerdown', () => this.loadFromSlot(slotIndex));
    }

    // Clear button (only if occupied)
    if (meta) {
      const clrBtn = this.makeSmallButton(cx + 72, y, '[X]', '#cc4444');
      clrBtn.on('pointerdown', () => this.clearSlot(slotIndex));
    }
  }

  private formatSlotMeta(meta: SlotMeta): string {
    const d = new Date(meta.timestamp);
    const date = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const cls = meta.classId.charAt(0).toUpperCase();
    return `Lv${meta.playerLevel}${cls} ${meta.currentZoneName.substring(0, 8)} ${date}`;
  }

  // ── Slot actions ──────────────────────────────────────────────────────────

  private saveToSlot(slotIndex: number): void {
    this.sfx.playMenuClick();
    const gameScene = this.scene.get(SCENES.GAME) as GameScene;
    const data = gameScene.buildSlotSaveData();
    SaveManager.saveSlot(slotIndex, data);
    // Refresh slot text
    const meta = SaveManager.listSlots()[slotIndex];
    if (meta && this.slotTexts[slotIndex]) {
      this.slotTexts[slotIndex].setText(this.formatSlotMeta(meta));
      this.slotTexts[slotIndex].setColor('#ccddcc');
    }
    this.flashText(`Slot ${slotIndex === 0 ? 'Auto' : slotIndex} saved`, '#88ffcc');
  }

  private loadFromSlot(slotIndex: number): void {
    this.sfx.playMenuClick();
    const slot = SaveManager.applySlot(slotIndex);
    if (!slot) {
      this.flashText('Load failed — slot corrupted', '#ff4444');
      return;
    }
    const zoneId = slot.currentZoneId;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.stop(SCENES.GAME);
      this.scene.stop(SCENES.PAUSE);
      this.scene.start(SCENES.GAME, { zoneId });
    });
  }

  private clearSlot(slotIndex: number): void {
    this.sfx.playMenuClick();
    SaveManager.clearSlot(slotIndex);
    if (this.slotTexts[slotIndex]) {
      this.slotTexts[slotIndex].setText('— empty —');
      this.slotTexts[slotIndex].setColor('#445566');
    }
    this.flashText(`Slot ${slotIndex === 0 ? 'Auto' : slotIndex} cleared`, '#ffaa44');
  }

  /** Brief status message at the bottom of the panel. */
  private flashText(msg: string, color: string): void {
    const t = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 8, msg, {
      fontSize: '5px', color, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);
    this.tweens.add({ targets: t, alpha: 0, duration: 1400, delay: 800, onComplete: () => t.destroy() });
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  private addSeparator(cx: number, y: number): void {
    const sep = this.add.graphics().setDepth(2);
    sep.lineStyle(1, 0x50a8e8, 0.35);
    sep.lineBetween(cx - 68, y, cx + 68, y);
  }

  private makeButton(x: number, y: number, label: string, color: string): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, {
        fontSize: '7px', color, fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    btn.on('pointerover', () => { btn.setColor('#ffffff'); btn.setScale(1.06); });
    btn.on('pointerout',  () => { btn.setColor(color);    btn.setScale(1); });
    return btn;
  }

  private makeSmallButton(x: number, y: number, label: string, color: string): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, {
        fontSize: '5px', color, fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor(color));
    return btn;
  }

  private makeVolumeRow(
    cx: number, y: number,
    label: string,
    get: () => number,
    set: (v: number) => void,
  ): void {
    const STEP = 0.2;

    this.add
      .text(cx - 62, y, label, {
        fontSize: '6px', color: '#aaccee', fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5).setDepth(3);

    const pct = () => `${Math.round(get() * 100)}%`;

    const valueText = this.add
      .text(cx, y, pct(), {
        fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5).setDepth(3);

    const decBtn = this.add
      .text(cx - 18, y, '◄', {
        fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    const incBtn = this.add
      .text(cx + 18, y, '►', {
        fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    decBtn.on('pointerdown', () => {
      this.sfx.playMenuClick();
      set(Math.max(0, get() - STEP));
      valueText.setText(pct());
    });
    incBtn.on('pointerdown', () => {
      this.sfx.playMenuClick();
      set(Math.min(1, get() + STEP));
      valueText.setText(pct());
    });

    decBtn.on('pointerover', () => decBtn.setColor('#ffffff'));
    decBtn.on('pointerout',  () => decBtn.setColor('#50a8e8'));
    incBtn.on('pointerover', () => incBtn.setColor('#ffffff'));
    incBtn.on('pointerout',  () => incBtn.setColor('#50a8e8'));
  }

  private openSettings(): void {
    this.sfx.playMenuClick();
    this.scene.launch(SCENES.SETTINGS, { origin: 'pause' });
  }

  private resume(): void {
    this.sfx.playMenuClick();
    this.scene.resume(SCENES.GAME);
    this.scene.stop();
  }

  private goMenu(): void {
    this.sfx.playMenuClick();
    this.sfx.stopMusic();
    this.scene.stop(SCENES.GAME);
    this.scene.start(SCENES.LEVEL_SELECT);
  }
}
