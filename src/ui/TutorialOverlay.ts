/**
 * TutorialOverlay — step-by-step onboarding guide for new players.
 *
 * Shows a panel at the bottom of the HUD with one tutorial step at a time.
 * Each step waits for the player to perform an action (move, attack, etc.)
 * before advancing automatically.
 *
 * Lifecycle:
 *  - Attach to GameScene immediately after createHUD().
 *  - Call notifyMoved / notifyAttacked / notifyDodged / notifySprinted each
 *    frame when the relevant action is detected.
 *  - Call update(time, delta) every frame so auto-advance timers tick.
 *  - Set onComplete to be notified when the tutorial finishes or is skipped.
 *    Caller is responsible for persisting completion via SaveManager.
 *
 * Press T to skip at any time.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const PANEL_X      = 4;
const PANEL_Y      = 136;
const PANEL_W      = CANVAS.WIDTH - 8;  // 312
const PANEL_H      = 42;
const DEPTH        = 70;
const PAD_X        = 5;
const PAD_Y        = 4;

// ── Step definitions ──────────────────────────────────────────────────────────

type TriggerKind = 'move' | 'attack' | 'dodge' | 'sprint' | 'minimap' | 'inventory' | 'skill_tree' | 'auto';

interface TutorialStep {
  title:       string;
  instruction: string;
  trigger:     TriggerKind;
  autoDelay?:  number; // ms before auto-advance (trigger === 'auto')
}

const STEPS: TutorialStep[] = [
  {
    title:       'Welcome to PixelRealm!',
    instruction: 'Use WASD (or Arrow Keys) to move your character around the zone.',
    trigger:     'move',
  },
  {
    title:       'Combat — Attack',
    instruction: 'Press SPACE to swing your weapon. Hit enemies to score kills!',
    trigger:     'attack',
  },
  {
    title:       'Combat — Dodge Roll',
    instruction: 'Press Q to dodge-roll in your movement direction. Costs mana, grants invincibility frames.',
    trigger:     'dodge',
  },
  {
    title:       'Combat — Sprint',
    instruction: 'Hold SHIFT while moving to sprint. You move faster but drain mana.',
    trigger:     'sprint',
  },
  {
    title:       'Inventory',
    instruction: 'Press I to open your inventory. Equip gear and use items collected from enemies.',
    trigger:     'inventory',
  },
  {
    title:       'Skill Tree',
    instruction: 'Press K to open the Skill Tree. Choose Warrior or Mage and unlock powerful abilities!',
    trigger:     'skill_tree',
  },
  {
    title:       'HUD Overview',
    instruction: 'Red = HP  ·  Blue = Mana  ·  Yellow = XP  ·  Top-right = Wave info',
    trigger:     'auto',
    autoDelay:   5000,
  },
  {
    title:       'Mini-Map',
    instruction: 'Press M to toggle the mini-map (top-right). Yellow = you, Red = enemies.',
    trigger:     'minimap',
  },
  {
    title:       'Quests & NPCs',
    instruction: 'Press E near an NPC to accept quests. Clear all waves and defeat the boss to unlock new zones!',
    trigger:     'auto',
    autoDelay:   5000,
  },
  {
    title:       'Ready for Adventure!',
    instruction: 'Tutorial complete. Defeat all waves and the zone boss to progress. Good luck!',
    trigger:     'auto',
    autoDelay:   3500,
  },
];

// ── Class ─────────────────────────────────────────────────────────────────────

export class TutorialOverlay {
  // ── Public hook ──────────────────────────────────────────────────────────
  onComplete?: () => void;

  // ── State ─────────────────────────────────────────────────────────────────
  private stepIdx     = 0;
  private autoTimer   = 0;
  private dismissed   = false;
  private completing  = false;   // true during the final fade-out tween

  // ── Action flags (set by GameScene or detected inline, cleared on advance) ──
  private didMove      = false;
  private didAttack    = false;
  private didDodge     = false;
  private didSprint    = false;
  private didMiniMap   = false;
  private didInventory = false;
  private didSkillTree = false;

  // ── UI objects ────────────────────────────────────────────────────────────
  private panel:       Phaser.GameObjects.Rectangle;
  private titleText:   Phaser.GameObjects.Text;
  private bodyText:    Phaser.GameObjects.Text;
  private progressText:Phaser.GameObjects.Text;
  private skipText:    Phaser.GameObjects.Text;
  private checkText:   Phaser.GameObjects.Text;
  private progressBar: Phaser.GameObjects.Rectangle;
  private progressBg:  Phaser.GameObjects.Rectangle;

  // ── Input ─────────────────────────────────────────────────────────────────
  private skipKey: Phaser.Input.Keyboard.Key;
  private mKey:    Phaser.Input.Keyboard.Key;

  constructor(private scene: Phaser.Scene) {
    const cx = PANEL_X + PANEL_W / 2;

    // Background panel
    this.panel = scene.add.rectangle(
      PANEL_X + PANEL_W / 2,
      PANEL_Y + PANEL_H / 2,
      PANEL_W,
      PANEL_H,
      0x000000,
      0.78,
    ).setScrollFactor(0).setDepth(DEPTH);

    // Panel border (drawn via a thin outline rectangle, same position)
    scene.add.rectangle(
      PANEL_X + PANEL_W / 2,
      PANEL_Y + PANEL_H / 2,
      PANEL_W,
      PANEL_H,
    ).setScrollFactor(0).setDepth(DEPTH)
      .setFillStyle(0x000000, 0)
      .setStrokeStyle(0.5, 0x4488cc, 0.7);

    // Progress step counter (top-left)
    this.progressText = scene.add.text(
      PANEL_X + PAD_X,
      PANEL_Y + PAD_Y,
      '',
      { fontSize: '4px', color: '#6699bb', fontFamily: 'monospace' },
    ).setScrollFactor(0).setDepth(DEPTH + 1).setOrigin(0, 0);

    // Step title (centered)
    this.titleText = scene.add.text(
      cx,
      PANEL_Y + PAD_Y,
      '',
      {
        fontSize: '5px',
        color: '#ffdd88',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 1,
      },
    ).setScrollFactor(0).setDepth(DEPTH + 1).setOrigin(0.5, 0);

    // Body instruction text (centered below title)
    this.bodyText = scene.add.text(
      cx,
      PANEL_Y + PAD_Y + 9,
      '',
      {
        fontSize: '4px',
        color: '#dddddd',
        fontFamily: 'monospace',
        wordWrap: { width: PANEL_W - PAD_X * 2 },
        align: 'center',
      },
    ).setScrollFactor(0).setDepth(DEPTH + 1).setOrigin(0.5, 0);

    // Skip hint (bottom-right)
    this.skipText = scene.add.text(
      PANEL_X + PANEL_W - PAD_X,
      PANEL_Y + PANEL_H - PAD_Y,
      '[T] Skip Tutorial',
      { fontSize: '3px', color: '#556677', fontFamily: 'monospace' },
    ).setScrollFactor(0).setDepth(DEPTH + 1).setOrigin(1, 1);

    // Completion check mark (briefly shown when a step completes)
    this.checkText = scene.add.text(
      cx,
      PANEL_Y + PANEL_H / 2,
      '✓',
      {
        fontSize: '14px',
        color: '#44ff88',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
      },
    ).setScrollFactor(0).setDepth(DEPTH + 2).setOrigin(0.5).setAlpha(0);

    // Auto-advance progress bar (bottom edge of panel)
    this.progressBg = scene.add.rectangle(
      PANEL_X + PANEL_W / 2,
      PANEL_Y + PANEL_H - 1,
      PANEL_W,
      2,
      0x223344,
      0.7,
    ).setScrollFactor(0).setDepth(DEPTH + 1);

    this.progressBar = scene.add.rectangle(
      PANEL_X,
      PANEL_Y + PANEL_H - 1,
      0,
      2,
      0x4488cc,
      0.9,
    ).setScrollFactor(0).setDepth(DEPTH + 2).setOrigin(0, 0.5);

    // Input keys
    this.skipKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.mKey    = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.renderStep();
  }

  // ── Notification API (called by GameScene) ─────────────────────────────────

  notifyMoved():           void { this.didMove      = true; }
  notifyAttacked():        void { this.didAttack    = true; }
  notifyDodged():          void { this.didDodge     = true; }
  notifySprinted():        void { this.didSprint    = true; }
  notifyInventoryOpened(): void { this.didInventory = true; }
  notifySkillTreeOpened(): void { this.didSkillTree = true; }

  // ── Update (called every frame) ───────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.dismissed || this.completing) return;

    // Skip key
    if (Phaser.Input.Keyboard.JustDown(this.skipKey)) {
      this.skip();
      return;
    }

    // Detect M key inline (minimap panel doesn't consume it before tutorial runs)
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) this.didMiniMap = true;
    // didInventory and didSkillTree are set via notifyInventoryOpened / notifySkillTreeOpened
    // called from GameScene after panel open detection, to avoid JustDown event consumption.

    const step = STEPS[this.stepIdx];
    let advance = false;

    switch (step.trigger) {
      case 'move':       advance = this.didMove;      break;
      case 'attack':     advance = this.didAttack;    break;
      case 'dodge':      advance = this.didDodge;     break;
      case 'sprint':     advance = this.didSprint;    break;
      case 'minimap':    advance = this.didMiniMap;   break;
      case 'inventory':  advance = this.didInventory; break;
      case 'skill_tree': advance = this.didSkillTree; break;
      case 'auto': {
        this.autoTimer -= delta;
        const total = step.autoDelay ?? 3000;
        const pct   = Math.max(0, 1 - this.autoTimer / total);
        this.progressBar.width = PANEL_W * pct;
        if (this.autoTimer <= 0) advance = true;
        break;
      }
    }

    if (advance) this.advanceStep();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.panel.destroy();
    this.titleText.destroy();
    this.bodyText.destroy();
    this.progressText.destroy();
    this.skipText.destroy();
    this.checkText.destroy();
    this.progressBar.destroy();
    this.progressBg.destroy();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private skip(): void {
    this.completing = true;
    this.scene.tweens.add({
      targets: [
        this.panel, this.titleText, this.bodyText,
        this.progressText, this.skipText, this.checkText,
        this.progressBar, this.progressBg,
      ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.dismissed = true;
        this.destroy();
        this.onComplete?.();
      },
    });
  }

  private advanceStep(): void {
    // Reset flags
    this.didMove      = false;
    this.didAttack    = false;
    this.didDodge     = false;
    this.didSprint    = false;
    this.didMiniMap   = false;
    this.didInventory = false;
    this.didSkillTree = false;

    // Show completion flash
    this.flashCheck();

    this.stepIdx++;
    if (this.stepIdx >= STEPS.length) {
      // All steps done — short delay then dismiss
      this.scene.time.delayedCall(600, () => this.skip());
      return;
    }

    this.renderStep();
  }

  private renderStep(): void {
    const step = STEPS[this.stepIdx];
    this.titleText.setText(step.title);
    this.bodyText.setText(step.instruction);
    this.progressText.setText(`Step ${this.stepIdx + 1} / ${STEPS.length}`);

    // Reset auto-advance progress bar
    this.progressBar.width = 0;
    if (step.trigger === 'auto') {
      this.autoTimer = step.autoDelay ?? 3000;
    } else {
      // Hide progress bar for action-triggered steps
      this.progressBar.width = 0;
    }
  }

  private flashCheck(): void {
    this.checkText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.checkText,
      alpha:   0,
      scaleX:  2,
      scaleY:  2,
      duration: 500,
      ease:    'Power2',
      onComplete: () => {
        this.checkText.setScale(1);
      },
    });
  }
}
