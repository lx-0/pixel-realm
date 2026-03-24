import Phaser from 'phaser';
import { SCENES } from '../config/constants';
import { SettingsManager } from '../systems/SettingsManager';

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
    this.load.image('tileset_swamp',    'assets/tiles/tilesets/tileset_swamp.png');

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

    // Volcanic Highlands enemies (12 frames × 16×24; boss: 12 frames × 32×32)
    this.load.spritesheet('enemy_lava_slime',  'assets/char_enemy_lava_slime.png',  { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_fire_imp',    'assets/char_enemy_fire_imp.png',    { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_magma_golem', 'assets/char_enemy_magma_golem.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('boss_infernal_warden', 'assets/boss_infernal_warden.png', { frameWidth: 32, frameHeight: 32 });

    // Shadowmire Swamp enemies (12 frames × 16×24; boss phases: 32×32 each)
    this.load.spritesheet('enemy_bog_crawler',  'assets/sprites/enemies/char_enemy_bog_crawler.png',  { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_swamp_wraith', 'assets/sprites/enemies/char_enemy_swamp_wraith.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_toxic_toad',   'assets/sprites/enemies/char_enemy_toxic_toad.png',   { frameWidth: 16, frameHeight: 24 });
    this.load.image('boss_mire_queen_phase1', 'assets/sprites/enemies/bosses/boss_mire_queen_phase1.png');
    this.load.image('boss_mire_queen_phase2', 'assets/sprites/enemies/bosses/boss_mire_queen_phase2.png');
    this.load.image('boss_mire_queen_phase3', 'assets/sprites/enemies/bosses/boss_mire_queen_phase3.png');
    this.load.image('boss_mire_queen_idle',   'assets/sprites/enemies/bosses/boss_mire_queen_idle.png');
    this.load.image('boss_mire_queen_attack', 'assets/sprites/enemies/bosses/boss_mire_queen_attack.png');

    // Shadowmire Swamp NPC sprites
    this.load.image('npc_swamp_hermit',       'assets/sprites/characters/char_npc_swamp_hermit.png');
    this.load.image('npc_swamp_potion_seller','assets/sprites/characters/char_npc_swamp_potion_seller.png');
    this.load.image('npc_quest_swamp',        'assets/sprites/characters/char_npc_quest_swamp.png');

    // Shadowmire Swamp parallax layers
    this.load.image('bg_parallax_swamp_far',  'assets/backgrounds/parallax/bg_parallax_swamp_far.png');
    this.load.image('bg_parallax_swamp_mid',  'assets/backgrounds/parallax/bg_parallax_swamp_mid.png');
    this.load.image('bg_parallax_swamp_near', 'assets/backgrounds/parallax/bg_parallax_swamp_near.png');

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

    // Dungeon enemies (12 frames × 16×24; boss: 12 frames × 32×32)
    this.load.spritesheet('enemy_dun_skeleton', 'assets/char_enemy_dun_skeleton.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_dun_spider',   'assets/char_enemy_dun_spider.png',   { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_dun_mage',     'assets/char_enemy_dun_mage.png',     { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('enemy_dun_golem',    'assets/char_enemy_dun_golem.png',    { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('boss_dungeon',       'assets/char_boss_dungeon.png',       { frameWidth: 32, frameHeight: 32 });

    // Dungeon decoration spritesheets (animated)
    this.load.spritesheet('dun_decor_torch',   'assets/sprite_dun_decor_torch.png',   { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('dun_decor_crystal', 'assets/sprite_dun_decor_crystal.png', { frameWidth: 16, frameHeight: 16 });

    // Dungeon decoration sprites (static)
    this.load.image('dun_decor_rubble', 'assets/sprite_dun_decor_rubble.png');
    this.load.image('dun_decor_barrel', 'assets/sprite_dun_decor_barrel.png');
    this.load.image('dun_decor_bones',  'assets/sprite_dun_decor_bones.png');

    // Dungeon loot icons (16×16)
    this.load.image('loot_shadow_blade', 'assets/icon_dun_loot_shadow_blade.png');
    this.load.image('loot_cursed_helm',  'assets/icon_dun_loot_cursed_helm.png');
    this.load.image('loot_soul_gem',     'assets/icon_dun_loot_soul_gem.png');
    this.load.image('loot_bone_shield',  'assets/icon_dun_loot_bone_shield.png');
    this.load.image('loot_dark_staff',   'assets/icon_dun_loot_dark_staff.png');
    this.load.image('loot_crypt_ring',   'assets/icon_dun_loot_crypt_ring.png');

    // Dungeon UI panels & HUD
    this.load.image('ui_panel_dungeon_entrance', 'assets/ui_panel_dungeon_entrance.png');
    this.load.image('ui_dungeon_room_progress',  'assets/ui_dungeon_room_progress.png');
    this.load.image('ui_dungeon_boss_hp_frame',  'assets/ui_dungeon_boss_hp_frame.png');
    this.load.image('ui_dungeon_timer',          'assets/ui_dungeon_timer.png');

    // Boss chamber background
    this.load.image('bg_boss_chamber', 'assets/bg_boss_chamber.png');

    // Additional UI elements
    this.load.image('ui_btn',        'assets/ui_btn.png');
    this.load.image('ui_cursor',     'assets/ui_cursor.png');
    this.load.image('ui_icon_skill', 'assets/ui_icon_skill.png');
    this.load.image('ui_slot',       'assets/ui_slot.png');

    // Skill tree UI assets
    this.load.image('ui_skill_tree_panel_bg',   'assets/ui/skill_tree/ui_skill_tree_panel_bg.png');
    this.load.image('ui_skill_node_unlocked',    'assets/ui/skill_tree/ui_skill_node_unlocked.png');
    this.load.image('ui_skill_node_available',   'assets/ui/skill_tree/ui_skill_node_available.png');
    this.load.image('ui_skill_node_locked',      'assets/ui/skill_tree/ui_skill_node_locked.png');
    this.load.image('ui_skill_connector_h',      'assets/ui/skill_tree/ui_skill_connector_h.png');
    this.load.image('ui_skill_connector_v',      'assets/ui/skill_tree/ui_skill_connector_v.png');
    this.load.image('ui_skill_point_pip',        'assets/ui/skill_tree/ui_skill_point_pip.png');
    this.load.image('ui_skill_point_pip_empty',  'assets/ui/skill_tree/ui_skill_point_pip_empty.png');
    this.load.image('ui_archetype_badge_warrior', 'assets/ui/skill_tree/ui_archetype_badge_warrior.png');
    this.load.image('ui_archetype_badge_mage',    'assets/ui/skill_tree/ui_archetype_badge_mage.png');
    this.load.image('ui_archetype_badge_ranger',  'assets/ui/skill_tree/ui_archetype_badge_ranger.png');

    // Crafting station spritesheets (4 frames × 32×32 = 128×32)
    this.load.spritesheet('station_anvil',          'assets/station_anvil.png',          { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('station_alchemy_table',  'assets/station_alchemy_table.png',  { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('station_workbench',      'assets/station_workbench.png',      { frameWidth: 32, frameHeight: 32 });

    // Crafting material icons (16×16)
    this.load.image('icon_mat_iron_ore',     'assets/icon_mat_iron_ore.png');
    this.load.image('icon_mat_gold_ore',     'assets/icon_mat_gold_ore.png');
    this.load.image('icon_mat_crystal',      'assets/icon_mat_crystal.png');
    this.load.image('icon_mat_herb_green',   'assets/icon_mat_herb_green.png');
    this.load.image('icon_mat_herb_red',     'assets/icon_mat_herb_red.png');
    this.load.image('icon_mat_herb_blue',    'assets/icon_mat_herb_blue.png');
    this.load.image('icon_mat_gem_ruby',     'assets/icon_mat_gem_ruby.png');
    this.load.image('icon_mat_gem_sapphire', 'assets/icon_mat_gem_sapphire.png');
    this.load.image('icon_mat_gem_emerald',  'assets/icon_mat_gem_emerald.png');
    this.load.image('icon_mat_leather',      'assets/icon_mat_leather.png');
    this.load.image('icon_mat_wood',         'assets/icon_mat_wood.png');
    this.load.image('icon_mat_cloth',        'assets/icon_mat_cloth.png');
    this.load.image('icon_mat_bone',         'assets/icon_mat_bone.png');
    this.load.image('icon_mat_feather',      'assets/icon_mat_feather.png');
    this.load.image('icon_mat_venom',        'assets/icon_mat_venom.png');
    this.load.image('icon_mat_coal',         'assets/icon_mat_coal.png');
    this.load.image('icon_mat_moonstone',    'assets/icon_mat_moonstone.png');

    // Crafted item icons (16×16)
    this.load.image('icon_craft_iron_sword',    'assets/icon_craft_iron_sword.png');
    this.load.image('icon_craft_gold_ring',     'assets/icon_craft_gold_ring.png');
    this.load.image('icon_craft_leather_armor', 'assets/icon_craft_leather_armor.png');
    this.load.image('icon_craft_wooden_shield', 'assets/icon_craft_wooden_shield.png');
    this.load.image('icon_craft_health_potion', 'assets/icon_craft_health_potion.png');
    this.load.image('icon_craft_mana_potion',   'assets/icon_craft_mana_potion.png');
    this.load.image('icon_craft_fire_scroll',   'assets/icon_craft_fire_scroll.png');
    this.load.image('icon_craft_iron_helm',     'assets/icon_craft_iron_helm.png');
    this.load.image('icon_craft_bow',           'assets/icon_craft_bow.png');
    this.load.image('icon_craft_pickaxe',       'assets/icon_craft_pickaxe.png');
    this.load.image('icon_craft_staff',         'assets/icon_craft_staff.png');
    this.load.image('icon_craft_boots',         'assets/icon_craft_boots.png');

    // Crafting UI panel
    this.load.image('ui_panel_crafting', 'assets/ui_panel_crafting.png');

    // PvP Arena tilesets (16 tiles × 16×16 = 256×16)
    this.load.image('tileset_arena_gladiator', 'assets/tileset_arena_gladiator.png');
    this.load.image('tileset_arena_shadow',    'assets/tileset_arena_shadow.png');

    // Arena UI panels
    this.load.image('ui_panel_arena_queue',   'assets/ui_panel_arena_queue.png');
    this.load.image('ui_arena_hud',           'assets/ui_arena_hud.png');
    this.load.image('ui_panel_arena_results', 'assets/ui_panel_arena_results.png');

    // Arena rank tier icons (16×16)
    this.load.image('icon_rank_arena_bronze',   'assets/icon_rank_arena_bronze.png');
    this.load.image('icon_rank_arena_silver',   'assets/icon_rank_arena_silver.png');
    this.load.image('icon_rank_arena_gold',     'assets/icon_rank_arena_gold.png');
    this.load.image('icon_rank_arena_platinum', 'assets/icon_rank_arena_platinum.png');
    this.load.image('icon_rank_arena_diamond',  'assets/icon_rank_arena_diamond.png');

    // Arena leaderboard panel
    this.load.image('ui_panel_arena_leaderboard', 'assets/ui_panel_arena_leaderboard.png');

    // Arena spectator overlay
    this.load.image('ui_arena_spectator', 'assets/ui_arena_spectator.png');

    // Arena victory/defeat splash screens (320×180)
    this.load.image('bg_arena_victory', 'assets/bg_arena_victory.png');
    this.load.image('bg_arena_defeat',  'assets/bg_arena_defeat.png');

    // Crafting progress bar (8 frames × 80×10 = 640×10)
    this.load.spritesheet('ui_craft_progress', 'assets/ui_craft_progress.png', { frameWidth: 80, frameHeight: 10 });

    // Craft result VFX (6 frames × 32×32 = 192×32)
    this.load.spritesheet('vfx_craft_success', 'assets/vfx_craft_success.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vfx_craft_failure', 'assets/vfx_craft_failure.png', { frameWidth: 32, frameHeight: 32 });

    // Player housing tilesets (16 tiles × 16×16 = 256×16)
    this.load.image('tileset_house_cottage',  'assets/tileset_house_cottage.png');
    this.load.image('tileset_house_manor',    'assets/tileset_house_manor.png');
    this.load.image('tileset_house_interior', 'assets/tileset_house_interior.png');

    // Housing furniture sprites (16×16)
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

    // Housing decoration sprites (16×16)
    this.load.image('decor_painting', 'assets/sprite_decor_painting.png');
    this.load.image('decor_plant',    'assets/sprite_decor_plant.png');
    this.load.image('decor_trophy',   'assets/sprite_decor_trophy.png');
    this.load.image('decor_pet_bed',  'assets/sprite_decor_pet_bed.png');
    this.load.image('decor_banner',   'assets/sprite_decor_banner.png');
    this.load.image('decor_candles',  'assets/sprite_decor_candles.png');

    // Housing UI
    this.load.image('ui_panel_housing',       'assets/ui/housing/ui_panel_housing.png');
    this.load.image('icon_land_deed',         'assets/ui/housing/icon_land_deed.png');
    this.load.image('ui_house_preview_frame', 'assets/ui/housing/ui_house_preview_frame.png');

    // Land plot markers (16×16)
    this.load.image('plot_boundary', 'assets/sprite_plot_boundary.png');
    this.load.image('plot_for_sale', 'assets/sprite_plot_for_sale.png');
    this.load.image('plot_flag',     'assets/sprite_plot_flag.png');

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

    // Volcanic Highlands enemy animations
    if (this.textures.get('enemy_lava_slime').frameTotal > 1) {
      this.createVariantAnims('enemy_lava_slime', 'lava_slime');
    }
    if (this.textures.get('enemy_fire_imp').frameTotal > 1) {
      this.createVariantAnims('enemy_fire_imp', 'fire_imp');
    }
    if (this.textures.get('enemy_magma_golem').frameTotal > 1) {
      this.createVariantAnims('enemy_magma_golem', 'magma_golem');
    }
    if (this.textures.get('boss_infernal_warden').frameTotal > 1) {
      this.createVariantAnims('boss_infernal_warden', 'infernal_warden');
    }

    // Shadowmire Swamp enemy animations
    if (this.textures.get('enemy_bog_crawler').frameTotal > 1) {
      this.createVariantAnims('enemy_bog_crawler', 'bog_crawler');
    }
    if (this.textures.get('enemy_swamp_wraith').frameTotal > 1) {
      this.createVariantAnims('enemy_swamp_wraith', 'swamp_wraith');
    }
    if (this.textures.get('enemy_toxic_toad').frameTotal > 1) {
      this.createVariantAnims('enemy_toxic_toad', 'toxic_toad');
    }

    // Dungeon enemy animations
    if (this.textures.get('enemy_dun_skeleton').frameTotal > 1) {
      this.createVariantAnims('enemy_dun_skeleton', 'dun_skeleton');
    }
    if (this.textures.get('enemy_dun_spider').frameTotal > 1) {
      this.createVariantAnims('enemy_dun_spider', 'dun_spider');
    }
    if (this.textures.get('enemy_dun_mage').frameTotal > 1) {
      this.createVariantAnims('enemy_dun_mage', 'dun_mage');
    }
    if (this.textures.get('enemy_dun_golem').frameTotal > 1) {
      this.createVariantAnims('enemy_dun_golem', 'dun_golem');
    }
    if (this.textures.get('boss_dungeon').frameTotal > 1) {
      this.createVariantAnims('boss_dungeon', 'dungeon_boss');
    }

    // Dungeon decoration animations (4 frames @ 3fps ambient loops)
    this.createStationAnims('dun_decor_torch', 'dun_torch');
    this.createStationAnims('dun_decor_crystal', 'dun_crystal');

    // Crafting station idle glow animations (4 frames @ 3fps for slow ambient loop)
    this.createStationAnims('station_anvil', 'anvil');
    this.createStationAnims('station_alchemy_table', 'alchemy_table');
    this.createStationAnims('station_workbench', 'workbench');

    // Craft result VFX animations (6 frames)
    if (this.textures.get('vfx_craft_success').frameTotal > 1) {
      this.anims.create({ key: 'vfx-craft-success', frames: this.anims.generateFrameNumbers('vfx_craft_success', { start: 0, end: 5 }), frameRate: 12, repeat: 0 });
    }
    if (this.textures.get('vfx_craft_failure').frameTotal > 1) {
      this.anims.create({ key: 'vfx-craft-failure', frames: this.anims.generateFrameNumbers('vfx_craft_failure', { start: 0, end: 5 }), frameRate: 12, repeat: 0 });
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

  /** Register idle/walk/attack/death animations for a named enemy variant spritesheet. */
  private createVariantAnims(textureKey: string, name: string): void {
    const a = this.anims;
    if (!a.exists(`${name}-idle`))   a.create({ key: `${name}-idle`,   frames: a.generateFrameNumbers(textureKey, { start: 0,  end: 1  }), frameRate: 4,  repeat: -1 });
    if (!a.exists(`${name}-walk`))   a.create({ key: `${name}-walk`,   frames: a.generateFrameNumbers(textureKey, { start: 2,  end: 5  }), frameRate: 10, repeat: -1 });
    if (!a.exists(`${name}-attack`)) a.create({ key: `${name}-attack`, frames: a.generateFrameNumbers(textureKey, { start: 6,  end: 9  }), frameRate: 14, repeat: 0  });
    if (!a.exists(`${name}-death`))  a.create({ key: `${name}-death`,  frames: a.generateFrameNumbers(textureKey, { start: 10, end: 11 }), frameRate: 6,  repeat: 0  });
  }

  /** Register idle glow animation for a crafting station spritesheet. */
  private createStationAnims(textureKey: string, name: string): void {
    if (this.textures.get(textureKey).frameTotal > 1) {
      const a = this.anims;
      if (!a.exists(`${name}-idle`)) {
        a.create({ key: `${name}-idle`, frames: a.generateFrameNumbers(textureKey, { start: 0, end: 3 }), frameRate: 3, repeat: -1 });
      }
    }
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
