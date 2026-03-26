import Phaser from 'phaser';
import { SCENES } from '../config/constants';
import { SettingsManager } from '../systems/SettingsManager';
import { DayNightSystem } from '../systems/DayNightSystem';

/**
 * BootScene — loads PNG assets from public/assets/ then transitions to Menu.
 * Falls back to procedurally-generated textures for any asset that fails to load.
 * Also generates always-procedural textures ('particle', 'wall') needed for VFX.
 *
 * Only assets actually referenced by game scenes are loaded here. Zone-specific
 * enemy/boss/NPC/tileset/parallax assets for zones 1-19 are NOT loaded because
 * GameScene renders all enemies using the generic 'enemy' sprite (tinted per type)
 * and builds all zone geometry procedurally from ZoneConfig color values.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload(): void {
    // ── Core sprites ─────────────────────────────────────────────────────────
    // player: 14 frames × 16px = 224×24  (idle:0-1, walk:2-5, attack:6-9, death:10-13)
    // enemy : 12 frames × 16px = 192×24  (idle:0-1, walk:2-5, attack:6-9, death:10-11)
    this.load.spritesheet('player', 'assets/char_player_warrior.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy',  'assets/char_enemy_goblin.png',   { frameWidth: 16, frameHeight: 24 });

    // Pickups used in GameScene
    this.load.image('pickup',      'assets/icon_pickup_xp.png');
    this.load.image('pickup_coin', 'assets/icon_pickup_coin.png');

    // ── Skill tree UI ─────────────────────────────────────────────────────────
    // ui_icon_skill is the fallback badge; archetype badges are used per class
    this.load.image('ui_icon_skill',              'assets/ui_icon_skill.png');
    this.load.image('ui_archetype_badge_warrior', 'assets/ui/skill_tree/ui_archetype_badge_warrior.png');
    this.load.image('ui_archetype_badge_mage',    'assets/ui/skill_tree/ui_archetype_badge_mage.png');
    this.load.image('ui_archetype_badge_ranger',  'assets/ui/skill_tree/ui_archetype_badge_ranger.png');
    this.load.image('ui_archetype_badge_artisan', 'assets/ui/skill_tree/ui_class_emblem_artisan.png');

    // ── PvP Arena ─────────────────────────────────────────────────────────────
    this.load.image('tileset_arena_gladiator',    'assets/tileset_arena_gladiator.png');
    this.load.image('tileset_arena_shadow',       'assets/tileset_arena_shadow.png');
    this.load.image('ui_arena_hud',               'assets/ui_arena_hud.png');
    this.load.image('ui_panel_arena_leaderboard', 'assets/ui_panel_arena_leaderboard.png');
    this.load.image('bg_arena_victory',           'assets/bg_arena_victory.png');
    this.load.image('bg_arena_defeat',            'assets/bg_arena_defeat.png');

    // ── Housing furniture sprites (16×16) ─────────────────────────────────────
    this.load.image('furn_bed',            'assets/sprite_furn_bed.png');
    this.load.image('furn_table',          'assets/sprite_furn_table.png');
    this.load.image('furn_chair',          'assets/sprite_furn_chair.png');
    this.load.image('furn_chest',          'assets/sprite_furn_chest.png');
    this.load.image('furn_shelf',          'assets/sprite_furn_shelf.png');
    this.load.image('furn_rug',            'assets/sprite_furn_rug.png');
    this.load.image('furn_lamp',           'assets/sprite_furn_lamp.png');
    this.load.image('furn_fireplace',      'assets/sprite_furn_fireplace.png');
    this.load.image('furn_crafting_bench', 'assets/sprite_furn_crafting_bench.png');
    this.load.image('furn_cooking_pot',    'assets/sprite_furn_cooking_pot.png');

    // ── Housing decoration sprites (16×16) ────────────────────────────────────
    this.load.image('decor_painting', 'assets/sprite_decor_painting.png');
    this.load.image('decor_plant',    'assets/sprite_decor_plant.png');
    this.load.image('decor_trophy',   'assets/sprite_decor_trophy.png');
    this.load.image('decor_pet_bed',  'assets/sprite_decor_pet_bed.png');
    this.load.image('decor_banner',   'assets/sprite_decor_banner.png');
    this.load.image('decor_candles',  'assets/sprite_decor_candles.png');

    // ── Companion pet sprites (12×12 each) ───────────────────────────────────
    this.load.image('pet_wolf',         'assets/pets/pet_wolf.png');
    this.load.image('pet_hawk',         'assets/pets/pet_hawk.png');
    this.load.image('pet_cat',          'assets/pets/pet_cat.png');
    this.load.image('pet_dragon_whelp', 'assets/pets/pet_dragon_whelp.png');
    this.load.image('pet_wisp',         'assets/pets/pet_wisp.png');
    this.load.image('pet_golem',        'assets/pets/pet_golem.png');

    // ── Day/night cycle HUD icon sheet ────────────────────────────────────────
    DayNightSystem.preload(this);

    this.load.on('loaderror', () => {
      this.generateFallbackTextures();
    });
  }

  create(): void {
    // Ensure all required textures exist (either loaded PNG or fallback)
    this.generateFallbackTextures();

    // Create sprite animations if spritesheets loaded correctly
    if (this.textures.get('player').frameTotal > 1) {
      this.createPlayerAnims();
    }
    if (this.textures.get('enemy').frameTotal > 1) {
      this.createEnemyAnims();
    }

    SettingsManager.getInstance().applyAll();
    this.scene.start(SCENES.MENU);
  }

  // ─── Animations ────────────────────────────────────────────────────────────

  private createPlayerAnims(): void {
    const a = this.anims;
    if (!a.exists('player-idle'))   a.create({ key: 'player-idle',   frames: a.generateFrameNumbers('player', { start: 0,  end: 1  }), frameRate: 6,  repeat: -1 });
    if (!a.exists('player-walk'))   a.create({ key: 'player-walk',   frames: a.generateFrameNumbers('player', { start: 2,  end: 5  }), frameRate: 12, repeat: -1 });
    if (!a.exists('player-attack')) a.create({ key: 'player-attack', frames: a.generateFrameNumbers('player', { start: 6,  end: 9  }), frameRate: 16, repeat: 0  });
    if (!a.exists('player-death'))  a.create({ key: 'player-death',  frames: a.generateFrameNumbers('player', { start: 10, end: 13 }), frameRate: 8,  repeat: 0  });
  }

  private createEnemyAnims(): void {
    const a = this.anims;
    if (!a.exists('enemy-idle'))   a.create({ key: 'enemy-idle',   frames: a.generateFrameNumbers('enemy', { start: 0,  end: 1  }), frameRate: 4,  repeat: -1 });
    if (!a.exists('enemy-walk'))   a.create({ key: 'enemy-walk',   frames: a.generateFrameNumbers('enemy', { start: 2,  end: 5  }), frameRate: 10, repeat: -1 });
    if (!a.exists('enemy-attack')) a.create({ key: 'enemy-attack', frames: a.generateFrameNumbers('enemy', { start: 6,  end: 9  }), frameRate: 14, repeat: 0  });
    if (!a.exists('enemy-death'))  a.create({ key: 'enemy-death',  frames: a.generateFrameNumbers('enemy', { start: 10, end: 11 }), frameRate: 6,  repeat: 0  });
  }

  // ─── Texture generation ───────────────────────────────────────────────────

  private generateFallbackTextures(): void {
    // ── Always-procedural textures ──────────────────────────────────────────

    // Particle dot (used for VFX bursts)
    if (!this.textures.exists('particle')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff);
      g.fillCircle(3, 3, 3);
      g.generateTexture('particle', 6, 6);
      g.destroy();
    }

    // Stone wall tile
    if (!this.textures.exists('wall')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x4a4a4a); g.fillRect(0, 0, 16, 16);
      g.fillStyle(0x2b2b2b);
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 0, 1, 16);
      g.fillStyle(0x6e6e6e);
      g.fillRect(15, 0, 1, 16);
      g.fillRect(0, 15, 16, 1);
      // stone texture dots
      g.fillStyle(0x3a3a3a);
      [[3,4],[8,2],[12,5],[2,9],[7,11],[13,8],[5,13],[10,7]].forEach(([x,y]) => {
        g.fillRect(x, y, 2, 1);
      });
      g.generateTexture('wall', 16, 16);
      g.destroy();
    }

    // ── PNG-fallback textures ────────────────────────────────────────────────

    if (!this.textures.exists('player')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x8b5c2a); g.fillRect(2, 20, 5, 4); g.fillRect(9, 20, 5, 4);
      g.fillStyle(0x1a4a8a); g.fillRect(3, 15, 4, 6);  g.fillRect(9, 15, 4, 6);
      g.fillStyle(0xa87000); g.fillRect(2, 14, 11, 1);
      g.fillStyle(0x50a8e8); g.fillRect(2, 7, 12, 7);
      g.fillStyle(0xc8c8c8); g.fillRect(4, 1, 7, 6);
      g.fillStyle(0x0d0d0d); g.fillRect(5, 4, 1, 1); g.fillRect(8, 4, 1, 1);
      g.lineStyle(1, 0x0d0d0d);
      g.strokeRect(4, 1, 7, 6);
      g.strokeRect(2, 7, 12, 7);
      g.generateTexture('player', 16, 24);
      g.destroy();
    }

    if (!this.textures.exists('enemy')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x5a0a0a); g.fillRect(2, 20, 5, 4); g.fillRect(9, 20, 5, 4);
      g.fillStyle(0xa01010); g.fillRect(3, 15, 4, 6);  g.fillRect(9, 15, 4, 6);
      g.fillStyle(0xd42020); g.fillRect(1, 8, 13, 7);
      g.fillStyle(0xf06020); g.fillRect(2, 10, 2, 2);  g.fillRect(11, 10, 2, 2);
      g.fillStyle(0xd42020); g.fillRect(3, 3, 9, 6);
      g.fillStyle(0x5a0a0a); g.fillRect(3, 1, 2, 3);   g.fillRect(10, 1, 2, 3);
      g.fillStyle(0x0d0d0d); g.fillRect(5, 5, 1, 1);   g.fillRect(9, 5, 1, 1);
      g.lineStyle(1, 0x0d0d0d);
      g.strokeRect(3, 3, 9, 6);
      g.strokeRect(1, 8, 13, 7);
      g.generateTexture('enemy', 16, 24);
      g.destroy();
    }

    if (!this.textures.exists('ground')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x4c9b4c); g.fillRect(0, 0, 16, 3);
      g.fillStyle(0x78c878); g.fillRect(0, 0, 16, 2);
      g.fillStyle(0x8b5c2a); g.fillRect(0, 3, 16, 13);
      g.fillStyle(0x3b2010);
      [[2,5],[6,7],[10,5],[4,10],[12,9],[8,13],[1,12],[14,6]].forEach(([x,y]) => {
        g.fillRect(x, y, 2, 1);
      });
      g.generateTexture('ground', 16, 16);
      g.destroy();
    }

    if (!this.textures.exists('pickup')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xe8b800); g.fillCircle(8, 8, 5);
      g.fillStyle(0xffe040); g.fillCircle(6, 6, 2);
      g.fillStyle(0xffffff); g.fillRect(5, 5, 1, 1);
      g.generateTexture('pickup', 16, 16);
      g.destroy();
    }

    // Pet fallback textures (colored circles used when PNG assets are missing)
    const petFallbacks: Array<[string, number]> = [
      ['pet_wolf',         0xd4a860],
      ['pet_hawk',         0xa0c0f0],
      ['pet_cat',          0xf0c0a0],
      ['pet_dragon_whelp', 0xff6060],
      ['pet_wisp',         0x80ffff],
      ['pet_golem',        0xa0a0a0],
    ];
    for (const [key, color] of petFallbacks) {
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(color); g.fillCircle(6, 6, 5);
        g.fillStyle(0xffffff, 0.3); g.fillCircle(4, 4, 2);
        g.generateTexture(key, 12, 12);
        g.destroy();
      }
    }

    if (!this.textures.exists('hazard')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x2b2b2b); g.fillRect(0, 9, 16, 7);
      g.fillStyle(0xf06020); g.fillRect(0, 4, 16, 6);
      g.fillStyle(0xffe040);
      g.fillRect(3, 2, 2, 4);
      g.fillRect(8, 1, 2, 5);
      g.fillRect(12, 2, 2, 4);
      g.fillStyle(0xffffff);
      g.fillRect(4, 2, 1, 2);
      g.fillRect(9, 1, 1, 2);
      g.fillStyle(0x5a0a0a);
      [[2,11],[6,10],[10,12],[14,11],[4,14],[9,13]].forEach(([x,y]) => {
        g.fillRect(x, y, 2, 1);
      });
      g.generateTexture('hazard', 16, 16);
      g.destroy();
    }
  }
}
