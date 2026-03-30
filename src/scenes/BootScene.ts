import Phaser from 'phaser';
import { SCENES, ZONES } from '../config/constants';
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

    // ── World map + waystone navigation ───────────────────────────────────────
    this.load.image('worldmap_bg',                 'assets/worldmap/worldmap_bg.png');
    this.load.image('waystone_inactive',            'assets/worldmap/waystone_inactive.png');
    this.load.image('waystone_active',              'assets/worldmap/waystone_active.png');
    this.load.spritesheet('waystone_teleport',      'assets/worldmap/waystone_teleport.png',  { frameWidth: 16, frameHeight: 16 });
    // Zone biome icons (16×16)
    this.load.image('icon_zone_forest',             'assets/worldmap/icon_zone_forest.png');
    this.load.image('icon_zone_desert',             'assets/worldmap/icon_zone_desert.png');
    this.load.image('icon_zone_dungeon',            'assets/worldmap/icon_zone_dungeon.png');
    this.load.image('icon_zone_ocean',              'assets/worldmap/icon_zone_ocean.png');
    this.load.image('icon_zone_ice',                'assets/worldmap/icon_zone_ice.png');
    this.load.image('icon_zone_volcanic',           'assets/worldmap/icon_zone_volcanic.png');
    this.load.image('icon_zone_swamp',              'assets/worldmap/icon_zone_swamp.png');
    this.load.image('icon_zone_astral',             'assets/worldmap/icon_zone_astral.png');
    this.load.image('icon_zone_eclipsed',           'assets/worldmap/icon_zone_eclipsed.png');
    this.load.image('icon_zone_ethereal',           'assets/worldmap/icon_zone_ethereal.png');
    this.load.image('icon_zone_oblivion',           'assets/worldmap/icon_zone_oblivion.png');
    // Fast-travel panel + buttons (160×96 panel, 48×16 buttons)
    this.load.image('ui_panel_fasttravel',          'assets/worldmap/ui_panel_fasttravel.png');
    this.load.image('ui_btn_fasttravel',            'assets/worldmap/ui_btn_fasttravel.png');
    this.load.image('ui_btn_fasttravel_disabled',   'assets/worldmap/ui_btn_fasttravel_disabled.png');
    // Fog-of-war tiles (16×16)
    this.load.image('fog_tile',                     'assets/worldmap/fog_tile.png');
    this.load.image('fog_edge_n',                   'assets/worldmap/fog_edge_n.png');
    this.load.image('fog_edge_s',                   'assets/worldmap/fog_edge_s.png');
    this.load.image('fog_edge_e',                   'assets/worldmap/fog_edge_e.png');
    this.load.image('fog_edge_w',                   'assets/worldmap/fog_edge_w.png');
    this.load.image('fog_corner_ne',                'assets/worldmap/fog_corner_ne.png');
    this.load.image('fog_corner_nw',                'assets/worldmap/fog_corner_nw.png');
    this.load.image('fog_corner_se',                'assets/worldmap/fog_corner_se.png');
    this.load.image('fog_corner_sw',                'assets/worldmap/fog_corner_sw.png');
    // Markers (16×16 static; 96×16 animated 6-frame)
    this.load.image('marker_player',                'assets/worldmap/marker_player.png');
    this.load.spritesheet('marker_player_anim',     'assets/worldmap/marker_player_anim.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('marker_path',                  'assets/worldmap/marker_path.png');
    this.load.image('marker_path_arrow',            'assets/worldmap/marker_path_arrow.png');
    this.load.image('marker_quest',                 'assets/worldmap/marker_quest.png');

    // ── Housing system ────────────────────────────────────────────────────────
    this.load.image('sprite_house_cottage',    'assets/sprites/housing/sprite_house_cottage.png');
    this.load.image('sprite_house_manor',      'assets/sprites/housing/sprite_house_manor.png');
    this.load.image('sprite_house_estate',     'assets/sprites/housing/sprite_house_estate.png');
    this.load.image('sprite_housing_portal',   'assets/sprites/housing/sprite_housing_portal.png');
    this.load.image('sprite_plot_for_sale',    'assets/sprites/housing/sprite_plot_for_sale.png');
    this.load.image('ui_panel_housing',        'assets/ui/housing/ui_panel_housing.png');
    this.load.image('ui_panel_house_selector', 'assets/ui/housing/ui_panel_house_selector.png');
    this.load.image('icon_land_deed',          'assets/ui/housing/icon_land_deed.png');

    // ── Mount system ──────────────────────────────────────────────────────────
    // Mount world sprites (24×24 rideable mounts in game world)
    this.load.image('mount_war_horse',     'assets/sprites/mounts/mount_war_horse.png');
    this.load.image('mount_shadow_wolf',   'assets/sprites/mounts/mount_shadow_wolf.png');
    this.load.image('mount_desert_raptor', 'assets/sprites/mounts/mount_desert_raptor.png');
    this.load.image('mount_frost_elk',     'assets/sprites/mounts/mount_frost_elk.png');
    this.load.image('mount_crystal_drake', 'assets/sprites/mounts/mount_crystal_drake.png');
    this.load.image('mount_mech_golem',    'assets/sprites/mounts/mount_mech_golem.png');
    // Mount skin variants (PIX-418)
    this.load.image('mount_war_horse_golden',      'assets/sprites/mounts/mount_war_horse_golden.png');
    this.load.image('mount_shadow_wolf_frost',     'assets/sprites/mounts/mount_shadow_wolf_frost.png');
    this.load.image('mount_crystal_drake_fire',    'assets/sprites/mounts/mount_crystal_drake_fire.png');
    this.load.image('mount_frost_elk_verdant',     'assets/sprites/mounts/mount_frost_elk_verdant.png');
    // Stable building and stablemaster NPC
    this.load.image('sprite_stable_building', 'assets/sprites/mounts/sprite_stable_building.png');
    this.load.image('char_npc_stablemaster',  'assets/sprites/mounts/char_npc_stablemaster.png');
    // Mount collection panel background
    this.load.image('ui_panel_mount_collection', 'assets/ui/mounts/ui_panel_mount_collection.png');
    // Mount icons (16×16)
    this.load.image('icon_mount_war_horse',     'assets/ui/mounts/icon_mount_war_horse.png');
    this.load.image('icon_mount_shadow_wolf',   'assets/ui/mounts/icon_mount_shadow_wolf.png');
    this.load.image('icon_mount_desert_raptor', 'assets/ui/mounts/icon_mount_desert_raptor.png');
    this.load.image('icon_mount_frost_elk',     'assets/ui/mounts/icon_mount_frost_elk.png');
    this.load.image('icon_mount_crystal_drake', 'assets/ui/mounts/icon_mount_crystal_drake.png');
    this.load.image('icon_mount_mech_golem',    'assets/ui/mounts/icon_mount_mech_golem.png');
    // Mount UI elements
    this.load.image('ui_glow_border_common',    'assets/ui/mounts/ui_glow_border_common.png');
    this.load.image('ui_glow_border_rare',      'assets/ui/mounts/ui_glow_border_rare.png');
    this.load.image('ui_glow_border_epic',      'assets/ui/mounts/ui_glow_border_epic.png');
    this.load.image('ui_glow_border_legendary', 'assets/ui/mounts/ui_glow_border_legendary.png');
    this.load.image('ui_button_mount_summon',   'assets/ui/mounts/ui_button_mount_summon.png');
    this.load.image('ui_button_mount_dismiss',  'assets/ui/mounts/ui_button_mount_dismiss.png');

    // ── Cosmetic shop (PIX-338 art set) ──────────────────────────────────────
    // Shop UI panels
    this.load.image('ui_panel_cosmetic_shop',  'assets/ui/cosmetic_shop/ui_panel_cosmetic_shop.png');
    this.load.image('ui_fitting_room_bg',      'assets/ui/cosmetic_shop/ui_fitting_room_bg.png');
    this.load.image('ui_dye_palette_panel',    'assets/ui/cosmetic_shop/ui_dye_palette_panel.png');
    this.load.image('ui_purchase_confirm',     'assets/ui/cosmetic_shop/ui_purchase_confirm.png');
    // Category icons
    this.load.image('icon_category_aura',        'assets/ui/cosmetic_shop/icon_category_aura.png');
    this.load.image('icon_category_head',         'assets/ui/cosmetic_shop/icon_category_head.png');
    this.load.image('icon_category_back',         'assets/ui/cosmetic_shop/icon_category_back.png');
    this.load.image('icon_category_chest',        'assets/ui/cosmetic_shop/icon_category_chest.png');
    this.load.image('icon_category_weapon_skin',  'assets/ui/cosmetic_shop/icon_category_weapon_skin.png');
    // Stylist NPC sprite
    this.load.image('char_npc_stylist', 'assets/sprites/characters/char_npc_stylist.png');
    // Cosmetic overlays (outfit, hat, aura, cloak, wings)
    this.load.image('aura_flame',   'assets/cosmetics/aura_flame.png');
    this.load.image('aura_frost',   'assets/cosmetics/aura_frost.png');
    this.load.image('aura_holy',    'assets/cosmetics/aura_holy.png');
    this.load.image('aura_shadow',  'assets/cosmetics/aura_shadow.png');
    this.load.image('hat_wizard',   'assets/cosmetics/hat_wizard.png');
    this.load.image('hat_crown',    'assets/cosmetics/hat_crown.png');
    this.load.image('hat_pirate',   'assets/cosmetics/hat_pirate.png');
    this.load.image('hat_hood',     'assets/cosmetics/hat_hood.png');
    this.load.image('cloak_crimson',  'assets/cosmetics/cloak_crimson.png');
    this.load.image('cloak_midnight', 'assets/cosmetics/cloak_midnight.png');
    this.load.image('cloak_ivory',    'assets/cosmetics/cloak_ivory.png');
    this.load.image('wings_angel',    'assets/cosmetics/wings_angel.png');
    this.load.image('wings_demon',    'assets/cosmetics/wings_demon.png');
    this.load.image('wings_fairy',    'assets/cosmetics/wings_fairy.png');
    this.load.image('cosmetic_outfit_mage_celestial',   'assets/cosmetics/cosmetic_outfit_mage_celestial.png');
    this.load.image('cosmetic_outfit_warrior_ember',    'assets/cosmetics/cosmetic_outfit_warrior_ember.png');
    this.load.image('cosmetic_outfit_ranger_frost',     'assets/cosmetics/cosmetic_outfit_ranger_frost.png');
    this.load.image('cosmetic_outfit_ranger_shadow',    'assets/cosmetics/cosmetic_outfit_ranger_shadow.png');
    this.load.image('cosmetic_outfit_warrior_royal',    'assets/cosmetics/cosmetic_outfit_warrior_royal.png');
    // Expanded cosmetic outfits (PIX-418)
    this.load.image('cosmetic_outfit_mage_scholar',      'assets/cosmetics/cosmetic_outfit_mage_scholar.png');
    this.load.image('cosmetic_outfit_warrior_knight',    'assets/cosmetics/cosmetic_outfit_warrior_knight.png');
    this.load.image('cosmetic_outfit_ranger_woodland',   'assets/cosmetics/cosmetic_outfit_ranger_woodland.png');
    this.load.image('cosmetic_outfit_artisan_master',    'assets/cosmetics/cosmetic_outfit_artisan_master.png');
    this.load.image('cosmetic_outfit_mage_void',         'assets/cosmetics/cosmetic_outfit_mage_void.png');
    this.load.image('cosmetic_outfit_artisan_festival',  'assets/cosmetics/cosmetic_outfit_artisan_festival.png');
    // Portrait frames
    this.load.image('frame_gold',      'assets/ui/cosmetic_shop/frame_gold.png');
    this.load.image('frame_celestial', 'assets/ui/cosmetic_shop/frame_celestial.png');

    // ── Bestiary (PIX-337 art set) ────────────────────────────────────────────
    this.load.image('ui_bestiary_book_frame',        'assets/ui/bestiary/ui_bestiary_book_frame.png');
    this.load.image('ui_bestiary_info_panel',         'assets/ui/bestiary/ui_bestiary_info_panel.png');
    this.load.image('ui_bestiary_portrait_common',    'assets/ui/bestiary/ui_bestiary_portrait_common.png');
    this.load.image('ui_bestiary_portrait_uncommon',  'assets/ui/bestiary/ui_bestiary_portrait_uncommon.png');
    this.load.image('ui_bestiary_portrait_rare',      'assets/ui/bestiary/ui_bestiary_portrait_rare.png');
    this.load.image('ui_bestiary_portrait_boss',      'assets/ui/bestiary/ui_bestiary_portrait_boss.png');
    this.load.image('ui_bestiary_portrait_world_boss','assets/ui/bestiary/ui_bestiary_portrait_world_boss.png');
    this.load.image('ui_bestiary_undiscovered',       'assets/ui/bestiary/ui_bestiary_undiscovered.png');
    this.load.image('ui_bestiary_discovered',         'assets/ui/bestiary/ui_bestiary_discovered.png');
    this.load.image('ui_bestiary_progress_bg',        'assets/ui/bestiary/ui_bestiary_progress_bg.png');
    this.load.image('ui_bestiary_progress_fill',      'assets/ui/bestiary/ui_bestiary_progress_fill.png');
    this.load.image('ui_bestiary_badge_bronze',       'assets/ui/bestiary/ui_bestiary_badge_bronze.png');
    this.load.image('ui_bestiary_badge_silver',       'assets/ui/bestiary/ui_bestiary_badge_silver.png');
    this.load.image('ui_bestiary_badge_gold',         'assets/ui/bestiary/ui_bestiary_badge_gold.png');
    this.load.image('ui_bestiary_badge_platinum',     'assets/ui/bestiary/ui_bestiary_badge_platinum.png');
    this.load.image('ui_bestiary_tab_active',         'assets/ui/bestiary/ui_bestiary_tab_active.png');
    this.load.image('ui_bestiary_tab_inactive',       'assets/ui/bestiary/ui_bestiary_tab_inactive.png');
    this.load.image('ui_bestiary_list_row',           'assets/ui/bestiary/ui_bestiary_list_row.png');
    this.load.image('ui_bestiary_list_row_hover',     'assets/ui/bestiary/ui_bestiary_list_row_hover.png');
    // Bestiary zone icons
    this.load.image('ui_bestiary_zone_all',     'assets/ui/bestiary/ui_bestiary_zone_all.png');
    this.load.image('ui_bestiary_zone_plains',  'assets/ui/bestiary/ui_bestiary_zone_plains.png');
    this.load.image('ui_bestiary_zone_forest',  'assets/ui/bestiary/ui_bestiary_zone_forest.png');
    this.load.image('ui_bestiary_zone_desert',  'assets/ui/bestiary/ui_bestiary_zone_desert.png');
    this.load.image('ui_bestiary_zone_dungeon', 'assets/ui/bestiary/ui_bestiary_zone_dungeon.png');

    // ── LLM dynamic content UI (PIX-323 art set) ─────────────────────────────
    // Quest board
    this.load.image('ui_panel_quest_board',    'assets/ui/llm_content/ui_panel_quest_board.png');
    this.load.image('ui_frame_quest_scroll',   'assets/ui/llm_content/ui_frame_quest_scroll.png');
    // NPC portrait frames + 6 portrait bases
    this.load.image('ui_frame_npc_portrait',       'assets/ui/llm_content/ui_frame_npc_portrait.png');
    this.load.image('ui_portrait_npc_adventurer',  'assets/ui/llm_content/ui_portrait_npc_adventurer.png');
    this.load.image('ui_portrait_npc_farmer',      'assets/ui/llm_content/ui_portrait_npc_farmer.png');
    this.load.image('ui_portrait_npc_guard',       'assets/ui/llm_content/ui_portrait_npc_guard.png');
    this.load.image('ui_portrait_npc_merchant',    'assets/ui/llm_content/ui_portrait_npc_merchant.png');
    this.load.image('ui_portrait_npc_mystic',      'assets/ui/llm_content/ui_portrait_npc_mystic.png');
    this.load.image('ui_portrait_npc_scholar',     'assets/ui/llm_content/ui_portrait_npc_scholar.png');
    // Emotion icons (happy/angry/sad/neutral/surprised)
    this.load.image('ui_icon_emotion_happy',     'assets/ui/llm_content/ui_icon_emotion_happy.png');
    this.load.image('ui_icon_emotion_angry',     'assets/ui/llm_content/ui_icon_emotion_angry.png');
    this.load.image('ui_icon_emotion_sad',       'assets/ui/llm_content/ui_icon_emotion_sad.png');
    this.load.image('ui_icon_emotion_neutral',   'assets/ui/llm_content/ui_icon_emotion_neutral.png');
    this.load.image('ui_icon_emotion_surprised', 'assets/ui/llm_content/ui_icon_emotion_surprised.png');
    // World event banner + type icons
    this.load.image('ui_banner_world_event',      'assets/ui/llm_content/ui_banner_world_event.png');
    this.load.image('ui_icon_event_boss_spawn',   'assets/ui/llm_content/ui_icon_event_boss_spawn.png');
    this.load.image('ui_icon_event_discovery',    'assets/ui/llm_content/ui_icon_event_discovery.png');
    this.load.image('ui_icon_event_festival',     'assets/ui/llm_content/ui_icon_event_festival.png');
    this.load.image('ui_icon_event_invasion',     'assets/ui/llm_content/ui_icon_event_invasion.png');
    this.load.image('ui_icon_event_storm',        'assets/ui/llm_content/ui_icon_event_storm.png');
    // Dialogue bubble variants
    this.load.image('ui_bubble_dialogue_normal', 'assets/ui/llm_content/ui_bubble_dialogue_normal.png');
    this.load.image('ui_bubble_dialogue_quest',  'assets/ui/llm_content/ui_bubble_dialogue_quest.png');
    this.load.image('ui_bubble_dialogue_urgent', 'assets/ui/llm_content/ui_bubble_dialogue_urgent.png');
    this.load.image('ui_bubble_dialogue_lore',   'assets/ui/llm_content/ui_bubble_dialogue_lore.png');

    // ── Auction house (PIX-319 art set) ───────────────────────────────────────
    this.load.image('char_npc_auctioneer',       'assets/sprites/characters/char_npc_auctioneer.png');
    this.load.image('ui_panel_auction_browse',   'assets/ui/auction/ui_panel_auction_browse.png');
    this.load.image('ui_panel_auction_bids',     'assets/ui/auction/ui_panel_auction_bids.png');
    this.load.image('ui_stamp_sold',             'assets/ui/auction/ui_stamp_sold.png');
    this.load.image('ui_stamp_expired',          'assets/ui/auction/ui_stamp_expired.png');
    this.load.image('ui_glow_rare_auction',      'assets/ui/auction/ui_glow_rare_auction.png');
    this.load.image('ui_glow_epic_auction',      'assets/ui/auction/ui_glow_epic_auction.png');
    this.load.image('ui_glow_legendary_auction', 'assets/ui/auction/ui_glow_legendary_auction.png');
    this.load.image('ui_icon_bid_hammer',        'assets/ui/auction/ui_icon_bid_hammer.png');
    this.load.image('ui_icon_gold_coin',         'assets/ui/auction/ui_icon_gold_coin.png');

    // ── Fishing (PIX-353 art set) ─────────────────────────────────────────────
    this.load.image('fishing_spot',                'assets/sprites/fishing/fishing_spot.png');
    this.load.image('char_npc_rod_vendor',         'assets/sprites/characters/char_npc_rod_vendor.png');
    this.load.image('ui_fishing_cast_bar_bg',      'assets/ui/fishing/ui_fishing_cast_bar_bg.png');
    this.load.image('ui_fishing_cast_bar_fill',    'assets/ui/fishing/ui_fishing_cast_bar_fill.png');
    this.load.image('ui_fishing_tension_bar_bg',   'assets/ui/fishing/ui_fishing_tension_bar_bg.png');
    this.load.image('ui_fishing_tension_arrow',    'assets/ui/fishing/ui_fishing_tension_arrow.png');
    // Fish sprites
    this.load.image('item_fish_forest_trout',      'assets/sprites/fishing/item_fish_forest_trout.png');
    this.load.image('item_fish_forest_bass',       'assets/sprites/fishing/item_fish_forest_bass.png');
    this.load.image('item_fish_river_perch',       'assets/sprites/fishing/item_fish_river_perch.png');
    this.load.image('item_fish_desert_catfish',    'assets/sprites/fishing/item_fish_desert_catfish.png');
    this.load.image('item_fish_desert_sandfish',   'assets/sprites/fishing/item_fish_desert_sandfish.png');
    this.load.image('item_fish_ocean_clownfish',   'assets/sprites/fishing/item_fish_ocean_clownfish.png');
    this.load.image('item_fish_ocean_tuna',        'assets/sprites/fishing/item_fish_ocean_tuna.png');
    this.load.image('item_fish_frost_salmon',      'assets/sprites/fishing/item_fish_frost_salmon.png');
    this.load.image('item_fish_ice_pike',          'assets/sprites/fishing/item_fish_ice_pike.png');
    this.load.image('item_fish_volcanic_eel',      'assets/sprites/fishing/item_fish_volcanic_eel.png');
    this.load.image('item_fish_lava_guppy',        'assets/sprites/fishing/item_fish_lava_guppy.png');
    this.load.image('item_fish_void_anglerfish',   'assets/sprites/fishing/item_fish_void_anglerfish.png');
    this.load.image('item_fish_void_jellyfish',    'assets/sprites/fishing/item_fish_void_jellyfish.png');
    this.load.image('item_catch_old_boot',         'assets/sprites/fishing/item_catch_old_boot.png');
    this.load.image('item_catch_treasure',         'assets/sprites/fishing/item_catch_treasure.png');
    // Rod items
    this.load.image('item_rod_basic',              'assets/sprites/fishing/item_rod_basic.png');
    this.load.image('item_rod_reinforced',         'assets/sprites/fishing/item_rod_reinforced.png');
    this.load.image('item_rod_master',             'assets/sprites/fishing/item_rod_master.png');

    // ── Zone loading screen backgrounds (PIX-421) ────────────────────────────
    for (const zone of ZONES) {
      const num  = zone.id.replace('zone', '');
      const slug = zone.name.toLowerCase().replace(/\s+/g, '_');
      this.load.image(
        `bg_loading_zone${num}`,
        `assets/backgrounds/loading/bg_loading_zone${num}_${slug}.png`,
      );
    }

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
    if (this.textures.get('waystone_teleport').frameTotal > 1) {
      this.anims.create({ key: 'waystone-teleport', frames: this.anims.generateFrameNumbers('waystone_teleport', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    }
    if (this.textures.get('marker_player_anim').frameTotal > 1) {
      this.anims.create({ key: 'marker-player-pulse', frames: this.anims.generateFrameNumbers('marker_player_anim', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
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
    // Class-specific dodge animations (registered when spritesheet is available)
    const dodgeSheets: [string, string][] = [
      ['player-dodge-warrior', 'player_dodge_warrior'],
      ['player-dodge-mage',    'player_dodge_mage'],
      ['player-dodge-ranger',  'player_dodge_ranger'],
      ['player-dodge-artisan', 'player_dodge_artisan'],
    ];
    for (const [key, sheet] of dodgeSheets) {
      if (!a.exists(key) && this.textures.exists(sheet) && this.textures.get(sheet).frameTotal > 1) {
        a.create({ key, frames: a.generateFrameNumbers(sheet, { start: 0, end: -1 }), frameRate: 16, repeat: 0 });
      }
    }
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
