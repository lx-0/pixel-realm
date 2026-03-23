import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SettingsManager } from '../systems/SettingsManager';
import { SoundManager } from '../systems/SoundManager';

export interface SettingsSceneData {
  /** Which scene to return to when settings are closed. */
  origin: 'menu' | 'pause';
}

type Tab = 'audio' | 'display' | 'controls';

/**
 * SettingsScene — full-screen tabbed settings overlay.
 * Launched from MenuScene or PauseScene; returns to origin on close.
 */
export class SettingsScene extends Phaser.Scene {
  private settings!: SettingsManager;
  private sfx!: SoundManager;

  private activeTab: Tab = 'audio';
  private tabContainers: Record<Tab, Phaser.GameObjects.Container> = {} as never;
  private tabButtons: Record<Tab, Phaser.GameObjects.Text> = {} as never;

  constructor() {
    super(SCENES.SETTINGS);
  }

  init(_data: SettingsSceneData): void {
    this.activeTab = 'audio';
  }

  create(): void {
    this.settings = SettingsManager.getInstance();
    this.sfx      = SoundManager.getInstance();

    const cx = CANVAS.WIDTH  / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Backdrop ──────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x000000, 0.78).setDepth(0);

    // ── Panel ─────────────────────────────────────────────────────────────────
    const panelW = 200;
    const panelH = 150;
    this.add.rectangle(cx, cy, panelW, panelH, 0x0a0a2e, 0.95).setDepth(1);
    const border = this.add.graphics().setDepth(2);
    border.lineStyle(1, 0x50a8e8, 0.85);
    border.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(cx, cy - panelH / 2 + 8, 'SETTINGS', {
      fontSize: '8px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3);

    // ── Tab buttons ───────────────────────────────────────────────────────────
    const tabs: Tab[] = ['audio', 'display', 'controls'];
    const tabW = 54;
    const tabY = cy - panelH / 2 + 22;

    tabs.forEach((tab, i) => {
      const tx = cx - tabW + i * tabW;
      const btn = this.add.text(tx, tabY, tab.toUpperCase(), {
        fontSize: '5px', color: '#888899', fontFamily: 'monospace',
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(3);

      btn.on('pointerover', () => { if (this.activeTab !== tab) btn.setColor('#ccccdd'); });
      btn.on('pointerout',  () => { if (this.activeTab !== tab) btn.setColor('#888899'); });
      btn.on('pointerdown', () => this.switchTab(tab));

      this.tabButtons[tab] = btn;
    });

    // Tab underline bar
    const tabBarY = tabY + 7;
    const tabBarBg = this.add.graphics().setDepth(2);
    tabBarBg.lineStyle(1, 0x50a8e8, 0.25);
    tabBarBg.lineBetween(cx - panelW / 2 + 4, tabBarY, cx + panelW / 2 - 4, tabBarY);

    // ── Content area y start ──────────────────────────────────────────────────
    const contentY = tabY + 14;

    // Build each tab container
    this.tabContainers.audio    = this.buildAudioTab(cx, contentY);
    this.tabContainers.display  = this.buildDisplayTab(cx, contentY);
    this.tabContainers.controls = this.buildControlsTab(cx, contentY);

    // ── Close button ──────────────────────────────────────────────────────────
    const closeBtn = this.add.text(cx + panelW / 2 - 6, cy - panelH / 2 + 5, '✕', {
      fontSize: '6px', color: '#cc4444', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(3);

    closeBtn.on('pointerover', () => closeBtn.setColor('#ff6666'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#cc4444'));
    closeBtn.on('pointerdown', () => this.closeSettings());

    // ESC to close
    this.input.keyboard!.once('keydown-ESC', () => this.closeSettings());

    // Activate initial tab
    this.switchTab('audio');
    this.cameras.main.fadeIn(120, 0, 0, 0);
  }

  // ── Tab construction ───────────────────────────────────────────────────────

  private buildAudioTab(cx: number, startY: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = startY;

    const addVolRow = (label: string, get: () => number, set: (v: number) => void) => {
      const STEP = 0.1;
      const row = this.buildSliderRow(cx, y, label, get, set, STEP);
      items.push(...row);
      y += 16;
    };

    addVolRow('Master',  () => this.settings.masterVolume,  (v) => { this.settings.masterVolume  = v; this.settings.save(); });
    addVolRow('Music',   () => this.settings.musicVolume,   (v) => { this.settings.musicVolume   = v; this.settings.save(); });
    addVolRow('SFX',     () => this.settings.sfxVolume,     (v) => { this.settings.sfxVolume     = v; this.settings.save(); });
    addVolRow('Ambient', () => this.settings.ambientVolume, (v) => { this.settings.ambientVolume = v; this.settings.save(); });

    const c = this.add.container(0, 0, items).setDepth(3);
    return c;
  }

  private buildDisplayTab(cx: number, startY: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = startY;

    // Fullscreen toggle
    items.push(...this.buildToggleRow(cx, y, 'Fullscreen',
      () => this.settings.fullscreen,
      (v) => {
        this.settings.fullscreen = v;
        this.settings.save();
        if (v) {
          this.scale.startFullscreen();
        } else {
          this.scale.stopFullscreen();
        }
      },
    ));
    y += 16;

    // Smooth scaling toggle
    items.push(...this.buildToggleRow(cx, y, 'Smooth Scale',
      () => this.settings.smoothScale,
      (v) => {
        this.settings.smoothScale = v;
        this.settings.save();
      },
    ));
    y += 16;

    // Show FPS toggle
    items.push(...this.buildToggleRow(cx, y, 'Show FPS',
      () => this.settings.showFPS,
      (v) => {
        this.settings.showFPS = v;
        this.settings.save();
      },
    ));

    return this.add.container(0, 0, items).setDepth(3);
  }

  private buildControlsTab(cx: number, startY: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];

    const bindings: [string, string][] = [
      ['Move',       'W / A / S / D'],
      ['Attack',     'SPACE'],
      ['Sprint',     'SHIFT'],
      ['Dodge',      'Q'],
      ['NPC Talk',   'E'],
      ['Inventory',  'I'],
      ['Quest Log',  'J'],
      ['Skill Tree', 'K'],
      ['Achievements','H'],
      ['World Map',  'M'],
      ['Craft',      'F'],
      ['Skills 1–6', '1 – 6'],
      ['Chat',       'ENTER'],
      ['Mute',       'N'],
      ['Close / Pause', 'ESC'],
    ];

    items.push(this.add.text(cx, startY - 2, 'Key Bindings (v1 — read only)', {
      fontSize: '4px', color: '#555577', fontFamily: 'monospace',
    }).setOrigin(0.5));

    bindings.forEach(([action, key], i) => {
      const rowY = startY + 8 + i * 7;
      items.push(
        this.add.text(cx - 42, rowY, action, {
          fontSize: '4px', color: '#aaccee', fontFamily: 'monospace',
        }).setOrigin(0, 0.5),
        this.add.text(cx + 42, rowY, key, {
          fontSize: '4px', color: '#ffffff', fontFamily: 'monospace',
        }).setOrigin(1, 0.5),
      );
    });

    return this.add.container(0, 0, items).setDepth(3);
  }

  // ── Reusable row builders ──────────────────────────────────────────────────

  private buildSliderRow(
    cx: number, y: number, label: string,
    get: () => number, set: (v: number) => void, step: number,
  ): Phaser.GameObjects.GameObject[] {
    const labelText = this.add.text(cx - 52, y, label, {
      fontSize: '6px', color: '#aaccee', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    const pct = () => `${Math.round(get() * 100)}%`;

    const valueText = this.add.text(cx, y, pct(), {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    const decBtn = this.add.text(cx - 20, y, '◄', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const incBtn = this.add.text(cx + 20, y, '►', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    decBtn.on('pointerdown', () => {
      this.sfx.playMenuClick();
      set(Math.max(0, get() - step));
      valueText.setText(pct());
    });
    incBtn.on('pointerdown', () => {
      this.sfx.playMenuClick();
      set(Math.min(1, get() + step));
      valueText.setText(pct());
    });

    decBtn.on('pointerover', () => decBtn.setColor('#ffffff'));
    decBtn.on('pointerout',  () => decBtn.setColor('#50a8e8'));
    incBtn.on('pointerover', () => incBtn.setColor('#ffffff'));
    incBtn.on('pointerout',  () => incBtn.setColor('#50a8e8'));

    return [labelText, valueText, decBtn, incBtn];
  }

  private buildToggleRow(
    cx: number, y: number, label: string,
    get: () => boolean, set: (v: boolean) => void,
  ): Phaser.GameObjects.GameObject[] {
    const labelText = this.add.text(cx - 52, y, label, {
      fontSize: '6px', color: '#aaccee', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    const stateText = () => get() ? 'ON ' : 'OFF';
    const stateColor = () => get() ? '#50e888' : '#888888';

    const btn = this.add.text(cx + 40, y, stateText(), {
      fontSize: '6px', color: stateColor(), fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.sfx.playMenuClick();
      set(!get());
      btn.setText(stateText());
      btn.setColor(stateColor());
    });
    btn.on('pointerover', () => btn.setAlpha(0.75));
    btn.on('pointerout',  () => btn.setAlpha(1));

    return [labelText, btn];
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

  private switchTab(tab: Tab): void {
    this.activeTab = tab;

    // Update tab button colours
    const tabs: Tab[] = ['audio', 'display', 'controls'];
    tabs.forEach((t) => {
      this.tabButtons[t].setColor(t === tab ? '#ffd700' : '#888899');
    });

    // Show / hide containers
    tabs.forEach((t) => {
      this.tabContainers[t].setVisible(t === tab);
    });
  }

  // ── Close ──────────────────────────────────────────────────────────────────

  private closeSettings(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.time.delayedCall(120, () => {
      this.scene.stop();
    });
  }
}
