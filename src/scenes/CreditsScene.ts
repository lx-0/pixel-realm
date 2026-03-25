import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

/**
 * CreditsScene — end-game credits with scrolling text.
 * Reached after completing the final zone.
 */
export class CreditsScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.CREDITS);
  }

  create(): void {
    this.sfx = SoundManager.getInstance();
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x05050f);

    // Golden particle rain
    this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: CANVAS.WIDTH },
      y: CANVAS.HEIGHT + 4,
      speedY: { min: -12, max: -4 },
      speedX: { min: -2, max: 2 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 6000, max: 10000 },
      tint: [0xffd700, 0xffe040, 0xffaa00, 0xffffff],
      alpha: { start: 0.6, end: 0 },
      frequency: 250,
      quantity: 1,
    }).setDepth(1);

    // ── Congratulations banner ──────────────────────────────────────────────
    const banner = this.add.text(cx, cy - 72, '✦  YOU HAVE CONQUERED  ✦', {
      fontSize: '8px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.add.text(cx, cy - 58, 'PixelRealm', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setAlpha(0)
      .setAlpha(1); // will fade in via tweens below — reassign alpha properly

    // re-do with proper tween:
    const bigTitle = this.add.text(cx, cy - 58, 'PixelRealm', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({ targets: banner,   alpha: 1, duration: 800, delay: 200, ease: 'Power2' });
    this.tweens.add({ targets: bigTitle, alpha: 1, duration: 800, delay: 600, ease: 'Power2' });

    // ── Scrolling credits ───────────────────────────────────────────────────
    const creditsLines = [
      '',
      '',
      '— CREDITS —',
      '',
      'Game Design',
      'PixelForge Studios',
      '',
      'Lore & Level Design',
      'PixelForge Studios',
      '',
      'Programming',
      'PixelForge Studios',
      '',
      'Art Direction',
      'PixelForge Studios',
      '',
      'Sound Design',
      'PixelForge Studios',
      '',
      '— ZONES —',
      '',
      'Zone 1: Verdant Hollow',
      'Zone 2: Dusty Trail',
      'Zone 3: Ironveil Ruins',
      'Zone 4: Saltmarsh Harbor',
      'Zone 5: Ice Caverns',
      'Zone 6: Volcanic Highlands',
      'Zone 7: Shadowmire Swamp',
      'Zone 8: Frostpeak Highlands',
      'Zone 9: Celestial Spire',
      'Zone 10: Abyssal Depths',
      'Zone 11: Dragonbone Wastes',
      'Zone 12: Void Sanctum',
      'Zone 13: Eclipsed Throne',
      'Zone 14: Shattered Dominion',
      'Zone 15: Primordial Core',
      'Zone 16: Ethereal Nexus',
      'Zone 17: Twilight Citadel',
      'Zone 18: Oblivion Spire',
      'Zone 19: Astral Pinnacle',
      '',
      '— BOSSES —',
      '',
      'Slime King',
      'Bandit Chief Korran',
      'Archon Thessar',
      'Maw of the Deep',
      'Glacial Wyrm Vorthex',
      'Infernal Warden',
      'Mire Queen',
      'Frost Titan',
      'Celestial Arbiter',
      'Abyssal Kraken Lord',
      'Ancient Dracolich',
      'Void Architect',
      'The Eclipsed King',
      'The Unmaker',
      'The Genesis Flame',
      'The Nexus Overseer',
      'The Twilight Warden',
      'The Spire Keeper',
      'The Astral Sovereign',
      '',
      '',
      'Thank you for playing!',
      '',
      '✦  PixelRealm v1.0.0-rc1  ✦',
      '',
      '',
    ];

    const lineH = 8;
    const startY = cy + 20;
    const endY = startY - creditsLines.length * lineH - 60;

    const BOSS_NAMES = new Set([
      'Slime King', 'Bandit Chief Korran', 'Archon Thessar', 'Maw of the Deep',
      'Glacial Wyrm Vorthex', 'Infernal Warden', 'Mire Queen', 'Frost Titan',
      'Celestial Arbiter', 'Abyssal Kraken Lord', 'Ancient Dracolich', 'Void Architect',
      'The Eclipsed King', 'The Unmaker', 'The Genesis Flame', 'The Nexus Overseer',
      'The Twilight Warden', 'The Spire Keeper', 'The Astral Sovereign',
    ]);
    const creditsContainer = this.add.container(cx, startY);
    creditsLines.forEach((line, i) => {
      const isHeader = line.startsWith('—');
      const isZone   = line.startsWith('Zone');
      const isBoss   = BOSS_NAMES.has(line);
      const isThank  = line.includes('Thank');
      const isVersion= line.includes('v1.0.0-rc1');

      let color = '#888899';
      let size  = '5px';
      if (isHeader)  { color = '#ffd700'; size = '6px'; }
      if (isZone)    { color = '#aaccff'; }
      if (isBoss)    { color = '#ff8888'; }
      if (isThank)   { color = '#ffffff'; size = '7px'; }
      if (isVersion) { color = '#ffd700'; size = '6px'; }

      const t = this.add.text(0, i * lineH, line, {
        fontSize: size, color, fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 0).setDepth(10);
      creditsContainer.add(t);
    });

    // Scroll tween
    this.tweens.add({
      targets: creditsContainer,
      y: endY,
      duration: creditsLines.length * 420,
      ease: 'Linear',
      delay: 1500,
    });

    // ── Buttons ─────────────────────────────────────────────────────────────
    const menuBtn = this.add.text(cx, CANVAS.HEIGHT - 6, 'Main Menu', {
      fontSize: '6px', color: '#90d0f8', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5, 1).setDepth(20).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => { menuBtn.setColor('#ffffff'); menuBtn.setScale(1.06); });
    menuBtn.on('pointerout',  () => { menuBtn.setColor('#90d0f8'); menuBtn.setScale(1); });
    menuBtn.on('pointerdown', () => this.goMenu());

    this.input.keyboard?.on('keydown-SPACE', () => this.goMenu());
    this.input.keyboard?.on('keydown-ESC',   () => this.goMenu());

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private goMenu(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start(SCENES.MENU));
  }
}
