/**
 * SkillTreePanel — in-game skill tree allocation UI.
 *
 * Press K to toggle open/close.
 * Shows the player's class archetypes, unlocked skills, available skill points,
 * and lets them spend points or respec.
 *
 * Layout (within 320×180 canvas, scroll-factor 0):
 *   - Panel bg: 260×160 centred
 *   - Header: class badge + class name + skill points counter
 *   - 3 columns (one per archetype), 5 skill-node rows each
 *   - Footer: "Respec" button (hold R + confirm)
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import {
  ALL_SKILLS, CLASS_ARCHETYPES, ARCHETYPE_NAMES, CLASS_NAMES,
  type ClassId, type SkillDef,
} from '../config/skills';

// ── Layout constants ──────────────────────────────────────────────────────────

const PANEL_W   = 260;
const PANEL_H   = 162;
const PANEL_X   = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y   = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH     = 72;
const PAD       = 6;
const COL_W     = (PANEL_W - PAD * 2) / 3;
const ROW_H     = 24;
const NODE_SIZE = 14;
const HEADER_H  = 18;


// ── Color palette ─────────────────────────────────────────────────────────────

const COL_BG        = 0x0d0d1a;
const COL_BORDER    = 0x4455aa;
const COL_HEADER    = 0x1a1a33;
const COL_UNLOCKED  = 0x44cc88;
const COL_AVAILABLE = 0xaaaaff;
const COL_LOCKED    = 0x334466;
const COL_ACTIVE    = 0xffe040;
const COL_CONNECTOR = 0x445566;
const COL_WARRIOR   = 0xdd5533;
const COL_MAGE      = 0x7755dd;

const CLASS_COLOR: Record<ClassId, number> = {
  warrior: COL_WARRIOR,
  mage:    COL_MAGE,
};

// ── SkillTreePanel ─────────────────────────────────────────────────────────────

export interface SkillTreeState {
  classId: ClassId;
  unlockedSkills: string[];   // array of skill ids
  skillPoints: number;
  hotbar: string[];           // active skill ids in slots 0-5
}

export class SkillTreePanel {
  private scene:   Phaser.Scene;
  private visible  = false;
  private kKey!:   Phaser.Input.Keyboard.Key;

  private container: Phaser.GameObjects.Container;

  // Current state (updated by GameScene when server syncs)
  private state: SkillTreeState = {
    classId:       'warrior',
    unlockedSkills: [],
    skillPoints:   0,
    hotbar:        [],
  };

  // Callbacks to parent (GameScene)
  public onAllocSkill?:  (skillId: string) => void;
  public onSetHotbar?:   (hotbar: string[]) => void;
  public onRespec?:      () => void;
  public onSetClass?:    (classId: ClassId) => void;

  // Tooltip overlay
  private tooltipContainer: Phaser.GameObjects.Container;
  private tooltipText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.tooltipContainer = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);
    this.kKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.buildTooltip();
    this.rebuild();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this.visible; }

  /** Called by GameScene when server sends updated skill state. */
  updateState(state: SkillTreeState): void {
    this.state = { ...state };
    if (this.visible) this.rebuild();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.kKey)) {
      this.toggle();
    }
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  show(): void {
    this.visible = true;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    this.tooltipContainer.setVisible(false);
  }

  // ── Build / rebuild ────────────────────────────────────────────────────────

  private toggle(): void { this.visible ? this.hide() : this.show(); }

  private rebuild(): void {
    this.container.removeAll(true);

    // ── Panel background ───────────────────────────────────────────────────
    const bg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, PANEL_W, PANEL_H, COL_BG, 0.95,
    ).setStrokeStyle(1, COL_BORDER);
    this.container.add(bg);

    // ── Header ─────────────────────────────────────────────────────────────
    const headerBg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2, PANEL_W, HEADER_H, COL_HEADER, 1,
    );
    this.container.add(headerBg);

    // Class badge
    const classKey  = `ui_archetype_badge_${this.state.classId}`;
    const badgeSize = 12;
    const badgeTex  = this.scene.textures.exists(classKey) ? classKey : 'ui_icon_skill';
    const badge = this.scene.add.image(PANEL_X + PAD + badgeSize / 2, PANEL_Y + HEADER_H / 2, badgeTex)
      .setDisplaySize(badgeSize, badgeSize);
    this.container.add(badge);

    const classColor = `#${CLASS_COLOR[this.state.classId].toString(16).padStart(6, '0')}`;
    this.container.add(this.scene.add.text(
      PANEL_X + PAD + badgeSize + 3, PANEL_Y + HEADER_H / 2,
      `${CLASS_NAMES[this.state.classId]}`,
      { fontSize: '6px', color: classColor, fontFamily: 'monospace' },
    ).setOrigin(0, 0.5));

    // Skill points counter (top right)
    const ptColor = this.state.skillPoints > 0 ? '#ffe040' : '#888888';
    this.container.add(this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + HEADER_H / 2,
      `${this.state.skillPoints} SP`,
      { fontSize: '6px', color: ptColor, fontFamily: 'monospace' },
    ).setOrigin(1, 0.5));

    // Close hint
    this.container.add(this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2,
      `SKILL TREE  [K]`,
      { fontSize: '5px', color: '#aaaaaa', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0.5));

    // ── Archetype columns ──────────────────────────────────────────────────
    const archetypes = CLASS_ARCHETYPES[this.state.classId];
    const unlockedSet = new Set(this.state.unlockedSkills);

    archetypes.forEach((archetypeId, colIdx) => {
      const colX = PANEL_X + PAD + colIdx * COL_W;
      const colCentreX = colX + COL_W / 2;

      // Column header
      const atColor = `#${CLASS_COLOR[this.state.classId].toString(16).padStart(6, '0')}`;
      this.container.add(this.scene.add.text(
        colCentreX, PANEL_Y + HEADER_H + 4,
        ARCHETYPE_NAMES[archetypeId],
        { fontSize: '5px', color: atColor, fontFamily: 'monospace' },
      ).setOrigin(0.5, 0));

      // Skills in this archetype, tier 1 → 5
      const skills = ALL_SKILLS
        .filter(s => s.archetypeId === archetypeId)
        .sort((a, b) => a.tier - b.tier);

      skills.forEach((skill, rowIdx) => {
        const nodeY = PANEL_Y + HEADER_H + 13 + rowIdx * ROW_H;
        const isUnlocked  = unlockedSet.has(skill.id);
        const prereqMet   = !skill.prerequisiteId || unlockedSet.has(skill.prerequisiteId);
        const canAfford   = this.state.skillPoints > 0;
        const canUnlock   = !isUnlocked && prereqMet && canAfford;

        // Connector line to previous node
        if (rowIdx > 0) {
          const prevY = PANEL_Y + HEADER_H + 13 + (rowIdx - 1) * ROW_H;
          const line = this.scene.add.rectangle(
            colCentreX, (prevY + nodeY) / 2,
            1, ROW_H - NODE_SIZE, COL_CONNECTOR,
          );
          this.container.add(line);
        }

        // Node background
        const nodeColor = isUnlocked ? COL_UNLOCKED : canUnlock ? COL_AVAILABLE : COL_LOCKED;
        const nodeBg = this.scene.add.rectangle(
          colCentreX, nodeY, NODE_SIZE, NODE_SIZE, nodeColor, 1,
        ).setStrokeStyle(1, isUnlocked ? COL_ACTIVE : nodeColor);
        this.container.add(nodeBg);

        // Skill type indicator: 'A' = active, 'P' = passive
        const typeLabel = skill.type === 'active' ? 'A' : 'P';
        const typeTxt = this.scene.add.text(
          colCentreX, nodeY,
          typeLabel,
          { fontSize: '5px', color: isUnlocked ? '#000000' : '#aaaaaa', fontFamily: 'monospace', fontStyle: 'bold' },
        ).setOrigin(0.5, 0.5);
        this.container.add(typeTxt);

        // Skill name (to the side of node)
        const nameColor = isUnlocked ? '#ddffdd' : canUnlock ? '#aaaaff' : '#666688';
        const nameTxt = this.scene.add.text(
          colCentreX, nodeY + NODE_SIZE / 2 + 1,
          skill.name,
          { fontSize: '4px', color: nameColor, fontFamily: 'monospace' },
        ).setOrigin(0.5, 0);
        this.container.add(nameTxt);

        // Click to allocate
        if (canUnlock) {
          nodeBg.setInteractive({ useHandCursor: true });
          nodeBg.on('pointerdown', () => {
            this.onAllocSkill?.(skill.id);
          });
          nodeBg.on('pointerover', () => {
            this.showTooltip(skill, colCentreX, nodeY - NODE_SIZE);
          });
          nodeBg.on('pointerout', () => {
            this.tooltipContainer.setVisible(false);
          });
        } else if (isUnlocked) {
          nodeBg.setInteractive({ useHandCursor: false });
          nodeBg.on('pointerover', () => {
            this.showTooltip(skill, colCentreX, nodeY - NODE_SIZE);
          });
          nodeBg.on('pointerout', () => {
            this.tooltipContainer.setVisible(false);
          });
        }
      });
    });

    // ── Hotbar row ─────────────────────────────────────────────────────────
    const hotbarY = PANEL_Y + PANEL_H - 14;
    this.container.add(this.scene.add.text(
      PANEL_X + PAD, hotbarY - 5,
      'HOTBAR  (1-6)',
      { fontSize: '4px', color: '#888888', fontFamily: 'monospace' },
    ));

    for (let slot = 0; slot < 6; slot++) {
      const slotX = PANEL_X + PAD + slot * 18;
      const skillId = this.state.hotbar[slot] ?? '';
      const skillDef = skillId ? ALL_SKILLS.find(s => s.id === skillId) : null;

      const slotBg = this.scene.add.rectangle(slotX + 7, hotbarY, 14, 10, 0x1a1a33)
        .setStrokeStyle(1, 0x445566)
        .setInteractive({ useHandCursor: true });

      this.container.add(slotBg);
      this.container.add(this.scene.add.text(
        slotX + 7, hotbarY - 5,
        `${slot + 1}`,
        { fontSize: '4px', color: '#666688', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0.5));

      if (skillDef) {
        this.container.add(this.scene.add.text(
          slotX + 7, hotbarY,
          skillDef.name.slice(0, 5),
          { fontSize: '3px', color: '#aaddff', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0.5));
      }

      // Click to clear slot
      slotBg.on('pointerdown', () => {
        const newHotbar = [...(this.state.hotbar ?? [])];
        newHotbar[slot] = '';
        while (newHotbar.length > 6) newHotbar.pop();
        this.onSetHotbar?.(newHotbar);
      });
    }

    // ── Respec button ──────────────────────────────────────────────────────
    const respecBg = this.scene.add.rectangle(
      PANEL_X + PANEL_W - PAD - 22, hotbarY, 42, 10, 0x330011,
    ).setStrokeStyle(1, 0x883333).setInteractive({ useHandCursor: true });
    this.container.add(respecBg);
    this.container.add(this.scene.add.text(
      PANEL_X + PANEL_W - PAD - 22, hotbarY,
      'RESPEC',
      { fontSize: '4px', color: '#cc4444', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0.5));
    respecBg.on('pointerdown', () => this.onRespec?.());

    // ── Class switcher (only if 0 skills unlocked) ─────────────────────────
    if (this.state.unlockedSkills.length === 0) {
      const otherClass: ClassId = this.state.classId === 'warrior' ? 'mage' : 'warrior';
      const switchTxt = `→ ${CLASS_NAMES[otherClass]}`;
      const switchBtn = this.scene.add.text(
        PANEL_X + PAD, hotbarY,
        switchTxt,
        { fontSize: '4px', color: '#8888cc', fontFamily: 'monospace' },
      ).setInteractive({ useHandCursor: true });
      switchBtn.on('pointerdown', () => this.onSetClass?.(otherClass));
      this.container.add(switchBtn);
    }
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────

  private buildTooltip(): void {
    const bg = this.scene.add.rectangle(0, 0, 100, 40, 0x000022, 0.95)
      .setStrokeStyle(1, 0x4455aa);
    this.tooltipText = this.scene.add.text(
      0, 0, '',
      { fontSize: '4px', color: '#ddddff', fontFamily: 'monospace', wordWrap: { width: 95 } },
    ).setOrigin(0.5, 0.5);
    this.tooltipContainer.add([bg, this.tooltipText]);
  }

  private showTooltip(skill: SkillDef, x: number, y: number): void {
    const lines: string[] = [`${skill.name}`];

    if (skill.type === 'active') {
      lines.push(`CD: ${((skill.cooldownMs ?? 0) / 1000).toFixed(1)}s  Mana: ${skill.manaCost ?? 0}`);
    } else {
      lines.push('Passive');
      // Show passive stat bonuses
      const pb = skill.passiveBonus;
      if (pb) {
        if (pb.damagePct)           lines.push(`+${Math.round(pb.damagePct * 100)}% damage`);
        if (pb.maxHpFlat)           lines.push(`+${pb.maxHpFlat} max HP`);
        if (pb.maxManaFlat)         lines.push(`+${pb.maxManaFlat} max mana`);
        if (pb.speedPct)            lines.push(`+${Math.round(pb.speedPct * 100)}% move speed`);
        if (pb.critChancePct)       lines.push(`+${Math.round(pb.critChancePct * 100)}% crit chance`);
        if (pb.attackCdReductionPct)lines.push(`-${Math.round(pb.attackCdReductionPct * 100)}% attack CD`);
        if (pb.allCdReductionPct)   lines.push(`-${Math.round(pb.allCdReductionPct * 100)}% all CDs`);
        if (pb.damageReductionPct)  lines.push(`-${Math.round(pb.damageReductionPct * 100)}% dmg taken`);
        if (pb.manaRegenFlat)       lines.push(`+${pb.manaRegenFlat} mana/s`);
        if (pb.healOnKill)          lines.push(`+${pb.healOnKill} HP on kill`);
      }
    }

    lines.push(skill.description);
    const tipText = lines.join('\n');
    this.tooltipText.setText(tipText);

    // Size bg to text
    const tw = Math.max(80, this.tooltipText.width + 10);
    const th = this.tooltipText.height + 8;
    const tipBg = this.tooltipContainer.getAt(0) as Phaser.GameObjects.Rectangle;
    tipBg.setSize(tw, th);

    // Clamp position within canvas
    const tx = Phaser.Math.Clamp(x, tw / 2 + 2, CANVAS.WIDTH - tw / 2 - 2);
    const ty = Phaser.Math.Clamp(y - th / 2 - 4, th / 2 + 2, CANVAS.HEIGHT - th / 2 - 2);
    this.tooltipContainer.setPosition(tx, ty);
    this.tooltipContainer.setVisible(true);
  }
}
