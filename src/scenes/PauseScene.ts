import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

/**
 * PauseScene — overlay that runs in parallel with (paused) GameScene.
 * Launched via scene.launch(); resumes GameScene on dismiss.
 * Includes SFX and BGM volume controls.
 */
export class PauseScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.PAUSE);
  }

  create(): void {
    this.sfx = SoundManager.getInstance();
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Semi-transparent overlay ─────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x000000, 0.65).setDepth(0);

    // ── Panel (expanded for audio controls) ──────────────────────────────────
    const panelH = 116;
    const panelCy = cy + 8;
    this.add.rectangle(cx, panelCy, 112, panelH, 0x0a0a2e, 0.92).setDepth(1);

    const border = this.add.graphics().setDepth(2);
    border.lineStyle(1, 0x50a8e8, 0.8);
    border.strokeRect(cx - 56, panelCy - panelH / 2, 112, panelH);

    // ── Title ────────────────────────────────────────────────────────────────
    this.add
      .text(cx, panelCy - 47, '— PAUSED —', {
        fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      })
      .setOrigin(0.5).setDepth(3);

    // ── Buttons ──────────────────────────────────────────────────────────────
    const resumeBtn = this.makeButton(cx, panelCy - 26, 'Resume  (ESC)', '#ffe040');
    const menuBtn   = this.makeButton(cx, panelCy - 10, 'Main Menu', '#90d0f8');

    resumeBtn.on('pointerdown', () => this.resume());
    menuBtn.on('pointerdown', () => this.goMenu());

    // ── Audio section separator ───────────────────────────────────────────────
    const sep = this.add.graphics().setDepth(2);
    sep.lineStyle(1, 0x50a8e8, 0.35);
    sep.lineBetween(cx - 46, panelCy + 6, cx + 46, panelCy + 6);

    this.add
      .text(cx, panelCy + 12, 'AUDIO', {
        fontSize: '5px', color: '#88bbdd', fontFamily: 'monospace',
      })
      .setOrigin(0.5).setDepth(3);

    // ── Volume rows ───────────────────────────────────────────────────────────
    this.makeVolumeRow(cx, panelCy + 26, 'SFX',
      () => this.sfx.sfxVolume,
      (v) => { this.sfx.sfxVolume = v; },
    );
    this.makeVolumeRow(cx, panelCy + 40, 'BGM',
      () => this.sfx.musicVolume,
      (v) => { this.sfx.musicVolume = v; },
    );

    // ── ESC to resume ─────────────────────────────────────────────────────────
    this.input.keyboard!.once('keydown-ESC', () => this.resume());

    // Fade in overlay
    this.cameras.main.fadeIn(120, 0, 0, 0);
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

  private makeVolumeRow(
    cx: number, y: number,
    label: string,
    get: () => number,
    set: (v: number) => void,
  ): void {
    const STEP = 0.2;

    this.add
      .text(cx - 40, y, label, {
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
