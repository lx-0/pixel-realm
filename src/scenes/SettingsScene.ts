import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SettingsManager } from '../systems/SettingsManager';
import { SoundManager } from '../systems/SoundManager';
import type { ColorblindMode, UiScale } from '../systems/SettingsManager';
import { t, getLanguage, changeLanguage, SUPPORTED_LOCALES } from '../i18n';
import type { Locale } from '../i18n';

export interface SettingsSceneData {
  /** Which scene to return to when settings are closed. */
  origin: 'menu' | 'pause';
}

type Tab = 'audio' | 'display' | 'controls' | 'access';

/**
 * SettingsScene — full-screen tabbed settings overlay.
 * Launched from MenuScene or PauseScene; returns to origin on close.
 * Tabs: Audio, Display, Controls, Accessibility (includes language switcher)
 */
export class SettingsScene extends Phaser.Scene {
  private settings!: SettingsManager;
  private sfx!: SoundManager;

  private activeTab: Tab = 'audio';
  private tabContainers: Record<Tab, Phaser.GameObjects.Container> = {} as never;
  private tabButtons: Record<Tab, Phaser.GameObjects.Text> = {} as never;

  private origin: 'menu' | 'pause' = 'menu';
  private langChanged = false;

  constructor() {
    super(SCENES.SETTINGS);
  }

  init(data: SettingsSceneData): void {
    this.activeTab = 'audio';
    this.origin = data?.origin ?? 'menu';
    this.langChanged = false;
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
    this.add.text(cx, cy - panelH / 2 + 8, t('settings.title'), {
      fontSize: '8px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3);

    // ── Tab buttons ───────────────────────────────────────────────────────────
    const tabs: Tab[] = ['audio', 'display', 'controls', 'access'];
    const tabLabelKeys: Record<Tab, string> = {
      audio:    'settings.tab_audio',
      display:  'settings.tab_display',
      controls: 'settings.tab_controls',
      access:   'settings.tab_access',
    };
    const tabW = 42;
    const tabY = cy - panelH / 2 + 22;

    tabs.forEach((tab, i) => {
      const tx = cx - tabW * 1.5 + i * tabW;
      const btn = this.add.text(tx, tabY, t(tabLabelKeys[tab]), {
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
    this.tabContainers.access   = this.buildAccessibilityTab(cx, contentY);

    // ── Close button ──────────────────────────────────────────────────────────
    const closeBtn = this.add.text(cx + panelW / 2 - 6, cy - panelH / 2 + 5, 'X', {
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

    const addVolRow = (labelKey: string, get: () => number, set: (v: number) => void) => {
      const STEP = 0.1;
      const row = this.buildSliderRow(cx, y, t(labelKey), get, set, STEP);
      items.push(...row);
      y += 16;
    };

    addVolRow('settings.master',  () => this.settings.masterVolume,  (v) => { this.settings.masterVolume  = v; this.settings.save(); });
    addVolRow('settings.music',   () => this.settings.musicVolume,   (v) => { this.settings.musicVolume   = v; this.settings.save(); });
    addVolRow('settings.sfx',     () => this.settings.sfxVolume,     (v) => { this.settings.sfxVolume     = v; this.settings.save(); });
    addVolRow('settings.ambient', () => this.settings.ambientVolume, (v) => { this.settings.ambientVolume = v; this.settings.save(); });

    const c = this.add.container(0, 0, items).setDepth(3);
    return c;
  }

  private buildDisplayTab(cx: number, startY: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = startY;

    items.push(...this.buildToggleRow(cx, y, t('settings.fullscreen'),
      () => this.settings.fullscreen,
      (v) => {
        this.settings.fullscreen = v;
        this.settings.save();
        if (v) { this.scale.startFullscreen(); } else { this.scale.stopFullscreen(); }
      },
    ));
    y += 16;

    items.push(...this.buildToggleRow(cx, y, t('settings.smooth_scale'),
      () => this.settings.smoothScale,
      (v) => { this.settings.smoothScale = v; this.settings.save(); },
    ));
    y += 16;

    items.push(...this.buildToggleRow(cx, y, t('settings.show_fps'),
      () => this.settings.showFPS,
      (v) => { this.settings.showFPS = v; this.settings.save(); },
    ));

    return this.add.container(0, 0, items).setDepth(3);
  }

  private buildControlsTab(cx: number, startY: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];

    const bindings: [string, string][] = [
      [t('controls.move'),          'W / A / S / D'],
      [t('controls.attack'),        'SPACE'],
      [t('controls.sprint'),        'SHIFT'],
      [t('controls.dodge'),         'Q'],
      [t('controls.npc_talk'),      'E'],
      [t('controls.inventory'),     'I'],
      [t('controls.quest_log'),     'J'],
      [t('controls.skill_tree'),    'K'],
      [t('controls.achievements'),  'H'],
      [t('controls.world_map'),     'M'],
      [t('controls.craft'),         'F'],
      [t('controls.skills_hotkeys'), '1 - 6'],
      [t('controls.chat'),          'ENTER'],
      [t('controls.mute'),          'N'],
      [t('controls.close_pause'),   'ESC'],
    ];

    items.push(this.add.text(cx, startY - 2, t('settings.keybindings_title'), {
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

  private buildAccessibilityTab(cx: number, startY: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = startY;

    // Colorblind Mode
    items.push(this.add.text(cx - 52, y, t('settings.colorblind'), {
      fontSize: '6px', color: '#aaccee', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));

    const MODES: ColorblindMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
    const modeLabels: Record<ColorblindMode, string> = {
      none:         t('settings.colorblind_none'),
      protanopia:   t('settings.colorblind_protan'),
      deuteranopia: t('settings.colorblind_deutan'),
      tritanopia:   t('settings.colorblind_tritan'),
    };

    const modeValueText = this.add.text(cx, y, modeLabels[this.settings.colorblindMode], {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
    items.push(modeValueText);

    const decMode = this.add.text(cx - 20, y, '<', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    const incMode = this.add.text(cx + 20, y, '>', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const stepMode = (dir: 1 | -1) => {
      this.sfx.playMenuClick();
      const idx = MODES.indexOf(this.settings.colorblindMode);
      const next = MODES[(idx + dir + MODES.length) % MODES.length];
      this.settings.colorblindMode = next;
      this.settings.save();
      modeValueText.setText(modeLabels[next]);
    };
    decMode.on('pointerdown', () => stepMode(-1));
    incMode.on('pointerdown', () => stepMode(1));
    decMode.on('pointerover', () => decMode.setColor('#ffffff'));
    decMode.on('pointerout',  () => decMode.setColor('#50a8e8'));
    incMode.on('pointerover', () => incMode.setColor('#ffffff'));
    incMode.on('pointerout',  () => incMode.setColor('#50a8e8'));
    items.push(decMode, incMode);
    y += 16;

    // UI Scale
    items.push(this.add.text(cx - 52, y, t('settings.ui_scale'), {
      fontSize: '6px', color: '#aaccee', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));

    const SCALES: UiScale[] = [1, 1.5, 2];
    const scaleLabel = (s: UiScale) => s + 'x';

    const scaleValueText = this.add.text(cx, y, scaleLabel(this.settings.uiScale), {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
    items.push(scaleValueText);

    const decScale = this.add.text(cx - 20, y, '<', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    const incScale = this.add.text(cx + 20, y, '>', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const stepScale = (dir: 1 | -1) => {
      this.sfx.playMenuClick();
      const idx = SCALES.indexOf(this.settings.uiScale);
      const next = SCALES[Math.max(0, Math.min(SCALES.length - 1, idx + dir))];
      this.settings.uiScale = next;
      this.settings.save();
      scaleValueText.setText(scaleLabel(next));
    };
    decScale.on('pointerdown', () => stepScale(-1));
    incScale.on('pointerdown', () => stepScale(1));
    decScale.on('pointerover', () => decScale.setColor('#ffffff'));
    decScale.on('pointerout',  () => decScale.setColor('#50a8e8'));
    incScale.on('pointerover', () => incScale.setColor('#ffffff'));
    incScale.on('pointerout',  () => incScale.setColor('#50a8e8'));
    items.push(decScale, incScale);
    y += 16;

    // Reduced Motion
    items.push(...this.buildToggleRow(cx, y, t('settings.reduced_motion'),
      () => this.settings.reducedMotion,
      (v) => { this.settings.reducedMotion = v; this.settings.save(); },
    ));
    y += 16;

    // Language
    items.push(this.add.text(cx - 52, y, t('settings.language'), {
      fontSize: '6px', color: '#aaccee', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));

    const LANGS: Locale[] = SUPPORTED_LOCALES.map(l => l.code);
    const langValueText = this.add.text(cx, y, t(`lang.${getLanguage()}`), {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
    items.push(langValueText);

    const decLang = this.add.text(cx - 20, y, '<', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    const incLang = this.add.text(cx + 20, y, '>', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const stepLang = (dir: 1 | -1) => {
      this.sfx.playMenuClick();
      const idx = LANGS.indexOf(getLanguage());
      const next = LANGS[(idx + dir + LANGS.length) % LANGS.length];
      changeLanguage(next);
      langValueText.setText(t(`lang.${next}`));
      this.langChanged = true;
    };
    decLang.on('pointerdown', () => stepLang(-1));
    incLang.on('pointerdown', () => stepLang(1));
    decLang.on('pointerover', () => decLang.setColor('#ffffff'));
    decLang.on('pointerout',  () => decLang.setColor('#50a8e8'));
    incLang.on('pointerover', () => incLang.setColor('#ffffff'));
    incLang.on('pointerout',  () => incLang.setColor('#50a8e8'));
    items.push(decLang, incLang);
    y += 16;

    // Hint
    items.push(this.add.text(cx, y + 4, t('settings.access_hint'), {
      fontSize: '4px', color: '#556688', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5));

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

    const pct = () => Math.round(get() * 100) + '%';

    const valueText = this.add.text(cx, y, pct(), {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    const decBtn = this.add.text(cx - 20, y, '<', {
      fontSize: '6px', color: '#50a8e8', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const incBtn = this.add.text(cx + 20, y, '>', {
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

    const stateText = () => get() ? t('settings.on') : t('settings.off');
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

    const tabs: Tab[] = ['audio', 'display', 'controls', 'access'];
    tabs.forEach((t) => {
      this.tabButtons[t].setColor(t === tab ? '#ffd700' : '#888899');
    });
    tabs.forEach((t) => {
      this.tabContainers[t].setVisible(t === tab);
    });
  }

  // ── Close ──────────────────────────────────────────────────────────────────

  private closeSettings(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.time.delayedCall(120, () => {
      const langChanged = this.langChanged;
      const origin = this.origin;
      this.scene.stop();
      // If language changed, restart the origin scene so all strings refresh
      if (langChanged && origin === 'menu') {
        this.scene.get(SCENES.MENU).scene.restart();
      }
    });
  }
}
