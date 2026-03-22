import Phaser from 'phaser';
import { SCENES } from '../config/constants';

/**
 * BootScene — loads PNG assets from public/assets/ then transitions to Menu.
 * Falls back to procedurally-generated textures for any asset that fails to load.
 * Also generates always-procedural textures ('particle', 'wall') needed for VFX.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload(): void {
    // Spritesheets (animated characters) — horizontal strips
    // player: 14 frames × 16px = 224×24  (idle:0-1, walk:2-5, attack:6-9, death:10-13)
    // enemy : 12 frames × 16px = 192×24  (idle:0-1, walk:2-5, attack:6-9, death:10-11)
    this.load.spritesheet('player', 'assets/char_player_warrior.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy',  'assets/char_enemy_goblin.png',   { frameWidth: 16, frameHeight: 24 });

    // Tiles & pickups
    this.load.image('ground', 'assets/tile_grass_plains.png');
    this.load.image('pickup', 'assets/icon_pickup_xp.png');
    this.load.image('hazard', 'assets/tile_hazard_fire.png');

    // UI elements
    this.load.image('ui_hud_frame', 'assets/ui_hud_frame.png');
    this.load.image('ui_bar_fill',  'assets/ui_bar_fill.png');
    this.load.image('ui_bar_mp',    'assets/ui_bar_mp_fill.png');

    // Parallax background layers
    this.load.image('bg_sky',        'assets/bg_sky.png');
    this.load.image('bg_hills_far',  'assets/bg_hills_far.png');
    this.load.image('bg_hills_near', 'assets/bg_hills_near.png');

    // Ice Caverns parallax layers
    this.load.image('bg_ice_far',  'assets/bg_ice_far.png');
    this.load.image('bg_ice_near', 'assets/bg_ice_near.png');

    // Menu / screen backgrounds
    this.load.image('bg_menu_title', 'assets/bg_menu_title.png');
    this.load.image('bg_options',    'assets/bg_options.png');
    this.load.image('bg_credits',    'assets/bg_credits.png');
    this.load.image('bg_gameover',   'assets/bg_gameover.png');

    // Additional tilesets (biomes)
    this.load.image('tileset_desert',   'assets/tileset_desert.png');
    this.load.image('tileset_ice',      'assets/tileset_ice.png');
    this.load.image('tileset_volcanic', 'assets/tileset_volcanic.png');
    this.load.image('tileset_ocean',    'assets/tileset_ocean.png');
    this.load.image('tileset_dungeon',  'assets/tileset_dungeon.png');
    this.load.image('tileset_town',     'assets/tileset_town.png');

    // Enemy variants (12 frames × 16×24; boss: 12 frames × 32×32)
    this.load.spritesheet('enemy_slime',    'assets/char_enemy_slime.png',    { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_skeleton', 'assets/char_enemy_skeleton.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_orc',      'assets/char_enemy_orc.png',      { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_boss',     'assets/char_enemy_boss.png',     { frameWidth: 32, frameHeight: 32 });

    // Ice Caverns enemies (12 frames × 16×24; boss: 12 frames × 32×32)
    this.load.spritesheet('enemy_ice_elemental', 'assets/char_enemy_ice_elemental.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_frost_wolf',    'assets/char_enemy_frost_wolf.png',    { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_crystal_golem', 'assets/char_enemy_crystal_golem.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('boss_glacial_wyrm',   'assets/char_boss_glacial_wyrm.png',   { frameWidth: 32, frameHeight: 32 });

    // Pickups & collectibles
    this.load.image('pickup_health', 'assets/icon_pickup_health.png');
    this.load.image('pickup_mana',   'assets/icon_pickup_mana.png');
    this.load.image('pickup_coin',   'assets/icon_pickup_coin.png');
    this.load.image('pickup_gem',    'assets/icon_pickup_gem.png');
    this.load.image('pickup_star',   'assets/icon_pickup_star.png');

    // Ice Caverns loot
    this.load.image('pickup_ice_shard',   'assets/icon_pickup_ice_shard.png');
    this.load.image('pickup_frozen_gem',  'assets/icon_pickup_frozen_gem.png');
    this.load.image('pickup_wyrm_scale',  'assets/icon_pickup_wyrm_scale.png');

    // Additional UI elements
    this.load.image('ui_btn',        'assets/ui_btn.png');
    this.load.image('ui_cursor',     'assets/ui_cursor.png');
    this.load.image('ui_icon_skill', 'assets/ui_icon_skill.png');
    this.load.image('ui_slot',       'assets/ui_slot.png');

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
    if (this.textures.get('enemy_slime').frameTotal > 1) {
      this.createVariantAnims('enemy_slime', 'slime');
    }
    if (this.textures.get('enemy_skeleton').frameTotal > 1) {
      this.createVariantAnims('enemy_skeleton', 'skeleton');
    }
    if (this.textures.get('enemy_orc').frameTotal > 1) {
      this.createVariantAnims('enemy_orc', 'orc');
    }
    if (this.textures.get('enemy_boss').frameTotal > 1) {
      this.createVariantAnims('enemy_boss', 'boss');
    }
    if (this.textures.get('enemy_ice_elemental').frameTotal > 1) {
      this.createVariantAnims('enemy_ice_elemental', 'ice_elemental');
    }
    if (this.textures.get('enemy_frost_wolf').frameTotal > 1) {
      this.createVariantAnims('enemy_frost_wolf', 'frost_wolf');
    }
    if (this.textures.get('enemy_crystal_golem').frameTotal > 1) {
      this.createVariantAnims('enemy_crystal_golem', 'crystal_golem');
    }
    if (this.textures.get('boss_glacial_wyrm').frameTotal > 1) {
      this.createVariantAnims('boss_glacial_wyrm', 'glacial_wyrm');
    }

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

  /** Register idle/walk/attack/death animations for a named enemy variant spritesheet. */
  private createVariantAnims(textureKey: string, name: string): void {
    const a = this.anims;
    if (!a.exists(`${name}-idle`))   a.create({ key: `${name}-idle`,   frames: a.generateFrameNumbers(textureKey, { start: 0,  end: 1  }), frameRate: 4,  repeat: -1 });
    if (!a.exists(`${name}-walk`))   a.create({ key: `${name}-walk`,   frames: a.generateFrameNumbers(textureKey, { start: 2,  end: 5  }), frameRate: 10, repeat: -1 });
    if (!a.exists(`${name}-attack`)) a.create({ key: `${name}-attack`, frames: a.generateFrameNumbers(textureKey, { start: 6,  end: 9  }), frameRate: 14, repeat: 0  });
    if (!a.exists(`${name}-death`))  a.create({ key: `${name}-death`,  frames: a.generateFrameNumbers(textureKey, { start: 10, end: 11 }), frameRate: 6,  repeat: 0  });
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
