import Phaser from 'phaser';
import {
  CANVAS, PLAYER, COMBAT, MANA, LEVELS, SCENES, SPRINT, DODGE,
  ZONES, ENEMY_TYPES, BOSS_TYPES, ECONOMY, LOOT,
  STATUS_EFFECTS, MELEE_STATUS_ON_HIT, PROJECTILE_STATUS_ON_HIT,
  type EnemyTypeName, type BossTypeName, type ZoneConfig, type EffectKey,
} from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import { SettingsManager } from '../systems/SettingsManager';
import { SaveManager, SKILL_SAVE_KEY, type SkillSaveData, type SlotSaveData }  from '../systems/SaveManager';
import { MultiplayerClient, type RemotePlayer, type RemoteEnemy, type FactionRepEntry, type FactionRepChanged, type FriendEntry, type EmoteEvent, type WorldEventEntry, type EmoteId } from '../systems/MultiplayerClient';
import { FactionReputationPanel } from '../ui/FactionReputationPanel';
import { ChatOverlay }        from '../ui/ChatOverlay';
import { PlayerListPanel }    from '../ui/PlayerListPanel';
import { QuestLogPanel }      from '../ui/QuestLogPanel';
import { InventoryPanel }     from '../ui/InventoryPanel';
import { NpcDialogueOverlay } from '../ui/NpcDialogueOverlay';
import { CraftingPanel }      from '../ui/CraftingPanel';
import { MiniMapOverlay, type NpcMarker } from '../ui/MiniMapOverlay';
import { WorldMapOverlay } from '../ui/WorldMapOverlay';
import { TutorialOverlay }  from '../ui/TutorialOverlay';
import { TradeWindow }       from '../ui/TradeWindow';
import { MarketplacePanel }  from '../ui/MarketplacePanel';
import { SkillTreePanel, type SkillTreeState } from '../ui/SkillTreePanel';
import { GuildPanel } from '../ui/GuildPanel';
import { PartyPanel } from '../ui/PartyPanel';
import { SocialPanel } from '../ui/SocialPanel';
import { AchievementPanel, type AchievementData } from '../ui/AchievementPanel';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { AchievementTracker } from '../systems/AchievementTracker';
import { FastTravelPanel } from '../ui/FastTravelPanel';
import { ConnectionOverlay } from '../ui/ConnectionOverlay';
import { LootRollPanel } from '../ui/LootRollPanel';
import { DayNightSystem } from '../systems/DayNightSystem';
import { WeatherSystem }   from '../systems/WeatherSystem';
import { MobileTouchControls } from '../systems/MobileTouchControls';
import {
  SKILL_BY_ID, computePassiveBonuses,
  type ClassId, type PassiveBonus,
} from '../config/skills';

// ── Internal types ────────────────────────────────────────────────────────────

interface StatusEffectState {
  expiresAt:  number;  // ms timestamp
  nextTickAt: number;  // when next DoT tick fires (0 for non-DoT effects)
  ticksLeft:  number;  // remaining DoT ticks (0 for non-DoT effects)
}

interface EnemyExtra {
  hp:              number;
  maxHp:           number;
  typeName:        EnemyTypeName | 'boss';
  bossType?:       BossTypeName;
  patrolAngle:     number;
  burstTimer:      number;
  burstCooldown:   number;
  burstReady:      boolean;
  shootTimer:      number;
  phaseTimer:      number;
  phaseInvincible: boolean;
  phase2:          boolean;
  isTentacle:      boolean;
  isPillar:        boolean;
  /** true = managed by server, skip local AI */
  isRemote:        boolean;
  /** Active status effects on this enemy. */
  effects:         Partial<Record<EffectKey, StatusEffectState>>;
  /** Immunity end timestamps — keyed by EffectKey. */
  effectImmunity:  Partial<Record<EffectKey, number>>;
}

export interface GameSceneData {
  zoneId: string;
}

export interface GameOverData {
  wave:     number;
  kills:    number;
  level:    number;
  timeSecs: number;
  zoneId:   string;
  zoneName: string;
  victory:  boolean;
  score:    number;
}

/**
 * GameScene — zone-based gameplay.
 *
 * Modes:
 *  - Solo (default): full local simulation identical to original behaviour.
 *  - Multiplayer: connects to the Colyseus ZoneRoom; enemies and players are
 *    driven by the server. Falls back to solo if the server is unreachable.
 *
 * Runs 3 enemy waves + 1 boss wave per zone (solo) or server-driven waves
 * (multiplayer).  On boss death / zone completion: saves progress, unlocks
 * next zone, transitions to game-over (victory).
 */
export class GameScene extends Phaser.Scene {
  private readonly worldW = CANVAS.WIDTH * 2;
  private readonly worldH = CANVAS.HEIGHT * 2;

  private enemies!:     Phaser.Physics.Arcade.Group;
  private pickups!:     Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;

  private player!: Phaser.Physics.Arcade.Sprite;
  private hp:   number = PLAYER.BASE_HP;
  private mana: number = PLAYER.BASE_MANA;
  private xp    = 0;
  private level = 1;
  private lastAttackTime = 0;
  private lastHitTime    = 0;
  private isDead         = false;
  private charmed        = false;
  private charmedUntil   = 0;

  // ── Death / respawn ───────────────────────────────────────────────────────
  private gold            = 0;        // carried gold (5% lost on death)
  private deathCount      = 0;        // deaths this session
  private respawnImmune   = false;    // true during 30 s post-respawn immunity
  private immunityEndAt   = 0;        // this.time.now timestamp
  private immunityFlashMs = 0;        // flash accumulator
  private escapeScrolls   = 1;        // Escape Scrolls (start with 1 per run)
  private deathMarkerPos: { x: number; y: number } | null = null;
  private escScrollKey!:  Phaser.Input.Keyboard.Key;
  private emoteKey!:      Phaser.Input.Keyboard.Key;

  // ── Status effects ────────────────────────────────────────────────────────
  private playerEffects:        Partial<Record<EffectKey, StatusEffectState>> = {};
  private playerEffectImmunity: Partial<Record<EffectKey, number>>            = {};
  private statusHudIndicators:  Partial<Record<EffectKey, Phaser.GameObjects.Text>> = {};

  // ── Sprint ───────────────────────────────────────────────────────────────
  private sprintDustTimer = 0;

  // ── Dodge ────────────────────────────────────────────────────────────────
  private isDodging          = false;
  private dodgeEndTime       = 0;   // time.now when dash ends
  private dodgeCooldownEndTime = 0; // time.now when dodge becomes available again
  private dodgeVx            = 0;
  private dodgeVy            = 0;

  private cursors!:   Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!:      { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private attackKey!: Phaser.Input.Keyboard.Key;
  private escKey!:    Phaser.Input.Keyboard.Key;
  private sprintKey!: Phaser.Input.Keyboard.Key;
  private dodgeKey!:  Phaser.Input.Keyboard.Key;

  private zone!:            ZoneConfig;
  private zoneIdx          = 0;
  private wave             = 1;
  private isBossWave       = false;
  private kills            = 0;
  private score            = 0;
  private waveTransitioning = false;
  private gameStartTime    = 0;
  private bossAlive        = false;

  private pillars:    Phaser.Physics.Arcade.Sprite[] = [];
  private tentacles:  Phaser.Physics.Arcade.Sprite[] = [];
  private bossSprite?: Phaser.Physics.Arcade.Sprite;

  private hpBar!:           Phaser.GameObjects.Rectangle;
  private manaBar!:         Phaser.GameObjects.Rectangle;
  private xpBar!:           Phaser.GameObjects.Rectangle;
  private levelText!:       Phaser.GameObjects.Text;
  private waveText!:        Phaser.GameObjects.Text;
  private killText!:        Phaser.GameObjects.Text;
  private enemyCountText!:  Phaser.GameObjects.Text;
  private charmIndicator!:  Phaser.GameObjects.Text;
  private dodgeCooldownText?: Phaser.GameObjects.Text;
  private bossHpBar!:       Phaser.GameObjects.Rectangle;
  private bossNameText!:    Phaser.GameObjects.Text;
  private bossHudVisible    = false;

  private sfx!: SoundManager;

  // ── Multiplayer ───────────────────────────────────────────────────────────

  /** Multiplayer client (null in solo mode or before connection). */
  private mp: MultiplayerClient | null = null;
  private isMultiplayer = false;

  /** Remote player sprites keyed by sessionId. */
  private remotePlayerSprites = new Map<string, Phaser.Physics.Arcade.Sprite>();
  /** Name labels above remote player sprites. */
  private remotePlayerLabels  = new Map<string, Phaser.GameObjects.Text>();
  /** HP bar graphics for remote players. */
  private remotePlayerHpBars  = new Map<string, Phaser.GameObjects.Rectangle>();

  /** Server-synced enemy sprites keyed by server enemy id. */
  private remoteEnemySprites = new Map<string, Phaser.Physics.Arcade.Sprite>();

  /** HUD text showing online player count. */
  private onlineCountText?: Phaser.GameObjects.Text;

  /** Connection quality indicator dot (green/yellow/red). */
  private pingDot?: Phaser.GameObjects.Arc;
  /** Ping value label next to the dot. */
  private pingValueText?: Phaser.GameObjects.Text;
  /** "High Latency" warning shown when ping > 300 ms. */
  private latencyWarning?: Phaser.GameObjects.Text;
  /** Dismissible banner for planned server maintenance. */
  private maintenanceBanner?: Phaser.GameObjects.Text;
  /** Full-screen disconnect/reconnect overlay. */
  private connectionOverlay?: ConnectionOverlay;

  /** Chat overlay (multiplayer only). */
  private chat?: ChatOverlay;

  /** Player list panel (multiplayer only). */
  private playerList?: PlayerListPanel;

  /** Quest log panel (multiplayer only). */
  private questLog?: QuestLogPanel;

  /** Inventory panel (multiplayer only). */
  private inventory?: InventoryPanel;

  /** NPC dialogue overlay (multiplayer only). */
  private npcDialogue?: NpcDialogueOverlay;

  /** E key for NPC interaction. */
  private npcKey?: Phaser.Input.Keyboard.Key;

  /** Crafting panel (multiplayer only). */
  private craftingPanel?: CraftingPanel;

  /** Crafting station world sprite. */
  private craftingStation?: Phaser.GameObjects.Container;

  /** Up/Down keys for crafting panel navigation. */
  private upKey?: Phaser.Input.Keyboard.Key;
  private downKey?: Phaser.Input.Keyboard.Key;

  /** C key for confirming a craft. */
  private craftConfirmKey?: Phaser.Input.Keyboard.Key;

  /** HUD prompt shown when player is near crafting station. */
  private craftStationHint?: Phaser.GameObjects.Text;

  /** Mini-map HUD overlay (always present in corner). */
  private miniMap?: MiniMapOverlay;

  /** Full-screen world map overlay (M key). */
  private worldMap?: WorldMapOverlay;

  /** Fixed world-space positions for zone NPCs (quest givers). */
  private npcMarkers: NpcMarker[] = [];

  /** Whether the player currently has an active quest (multiplayer only). */
  private hasActiveQuest = false;

  /** N key — mute/unmute toggle. */
  private muteKey?: Phaser.Input.Keyboard.Key;

  /** HUD indicator shown when audio is muted. */
  private muteIndicator?: Phaser.GameObjects.Text;

  /** Tutorial overlay — shown only for first-time players on zone1. */
  private tutorial?: TutorialOverlay;

  /** Fast travel panel — opened by interacting with the Transport NPC. */
  private fastTravelPanel?: FastTravelPanel;

  /** Transport NPC sprite (world-space, near zone hub). */
  private transportNpc?: Phaser.GameObjects.Container;

  /** Proximity hint shown when player is near the Transport NPC. */
  private transportHint?: Phaser.GameObjects.Text;

  /** T key — opens fast travel dialog (handled inline in update). */
  // fastTravelKey handled via escScrollKey below

  /** P2P trade window (multiplayer only). */
  private tradeWindow?: TradeWindow;

  /** Marketplace / auction-house panel (multiplayer only). */
  private marketplace?: MarketplacePanel;

  /** Guild panel (multiplayer only). */
  private guildPanel?: GuildPanel;

  /** Party panel (multiplayer only). */
  private partyPanel?: PartyPanel;

  /** Social / friend list panel (multiplayer only). */
  private socialPanel?: SocialPanel;

  /** Party loot roll panel (multiplayer only). */
  private lootRollPanel?: LootRollPanel;

  /** Active emote animations: sessionId → { label, expiry } */
  private emoteLabels = new Map<string, Phaser.GameObjects.Text>();

  /** Season name HUD label (top-center). */
  private seasonLabel?: Phaser.GameObjects.Text;

  /** Session IDs of current party members (for mini-map highlight). */
  private partySessionIds = new Set<string>();

  /** Pending party invite — session ID of the inviter, cleared on accept/decline. */
  private pendingPartyInvite: string | null = null;

  /** Achievement panel (always present, H to open). */
  private achievementPanel?: AchievementPanel;

  /** Leaderboard panel (always present, L to open). */
  private leaderboardPanel?: LeaderboardPanel;

  /** Faction reputation panel (multiplayer only, R to open). */
  private factionPanel?: FactionReputationPanel;

  /** Day-night cycle — tint overlay + in-game clock HUD. */
  private dayNight?: DayNightSystem;

  /** Weather system — precipitation particles, fog overlay, speed modifiers. */
  private weather?: WeatherSystem;

  // ── Death/respawn HUD ─────────────────────────────────────────────────────
  private goldText?:   Phaser.GameObjects.Text;
  private scrollText?: Phaser.GameObjects.Text;

  /** HUD text showing total achievement points. */
  private achievePtsText?: Phaser.GameObjects.Text;

  // ── Skill tree ─────────────────────────────────────────────────────────────

  /** Skill tree panel (always present, K to open). */
  private skillTree?: SkillTreePanel;

  /** Current class id. */
  private classId: ClassId = 'warrior';

  /** Set of unlocked skill ids. */
  private unlockedSkills: Set<string> = new Set();

  /** Unspent skill points. */
  private skillPoints = 0;

  /** Active skill ids on hotbar slots 0-5 (empty string = empty). */
  private hotbar: string[] = ['', '', '', '', '', ''];

  /** Per-skill cooldown expiry timestamps (ms). */
  private skillCooldowns: Map<string, number> = new Map();

  /** Whether arcane_surge buff is active + expiry. */
  private arcaneSurgeUntil = 0;
  /** Whether berserk_mode buff is active + expiry. */
  private berserkUntil = 0;
  /** Arcane shield absorb remaining. */
  private shieldAbsorb = 0;

  /** Cached passive bonus values — updated by applyPassiveBonuses(). Avoids recomputing every frame. */
  private passiveBonusCache: Required<PassiveBonus> = {
    maxHpFlat: 0, maxManaFlat: 0, damagePct: 0, speedPct: 0,
    manaRegenFlat: 0, critChancePct: 0, attackCdReductionPct: 0,
    allCdReductionPct: 0, damageReductionPct: 0, healOnKill: 0,
  };

  /** HUD objects for hotbar display. */
  private hotbarSlotBgs:    Phaser.GameObjects.Rectangle[]    = [];
  private hotbarSlotLabels: Phaser.GameObjects.Text[]          = [];
  private hotbarCdOverlays: Phaser.GameObjects.Rectangle[]    = [];
  private hotbarCdTexts:    Phaser.GameObjects.Text[]          = [];
  private skillPointsBadge?: Phaser.GameObjects.Text;

  /** Hotbar key objects (1–6). */
  private hotbarKeys: Phaser.Input.Keyboard.Key[] = [];

  /** Mobile virtual joystick + action buttons (no-op on desktop). */
  private touch!: MobileTouchControls;

  constructor() {
    super(SCENES.GAME);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  create(data: GameSceneData): void {
    const zoneId = data?.zoneId ?? 'zone1';
    const found  = ZONES.find(z => z.id === zoneId);
    this.zone    = found ?? ZONES[0];
    this.zoneIdx = ZONES.indexOf(this.zone);

    const save   = SaveManager.load();
    this.level   = save.playerLevel;
    this.hp      = (PLAYER.BASE_HP as number) + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL;
    this.mana    = PLAYER.BASE_MANA as number;
    this.xp      = 0;

    this.lastAttackTime    = 0;
    this.lastHitTime       = 0;
    this.isDead            = false;
    this.charmed              = false;
    this.charmedUntil         = 0;
    this.playerEffects        = {};
    this.playerEffectImmunity = {};
    this.sprintDustTimer      = 0;
    this.isDodging         = false;
    this.dodgeEndTime      = 0;
    this.dodgeCooldownEndTime = 0;
    this.wave              = 1;
    this.isBossWave        = false;
    this.kills             = 0;
    this.score             = 0;
    this.gold              = 0;
    this.deathCount        = 0;
    this.respawnImmune     = false;
    this.immunityEndAt     = 0;
    this.immunityFlashMs   = 0;
    this.escapeScrolls     = 1;
    this.deathMarkerPos    = null;
    this.waveTransitioning = false;
    this.gameStartTime     = this.time.now;
    this.bossAlive         = false;
    this.pillars           = [];
    this.tentacles         = [];
    this.bossSprite        = undefined;
    this.bossHudVisible    = false;
    this.isMultiplayer     = false;

    // Load solo skill state from localStorage
    this.loadSoloSkillState();
    this.applyPassiveBonuses();

    // Auto-save every 5 minutes in solo play (slot 0)
    this.time.addEvent({
      delay: 5 * 60 * 1000,
      loop: true,
      callback: () => this.triggerAutoSave(),
    });

    this.sfx = SoundManager.getInstance();

    // Unlock audio + start zone music on first user interaction (autoplay policy)
    const unlockAudio = (): void => { this.sfx.unlock(); };
    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard!.once('keydown', unlockAudio);
    this.sfx.startZoneMusic(this.zone.id);
    this.sfx.startAmbient(this.zone.id);

    this.buildWorld();
    this.createPlayer();

    this.enemies     = this.physics.add.group();
    this.pickups     = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    this.setupCollisions();
    this.setupInput();
    this.touch = new MobileTouchControls(this);
    this.setupCamera();
    this.createHUD();
    this.dayNight = new DayNightSystem(this);
    this.weather  = new WeatherSystem(this, this.zone.biome);

    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Skill tree panel (always present)
    this.skillTree = new SkillTreePanel(this);
    this.skillTree.updateState(this.buildSkillTreeState());
    this.skillTree.onAllocSkill  = (id) => this.allocSkill(id);
    this.skillTree.onSetHotbar   = (hb) => this.setHotbar(hb);
    this.skillTree.onRespec      = () => this.respecSkills();
    this.skillTree.onSetClass    = (c)  => this.setClass(c);

    // Leaderboard panel (always present, populated once multiplayer connects)
    this.leaderboardPanel = new LeaderboardPanel(this);

    // Show tutorial for first-time players entering zone1
    if (!save.tutorialCompleted && zoneId === 'zone1') {
      this.tutorial = new TutorialOverlay(this);
      this.tutorial.onComplete = () => {
        SaveManager.completeTutorial();
        // Fire "First Steps" achievement
        const unlocked = AchievementTracker.recordEvent('tutorial_complete');
        unlocked.forEach(a => this.showAchievementUnlock(a));
        this.fireAchievementEvent('tutorial_complete');
        this.tutorial = undefined;
      };
    }

    // Attempt multiplayer connection. Scene starts in solo mode; if the
    // server responds we switch to multiplayer without interrupting the fade-in.
    this.initMultiplayer(zoneId).catch(() => {
      // initMultiplayer handles its own errors; this is belt-and-suspenders
    });
  }

  update(time: number, delta: number): void {
    if (this.isDead) return;

    // Tick mobile touch controls so justPressed flags are fresh this frame
    this.touch?.update();

    if (Phaser.Input.Keyboard.JustDown(this.escKey) || this.touch?.menu.justPressed) {
      // Escape closes any open panel before pausing
      const panelClosed =
        this.worldMap?.closeIfOpen()          ||
        this.skillTree?.closeIfOpen()         ||
        this.tradeWindow?.closeIfOpen()       ||
        this.marketplace?.closeIfOpen()       ||
        this.guildPanel?.closeIfOpen()        ||
        this.partyPanel?.closeIfOpen()        ||
        this.socialPanel?.closeIfOpen()       ||
        this.achievementPanel?.closeIfOpen()  ||
        this.leaderboardPanel?.closeIfOpen()  ||
        this.factionPanel?.closeIfOpen()      ||
        this.fastTravelPanel?.closeIfOpen()   ||
        this.npcDialogue?.closeIfOpen()       ||
        this.craftingPanel?.closeIfOpen()     ||
        this.questLog?.closeIfOpen()          ||
        this.inventory?.closeIfOpen()         ||
        this.chat?.active;
      if (!panelClosed) {
        this.scene.launch(SCENES.PAUSE, { zoneId: this.zone.id });
        this.scene.pause();
        return;
      }
    }

    // Mute toggle (N key) — persist state
    if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      const muted = this.sfx.toggleMute();
      this.muteIndicator?.setVisible(muted);
      const settings = SettingsManager.getInstance();
      settings.muted = muted;
      settings.save();
    }

    // Escape Scroll (T key) — teleport to zone spawn / nearest waystone
    if (this.escScrollKey && Phaser.Input.Keyboard.JustDown(this.escScrollKey) && this.escapeScrolls > 0) {
      this.escapeScrolls--;
      this.screenFlash(0x88ffcc, 0.5);
      this.spawnBurst(this.player.x, this.player.y, [0x88ffcc, 0xaaffdd, 0xffffff], 10, 100);
      this.player.setPosition(this.worldW / 2, this.worldH / 2);
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.respawnImmune   = true;
      this.immunityEndAt   = time + 5_000;  // 5 s immunity after scroll use
      this.immunityFlashMs = 0;
      this.floatingText(this.player.x, this.player.y - 20, 'Escape Scroll used!', '#88ffcc');
      this.updateHUD();
    }

    // Respawn immunity — flash player sprite every 200 ms
    if (this.respawnImmune) {
      this.immunityFlashMs += delta;
      this.player.setAlpha(Math.floor(this.immunityFlashMs / 200) % 2 === 0 ? 1 : 0.3);
      if (time >= this.immunityEndAt) {
        this.respawnImmune = false;
        this.player.setAlpha(1);
      }
    }

    // Skill tree panel (K key is handled inside the panel)
    const stWasBefore = this.skillTree?.isVisible ?? false;
    this.skillTree?.update();
    if (!stWasBefore && (this.skillTree?.isVisible ?? false)) {
      this.sfx.playPanelOpen();
      this.tutorial?.notifySkillTreeOpened();
    } else if (stWasBefore && !(this.skillTree?.isVisible ?? false)) {
      this.sfx.playPanelClose();
    }

    // Hotbar skill activation (keys 1–6), or emote when Z is held
    const emoteHeld = this.emoteKey?.isDown;
    for (let i = 0; i < 6; i++) {
      if (this.hotbarKeys[i] && Phaser.Input.Keyboard.JustDown(this.hotbarKeys[i])) {
        if (emoteHeld && this.isMultiplayer) {
          const emoteIds: EmoteId[] = ['wave', 'dance', 'sit', 'cheer', 'bow', 'angry'];
          this.mp?.sendEmote(emoteIds[i]);
        } else if (!this.skillTree?.isVisible) {
          this.activateSkillSlot(i, time);
        }
      }
    }

    // NPC interact key (E) — triggers quest dialogue in multiplayer
    // Skipped when the player is near the Transport NPC (handled in updateTransportNpcHint)
    const nearTransport = this.transportNpc && this.player
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, this.transportNpc.x, this.transportNpc.y) < 40
      : false;
    if (this.npcKey && Phaser.Input.Keyboard.JustDown(this.npcKey) && this.isMultiplayer && !nearTransport) {
      this.handleNpcInteract();
    }

    // Crafting panel key (F) — handled by CraftingPanel.update(); route nav/craft keys when open
    if (this.craftingPanel?.isVisible) {
      if (this.upKey   && Phaser.Input.Keyboard.JustDown(this.upKey))           this.craftingPanel.handleUp();
      if (this.downKey && Phaser.Input.Keyboard.JustDown(this.downKey))         this.craftingPanel.handleDown();
      if (this.craftConfirmKey && Phaser.Input.Keyboard.JustDown(this.craftConfirmKey)) this.craftingPanel.handleCraft();
    }

    // Chat overlay update (suppress game input while typing)
    this.chat?.update(delta);
    this.playerList?.update();
    this.guildPanel?.update();
    this.partyPanel?.update();
    this.socialPanel?.update();
    this.achievementPanel?.update();
    this.leaderboardPanel?.update();
    this.factionPanel?.update();

    // Panel updates with mutual exclusion — opening one closes the others
    const qlWas   = this.questLog?.isVisible     ?? false;
    const invWas  = this.inventory?.isVisible    ?? false;
    const crftWas = this.craftingPanel?.isVisible ?? false;
    const mkWas   = this.marketplace?.isVisible  ?? false;
    this.questLog?.update();
    if (this.inventory) this.inventory.playerLevel = this.level;
    this.inventory?.update();
    this.craftingPanel?.update();
    this.marketplace?.update();
    const qlNow   = this.questLog?.isVisible     ?? false;
    const invNow  = this.inventory?.isVisible    ?? false;
    const crftNow = this.craftingPanel?.isVisible ?? false;
    const mkNow   = this.marketplace?.isVisible  ?? false;
    if (!qlWas && qlNow) {
      // Quest log just opened — close others
      this.sfx.playPanelOpen();
      this.inventory?.hide();
      this.craftingPanel?.hide();
      this.npcDialogue?.hide();
      this.marketplace?.hide();
      this.skillTree?.hide();
    } else if (!invWas && invNow) {
      // Inventory just opened — close others
      this.sfx.playPanelOpen();
      this.questLog?.hide();
      this.craftingPanel?.hide();
      this.npcDialogue?.hide();
      this.marketplace?.hide();
      this.tutorial?.notifyInventoryOpened();
    } else if (!crftWas && crftNow) {
      // Crafting panel just opened — close others
      this.sfx.playPanelOpen();
      this.questLog?.hide();
      this.inventory?.hide();
      this.npcDialogue?.hide();
      this.marketplace?.hide();
    } else if (!mkWas && mkNow) {
      // Marketplace just opened — close others
      this.sfx.playPanelOpen();
      this.questLog?.hide();
      this.inventory?.hide();
      this.craftingPanel?.hide();
      this.npcDialogue?.hide();
    }
    // Panel close sounds
    if (qlWas && !qlNow)     this.sfx.playPanelClose();
    if (invWas && !invNow)   this.sfx.playPanelClose();
    if (crftWas && !crftNow) this.sfx.playPanelClose();
    if (mkWas && !mkNow)     this.sfx.playPanelClose();

    // Crafting station proximity hint
    this.updateCraftingStationHint();
    this.updateTransportNpcHint();

    this.handleDodgeRoll(time);
    this.handlePlayerMovement(delta);
    this.regenMana(delta);
    this.updateDodgeCooldownHUD(time);
    this.updateHotbarHUD();

    if (this.isMultiplayer) {
      this.syncRemoteEnemies();
      this.syncRemotePlayers();
      // Refresh player list every frame (cheap — only redraws when visible)
      this.playerList?.refresh(
        localStorage.getItem('pr_username') ?? 'Hero',
        this.hp,
        PLAYER.BASE_HP + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL,
        this.level,
        this.mp?.players ?? new Map(),
      );
    } else {
      this.updateEnemyAI(time, delta);
    }

    this.handleAttack(time);
    this.handleEnemyContact(time);
    this.cleanProjectiles();
    this.updateCharmStatus(time);
    this.updateStatusEffects(time);
    this.applyEnemyStatusVelocity();
    if (this.bossHudVisible) this.updateBossHpBar();

    this.miniMap?.update(
      this.player,
      this.enemies,
      this.mp?.players ?? new Map(),
      this.remoteEnemySprites,
      this.npcMarkers,
      this.deathMarkerPos,
      this.partySessionIds,
    );

    const save = SaveManager.load();
    this.worldMap?.update({
      currentZoneId:   this.zone.id,
      unlockedZoneIds: save.unlockedZones,
      hasActiveQuest:  this.hasActiveQuest,
    });

    this.tutorial?.update(time, delta);
    this.dayNight?.update(delta);
    this.weather?.update(delta);
  }

  // ── Multiplayer init ──────────────────────────────────────────────────────

  private async initMultiplayer(zoneId: string): Promise<void> {
    const client = new MultiplayerClient();

    // Pull saved userId from local storage if available
    const userId = localStorage.getItem('pr_userId') ?? undefined;
    const playerName = localStorage.getItem('pr_username') ?? 'Hero';

    const joined = await client.joinZone(zoneId, playerName, userId);
    if (!joined) {
      // Server not available — run in solo mode.
      // Give tutorial players a brief grace period before the first wave.
      const waveDelay = this.tutorial ? 4000 : 0;
      if (waveDelay > 0) {
        this.time.delayedCall(waveDelay, () => { if (!this.isDead) this.spawnWave(); });
      } else {
        this.spawnWave();
      }
      return;
    }

    this.mp = client;
    this.isMultiplayer = true;

    // Chat overlay
    this.chat = new ChatOverlay(this);
    this.chat.onSend = (text, whisperTo) => {
      // Handle /accept and /decline for party invites
      if (text.toLowerCase() === '/accept' || text.toLowerCase() === 'accept') {
        if (this.pendingPartyInvite) {
          this.mp?.sendPartyRespond(true);
          this.pendingPartyInvite = null;
        }
        return;
      }
      if (text.toLowerCase() === '/decline' || text.toLowerCase() === 'decline') {
        if (this.pendingPartyInvite) {
          this.mp?.sendPartyRespond(false);
          this.pendingPartyInvite = null;
        }
        return;
      }
      this.mp?.sendChat(text, whisperTo);
    };
    this.chat.onGuildSend = (text) => {
      this.mp?.sendGuildChat(text);
    };

    // Player list panel
    this.playerList = new PlayerListPanel(this);
    this.playerList.onReport = (playerName) => {
      this.mp?.sendReport(playerName);
    };

    // Quest log panel
    this.questLog = new QuestLogPanel(this);

    // Faction reputation panel (R key)
    this.factionPanel = new FactionReputationPanel(this);

    // Inventory panel
    this.inventory = new InventoryPanel(this);

    // Crafting panel
    this.craftingPanel = new CraftingPanel(this);
    this.craftingPanel.onCraftSuccess = (itemId, itemName) => {
      // Deduct crafting station usage fee (economy sink)
      const fee = ECONOMY.CRAFTING_STATION_FEE;
      if (fee > 0) {
        this.gold = Math.max(0, this.gold - fee);
        this.floatingText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 28, `-${fee}g (station fee)`, '#ff9933');
        this.updateHUD();
      }
      this.floatingText(
        CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20,
        `✦ Crafted!`,
        '#ffcc88',
      );
      // Glow the crafting station briefly
      if (this.craftingStation) {
        this.tweens.add({
          targets: this.craftingStation,
          alpha: 0.3,
          duration: 120,
          yoyo: true,
          repeat: 3,
        });
      }
      // Notify other zone players in multiplayer
      if (this.isMultiplayer && this.mp && itemName) {
        this.mp.sendCraftNotify(itemId, itemName);
      }
    };

    // Trade window (P2P)
    this.tradeWindow = new TradeWindow(this, client);

    // Marketplace panel
    this.marketplace = new MarketplacePanel(this);
    this.marketplace.onTransactionComplete = () => {
      // Refresh inventory panel after a buy/list
      if (this.inventory?.isVisible) this.inventory.show();
      this.chat?.addMessage('Marketplace transaction complete.', '#ffd700');
    };

    // NPC dialogue overlay
    this.npcDialogue = new NpcDialogueOverlay(this);
    this.npcDialogue.onAccept = (quest) => {
      // Quest is already assigned server-side on interact; just acknowledge.
      this.questLog?.setActiveQuest(quest);
      this.hasActiveQuest = true;
      this.npcMarkers = this.npcMarkers.map(m => ({ ...m, hasQuest: true }));
      this.chat?.addMessage(`Quest accepted: ${quest.title}`, '#ffd700');
    };
    this.npcDialogue.onDecline = () => {
      this.chat?.addMessage('Quest declined.', '#888899');
    };

    // Quest data from server (NPC interact response)
    client.onQuestData = (quest, isNew) => {
      if (isNew) {
        this.npcDialogue?.show(quest);
      } else {
        // Already have this quest — just show the log
        this.questLog?.setActiveQuest(quest);
        this.questLog?.show();
        this.chat?.addMessage(`Quest in progress: ${quest.title}`, '#aaddff');
      }
    };

    client.onQuestError = (msg) => {
      this.chat?.addMessage(`Quest: ${msg}`, '#ff8888');
    };

    client.onQuestCompleted = (questId) => {
      this.questLog?.markCompleted(questId, questId);
      this.hasActiveQuest = false;
      this.npcMarkers = this.npcMarkers.map(m => ({ ...m, hasQuest: false }));
      this.chat?.addMessage('Quest completed! Rewards granted.', '#88ee88');
    };

    // Faction reputation callbacks
    client.onFactionReputations = (reps: FactionRepEntry[]) => {
      this.factionPanel?.setReputations(reps);
    };

    client.onFactionRepChanged = (change: FactionRepChanged) => {
      this.factionPanel?.updateEntry(change.factionId, change.newRep, change.standing);
      const sign = change.delta >= 0 ? '+' : '';
      this.chat?.addMessage(
        `${change.factionName}: ${sign}${change.delta} rep (${change.standing})`,
        change.delta >= 0 ? '#88ee88' : '#ff8888',
      );
    };

    // Incoming chat messages
    client.onChatMessage = (msg) => {
      const senderName = localStorage.getItem('pr_username') ?? 'Hero';
      const isOwn = msg.sender === senderName;
      if (msg.whisper) {
        const label = isOwn ? `[→${msg.whisperTo}] ${msg.text}` : `[whisper] ${msg.sender}: ${msg.text}`;
        this.chat?.addMessage(label, '#ffccff');
      } else {
        this.chat?.addMessage(`${msg.sender}: ${msg.text}`, '#dddddd');
      }
    };

    // Wire up skill callbacks from server
    client.onSkillPointsUpdated = (pts) => {
      this.skillPoints = pts;
      this.skillTree?.updateState(this.buildSkillTreeState());
      this.updateHotbarHUD();
      if (pts > 0) this.chat?.addMessage(`✦ Skill point earned! (${pts} available) — Press K`, '#ffe040');
    };
    client.onSkillAllocOk = (skillId, pts) => {
      this.unlockedSkills.add(skillId);
      this.skillPoints = pts;
      this.applyPassiveBonuses();
      this.skillTree?.updateState(this.buildSkillTreeState());
      this.updateHotbarHUD();
    };
    client.onSkillHotbarOk = (hotbar) => {
      this.hotbar = hotbar;
      this.skillTree?.updateState(this.buildSkillTreeState());
      this.updateHotbarHUD();
    };
    client.onSkillRespecOk = (pts) => {
      this.unlockedSkills.clear();
      this.skillPoints = pts;
      this.hotbar = ['', '', '', '', '', ''];
      this.applyPassiveBonuses();
      this.skillTree?.updateState(this.buildSkillTreeState());
      this.updateHotbarHUD();
      this.chat?.addMessage('Skill tree respecced.', '#aaaaff');
    };
    client.onSkillUsed = (skillId, _cd, expiresAt) => {
      this.skillCooldowns.set(skillId, expiresAt);
      this.updateHotbarHUD();
    };
    client.onSkillError = (msg) => {
      this.chat?.addMessage(`Skill: ${msg}`, '#ff8888');
    };

    // Crafting events — show floating zone-wide notifications
    client.onCraftEvent = (playerName, itemName) => {
      this.chat?.addMessage(`${playerName} crafted ${itemName}`, '#ffcc88');
    };

    // Loot drops — show floating text for received materials
    client.onLootDrop = (items) => {
      items.forEach((itemId, i) => {
        const label = itemId.replace('mat_', '').replace(/_/g, ' ');
        this.time.delayedCall(i * 300, () => {
          this.floatingText(
            this.player.x + (Math.random() - 0.5) * 20,
            this.player.y - 14 - i * 8,
            `+${label}`,
            '#88ee88',
          );
        });
      });
    };

    // Guild panel
    this.guildPanel = new GuildPanel(this);
    this.guildPanel.userId   = localStorage.getItem('pr_userId')   ?? undefined;
    this.guildPanel.username = localStorage.getItem('pr_username') ?? 'Hero';
    this.guildPanel.onSendGuildChat = (text) => {
      this.mp?.sendGuildChat(text);
    };
    // Load initial guild state
    this.guildPanel.refresh().catch(() => {/* non-fatal */});

    // Achievement panel (H key — always present in solo and multiplayer)
    this.achievementPanel = new AchievementPanel(this);
    this.achievementPanel.userId = localStorage.getItem('pr_userId') ?? undefined;

    // Leaderboard panel (L key — always present in multiplayer)
    this.leaderboardPanel = new LeaderboardPanel(this);
    this.leaderboardPanel.userId   = localStorage.getItem('pr_userId')   ?? undefined;
    this.leaderboardPanel.username = localStorage.getItem('pr_username') ?? undefined;

    // Fire zone_visit event on scene start
    this.fireAchievementEvent('zone_visited', { distinctZones: SaveManager.load().unlockedZones.length });
    AchievementTracker.recordEvent('zone_visit');

    // Incoming guild chat
    client.onGuildChatMessage = (sender, text) => {
      const senderName = localStorage.getItem('pr_username') ?? 'Hero';
      const isOwn = sender === senderName;
      const label = isOwn ? `[G→] ${text}` : `[G] ${sender}: ${text}`;
      this.chat?.addMessage(label, '#88ddff');
    };

    // Loot roll panel (party need/greed/pass)
    this.lootRollPanel = new LootRollPanel(this);
    this.lootRollPanel.onVote = (rollId, choice) => {
      client.sendLootRollChoice(rollId, choice);
    };
    client.onLootRollStart = (rollId, items, timeoutMs) => {
      this.lootRollPanel?.show(rollId, items, timeoutMs);
    };
    client.onLootRollResult = (_rollId, items, winnerName, rolls) => {
      this.lootRollPanel?.showResult(items, winnerName, rolls);
    };

    // Party panel setup
    this.partyPanel = new PartyPanel(this);
    this.partyPanel.setMySessionId(client.mySessionId);

    // Party invite received
    client.onPartyInvited = (fromSessionId, fromName) => {
      this.chat?.addMessage(`[Party] ${fromName} invited you to a party! Type /accept or press P.`, '#aaffaa');
      // Auto-show a simple accept prompt via chat hint
      this.pendingPartyInvite = fromSessionId;
    };

    // Party state updated (member joined/left/kicked, loot mode changed)
    client.onPartyUpdate = (state) => {
      this.partyPanel?.applyPartyState(state);
      this.partySessionIds = new Set(state.members.map(m => m.sessionId).filter(sid => sid !== client.mySessionId));
    };

    // Party disbanded or we left
    client.onPartyDisbanded = (reason) => {
      this.partyPanel?.clearParty();
      this.partySessionIds.clear();
      this.chat?.addMessage(`[Party] ${reason}`, '#ffbbbb');
    };

    // Incoming party chat
    client.onPartyChat = (sender, text) => {
      this.chat?.addMessage(`[P] ${sender}: ${text}`, '#aaffaa');
    };

    // Incoming party XP (from a party member's kill)
    client.onPartyXp = (amount) => {
      this.xp += amount;
      this.floatingText(
        this.player.x + (Math.random() - 0.5) * 20,
        this.player.y - 22,
        `+${amount} XP (party)`,
        '#44ff88',
      );
      this.checkLevelUp();
      this.updateHUD();
    };

    // Party error messages
    client.onPartyError = (msg) => {
      this.chat?.addMessage(`[Party] ${msg}`, '#ff8888');
    };
    client.onPartyInfo = (msg) => {
      this.chat?.addMessage(`[Party] ${msg}`, '#aaffaa');
    };

    // Wire up party panel callbacks
    this.partyPanel.onLeave = () => client.sendPartyLeave();
    this.partyPanel.onKick  = (sid) => client.sendPartyKick(sid);
    this.partyPanel.onToggleLootMode = (mode) => client.sendPartyLootMode(mode);

    // Wire up party chat dispatch from ChatOverlay
    if (this.chat) {
      this.chat.onPartySend = (text) => client.sendPartyChat(text);
    }

    // Social panel (friend list, whisper, block)
    this.socialPanel = new SocialPanel(this);
    this.socialPanel.onFriendRequest = (name) => {
      client.sendFriendRequest(name);
    };
    this.socialPanel.onFriendAccept = (name) => {
      client.sendFriendRespond(name, true);
    };
    this.socialPanel.onFriendDecline = (name) => {
      client.sendFriendRespond(name, false);
    };
    this.socialPanel.onFriendRemove = (name) => {
      client.sendFriendRemove(name);
    };
    this.socialPanel.onBlockPlayer = (name) => {
      client.sendBlockPlayer(name);
      this.chat?.addMessage(`Blocked ${name}.`, '#ff9977');
    };
    this.socialPanel.onWhisper = (name) => {
      // Pre-fill the chat input with the whisper prefix
      this.chat?.openInput();
      // We set a one-shot hook so next send goes as a whisper
      const origOnSend = this.chat?.onSend;
      if (this.chat) {
        this.chat.onSend = (text, whisperTo) => {
          client.sendChat(text, whisperTo ?? name);
          if (this.chat) this.chat.onSend = origOnSend;
        };
      }
    };

    // Social server callbacks
    client.onFriendsList = (friends: FriendEntry[]) => {
      this.socialPanel?.applyFriends(friends);
    };
    client.onFriendRequestReceived = (fromName: string) => {
      this.chat?.addMessage(`[Friend] ${fromName} sent you a friend request! (O to manage)`, '#ffcc44');
      this.sfx.playMenuClick();
    };
    client.onFriendRequestAccepted = (byName: string) => {
      this.chat?.addMessage(`[Friend] ${byName} accepted your friend request!`, '#44ee88');
    };
    client.onFriendOnline = (username: string) => {
      this.socialPanel?.setFriendOnline(username, true);
      this.chat?.addMessage(`[Friend] ${username} is now online.`, '#44ee88');
    };
    client.onFriendOffline = (username: string) => {
      this.socialPanel?.setFriendOnline(username, false);
      this.chat?.addMessage(`[Friend] ${username} went offline.`, '#556677');
    };
    client.onSocialInfo = (msg: string) => {
      this.chat?.addMessage(`[Social] ${msg}`, '#aaddff');
    };
    client.onSocialError = (msg: string) => {
      this.chat?.addMessage(`[Social] ${msg}`, '#ff8888');
    };

    // Emote events — show floating animation above sender
    client.onEmote = (event: EmoteEvent) => {
      this.showEmoteAnimation(event.sessionId, event.emoteId);
    };

    // World events — show in chat on zone enter
    client.onWorldEvents = (events: WorldEventEntry[]) => {
      if (events.length) {
        events.forEach(e => {
          this.chat?.addMessage(`✦ World Event: ${e.name} — ${e.description}`, '#ffdd44');
        });
      }
    };

    // Season info — show tiny label near top
    client.onSeasonInfo = (name: string) => {
      if (!this.seasonLabel) {
        this.seasonLabel = this.add.text(CANVAS.WIDTH - 4, 4, '', {
          fontSize: '4px', color: '#88ffcc', fontFamily: 'monospace',
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(12);
      }
      this.seasonLabel.setText(`✿ ${name}`);
    };

    // Show control hints once
    this.time.delayedCall(2000, () => {
      this.chat?.addMessage('[T] chat  [/g] guild  [/p] party  [Tab] players  [Q] quests  [I] inv  [E] NPC  [F] craft  [J] market  [M] world map  [K] skills  [R] factions  [G] guild  [P] party  [O] friends  [H] achievements  [Z+1-6] emotes  [RClick] trade', '#555577');
    });

    // Wave state changes from server
    client.onWaveStateChange = (wave, waveState) => {
      this.onServerWaveChange(wave, waveState);
    };

    // Enemy removed by server
    client.onEnemyRemoved = (id) => {
      const sprite = this.remoteEnemySprites.get(id);
      if (sprite) {
        this.spawnBurst(sprite.x, sprite.y, [0xd42020, 0xf06020, 0x4a4a4a], 8, 140);
        sprite.destroy();
        this.remoteEnemySprites.delete(id);
        this.kills++;
        this.score += 20;
        this.updateHUD();
      }
    };

    // Show overlay immediately when connection drops; reconnect attempts begin automatically.
    client.onConnectionLost = () => {
      this.connectionOverlay?.show(60);
    };

    // Successful reconnect — server state sync resumes via existing listeners.
    client.onReconnected = () => {
      this.connectionOverlay?.showReconnected();
      this.isMultiplayer = true;
      this.mp = client;
      this.chat?.addMessage('Reconnected to server!', '#44ee88');
    };

    // All reconnect attempts exhausted — fall back to solo play.
    client.onDisconnected = () => {
      this.connectionOverlay?.showFailed();
      this.isMultiplayer = false;
      this.mp = null;
      // Clean up ping HUD
      this.pingDot?.destroy();
      this.pingDot = undefined;
      this.pingValueText?.destroy();
      this.pingValueText = undefined;
      this.latencyWarning?.setVisible(false);
      this.clearRemoteSprites();
      this.chat?.destroy();
      this.chat = undefined;
      this.playerList?.destroy();
      this.playerList = undefined;
      this.questLog?.destroy();
      this.questLog = undefined;
      this.factionPanel?.destroy();
      this.factionPanel = undefined;
      this.inventory?.destroy();
      this.inventory = undefined;
      this.npcDialogue?.destroy();
      this.npcDialogue = undefined;
      this.craftingPanel?.destroy();
      this.craftingPanel = undefined;
      this.tradeWindow?.destroy();
      this.tradeWindow = undefined;
      this.marketplace?.destroy();
      this.marketplace = undefined;
      this.socialPanel?.destroy();
      this.socialPanel = undefined;
      this.achievementPanel?.destroy();
      this.achievementPanel = new AchievementPanel(this); // re-create without userId for solo fallback
      this.leaderboardPanel?.destroy();
      this.leaderboardPanel = new LeaderboardPanel(this);
      // Resume local simulation after overlay hides (~2.5 s)
      this.time.delayedCall(2600, () => {
        if (!this.isDead && !this.waveTransitioning) this.spawnWave();
      });
    };

    // Create the online player count HUD item
    this.onlineCountText = this.add.text(CANVAS.WIDTH / 2, 4, '', {
      fontSize: '4px', color: '#88ffcc', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(12);

    // ── Connection quality indicator (top-right, below mute indicator) ────
    const HUD_Z = 12;
    const dotX  = CANVAS.WIDTH - 6;
    const dotY  = 35;
    this.pingDot = this.add.circle(dotX, dotY, 3, 0x44ee44)
      .setScrollFactor(0).setDepth(HUD_Z);
    this.pingValueText = this.add.text(dotX - 5, dotY + 5, '--', {
      fontSize: '4px', color: '#888899', fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(HUD_Z);

    // Make the dot interactive — show ping value tooltip on hover
    this.pingDot.setInteractive();
    this.pingDot.on('pointerover', () => this.pingValueText?.setVisible(true));
    this.pingDot.on('pointerout',  () => this.pingValueText?.setVisible(false));
    this.pingValueText.setVisible(false);

    // ── High-latency warning (top-center, below wave/online text) ────────
    this.latencyWarning = this.add.text(CANVAS.WIDTH / 2, 12, '⚠ High Latency', {
      fontSize: '5px', color: '#ffaa00', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(HUD_Z + 1).setVisible(false);

    // ── Latency callback ──────────────────────────────────────────────────
    client.onLatencyUpdate = (ms: number) => {
      if (!this.pingDot || !this.pingValueText) return;
      const color = ms < 100 ? 0x44ee44 : ms < 300 ? 0xffaa00 : 0xff4444;
      this.pingDot.setFillStyle(color);
      this.pingValueText.setText(`${ms}ms`);
      this.latencyWarning?.setVisible(ms >= 300);
    };

    // ── Maintenance notice ────────────────────────────────────────────────
    client.onMaintenanceNotice = (minutesLeft: number) => {
      this.showMaintenanceBanner(minutesLeft);
    };

    // ── Connection overlay ────────────────────────────────────────────────
    this.connectionOverlay = new ConnectionOverlay(this);

    this.updateHUD();
  }

  /** Show a dismissible maintenance banner at the top of the screen. */
  private showMaintenanceBanner(minutesLeft: number): void {
    if (!this.maintenanceBanner) {
      this.maintenanceBanner = this.add.text(CANVAS.WIDTH / 2, 22, '', {
        fontSize: '5px', color: '#ffcc44', fontFamily: 'monospace',
        stroke: '#220000', strokeThickness: 2,
        backgroundColor: '#331100',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(15).setInteractive();

      // Click to dismiss
      this.maintenanceBanner.on('pointerdown', () => {
        this.maintenanceBanner?.setVisible(false);
      });
    }
    this.maintenanceBanner.setText(
      `⚠  Server restart in ${minutesLeft} min — save your progress!  [click to dismiss]`,
    ).setVisible(true);

    // Auto-dismiss after 30 s if not dismissed manually
    this.time.delayedCall(30000, () => {
      this.maintenanceBanner?.setVisible(false);
    });
  }

  // ── NPC interaction ───────────────────────────────────────────────────────

  private handleNpcInteract(): void {
    // If a dialogue is already open, accept the quest on E
    if (this.npcDialogue?.isVisible) {
      this.npcDialogue.accept();
      return;
    }
    // Close other panels first
    this.questLog?.hide();
    this.inventory?.hide();
    // Request quest from server
    this.mp?.sendQuestNpcInteract('npc_quest');
  }

  // ── Crafting station proximity ────────────────────────────────────────────

  private updateCraftingStationHint(): void {
    if (!this.craftingStation || !this.craftStationHint || !this.player) return;
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.craftingStation.x, this.craftingStation.y,
    );
    const near = dist < 40;
    this.craftStationHint.setVisible(near && this.isMultiplayer && !this.craftingPanel?.isVisible);
  }

  // ── Server wave change ────────────────────────────────────────────────────

  private onServerWaveChange(wave: number, waveState: string): void {
    this.wave = wave;

    if (waveState === 'active') {
      const label = `Wave ${wave}/${this.mp?.zoneState.totalWaves ?? 3}`;
      this.floatingText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, `✦  ${label}  ✦`, '#ffd700');
      this.sfx.playWaveClear();
    } else if (waveState === 'complete') {
      this.time.delayedCall(1500, () => this.zoneCleared());
    }

    this.updateHUD();
  }

  // ── Remote enemy sync ─────────────────────────────────────────────────────

  private syncRemoteEnemies(): void {
    if (!this.mp) return;

    const serverEnemies = this.mp.enemies;
    const seen = new Set<string>();

    serverEnemies.forEach((re: RemoteEnemy) => {
      seen.add(re.id);

      let sprite = this.remoteEnemySprites.get(re.id);
      if (!sprite) {
        // Spawn a new sprite for this server enemy
        sprite = this.enemies.create(re.x, re.y, 'enemy') as Phaser.Physics.Arcade.Sprite;
        sprite.setDepth(10);
        sprite.setCollideWorldBounds(true);

        // Tint by enemy type if known
        const def = ENEMY_TYPES[re.type as EnemyTypeName];
        if (def) {
          sprite.setTint(def.color);
          sprite.setDisplaySize(def.size * 1.6, def.size * 1.6);
        }

        if (this.anims.exists('enemy-walk')) sprite.play('enemy-walk');

        // Mark as remote so local AI ignores it
        const extra: EnemyExtra = {
          hp: re.hp, maxHp: re.maxHp,
          typeName: (re.type ?? 'slime') as EnemyTypeName,
          patrolAngle: 0, burstTimer: 0, burstCooldown: 9999,
          burstReady: false, shootTimer: 9999, phaseTimer: 0,
          phaseInvincible: false, phase2: false,
          isTentacle: false, isPillar: false, isRemote: true,
          effects: {}, effectImmunity: {},
        };
        sprite.setData('extra', extra);

        this.remoteEnemySprites.set(re.id, sprite);
      } else {
        // Interpolate toward server position
        const lerpFactor = 0.25;
        sprite.x = Phaser.Math.Linear(sprite.x, re.x, lerpFactor);
        sprite.y = Phaser.Math.Linear(sprite.y, re.y, lerpFactor);

        // Update hp on the local extra so collision logic sees it
        const extra = sprite.getData('extra') as EnemyExtra;
        if (extra) {
          extra.hp = re.hp;
          extra.maxHp = re.maxHp;
          sprite.setData('extra', extra);
        }
      }
    });

    // Remove sprites for enemies that disappeared from server state
    this.remoteEnemySprites.forEach((sprite, id) => {
      if (!seen.has(id)) {
        sprite.destroy();
        this.remoteEnemySprites.delete(id);
      }
    });

    // Update enemy-alive count for HUD
    if (this.mp) this.mp.zoneState.enemiesAlive = serverEnemies.size;
    this.updateHUD();
  }

  // ── Remote player sync ────────────────────────────────────────────────────

  private syncRemotePlayers(): void {
    if (!this.mp) return;

    const serverPlayers = this.mp.players;
    const seen = new Set<string>();

    serverPlayers.forEach((rp: RemotePlayer) => {
      if (rp.sessionId === this.mp!.mySessionId) return; // skip self
      seen.add(rp.sessionId);

      let sprite = this.remotePlayerSprites.get(rp.sessionId);
      if (!sprite) {
        sprite = this.physics.add.sprite(rp.x, rp.y, 'player');
        sprite.setDepth(10).setTint(0x88aaff); // blue tint = remote player
        if (this.anims.exists('player-walk')) sprite.play('player-walk');
        this.remotePlayerSprites.set(rp.sessionId, sprite);

        // Right-click → initiate trade
        sprite.setInteractive();
        const capturedSessionId = rp.sessionId;
        const capturedName      = rp.name;
        sprite.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          if (ptr.rightButtonDown()) {
            if (ptr.event.shiftKey) {
              // Shift+Right-click → party invite
              this.mp?.sendPartyInvite(capturedSessionId);
              this.chat?.addMessage(`[Party] Inviting ${capturedName}…`, '#aaffaa');
            } else if (this.tradeWindow && !this.tradeWindow.isVisible) {
              // Right-click → trade
              this.tradeWindow.requestTrade(capturedSessionId, capturedName);
            }
          }
        });

        // Name label (include guild tag if present)
        const displayName = rp.guildTag ? `${rp.guildTag} ${rp.name}` : rp.name;
        const label = this.add.text(rp.x, rp.y - 12, displayName, {
          fontSize: '4px', color: '#aaddff', fontFamily: 'monospace',
          stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5).setDepth(11);
        this.remotePlayerLabels.set(rp.sessionId, label);

        // HP bar
        const hpBar = this.add.rectangle(rp.x, rp.y - 8, 12, 2, 0x00ee44)
          .setOrigin(0.5).setDepth(11);
        this.remotePlayerHpBars.set(rp.sessionId, hpBar);
      } else {
        const lerpFactor = 0.3;
        sprite.x = Phaser.Math.Linear(sprite.x, rp.x, lerpFactor);
        sprite.y = Phaser.Math.Linear(sprite.y, rp.y, lerpFactor);
      }

      // Update label + hp bar position
      const label  = this.remotePlayerLabels.get(rp.sessionId);
      const hpBar  = this.remotePlayerHpBars.get(rp.sessionId);
      const s      = this.remotePlayerSprites.get(rp.sessionId)!;

      if (label)  {
        label.x = s.x; label.y = s.y - 12;
        const newDisplayName = rp.guildTag ? `${rp.guildTag} ${rp.name}` : rp.name;
        if (label.text !== newDisplayName) label.setText(newDisplayName);
      }
      if (hpBar)  {
        hpBar.x = s.x; hpBar.y = s.y - 8;
        const pct = Math.max(0, rp.hp / rp.maxHp);
        hpBar.scaleX = pct;
        hpBar.setFillStyle(pct > 0.5 ? 0x00ee44 : pct > 0.25 ? 0xffaa00 : 0xff2222);
      }
    });

    // Remove sprites for players who left
    this.remotePlayerSprites.forEach((sprite, sid) => {
      if (!seen.has(sid)) {
        sprite.destroy();
        this.remotePlayerLabels.get(sid)?.destroy();
        this.remotePlayerHpBars.get(sid)?.destroy();
        this.remotePlayerSprites.delete(sid);
        this.remotePlayerLabels.delete(sid);
        this.remotePlayerHpBars.delete(sid);
      }
    });

    // Update online count HUD
    if (this.onlineCountText) {
      const total = this.mp.players.size; // includes self
      this.onlineCountText.setText(total > 1 ? `Online: ${total}` : '');
    }
  }

  private clearRemoteSprites(): void {
    this.remotePlayerSprites.forEach(s => s.destroy());
    this.remotePlayerLabels.forEach(l => l.destroy());
    this.remotePlayerHpBars.forEach(b => b.destroy());
    this.remotePlayerSprites.clear();
    this.remotePlayerLabels.clear();
    this.remotePlayerHpBars.clear();

    this.remoteEnemySprites.forEach(s => s.destroy());
    this.remoteEnemySprites.clear();
  }

  // ── World ─────────────────────────────────────────────────────────────────

  private buildWorld(): void {
    const W    = this.worldW;
    const H    = this.worldH;
    const WALL = 32;
    const z    = this.zone;

    // Ground texture
    const gg = this.make.graphics({ x: 0, y: 0 });
    gg.fillStyle(z.groundColor);
    gg.fillRect(0, 0, 16, 16);
    const darkerGround = Phaser.Display.Color.IntegerToColor(z.groundColor).darken(12).color;
    gg.fillStyle(darkerGround);
    [[2,3],[6,8],[10,2],[13,11],[7,6]].forEach(([x,y]) => gg.fillRect(x, y, 2, 1));
    gg.generateTexture('zone_ground', 16, 16);
    gg.destroy();

    this.add.tileSprite(W / 2, H / 2, W, H, 'zone_ground').setDepth(0);

    // Wall texture
    const wg = this.make.graphics({ x: 0, y: 0 });
    wg.fillStyle(z.wallColor);
    wg.fillRect(0, 0, 16, 16);
    const lighterWall = Phaser.Display.Color.IntegerToColor(z.wallColor).lighten(8).color;
    wg.fillStyle(lighterWall);
    wg.fillRect(15, 0, 1, 16);
    wg.fillRect(0, 15, 16, 1);
    wg.generateTexture('zone_wall', 16, 16);
    wg.destroy();

    this.add.tileSprite(W / 2,      WALL / 2, W,    WALL, 'zone_wall').setDepth(3);
    this.add.tileSprite(W / 2,  H - WALL / 2, W,    WALL, 'zone_wall').setDepth(3);
    this.add.tileSprite(WALL / 2,      H / 2, WALL,    H, 'zone_wall').setDepth(3);
    this.add.tileSprite(W - WALL / 2,  H / 2, WALL,    H, 'zone_wall').setDepth(3);

    this.physics.world.setBounds(WALL, WALL, W - WALL * 2, H - WALL * 2);

    this.addBiomeDecor(W, H, WALL);

    // Crafting station — placed in top-left corner of the zone
    this.addCraftingStation(WALL + 24, WALL + 24);

    // Transport NPC — placed in top-right corner of the zone
    this.addTransportNpc(W - WALL - 24, WALL + 24);

    // Zone name splash
    const zColor = `#${z.accentColor.toString(16).padStart(6, '0')}`;
    const banner = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, z.name, {
      fontSize: '14px', color: zColor, fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 400 });
    this.tweens.add({ targets: banner, alpha: 0, duration: 600, delay: 1200, onComplete: () => banner.destroy() });
  }

  private addBiomeDecor(W: number, H: number, WALL: number): void {
    const cx  = W / 2;
    const cy  = H / 2;
    const pts = [[90,80],[550,80],[90,280],[550,280],[220,60],[420,60],[220,300],[420,300],[150,190],[490,190]];
    const g   = this.add.graphics().setDepth(2);

    for (const [x, y] of pts) {
      if (x < WALL + 12 || x > W - WALL - 12) continue;
      if (y < WALL + 12 || y > H - WALL - 12) continue;
      if (Phaser.Math.Distance.Between(x, y, cx, cy) < 60) continue;
      g.fillStyle(this.zone.wallColor);
      g.fillRect(x - 6, y - 3, 12, 6);
      g.fillStyle(this.zone.accentColor, 0.3);
      g.fillRect(x - 4, y - 5, 4, 4);
    }
  }

  // ── Crafting station ──────────────────────────────────────────────────────

  private addCraftingStation(x: number, y: number): void {
    const g = this.add.graphics().setDepth(4);

    // Base: dark grey table
    g.fillStyle(0x553322);
    g.fillRect(-10, -6, 20, 12);
    // Anvil silhouette
    g.fillStyle(0x888888);
    g.fillRect(-7, -8, 14, 5);
    g.fillRect(-4, -13, 8, 5);
    // Glow
    g.lineStyle(1, 0xff9944, 0.7);
    g.strokeRect(-10, -6, 20, 12);

    const label = this.add.text(0, 9, 'CRAFT', {
      fontSize: '4px', color: '#ffcc88', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(4);

    const container = this.add.container(x, y, [g, label]).setDepth(4);
    this.craftingStation = container;

    // Ambient pulse tween on the label
    this.tweens.add({
      targets: label,
      alpha: 0.4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // HUD hint (fixed to camera, hidden by default)
    this.craftStationHint = this.add.text(
      CANVAS.WIDTH / 2, CANVAS.HEIGHT - 12,
      '[F] Crafting Station',
      { fontSize: '4px', color: '#ffcc88', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 },
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20).setVisible(false);
  }

  // ── Transport NPC ─────────────────────────────────────────────────────────

  private addTransportNpc(x: number, y: number): void {
    const g = this.add.graphics().setDepth(4);

    // Body: teal-robed figure
    g.fillStyle(0x226688);
    g.fillRect(-8, -10, 16, 18);
    // Head
    g.fillStyle(0xddbb99);
    g.fillRect(-5, -18, 10, 10);
    // Hat
    g.fillStyle(0x114455);
    g.fillRect(-6, -22, 12, 5);

    const label = this.add.text(0, 9, 'TRANSPORT', {
      fontSize: '3px', color: '#88ddff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(4);

    this.transportNpc = this.add.container(x, y, [g, label]).setDepth(4);

    // Bobbing animation
    this.tweens.add({
      targets: label,
      alpha: 0.5,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // HUD proximity hint (scroll-fixed)
    this.transportHint = this.add.text(
      CANVAS.WIDTH / 2, CANVAS.HEIGHT - 20,
      '[E] Fast Travel',
      { fontSize: '4px', color: '#88ddff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 },
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20).setVisible(false);

    // Fast travel panel (created once, reused)
    this.fastTravelPanel = new FastTravelPanel(this);
    this.fastTravelPanel.currentZoneId = this.zone.id;
    this.fastTravelPanel.onTravel = (zoneId, cost) => {
      this.gold = Math.max(0, this.gold - cost);
      this.updateHUD();
      this.cameras.main.fadeOut(400, 0, 0, 0, () => {
        this.scene.start(SCENES.GAME, { zoneId });
      });
    };
  }

  private updateTransportNpcHint(): void {
    if (!this.transportNpc || !this.transportHint || !this.player) return;
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.transportNpc.x, this.transportNpc.y,
    );
    const near = dist < 40;
    this.transportHint.setVisible(near && !this.fastTravelPanel?.isVisible);

    // E key near Transport NPC opens fast travel
    if (near && this.npcKey && Phaser.Input.Keyboard.JustDown(this.npcKey)) {
      if (this.fastTravelPanel) {
        const save = SaveManager.load();
        this.fastTravelPanel.currentZoneId  = this.zone.id;
        this.fastTravelPanel.unlockedZoneIds = save.unlockedZones;
        this.fastTravelPanel.playerGold     = this.gold;
        this.fastTravelPanel.open();
      }
    }
  }

  // ── Player ────────────────────────────────────────────────────────────────

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.worldW / 2, this.worldH / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    if (this.anims.exists('player-idle')) this.player.play('player-idle');
  }

  private handlePlayerMovement(delta: number): void {
    // Dodge overrides normal movement for its duration
    if (this.isDodging) {
      this.player.setVelocity(this.dodgeVx, this.dodgeVy);
      return;
    }

    let speed = (PLAYER.MOVE_SPEED + (this.level - 1) * LEVELS.SPEED_BONUS_PER_LEVEL) * (1 + this.passiveBonusCache.speedPct) * (this.weather?.speedMultiplier ?? 1);
    let vx = 0;
    let vy = 0;
    const left  = this.cursors.left.isDown  || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up    = this.cursors.up.isDown    || this.wasd.W.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.S.isDown;

    // Touch joystick overrides keyboard when active
    const tj = this.touch?.joystick;
    if (tj && (tj.dx !== 0 || tj.dy !== 0)) {
      const charm = this.charmed ? -1 : 1;
      vx = tj.dx * speed * charm;
      vy = tj.dy * speed * charm;
    } else if (this.charmed) {
      if (left)  vx =  speed; else if (right) vx = -speed;
      if (up)    vy =  speed; else if (down)  vy = -speed;
    } else {
      if (left)  vx = -speed; else if (right) vx =  speed;
      if (up)    vy = -speed; else if (down)  vy =  speed;
    }
    // Normalize diagonal movement to prevent ~41% speed boost
    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.SQRT2;
      vx *= inv;
      vy *= inv;
    }

    // Status effect movement penalties
    if (this.playerEffects.stun) {
      vx = 0;
      vy = 0;
    } else if (this.playerEffects.freeze) {
      const sm = STATUS_EFFECTS.freeze.speedMult ?? 0.5;
      vx *= sm;
      vy *= sm;
    }

    // Tutorial: notify movement
    if (this.tutorial && (vx !== 0 || vy !== 0)) this.tutorial.notifyMoved();

    // Sprint: hold Shift (or touch sprint button) while moving, mana must be available
    const wantsToSprint = (this.sprintKey.isDown || (this.touch?.sprint.isDown ?? false)) && (vx !== 0 || vy !== 0) && this.mana > 0;
    if (wantsToSprint) {
      speed *= SPRINT.SPEED_MULT;
      vx    *= SPRINT.SPEED_MULT;
      vy    *= SPRINT.SPEED_MULT;
      this.mana = Math.max(0, this.mana - SPRINT.MANA_COST_PER_SEC * delta / 1000);

      // Spawn dust trail periodically
      this.sprintDustTimer -= delta;
      if (this.sprintDustTimer <= 0) {
        this.spawnBurst(this.player.x, this.player.y + 4, [0xaaddaa, 0xdddddd, 0xffffff], 3, 28);
        this.sprintDustTimer = 90;
      }
      // Tutorial: notify sprint
      this.tutorial?.notifySprinted();
    } else {
      this.sprintDustTimer = 0;
    }

    this.player.setVelocity(vx, vy);

    if (this.anims.exists('player-walk') && this.anims.exists('player-idle')) {
      const moving  = vx !== 0 || vy !== 0;
      const current = this.player.anims.currentAnim?.key;
      if (moving  && current !== 'player-walk') this.player.play('player-walk');
      if (!moving && current !== 'player-idle') this.player.play('player-idle');
    }

    // Send position to server in multiplayer mode
    if (this.isMultiplayer && this.mp) {
      const facingX = vx !== 0 ? Math.sign(vx) : 1;
      const facingY = vy !== 0 ? Math.sign(vy) : 0;
      this.mp.sendMove(this.player.x, this.player.y, facingX, facingY);
    }
  }

  private updateCharmStatus(time: number): void {
    if (this.charmed && time > this.charmedUntil) {
      this.charmed = false;
      this.charmIndicator?.setVisible(false);
      const effectTint = this.getPlayerStatusTint();
      if (effectTint !== null) this.player.setTint(effectTint);
      else this.player.clearTint();
    }
  }

  // ── Status Effects ────────────────────────────────────────────────────────

  /** Returns the tint color for the highest-priority active player status effect, or null. */
  private getPlayerStatusTint(): number | null {
    for (const key of ['stun', 'freeze', 'burn', 'poison'] as EffectKey[]) {
      if (this.playerEffects[key]) return STATUS_EFFECTS[key].tint;
    }
    return null;
  }

  /** Apply a status effect to the local player (respects immunity). */
  private applyEffectToPlayer(effectKey: EffectKey, time: number): void {
    const immuneUntil = this.playerEffectImmunity[effectKey] ?? 0;
    if (time < immuneUntil) return;
    const def = STATUS_EFFECTS[effectKey];
    this.playerEffects[effectKey] = {
      expiresAt:  time + def.durationMs,
      nextTickAt: def.tickIntervalMs ? time + def.tickIntervalMs : 0,
      ticksLeft:  def.ticks ?? 0,
    };
    const tintHex = `#${def.tint.toString(16).padStart(6, '0')}`;
    this.floatingText(this.player.x, this.player.y - 16, effectKey.toUpperCase() + '!', tintHex);
    this.sfx.playStatusApply(effectKey);
  }

  /** Apply a status effect to an enemy (respects immunity). */
  private applyEffectToEnemy(
    e: Phaser.Physics.Arcade.Sprite,
    extra: EnemyExtra,
    effectKey: EffectKey,
    time: number,
  ): void {
    const immuneUntil = extra.effectImmunity[effectKey] ?? 0;
    if (time < immuneUntil) return;
    const def = STATUS_EFFECTS[effectKey];
    extra.effects[effectKey] = {
      expiresAt:  time + def.durationMs,
      nextTickAt: def.tickIntervalMs ? time + def.tickIntervalMs : 0,
      ticksLeft:  def.ticks ?? 0,
    };
    e.setData('extra', extra);
    const burstColors: Record<EffectKey, number[]> = {
      poison: [0x44ee44, 0x22aa22, 0x88ff88],
      burn:   [0xff7722, 0xff8844, 0xffaa00],
      freeze: [0x88ccff, 0xaaddff, 0xffffff],
      stun:   [0xffffaa, 0xffff44, 0xffffff],
    };
    this.spawnBurst(e.x, e.y, burstColors[effectKey], effectKey === 'stun' ? 8 : 5, effectKey === 'stun' ? 100 : 70);
    const tintHex = `#${def.tint.toString(16).padStart(6, '0')}`;
    this.floatingText(e.x, e.y - 12, effectKey.toUpperCase() + '!', tintHex);
    this.sfx.playStatusApply(effectKey);
  }

  /** Tick active status effects for both the player and all enemies. */
  private updateStatusEffects(time: number): void {
    const effectKeys: EffectKey[] = ['stun', 'freeze', 'burn', 'poison'];

    // ── Player ──────────────────────────────────────────────────────────────
    let playerTint: number | null = null;
    for (const key of effectKeys) {
      const state = this.playerEffects[key];
      if (!state) continue;

      if (time > state.expiresAt) {
        this.playerEffectImmunity[key] = time + STATUS_EFFECTS[key].immunityMs;
        delete this.playerEffects[key];
        this.sfx.playStatusExpire();
        continue;
      }

      const def = STATUS_EFFECTS[key];
      if (def.dmgPerTick && state.ticksLeft > 0 && time >= state.nextTickAt) {
        state.nextTickAt = time + (def.tickIntervalMs ?? 2000);
        state.ticksLeft--;
        this.applyDotDamage(def.dmgPerTick, key);
      }

      if (playerTint === null) playerTint = def.tint;
    }

    // Maintain persistent tint for active effects (don't fight dodge/charm tints)
    if (!this.isDodging && !this.charmed) {
      if (playerTint !== null) this.player.setTint(playerTint);
    }

    // ── Enemies ─────────────────────────────────────────────────────────────
    this.enemies.getChildren().forEach(obj => {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const extra = e.getData('extra') as EnemyExtra;
      if (!extra?.effects) return;

      let enemyEffectTint: number | null = null;

      for (const key of effectKeys) {
        const state = extra.effects[key];
        if (!state) continue;

        if (time > state.expiresAt) {
          extra.effectImmunity[key] = time + STATUS_EFFECTS[key].immunityMs;
          delete extra.effects[key];
          e.setData('extra', extra);
          this.sfx.playStatusExpire();
          continue;
        }

        const def = STATUS_EFFECTS[key];
        if (def.dmgPerTick && state.ticksLeft > 0 && time >= state.nextTickAt) {
          state.nextTickAt = time + (def.tickIntervalMs ?? 2000);
          state.ticksLeft--;
          extra.hp -= def.dmgPerTick;
          const tintHex = `#${def.tint.toString(16).padStart(6, '0')}`;
          this.floatingText(e.x, e.y - 10, `-${def.dmgPerTick}`, tintHex);
          if (key === 'poison') this.spawnBurst(e.x, e.y, [def.tint, 0x22aa22], 3, 40);
          else if (key === 'burn') this.spawnBurst(e.x, e.y, [def.tint, 0xff8844], 4, 60);
          e.setData('extra', extra);
          if (extra.hp <= 0) { this.killEnemy(e); return; }
        }

        if (enemyEffectTint === null) enemyEffectTint = def.tint;
      }

      if (enemyEffectTint !== null) {
        e.setTint(enemyEffectTint);
      } else if (!extra.phaseInvincible) {
        // Restore base color when no effect is active
        const col = extra.typeName === 'boss'
          ? BOSS_TYPES[extra.bossType!].color
          : (ENEMY_TYPES[extra.typeName as EnemyTypeName]?.color ?? 0xffffff);
        e.setTint(col);
      }
    });

    // ── HUD ──────────────────────────────────────────────────────────────────
    for (const key of effectKeys) {
      this.statusHudIndicators[key]?.setVisible(!!this.playerEffects[key]);
    }
  }

  /** Apply DoT damage to the player without triggering full hit feedback. */
  private applyDotDamage(dmg: number, effectKey: EffectKey): void {
    this.hp = Math.max(0, this.hp - dmg);
    const def = STATUS_EFFECTS[effectKey];
    const tintHex = `#${def.tint.toString(16).padStart(6, '0')}`;
    this.floatingText(this.player.x, this.player.y - 14, `-${dmg}`, tintHex);
    const burstColors: Record<EffectKey, number[]> = {
      poison: [0x44ee44, 0x22aa22, 0x88ff88],
      burn:   [0xff7722, 0xff8844, 0xffaa00],
      freeze: [0x88ccff, 0xaaddff, 0xffffff],
      stun:   [0xffffaa, 0xffff44, 0xffffff],
    };
    this.spawnBurst(this.player.x, this.player.y, burstColors[effectKey], 3, 50);
    this.updateHUD();
    if (this.hp <= 0) this.playerDead();
  }

  /** After enemy AI sets velocity, clamp it for frozen/stunned enemies. */
  private applyEnemyStatusVelocity(): void {
    const now = this.time.now;
    this.enemies.getChildren().forEach(obj => {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const extra = e.getData('extra') as EnemyExtra;
      if (!extra?.effects || extra.isPillar || extra.isTentacle || extra.isRemote) return;

      if (extra.effects.stun && now < extra.effects.stun.expiresAt) {
        e.setVelocity(0, 0);
      } else if (extra.effects.freeze && now < extra.effects.freeze.expiresAt) {
        const body = e.body as Phaser.Physics.Arcade.Body;
        body.velocity.scale(STATUS_EFFECTS.freeze.speedMult ?? 0.5);
      }
    });
  }

  private regenMana(delta: number): void {
    this.mana = Math.min(this.getMaxMana(), this.mana + this.getEffectiveManaRegen() * delta / 1000);
    if (this.manaBar) this.manaBar.scaleX = Math.max(0, this.mana / this.getMaxMana());
  }

  private handleDodgeRoll(time: number): void {
    // End dodge when duration expires
    if (this.isDodging && time >= this.dodgeEndTime) {
      this.isDodging = false;
      this.dodgeCooldownEndTime = time + DODGE.COOLDOWN_MS;
      const effectTint = this.getPlayerStatusTint();
      if (effectTint !== null && !this.charmed) this.player.setTint(effectTint);
      else if (!this.charmed) this.player.clearTint();
    }

    // Trigger new dodge on Q press or touch dodge button
    if (!Phaser.Input.Keyboard.JustDown(this.dodgeKey) && !(this.touch?.dodge.justPressed)) return;
    if (this.isDodging) return;
    if (time < this.dodgeCooldownEndTime) return;
    if (this.mana < DODGE.MANA_COST) return;

    // Determine dash direction from movement input (fallback: right)
    const left  = this.cursors.left.isDown  || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up    = this.cursors.up.isDown    || this.wasd.W.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.S.isDown;
    const tj = this.touch?.joystick;
    let dx: number;
    let dy: number;
    if (tj && (tj.dx !== 0 || tj.dy !== 0)) {
      dx = tj.dx;
      dy = tj.dy;
    } else {
      dx = (right ? 1 : 0) - (left ? 1 : 0);
      dy = (down  ? 1 : 0) - (up   ? 1 : 0);
    }
    if (dx === 0 && dy === 0) dx = 1; // default dash right
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    // Consume mana and start dash
    this.mana -= DODGE.MANA_COST;
    this.isDodging  = true;
    this.tutorial?.notifyDodged();
    this.dodgeEndTime = time + DODGE.DURATION_MS;
    this.dodgeVx    = dx * DODGE.DASH_SPEED;
    this.dodgeVy    = dy * DODGE.DASH_SPEED;
    this.sfx.playDodge();

    // Visual feedback: white-blue flash tint for roll duration
    this.player.setTint(0xaaddff);

    // Burst particles in dash direction
    this.spawnBurst(this.player.x, this.player.y, [0xaaddff, 0xffffff, 0x88bbff], 6, 90);

    // Screen flash (subtle)
    this.screenFlash(0x4488ff, 0.08);
  }

  private updateDodgeCooldownHUD(time: number): void {
    if (!this.dodgeCooldownText) return;
    const ready = !this.isDodging && time >= this.dodgeCooldownEndTime;
    if (ready) {
      this.dodgeCooldownText.setText('Q DODGE').setColor('#44ffaa');
    } else {
      const remaining = Math.ceil((this.dodgeCooldownEndTime - time) / 1000);
      const label = this.isDodging ? 'ROLLING' : `Q ${remaining}s`;
      this.dodgeCooldownText.setText(label).setColor('#888888');
    }
  }

  // ── Wave management (solo) ────────────────────────────────────────────────

  private spawnWave(): void {
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.pillars    = [];
    this.tentacles  = [];
    this.bossSprite = undefined;
    this.bossAlive  = false;
    this.waveTransitioning = false;

    const totalWaves = this.zone.waves;
    this.isBossWave  = this.wave > totalWaves;

    if (this.isBossWave) {
      this.spawnBossWave();
      this.sfx.startBossMusic(this.zone.bossType);
    } else {
      this.spawnNormalWave();
      this.sfx.startCombatMusic();
    }
    this.physics.add.collider(this.enemies, this.enemies);
    this.updateHUD();
  }

  private spawnNormalWave(): void {
    const count = 4 + (this.wave - 1) * 2;
    const types = this.zone.enemyTypes;
    const WALL  = 52;

    for (let i = 0; i < count; i++) {
      const typeName = types[i % types.length];
      const def      = ENEMY_TYPES[typeName];
      const hpScale  = (1 + (this.wave - 1) * COMBAT.WAVE_HP_SCALE_PER_WAVE + (this.level - 1) * 0.15)
                       * this.zone.difficultyMult;
      const hp       = Math.floor(def.baseHp * hpScale);
      const pos      = this.safeSpawnPos(WALL);
      const e        = this.spawnEnemyAt(pos.x, pos.y, typeName, hp);
      if (def.behaviour === 'stationary') {
        e.setVelocity(0, 0);
        (e.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      }
    }
  }

  private spawnBossWave(): void {
    const bossDef = BOSS_TYPES[this.zone.bossType];
    const hpScale = (1 + (this.level - 1) * 0.25) * this.zone.difficultyMult;
    const hp      = Math.floor(bossDef.baseHp * hpScale);

    const boss = this.spawnEnemyAt(this.worldW / 2, this.worldH / 2 - 40, 'boss' as EnemyTypeName, hp);
    boss.setTint(bossDef.color);
    boss.setDisplaySize(bossDef.size * 1.6, bossDef.size * 1.6);
    boss.setDepth(12);

    const extra      = boss.getData('extra') as EnemyExtra;
    extra.bossType   = this.zone.bossType;
    extra.typeName   = 'boss';
    boss.setData('extra', extra);
    this.bossSprite  = boss;
    this.bossAlive   = true;

    this.showBossHpBar(bossDef.name, hp, hp);

    if (this.zone.bossType === 'archon') {
      this.spawnPillars();
      this.floatingText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 30, 'Destroy the crystal pillars!', '#cc88ff');
    } else if (this.zone.bossType === 'kraken') {
      (boss.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      boss.setVelocity(0, 0);
      this.spawnTentacles(4);
      this.floatingText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 30, 'Sever the tentacles!', '#44ffaa');
    }
  }

  private spawnEnemyAt(x: number, y: number, typeName: EnemyTypeName | 'boss', hp: number): Phaser.Physics.Arcade.Sprite {
    const e = this.enemies.create(x, y, 'enemy') as Phaser.Physics.Arcade.Sprite;
    e.setCollideWorldBounds(true);
    e.setDepth(10);

    if (typeName !== 'boss' && typeName in ENEMY_TYPES) {
      const def = ENEMY_TYPES[typeName as EnemyTypeName];
      e.setTint(def.color);
      e.setDisplaySize(def.size * 1.6, def.size * 1.6);
    }
    if (this.anims.exists('enemy-walk')) e.play('enemy-walk');

    const extra: EnemyExtra = {
      hp,
      maxHp:           hp,
      typeName:        typeName as EnemyTypeName,
      patrolAngle:     Phaser.Math.FloatBetween(0, Math.PI * 2),
      burstTimer:      0,
      burstCooldown:   Phaser.Math.Between(1200, 2200),
      burstReady:      false,
      shootTimer:      Phaser.Math.Between(1000, 2200),
      phaseTimer:      0,
      phaseInvincible: false,
      phase2:          false,
      isTentacle:      false,
      isPillar:        false,
      isRemote:        false,
      effects:         {},
      effectImmunity:  {},
    };
    e.setData('extra', extra);
    return e;
  }

  private safeSpawnPos(WALL: number): { x: number; y: number } {
    const cx = this.worldW / 2;
    const cy = this.worldH / 2;
    let x: number, y: number;
    do {
      x = Phaser.Math.Between(WALL, this.worldW - WALL);
      y = Phaser.Math.Between(WALL, this.worldH - WALL);
    } while (Phaser.Math.Distance.Between(x, y, cx, cy) < 100);
    return { x, y };
  }

  // ── Boss mechanics ────────────────────────────────────────────────────────

  private spawnPillars(): void {
    const cx = this.worldW / 2;
    const cy = this.worldH / 2;
    for (const [dx, dy] of [[-80,-60],[80,-60],[-80,60],[80,60]]) {
      const p = this.enemies.create(cx + dx, cy + dy, 'enemy') as Phaser.Physics.Arcade.Sprite;
      p.setTint(0x9955ee);
      p.setDisplaySize(14, 14);
      (p.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      p.setVelocity(0, 0);
      p.setDepth(9);
      const extra: EnemyExtra = {
        hp: 80, maxHp: 80, typeName: 'slime', patrolAngle: 0,
        burstTimer: 0, burstCooldown: 9999, burstReady: false,
        shootTimer: 9999, phaseTimer: 0, phaseInvincible: false,
        phase2: false, isTentacle: false, isPillar: true, isRemote: false,
        effects: {}, effectImmunity: {},
      };
      p.setData('extra', extra);
      this.pillars.push(p);
    }
  }

  private spawnTentacles(count: number): void {
    const cx = this.worldW / 2;
    const cy = this.worldH / 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const t = this.enemies.create(cx + Math.cos(angle) * 70, cy + Math.sin(angle) * 70, 'enemy') as Phaser.Physics.Arcade.Sprite;
      t.setTint(0x227755);
      t.setDisplaySize(12, 20);
      (t.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      t.setVelocity(0, 0);
      t.setDepth(9);
      const hp = 120;
      const extra: EnemyExtra = {
        hp, maxHp: hp, typeName: 'slime', patrolAngle: 0,
        burstTimer: 0, burstCooldown: 9999, burstReady: false,
        shootTimer: 9999, phaseTimer: 0, phaseInvincible: false,
        phase2: false, isTentacle: true, isPillar: false, isRemote: false,
        effects: {}, effectImmunity: {},
      };
      t.setData('extra', extra);
      this.tentacles.push(t);
    }
  }

  // ── Enemy AI (solo only) ──────────────────────────────────────────────────

  private updateEnemyAI(_time: number, delta: number): void {
    this.enemies.getChildren().forEach(obj => {
      const e     = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const extra = e.getData('extra') as EnemyExtra;
      if (!extra) return;
      if (extra.isRemote) return; // handled by server
      if (extra.isPillar || extra.isTentacle) return;

      if (extra.typeName === 'boss') {
        this.updateBossAI(e, extra, delta);
        return;
      }

      const def  = ENEMY_TYPES[extra.typeName as EnemyTypeName];
      if (!def)  return;

      const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      const spd  = def.speed + (this.level - 1) * 2;

      // Wraith phase cycling
      if (def.behaviour === 'phase') {
        extra.phaseTimer += delta;
        const cycle = extra.phaseInvincible ? 800 : 2000;
        if (extra.phaseTimer >= cycle) {
          extra.phaseTimer     = 0;
          extra.phaseInvincible = !extra.phaseInvincible;
          e.setAlpha(extra.phaseInvincible ? 0.22 : 1.0);
        }
      }

      // Stationary
      if (def.behaviour === 'stationary') {
        e.setVelocity(0, 0);
        e.setData('extra', extra);
        return;
      }

      // Ranged shoot
      if (['ranged','ranged_flee','charm'].includes(def.behaviour)) {
        extra.shootTimer -= delta;
        if (extra.shootTimer <= 0 && dist < def.aggroRange * 1.5) {
          this.fireProjectile(e, def.baseDmg, def.projectileColor ?? 0xffaa44, def.behaviour === 'charm');
          extra.shootTimer = def.behaviour === 'charm' ? 3500 : 2200;
        }
      }

      // Movement
      if (dist < def.aggroRange) {
        const dx  = this.player.x - e.x;
        const dy  = this.player.y - e.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        if (def.behaviour === 'burst') {
          extra.burstTimer += delta;
          if (extra.burstTimer >= extra.burstCooldown) {
            extra.burstTimer    = 0;
            extra.burstCooldown = Phaser.Math.Between(1200, 2200);
            extra.burstReady    = true;
          }
          if (extra.burstReady) {
            e.setVelocity((dx / len) * spd * 3.2, (dy / len) * spd * 3.2);
            this.time.delayedCall(220, () => {
              if (e.active) { extra.burstReady = false; e.setData('extra', extra); }
            });
          } else {
            e.setVelocity(0, 0);
          }
        } else if (def.behaviour === 'ranged_flee') {
          if (dist < 55) {
            e.setVelocity(-(dx / len) * spd, -(dy / len) * spd);
          } else {
            const side = new Phaser.Math.Vector2(-dy, dx).normalize();
            e.setVelocity(side.x * spd * 0.8, side.y * spd * 0.8);
          }
        } else if (def.behaviour === 'sidestep') {
          const side = new Phaser.Math.Vector2(-dy, dx).normalize();
          e.setVelocity(
            (dx / len) * spd * 0.5 + side.x * spd * 0.9,
            (dy / len) * spd * 0.5 + side.y * spd * 0.9,
          );
        } else {
          e.setVelocity((dx / len) * spd, (dy / len) * spd);
        }
      } else {
        const angle = extra.patrolAngle + 0.015;
        extra.patrolAngle = angle;
        e.setVelocity(Math.cos(angle) * def.speed * 0.5, Math.sin(angle) * def.speed * 0.5);
      }

      e.setData('extra', extra);
    });
  }

  private updateBossAI(e: Phaser.Physics.Arcade.Sprite, extra: EnemyExtra, delta: number): void {
    const bossType = extra.bossType!;
    const bossDef  = BOSS_TYPES[bossType];
    const dist     = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);

    // Kraken: stationary, fires ink spray
    if (bossType === 'kraken') {
      e.setVelocity(0, 0);
      extra.shootTimer -= delta;
      if (extra.shootTimer <= 0 && dist < 200) {
        this.fireProjectile(e, Math.floor(bossDef.baseDmg * 0.7), 0x113355, false);
        extra.shootTimer = 2200;
      }
      e.setData('extra', extra);
      return;
    }

    // Archon: immune + shoots
    if (bossType === 'archon') {
      const pilarAlive = this.pillars.some(p => p.active);
      e.setAlpha(pilarAlive ? 0.35 : 1.0);
      extra.shootTimer -= delta;
      if (extra.shootTimer <= 0 && dist < 220 && !pilarAlive) {
        this.fireProjectile(e, bossDef.baseDmg, 0xcc88ff, false);
        extra.shootTimer = 1800;
      }
    }

    // Bandit chief: shoots
    if (bossType === 'bandit_chief') {
      extra.shootTimer -= delta;
      if (extra.shootTimer <= 0 && dist < 220) {
        this.fireProjectile(e, bossDef.baseDmg, 0xff4422, false);
        extra.shootTimer = 1600;
      }
    }

    // Phase 2 trigger at 40% HP
    if (!extra.phase2 && extra.hp < extra.maxHp * 0.4) {
      extra.phase2 = true;
      this.triggerBossPhase2(e, extra);
    }

    // Move toward player
    if (bossDef.speed > 0) {
      const dx  = this.player.x - e.x;
      const dy  = this.player.y - e.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd = bossDef.speed * (extra.phase2 ? 1.6 : 1.0);
      e.setVelocity((dx / len) * spd, (dy / len) * spd);
    }

    e.setData('extra', extra);
  }

  private triggerBossPhase2(e: Phaser.Physics.Arcade.Sprite, extra: EnemyExtra): void {
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    const txt = this.add.text(cx, cy - 20, '⚡ ENRAGED!', {
      fontSize: '8px', color: '#ff4422', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: txt, alpha: 1, duration: 300 });
    this.tweens.add({ targets: txt, alpha: 0, y: cy - 40, duration: 1000, delay: 800, onComplete: () => txt.destroy() });

    this.screenFlash(0xff0000, 0.3);
    this.cameras.main.shake(300, 0.018);

    if (extra.bossType === 'slime_king') {
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        this.spawnEnemyAt(e.x + Math.cos(ang) * 30, e.y + Math.sin(ang) * 30, 'slime_mini', 30);
      }
    } else if (extra.bossType === 'bandit_chief') {
      for (let i = 0; i < 3; i++) {
        const pos = this.safeSpawnPos(52);
        this.spawnEnemyAt(pos.x, pos.y, 'bandit', 60);
      }
    } else if (extra.bossType === 'kraken') {
      this.tentacles = this.tentacles.filter(t => t.active);
      if (this.tentacles.length < 2) this.spawnTentacles(2);
    }
  }

  // ── Projectile system ─────────────────────────────────────────────────────

  private fireProjectile(
    enemy: Phaser.Physics.Arcade.Sprite,
    dmg: number,
    color: number,
    isCharm: boolean,
  ): void {
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const proj  = this.projectiles.create(enemy.x, enemy.y, 'particle') as Phaser.Physics.Arcade.Sprite;
    proj.setDepth(15);
    proj.setTint(color);
    proj.setDisplaySize(5, 5);
    proj.setVelocity(Math.cos(angle) * 130, Math.sin(angle) * 130);
    proj.setData('damage',  Math.floor(dmg * (1 + (this.level - 1) * 0.1)));
    proj.setData('isCharm', isCharm);
    // Tag projectile with status effect based on enemy type
    const extra = enemy.getData('extra') as EnemyExtra;
    const typeName = extra?.typeName as string ?? '';
    const statusEffect = PROJECTILE_STATUS_ON_HIT[typeName as EnemyTypeName | BossTypeName];
    if (statusEffect) proj.setData('statusEffect', statusEffect);
    this.time.delayedCall(2500, () => { if (proj.active) proj.destroy(); });
  }

  private cleanProjectiles(): void {
    this.projectiles.getChildren().forEach(obj => {
      const p = obj as Phaser.Physics.Arcade.Sprite;
      if (!p.active) return;
      if (p.x < 0 || p.x > this.worldW || p.y < 0 || p.y > this.worldH) p.destroy();
    });
  }

  // ── Attack ────────────────────────────────────────────────────────────────

  private handleAttack(time: number): void {
    if (this.chat?.active || this.socialPanel?.active) return; // don't attack while chat/social input is open
    if (this.playerEffects.stun) return; // stunned — can't attack
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey) && !(this.touch?.attack.justPressed)) return;
    const attackCd = Math.round(COMBAT.ATTACK_COOLDOWN_MS * Math.max(0.2, 1 - this.passiveBonusCache.attackCdReductionPct));
    if (time - this.lastAttackTime < attackCd) return;

    this.lastAttackTime = time;
    this.mana = Math.max(0, this.mana - MANA.ATTACK_COST);
    this.sfx.playAttack();
    this.tutorial?.notifyAttacked();

    // Notify server
    if (this.isMultiplayer && this.mp) this.mp.sendAttack();

    this.tweens.add({ targets: this.player, scaleX: 1.25, scaleY: 0.82, duration: 55, yoyo: true, ease: 'Power2' });

    if (this.anims.exists('player-attack')) {
      this.player.play('player-attack');
      this.player.once('animationcomplete', () => {
        if (!this.isDead && this.anims.exists('player-idle')) this.player.play('player-idle');
      });
    }

    this.showAttackRing();

    // In multiplayer: damage is resolved server-side, but we still do local VFX
    // for responsiveness by checking nearby enemies visually.
    const berserk    = time < this.berserkUntil ? 1.5 : 1.0;
    const surge      = time < this.arcaneSurgeUntil ? 2.0 : 1.0;
    const dmg = Math.floor(
      (COMBAT.ATTACK_DAMAGE + (this.level - 1) * LEVELS.DAMAGE_BONUS_PER_LEVEL)
      * (1 + this.passiveBonusCache.damagePct) * berserk * surge,
    );
    const critChance = 0.05 + this.passiveBonusCache.critChancePct;
    let   hitAny = false;

    this.enemies.getChildren().forEach(obj => {
      const e     = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const extra = e.getData('extra') as EnemyExtra;
      if (!extra)  return;

      const hitRadius = COMBAT.ATTACK_RANGE_PX + (e.displayWidth / 2);
      const dist      = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist > hitRadius) return;

      if (this.isMultiplayer && extra.isRemote) {
        // Server handles damage; show VFX only
        hitAny = true;
        this.spawnBurst(e.x, e.y, [0xffffff, 0xffe040, 0xf0f0f0], 5, 110);
        this.sfx.playHit();
        this.floatingText(e.x, e.y - 10, `hit!`, '#ffaaaa');
        return;
      }

      // Solo: full local damage resolution
      // Archon immunity while pillars alive
      if (extra.typeName === 'boss' && extra.bossType === 'archon' && this.pillars.some(p => p.active)) return;
      // Kraken immunity while tentacles alive
      if (extra.typeName === 'boss' && extra.bossType === 'kraken' && this.tentacles.some(t => t.active)) return;
      // Wraith phase immunity
      if (extra.phaseInvincible) return;

      const def = extra.typeName !== 'boss' ? ENEMY_TYPES[extra.typeName as EnemyTypeName] : null;

      // Sentry reflect
      if (def?.behaviour === 'stationary') {
        this.applyDamageToPlayer(Math.floor(dmg * 0.5), time, 0xff00ff);
        this.floatingText(this.player.x, this.player.y - 12, 'REFLECTED!', '#ff88ff');
        return;
      }

      // Raider block (40% chance)
      if (def?.behaviour === 'block' && Math.random() < 0.4) {
        this.floatingText(e.x, e.y - 10, 'BLOCKED', '#5588ff');
        e.setTint(0xaaaaff);
        this.time.delayedCall(100, () => { if (e.active) e.setTint(def.color); });
        return;
      }

      hitAny = true;

      const isCrit = Math.random() < critChance;
      const hitDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;
      extra.hp -= hitDmg;
      e.setData('extra', extra);

      // Zone-infused weapon: player attacks carry a zone-specific effect (25% chance on non-boss enemies)
      if (extra.typeName !== 'boss' && !extra.isPillar && !extra.isTentacle && Math.random() < 0.25) {
        const zoneEffectMap: Partial<Record<string, EffectKey>> = {
          zone1: 'poison',
          zone2: 'burn',
          zone5: 'freeze',
        };
        const zoneEffect = zoneEffectMap[this.zone.id];
        if (zoneEffect) this.applyEffectToEnemy(e, extra, zoneEffect, time);
      }

      const kbMult = def ? def.knockbackMultiplier : 1.0;
      const dx     = e.x - this.player.x;
      const dy     = e.y - this.player.y;
      const len    = Math.sqrt(dx * dx + dy * dy) || 1;
      e.setVelocity((dx / len) * COMBAT.ATTACK_KNOCKBACK * kbMult, (dy / len) * COMBAT.ATTACK_KNOCKBACK * kbMult);

      e.setTint(0xffffff);
      this.time.delayedCall(80, () => {
        if (!e.active) return;
        const ex2  = e.getData('extra') as EnemyExtra;
        const col  = ex2.typeName === 'boss' ? BOSS_TYPES[ex2.bossType!].color
                   : (ENEMY_TYPES[ex2.typeName as EnemyTypeName]?.color ?? 0xffffff);
        e.setTint(col);
      });

      this.spawnBurst(e.x, e.y, isCrit ? [0xffe040, 0xffff80, 0xffffff] : [0xffffff, 0xffe040, 0xf0f0f0], isCrit ? 9 : 5, isCrit ? 150 : 110);
      if (isCrit) {
        this.sfx.playCriticalHit();
      } else {
        this.sfx.playHit();
      }
      if (isCrit) {
        this.floatingText(e.x, e.y - 10, `✦${hitDmg}!`, '#ffe040');
      } else {
        this.floatingText(e.x, e.y - 10, `-${hitDmg}`, '#ffffff');
      }

      if (extra.hp <= 0) this.killEnemy(e);
    });

    if (hitAny) {
      this.cameras.main.shake(70, 0.004);
    } else {
      this.sfx.playMiss();
    }
    this.updateHUD();
  }

  // ── Enemy death ───────────────────────────────────────────────────────────

  private killEnemy(e: Phaser.Physics.Arcade.Sprite): void {
    const extra = e.getData('extra') as EnemyExtra;

    if (extra.isPillar) {
      this.pillars = this.pillars.filter(p => p !== e);
      this.spawnBurst(e.x, e.y, [0xcc88ff, 0x8844cc, 0xffffff], 8, 140);
      e.destroy();
      if (this.pillars.length === 0) {
        this.floatingText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 10, '✦ PILLARS DESTROYED — Attack the Archon!', '#cc88ff');
      }
      return;
    }

    if (extra.isTentacle) {
      this.tentacles = this.tentacles.filter(t => t !== e);
      this.spawnBurst(e.x, e.y, [0x227755, 0x44ffaa, 0xffffff], 8, 140);
      e.destroy();
      if (this.tentacles.length === 0) {
        this.floatingText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 10, '✦ TENTACLES SEVERED — Attack the Kraken!', '#44ffaa');
      }
      return;
    }

    const isBoss  = extra.typeName === 'boss';
    const baseXp  = isBoss
      ? BOSS_TYPES[extra.bossType!].xpValue
      : (ENEMY_TYPES[extra.typeName as EnemyTypeName]?.xpValue ?? 10);
    const xpGain  = Math.floor(baseXp * this.zone.difficultyMult);

    this.kills++;
    this.xp    += xpGain;
    this.score += xpGain * 10;
    this.gold  += isBoss ? Phaser.Math.Between(40, 80) : Phaser.Math.Between(5, 20);

    // Bloodthirst passive: restore HP on non-boss kills
    if (!isBoss && this.passiveBonusCache.healOnKill > 0) {
      this.hp = Math.min(this.getMaxHp(), this.hp + this.passiveBonusCache.healOnKill);
    }

    // Achievement tracking — kills and boss kills
    const killUnlocks = AchievementTracker.recordEvent('kill', { count: 1 });
    killUnlocks.forEach(a => this.showAchievementUnlock(a));
    this.fireAchievementEvent('enemy_killed', { isBoss });
    if (isBoss) {
      const bossUnlocks = AchievementTracker.recordEvent('boss_kill');
      bossUnlocks.forEach(a => this.showAchievementUnlock(a));
    }

    this.spawnBurst(e.x, e.y, [0xd42020, 0xf06020, 0x2b2b2b, 0x4a4a4a], isBoss ? 18 : 10, isBoss ? 200 : 140);
    this.sfx.playKill();
    this.cameras.main.shake(isBoss ? 300 : 100, isBoss ? 0.02 : 0.006);
    this.hitStop(isBoss ? 100 : 55);
    this.spawnXpOrb(e.x, e.y, xpGain);
    this.floatingText(e.x, e.y - 14, `+${xpGain} XP`, '#44ff88');

    // Loot table roll — tier-appropriate drop rates
    const rareRoll  = Math.random();
    const epicRoll  = Math.random();
    const rareRate  = isBoss ? LOOT.RARE_DROP_RATE_BOSS  : LOOT.RARE_DROP_RATE_NORMAL;
    const epicRate  = isBoss ? LOOT.EPIC_DROP_RATE_BOSS  : 0;
    if (epicRate > 0 && epicRoll < epicRate) {
      this.floatingText(e.x, e.y - 22, '✦ EPIC DROP!', '#aa44ff');
    } else if (rareRoll < rareRate) {
      this.floatingText(e.x, e.y - 22, '✦ RARE DROP!', '#4488ff');
    }

    if (isBoss) {
      this.bossAlive    = false;
      this.bossSprite   = undefined;
      this.bossHudVisible = false;
      this.sfx.stopBossMusic();
    }

    e.destroy();
    this.checkLevelUp();
    this.updateHUD();
    if (!this.waveTransitioning) this.checkWaveComplete();
  }

  // ── Player damage ─────────────────────────────────────────────────────────

  private handleEnemyContact(time: number): void {
    if (this.isDodging || time < this.dodgeEndTime + (DODGE.INVULN_MS - DODGE.DURATION_MS)) return;
    if (this.respawnImmune) return;
    if (time - this.lastHitTime < COMBAT.PLAYER_INVINCIBILITY_MS) return;
    const pb = this.player.getBounds();
    let   hit      = false;
    let   hitExtra: EnemyExtra | null = null;
    this.enemies.getChildren().forEach(obj => {
      const e     = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const extra = e.getData('extra') as EnemyExtra;
      if (extra?.isPillar || extra?.isTentacle) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(pb, e.getBounds())) {
        hit = true;
        if (!hitExtra) hitExtra = extra;
      }
    });
    if (!hit) return;
    this.lastHitTime = time;
    this.applyDamageToPlayer(Math.floor((COMBAT.PLAYER_HIT_DAMAGE + (this.wave - 1) * 1.5) * this.zone.difficultyMult), time, 0xff4444);
    // Apply melee status effect from this enemy type
    const he = hitExtra as EnemyExtra | null;
    if (he && he.typeName !== 'boss') {
      const effectKey = MELEE_STATUS_ON_HIT[he.typeName as EnemyTypeName];
      if (effectKey) this.applyEffectToPlayer(effectKey, time);
    }
  }

  private onProjectileHit(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    proj:    Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const p = proj as Phaser.Physics.Arcade.Sprite;
    if (!p.active) return;
    const dmg     = p.getData('damage') as number ?? 10;
    const isCharm = p.getData('isCharm') as boolean;
    p.destroy();
    this.spawnBurst(p.x, p.y, [0xffaa44, 0xffffff], 4, 80);

    if (isCharm && !this.charmed) {
      if (this.isDodging) return; // dodge negates charm projectiles too
      this.charmed      = true;
      this.charmedUntil = this.time.now + 2000;
      this.player.setTint(0x00ffcc);
      this.charmIndicator?.setVisible(true);
      this.floatingText(this.player.x, this.player.y - 14, 'CHARMED!', '#00ffcc');
      this.sfx.playPlayerHit();
    } else {
      const now = this.time.now;
      if (this.isDodging || now < this.dodgeEndTime + (DODGE.INVULN_MS - DODGE.DURATION_MS)) return;
      if (this.respawnImmune) return;
      if (now - this.lastHitTime >= COMBAT.PLAYER_INVINCIBILITY_MS) {
        this.lastHitTime = now;
        this.applyDamageToPlayer(dmg, now, 0xff4444);
        // Apply projectile status effect if present
        const statusEffect = p.getData('statusEffect') as EffectKey | undefined;
        if (statusEffect) this.applyEffectToPlayer(statusEffect, now);
      }
    }
  }

  private applyDamageToPlayer(dmg: number, _time: number, tint: number): void {
    // Divine shield — completely block damage
    if ((this as any)._divineShieldUntil > this.time.now) return;

    // Arcane shield absorb
    if (this.shieldAbsorb > 0) {
      const absorbed = Math.min(this.shieldAbsorb, dmg);
      this.shieldAbsorb -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) return;
    }

    // Passive damage reduction
    const dr  = this.getDamageReduction();
    dmg = Math.max(1, Math.round(dmg * (1 - dr)));

    this.hp = Math.max(0, this.hp - dmg);
    this.player.setTint(tint);
    this.time.delayedCall(300, () => {
      if (!this.isDead) {
        const effectTint = this.getPlayerStatusTint();
        if (effectTint !== null && !this.charmed) this.player.setTint(effectTint);
        else if (!this.charmed) this.player.clearTint();
      }
    });
    this.cameras.main.shake(200, 0.014);
    this.screenFlash(0xff2020, 0.28);
    this.sfx.playPlayerHit();
    this.spawnBurst(this.player.x, this.player.y, [0xff4444, 0xffffff, 0xffaa00], 5, 80);
    this.floatingText(this.player.x, this.player.y - 14, `-${dmg}`, '#ff4444');
    this.updateHUD();
    if (this.hp <= 0) this.playerDead();
  }

  // ── Wave / zone completion ────────────────────────────────────────────────

  private checkWaveComplete(): void {
    if (this.pillars.some(p => p.active))    return;
    if (this.tentacles.some(t => t.active))  return;
    if (this.isBossWave && this.bossAlive)   return;
    if (this.enemies.countActive(true) > 0)  return;

    this.waveTransitioning = true;

    if (this.isBossWave) {
      this.time.delayedCall(1200, () => this.zoneCleared());
      return;
    }

    const cleared = this.wave;
    this.wave++;
    this.sfx.playWaveClear();
    this.sfx.stopCombatMusic();
    this.screenFlash(0xffe040, 0.12);

    const cx    = CANVAS.WIDTH / 2;
    const cy    = CANVAS.HEIGHT / 2;
    const label = this.wave > this.zone.waves ? 'BOSS INCOMING!' : `Wave ${cleared} Cleared!`;
    const color = this.wave > this.zone.waves ? '#ff4422' : '#ffd700';

    const banner = this.add.text(cx, cy + 5, `✦  ${label}  ✦`, {
      fontSize: '11px', color, fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);

    this.tweens.add({ targets: banner, alpha: 1, duration: 280 });
    this.tweens.add({ targets: banner, y: cy - 20, alpha: 0, duration: 1400, delay: 650, onComplete: () => banner.destroy() });
    this.time.delayedCall(2100, () => this.spawnWave());
  }

  private zoneCleared(): void {
    const nextIdx   = this.zoneIdx + 1;
    const nextZone  = ZONES[nextIdx] ?? null;
    const isLastZone = nextZone === null;

    const savedData = SaveManager.recordZoneClear(
      this.zone.id,
      this.score,
      this.xp + this.zone.xpReward,
      this.kills,
      nextZone?.id ?? null,
      isLastZone,
    );

    // Auto-save on zone clear (slot 0) — captures updated level/XP from recordZoneClear
    if (!this.isMultiplayer) {
      SaveManager.saveSlot(0, this.buildSlotSaveData());
    }

    // Achievement tracking — zone complete and kill milestones now that save is updated
    const zoneCompleteUnlocks = AchievementTracker.recordEvent('zone_complete');
    zoneCompleteUnlocks.forEach(a => this.showAchievementUnlock(a));
    const killMilestones = AchievementTracker.recordEvent('kill', { count: 0 });
    killMilestones.forEach(a => this.showAchievementUnlock(a));
    this.fireAchievementEvent('zone_completed', { distinctZones: Object.keys(savedData.highScores).length });
    this.fireAchievementEvent('enemy_killed', {});
    this.updateAchievementPtsHUD();

    const timeSecs = Math.floor((this.time.now - this.gameStartTime) / 1000);

    // Clean up multiplayer connection, UI, and audio before leaving scene
    this.mp?.disconnect().catch(() => {});
    this.chat?.destroy();
    this.playerList?.destroy();
    this.sfx.stopMusic();

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.scene.start(SCENES.GAME_OVER, {
        wave:     this.zone.waves + 1,
        kills:    this.kills,
        level:    savedData.playerLevel,
        timeSecs,
        zoneId:   this.zone.id,
        zoneName: this.zone.name,
        victory:  true,
        score:    this.score,
      } satisfies GameOverData);
    });
  }

  private playerDead(): void {
    this.isDead = true;
    this.deathCount++;
    SaveManager.recordDeath();

    this.sfx.playDeath();
    this.cameras.main.shake(350, 0.02);
    this.screenFlash(0xff0000, 0.55);
    this.spawnBurst(this.player.x, this.player.y, [0x888888, 0x444444, 0x0d0d0d], 16, 110);

    // Remember death location for minimap marker
    this.deathMarkerPos = { x: this.player.x, y: this.player.y };

    // Drop 5% of carried gold as ground loot
    const dropped = Math.floor(this.gold * 0.05);
    if (dropped > 0) {
      this.gold -= dropped;
      this.spawnDeathDrops(this.player.x, this.player.y, dropped);
    }

    // Equipment repair cost — deduct flat gold sink on death
    const repairCost = ECONOMY.ITEM_REPAIR_COST_ON_DEATH;
    if (repairCost > 0 && this.gold >= repairCost) {
      this.gold -= repairCost;
      this.floatingText(this.player.x, this.player.y - 24, `-${repairCost}g (repair)`, '#ff9933');
    } else if (repairCost > 0 && this.gold > 0) {
      // Can't afford full repair — drain all remaining gold
      this.floatingText(this.player.x, this.player.y - 24, `-${this.gold}g (repair)`, '#ff9933');
      this.gold = 0;
    }

    // Fade player out
    if (this.anims.exists('player-death')) this.player.play('player-death');
    this.tweens.add({ targets: this.player, alpha: 0, scaleX: 0.15, scaleY: 0.15, duration: 850, ease: 'Power3' });

    // Show death screen overlay with 3-second respawn countdown
    this.showDeathScreen();
  }

  /** Spawn dropped gold coins at the death location (despawn after 2 minutes). */
  private spawnDeathDrops(deathX: number, deathY: number, totalGold: number): void {
    const count = Math.min(totalGold, 5);  // max 5 coins
    const perCoin = Math.floor(totalGold / count);

    for (let i = 0; i < count; i++) {
      const ox = Phaser.Math.Between(-18, 18);
      const oy = Phaser.Math.Between(-18, 18);
      const coin = this.pickups.create(deathX + ox, deathY + oy, 'pickup_coin') as Phaser.Physics.Arcade.Sprite;
      coin.setDepth(8);
      coin.setData('type', 'gold');
      coin.setData('value', perCoin);

      // Gentle bob animation
      this.tweens.add({
        targets: coin, y: coin.y - 4,
        duration: 700 + Phaser.Math.Between(0, 200),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Despawn after 2 minutes
      this.time.delayedCall(120_000, () => {
        if (coin?.active) coin.destroy();
      });
    }
  }

  /** Full-screen death overlay with countdown, then triggers respawn. */
  private showDeathScreen(): void {
    const W = CANVAS.WIDTH;
    const H = CANVAS.HEIGHT;
    const Z = 100;

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.78)
      .setScrollFactor(0).setDepth(Z);

    const titleText = this.add.text(W / 2, H / 2 - 30, '💀 YOU DIED', {
      fontSize: '14px', color: '#ff3333', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(Z + 1);

    const hintText = this.add.text(W / 2, H / 2 - 14, 'Death location marked on map', {
      fontSize: '5px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(Z + 1);

    const countText = this.add.text(W / 2, H / 2, 'Respawning at waystone in 3...', {
      fontSize: '6px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(Z + 1);

    let remaining = 3;
    const tick = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        remaining--;
        if (remaining > 0) countText.setText(`Respawning at waystone in ${remaining}...`);
        else {
          tick.destroy();
          overlay.destroy();
          titleText.destroy();
          hintText.destroy();
          countText.destroy();
          this.respawnPlayer();
        }
      },
    });
  }

  /** Reset the player at the zone spawn (nearest waystone) with 30-second immunity. */
  private respawnPlayer(): void {
    const maxHp = this.getMaxHp();
    this.hp   = maxHp;
    this.isDead = false;

    // Teleport to zone centre (spawn point / waystone)
    this.player.setPosition(this.worldW / 2, this.worldH / 2);
    this.player.setAlpha(1);
    this.player.setScale(1);
    this.player.setVelocity(0, 0);
    if (this.anims.exists('player-idle')) this.player.play('player-idle');

    // 30-second immunity window
    this.respawnImmune   = true;
    this.immunityEndAt   = this.time.now + 30_000;
    this.immunityFlashMs = 0;

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.updateHUD();
    this.floatingText(this.player.x, this.player.y - 20, 'RESPAWNED — 30s immunity!', '#88ffcc');
  }

  // ── Pickups ───────────────────────────────────────────────────────────────

  private spawnXpOrb(x: number, y: number, value: number): void {
    const orb = this.pickups.create(
      x + Phaser.Math.Between(-14, 14),
      y + Phaser.Math.Between(-14, 14),
      'pickup',
    ) as Phaser.Physics.Arcade.Sprite;
    orb.setDepth(8);
    orb.setData('value', value);
    this.tweens.add({
      targets: orb, y: orb.y - 5,
      duration: 600 + Phaser.Math.Between(0, 200),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const sparkleTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        if (!orb.active) { sparkleTimer.destroy(); return; }
        this.spawnBurst(orb.x, orb.y, [0xffe040, 0xffd000, 0xffffff], 2, 25);
      },
      loop: true,
    });
    orb.setData('sparkleTimer', sparkleTimer);
  }

  private collectPickup(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    pickup:  Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const orb = pickup as Phaser.Physics.Arcade.Sprite;
    if (!orb.active) return;
    const value = orb.getData('value') as number;
    const type  = orb.getData('type') as string | undefined;
    this.sfx.playPickup();
    (orb.getData('sparkleTimer') as Phaser.Time.TimerEvent)?.destroy();
    orb.destroy();

    if (type === 'gold') {
      this.gold += value;
      this.spawnBurst(orb.x, orb.y, [0xffdd44, 0xffaa00, 0xffffff], 5, 80);
      this.floatingText(orb.x, orb.y - 8, `+${value}g`, '#ffdd44');
    } else {
      this.xp    += value;
      this.score += value;
      this.spawnBurst(orb.x, orb.y, [0xe8b800, 0xffe040, 0xffffff], 5, 80);
      this.floatingText(orb.x, orb.y - 8, `+${value} XP`, '#ffe040');
      this.checkLevelUp();
    }
    this.updateHUD();
  }

  private checkLevelUp(): void {
    if (this.level >= LEVELS.MAX_LEVEL) return;
    const threshold = LEVELS.XP_THRESHOLDS[this.level - 1];
    if (this.xp < threshold) return;

    this.level++;
    const maxHp = PLAYER.BASE_HP + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL;
    this.hp = Math.min(maxHp, this.hp + 30);

    // Grant 1 skill point per level-up
    this.skillPoints += 1;
    this.saveSoloSkillState();
    this.skillTree?.updateState(this.buildSkillTreeState());
    this.updateHotbarHUD();
    if (this.isMultiplayer && this.mp) this.mp.sendLevelUp();

    // Achievement tracking — level milestone
    const levelUnlocks = AchievementTracker.recordEvent('level_up', { level: this.level });
    levelUnlocks.forEach(a => this.showAchievementUnlock(a));
    this.fireAchievementEvent('level_up', { level: this.level });
    this.updateAchievementPtsHUD();

    this.spawnBurst(this.player.x, this.player.y, [0xffe040, 0xf0f0f0, 0x9050e0, 0xd090ff], 22, 160);
    this.cameras.main.shake(280, 0.016);
    this.screenFlash(0xffe040, 0.4);
    this.sfx.playLevelUp();

    const cx    = CANVAS.WIDTH / 2;
    const cy    = CANVAS.HEIGHT / 2;
    const lvTxt = this.add.text(cx, cy, `✦  LEVEL ${this.level}  ✦`, {
      fontSize: '12px', color: '#ffe040', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(35).setAlpha(0).setScale(0.6);

    this.tweens.add({ targets: lvTxt, alpha: 1, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.out' });
    this.tweens.add({ targets: lvTxt, alpha: 0, y: cy - 30, duration: 1200, delay: 1000, ease: 'Power2', onComplete: () => lvTxt.destroy() });

    this.updateHUD();
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.player, this.pickups,
      this.collectPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
    this.physics.add.overlap(
      this.player, this.projectiles,
      this.onProjectileHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
  }

  private setupInput(): void {
    this.cursors         = this.input.keyboard!.createCursorKeys();
    this.wasd            = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.attackKey       = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey          = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.sprintKey       = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.dodgeKey        = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.npcKey          = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.upKey           = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey         = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.craftConfirmKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.muteKey         = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.escScrollKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.emoteKey        = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    // Hotbar skill keys 1–6
    const hotbarKeyCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
    ];
    this.hotbarKeys = hotbarKeyCodes.map(code => this.input.keyboard!.addKey(code));
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const lx = 4;
    const bx = 18;
    const bw = 58;
    const Z  = 12;

    this.add.rectangle(bx + bw / 2 + 4, 28, bw + 36, 66, 0x000000, 0.5).setScrollFactor(0).setDepth(Z - 1);

    this.add.text(lx, 5, 'HP', { fontSize: '5px', color: '#ff8888', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.add.rectangle(bx + bw / 2, 5, bw, 4, 0x440000).setScrollFactor(0).setDepth(Z - 1);
    this.hpBar = this.add.rectangle(bx, 5, bw, 4, 0x00ee44).setOrigin(0, 0.5).setScrollFactor(0).setDepth(Z);

    this.add.text(lx, 13, 'MP', { fontSize: '5px', color: '#9090ff', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.add.rectangle(bx + bw / 2, 13, bw, 3, 0x1a0a3a).setScrollFactor(0).setDepth(Z - 1);
    this.manaBar = this.add.rectangle(bx, 13, bw, 3, 0x9050e0).setOrigin(0, 0.5).setScrollFactor(0).setDepth(Z);

    this.add.text(lx, 20, 'XP', { fontSize: '5px', color: '#ffe040', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.add.rectangle(bx + bw / 2, 20, bw, 3, 0x3a2a00).setScrollFactor(0).setDepth(Z - 1);
    this.xpBar = this.add.rectangle(bx, 20, bw, 3, 0xe8b800).setOrigin(0, 0.5).setScrollFactor(0).setDepth(Z);

    this.levelText = this.add.text(bx + bw + 4, 5, 'Lv.1', { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.achievePtsText = this.add.text(bx + bw + 4, 13, '0 pts', { fontSize: '4px', color: '#ffdd88', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.updateAchievementPtsHUD();

    this.waveText = this.add.text(lx, 28, 'Wave 1', { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.killText = this.add.text(lx, 37, 'Kills: 0', { fontSize: '5px', color: '#aaaaaa', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);

    this.dodgeCooldownText = this.add.text(lx, 46, 'Q DODGE', { fontSize: '5px', color: '#44ffaa', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);

    this.goldText   = this.add.text(lx, 64, 'Gold: 0', { fontSize: '4px', color: '#ffdd88', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.scrollText = this.add.text(lx, 71, 'T:Scroll x1', { fontSize: '4px', color: '#88ffcc', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);

    this.enemyCountText = this.add.text(CANVAS.WIDTH - 4, 4, '', { fontSize: '5px', color: '#ff8888', fontFamily: 'monospace' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(Z);

    const accentHex = `#${this.zone.accentColor.toString(16).padStart(6, '0')}`;
    this.add.text(CANVAS.WIDTH - 4, 14, this.zone.name, { fontSize: '4px', color: accentHex, fontFamily: 'monospace' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(Z);

    // Status effect HUD indicators (below dodge cooldown)
    const effectDefs: [EffectKey, string, string][] = [
      ['poison', 'PSN', '#44ee44'],
      ['burn',   'BRN', '#ff7722'],
      ['freeze', 'FRZ', '#88ccff'],
      ['stun',   'STN', '#ffffaa'],
    ];
    let iconX = lx;
    for (const [key, label, color] of effectDefs) {
      const icon = this.add.text(iconX, 55, label, {
        fontSize: '4px', color, fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(Z).setVisible(false);
      this.statusHudIndicators[key] = icon;
      iconX += 14;
    }

    this.charmIndicator = this.add.text(CANVAS.WIDTH / 2, 8, '⚡ CHARMED — Controls Reversed!', {
      fontSize: '5px', color: '#00ffcc', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(40).setVisible(false);

    this.muteIndicator = this.add.text(CANVAS.WIDTH - 4, 25, '🔇 MUTED [N]', {
      fontSize: '4px', color: '#ff4444', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(Z).setVisible(false);

    // Boss HP bar (bottom center, hidden initially)
    const bossW = 160;
    const bossH = 8;
    const bossX = (CANVAS.WIDTH - bossW) / 2;
    const bossY = CANVAS.HEIGHT - 18;
    this.bossNameText = this.add.text(CANVAS.WIDTH / 2, bossY - 3, '', {
      fontSize: '5px', color: '#ff8888', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(Z + 5).setVisible(false);
    this.add.rectangle(bossX + bossW / 2, bossY + bossH / 2, bossW, bossH, 0x440000).setScrollFactor(0).setDepth(Z + 4);
    this.bossHpBar = this.add.rectangle(bossX, bossY + bossH / 2, bossW, bossH, 0xff2222)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(Z + 5).setVisible(false);

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 3, 'WASD:Move  SHIFT:Sprint  Q:Dodge  SPACE:Attack  1-6:Skills  K:SkillTree  M:Map  F:Craft  T:Scroll  N:Mute  ESC:Pause', {
      fontSize: '4px', color: '#333344', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(Z);

    // ── Hotbar skill slots (1–6) at bottom-center ────────────────────────
    const hotbarSlotW = 14;
    const hotbarSlotH = 12;
    const hotbarY     = CANVAS.HEIGHT - 14;
    const totalW      = 6 * (hotbarSlotW + 2) - 2;
    const hotbarStartX = (CANVAS.WIDTH - totalW) / 2;

    this.hotbarSlotBgs    = [];
    this.hotbarSlotLabels = [];
    this.hotbarCdOverlays = [];
    this.hotbarCdTexts    = [];

    for (let i = 0; i < 6; i++) {
      const sx = hotbarStartX + i * (hotbarSlotW + 2);
      const bg = this.add.rectangle(sx + hotbarSlotW / 2, hotbarY, hotbarSlotW, hotbarSlotH, 0x0d0d1a)
        .setOrigin(0.5, 0.5).setStrokeStyle(1, 0x334466).setScrollFactor(0).setDepth(Z + 2);
      this.hotbarSlotBgs.push(bg);

      const label = this.add.text(sx + hotbarSlotW / 2, hotbarY,
        '',
        { fontSize: '3px', color: '#aaddff', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(Z + 3);
      this.hotbarSlotLabels.push(label);

      const keyLabel = this.add.text(sx + 1, hotbarY - hotbarSlotH / 2 + 1,
        `${i + 1}`,
        { fontSize: '3px', color: '#555577', fontFamily: 'monospace' },
      ).setScrollFactor(0).setDepth(Z + 4);
      this.add.existing(keyLabel);

      const cdOverlay = this.add.rectangle(sx + hotbarSlotW / 2, hotbarY, hotbarSlotW, hotbarSlotH, 0x000033, 0.7)
        .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(Z + 4).setVisible(false);
      this.hotbarCdOverlays.push(cdOverlay);

      const cdTxt = this.add.text(sx + hotbarSlotW / 2, hotbarY,
        '',
        { fontSize: '3px', color: '#aaaaff', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(Z + 5).setVisible(false);
      this.hotbarCdTexts.push(cdTxt);
    }

    // Skill points badge (top-right of hotbar area)
    this.skillPointsBadge = this.add.text(
      CANVAS.WIDTH - 4, CANVAS.HEIGHT - 10,
      '',
      { fontSize: '5px', color: '#ffe040', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 },
    ).setOrigin(1, 0.5).setScrollFactor(0).setDepth(Z + 3).setVisible(false);

    this.miniMap = new MiniMapOverlay(this);

    // Fixed quest-NPC position: top-right of playable area (opposite the crafting station)
    const WALL = 32;
    this.npcMarkers = [
      { x: this.worldW - WALL - 40, y: WALL + 40, hasQuest: false },
    ];

    const save = SaveManager.load();
    this.worldMap = new WorldMapOverlay(this, {
      currentZoneId:   this.zone.id,
      unlockedZoneIds: save.unlockedZones,
      hasActiveQuest:  false,
    });

    this.updateHUD();
  }

  private showBossHpBar(name: string, hp: number, maxHp: number): void {
    this.bossHudVisible = true;
    this.bossNameText.setText(`⚔  ${name}`).setVisible(true);
    this.bossHpBar.scaleX = hp / maxHp;
    this.bossHpBar.setVisible(true);
  }

  private updateBossHpBar(): void {
    if (!this.bossSprite?.active) return;
    const extra = this.bossSprite.getData('extra') as EnemyExtra;
    if (!extra) return;
    const pct = Math.max(0, extra.hp / extra.maxHp);
    this.bossHpBar.scaleX = pct;
    this.bossHpBar.setFillStyle(pct > 0.5 ? 0xff2222 : pct > 0.25 ? 0xff8800 : 0xffff00);
  }

  private updateHUD(): void {
    const maxHp  = this.getMaxHp();
    const maxMana = this.getMaxMana();
    const hpPct = Math.max(0, this.hp / maxHp);
    this.hpBar.scaleX = hpPct;
    this.hpBar.setFillStyle(hpPct > 0.5 ? 0x00ee44 : hpPct > 0.25 ? 0xffaa00 : 0xff2222);
    if (this.manaBar) this.manaBar.scaleX = Math.max(0, this.mana / maxMana);
    const atMax = this.level >= LEVELS.MAX_LEVEL;
    if (this.xpBar) this.xpBar.scaleX = atMax ? 1 : Math.min(1, this.xp / LEVELS.XP_THRESHOLDS[this.level - 1]);
    this.levelText?.setText(`Lv.${this.level}${atMax ? ' MAX' : ''}`);

    let wLabel: string;
    if (this.isMultiplayer && this.mp) {
      const zs = this.mp.zoneState;
      wLabel = zs.waveState === 'waiting' ? 'Waiting...'
             : zs.waveState === 'complete' ? 'Zone Complete!'
             : `Wave ${zs.currentWave}/${zs.totalWaves}`;
    } else {
      wLabel = this.isBossWave ? 'BOSS!' : `Wave ${this.wave}/${this.zone.waves}`;
    }
    this.waveText?.setText(wLabel);
    this.waveText?.setColor(this.isBossWave ? '#ff4422' : '#ffd700');
    this.killText?.setText(`Kills: ${this.kills}`);

    const alive = this.isMultiplayer
      ? (this.mp?.zoneState.enemiesAlive ?? 0)
      : (this.enemies?.countActive(true) ?? 0);
    this.enemyCountText?.setText(alive > 0 ? `Enemies: ${alive}` : '');
    this.goldText?.setText(`Gold: ${this.gold}`);
    this.scrollText?.setText(`T:Scroll x${this.escapeScrolls}`);
    this.scrollText?.setColor(this.escapeScrolls > 0 ? '#88ffcc' : '#555555');
  }

  // ── VFX ───────────────────────────────────────────────────────────────────

  private showAttackRing(): void {
    const gfx = this.add.graphics().setDepth(20);
    gfx.lineStyle(2, 0xffff44, 0.95);
    gfx.strokeCircle(this.player.x, this.player.y, COMBAT.ATTACK_RANGE_PX);
    this.tweens.add({ targets: gfx, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 220, ease: 'Power2', onComplete: () => gfx.destroy() });
  }

  private spawnBurst(x: number, y: number, tints: number[], count = 8, speed = 120): void {
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: speed * 0.3, max: speed },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0, ease: 'Power2' },
      lifespan: { min: 280, max: 480 },
      tint: tints,
      emitting: false,
    });
    emitter.setDepth(22);
    emitter.explode(count);
    this.time.delayedCall(600, () => { if (emitter?.active) emitter.destroy(); });
  }

  private screenFlash(color: number, alpha = 0.3): void {
    const flash = this.add.rectangle(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, CANVAS.WIDTH, CANVAS.HEIGHT, color, alpha)
      .setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: flash, alpha: 0, duration: 230, ease: 'Power2', onComplete: () => flash.destroy() });
  }

  // Emote labels — shown above the player sprite for 2.5 s
  private static readonly EMOTE_DISPLAY: Record<string, string> = {
    wave:  '👋 Wave',
    dance: '💃 Dance',
    sit:   '🪑 Sit',
    cheer: '🎉 Cheer',
    bow:   '🙇 Bow',
    angry: '😠 Angry',
  };
  private static readonly EMOTE_DURATION_MS = 2500;

  private showEmoteAnimation(sessionId: string, emoteId: string): void {
    // Find the sprite for this session
    const isLocal = sessionId === this.mp?.mySessionId;
    const sprite: Phaser.GameObjects.GameObject | undefined = isLocal
      ? this.player
      : this.remotePlayerSprites.get(sessionId);
    if (!sprite) return;

    // Destroy existing label if any
    this.emoteLabels.get(sessionId)?.destroy();

    const label = GameScene.EMOTE_DISPLAY[emoteId] ?? emoteId;
    const target = sprite as Phaser.Physics.Arcade.Sprite;
    const t = this.add.text(target.x, target.y - 18, label, {
      fontSize: '5px', color: '#ffee88', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(35);

    this.emoteLabels.set(sessionId, t);
    this.time.delayedCall(GameScene.EMOTE_DURATION_MS, () => {
      t.destroy();
      if (this.emoteLabels.get(sessionId) === t) this.emoteLabels.delete(sessionId);
    });
  }

  private floatingText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, {
      fontSize: '6px', color, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 24, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => t.destroy() });
  }

  private hitStop(ms: number): void {
    this.physics.pause();
    setTimeout(() => { if (this.scene.isActive(SCENES.GAME) && !this.isDead) this.physics.resume(); }, ms);
  }

  // ── Skill tree system ──────────────────────────────────────────────────────

  private loadSoloSkillState(): void {
    try {
      const raw = localStorage.getItem(SKILL_SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        classId?: string;
        unlockedSkills?: string[];
        skillPoints?: number;
        hotbar?: string[];
      };
      this.classId        = (data.classId as ClassId) ?? 'warrior';
      this.unlockedSkills = new Set(data.unlockedSkills ?? []);
      this.skillPoints    = data.skillPoints ?? 0;
      this.hotbar         = (data.hotbar ?? ['', '', '', '', '', '']).slice(0, 6);
      while (this.hotbar.length < 6) this.hotbar.push('');
    } catch { /* ignore */ }
  }

  private saveSoloSkillState(): void {
    try {
      const data = {
        classId:        this.classId,
        unlockedSkills: [...this.unlockedSkills],
        skillPoints:    this.skillPoints,
        hotbar:         this.hotbar,
      };
      localStorage.setItem(SKILL_SAVE_KEY, JSON.stringify(data));
    } catch { /* quota */ }
  }

  private buildSkillTreeState(): SkillTreeState {
    return {
      classId:        this.classId,
      unlockedSkills: [...this.unlockedSkills],
      skillPoints:    this.skillPoints,
      hotbar:         [...this.hotbar],
    };
  }

  // ── Save-slot system ───────────────────────────────────────────────────────

  /** Collect current skill state — used by PauseScene for manual slot saves. */
  public getCurrentSkillState(): SkillSaveData {
    return {
      classId:        this.classId,
      unlockedSkills: [...this.unlockedSkills],
      skillPoints:    this.skillPoints,
      hotbar:         [...this.hotbar],
    };
  }

  /** Build a full slot snapshot from live game state. */
  public buildSlotSaveData(): SlotSaveData {
    return SaveManager.buildSlotSnapshot(
      this.getCurrentSkillState(),
      this.zone.id,
      this.zone.name,
    );
  }

  /**
   * Write the current state to slot 0 (auto-save).
   * No-op in multiplayer or if the player is dead.
   */
  private triggerAutoSave(): void {
    if (this.isMultiplayer || this.isDead) return;
    SaveManager.saveSlot(0, this.buildSlotSaveData());
    this.showSaveToast('Auto-saved');
  }

  /** Show a small floating toast in the top-right corner. */
  private showSaveToast(msg: string): void {
    const t = this.add.text(CANVAS.WIDTH - 4, 6, msg, {
      fontSize: '5px', color: '#88ffcc', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(50).setAlpha(1);
    this.tweens.add({ targets: t, alpha: 0, y: 14, duration: 1800, delay: 900, ease: 'Power2', onComplete: () => t.destroy() });
  }

  /** Recalculate passive stat bonuses, cache them, and apply HP/mana caps. */
  private applyPassiveBonuses(): void {
    this.passiveBonusCache = computePassiveBonuses([...this.unlockedSkills]);
    const bonuses = this.passiveBonusCache;
    // Apply max HP / mana bonuses (re-derive from level base)
    const baseHp   = PLAYER.BASE_HP + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL;
    const baseMana = PLAYER.BASE_MANA;
    const newMaxHp   = baseHp   + bonuses.maxHpFlat;
    const newMaxMana = baseMana + bonuses.maxManaFlat;
    this.hp   = Math.min(this.hp,   newMaxHp);
    this.mana = Math.min(this.mana, newMaxMana);
    // (max values are derived dynamically in updateHUD / movement code)
  }

  /** Get effective max HP including passive bonuses. */
  private getMaxHp(): number {
    return PLAYER.BASE_HP + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL + this.passiveBonusCache.maxHpFlat;
  }

  /** Get effective max mana including passive bonuses. */
  private getMaxMana(): number {
    return PLAYER.BASE_MANA + this.passiveBonusCache.maxManaFlat;
  }

  /** Get effective mana regen per second including passive bonuses. */
  private getEffectiveManaRegen(): number {
    return MANA.REGEN_PER_SEC + this.passiveBonusCache.manaRegenFlat;
  }

  /** Get damage reduction fraction (0–0.8 capped). */
  private getDamageReduction(): number {
    let dr = this.passiveBonusCache.damageReductionPct;
    // last_stand: extra 30% DR when below 25% HP
    if (this.unlockedSkills.has('last_stand') && this.hp < this.getMaxHp() * 0.25) {
      dr += 0.30;
    }
    return Math.min(0.80, dr);
  }

  /** Skill panel callbacks ─────────────────────────────────────────────────── */

  private allocSkill(skillId: string): void {
    if (this.skillPoints <= 0) return;
    const skillDef = SKILL_BY_ID.get(skillId);
    if (!skillDef) return;
    if (skillDef.classId !== this.classId) return;
    if (this.unlockedSkills.has(skillId)) return;
    if (skillDef.prerequisiteId && !this.unlockedSkills.has(skillDef.prerequisiteId)) return;

    if (this.isMultiplayer && this.mp) {
      this.mp.sendSkillAlloc(skillId);
      // Optimistic update while waiting for server ack
      this.unlockedSkills.add(skillId);
      this.skillPoints -= 1;
    } else {
      this.unlockedSkills.add(skillId);
      this.skillPoints -= 1;
      this.applyPassiveBonuses();
      this.saveSoloSkillState();
    }
    this.skillTree?.updateState(this.buildSkillTreeState());
    this.updateHotbarHUD();
  }

  private setHotbar(hotbar: string[]): void {
    this.hotbar = hotbar.slice(0, 6);
    while (this.hotbar.length < 6) this.hotbar.push('');
    if (this.isMultiplayer && this.mp) {
      this.mp.sendSkillHotbar(this.hotbar);
    } else {
      this.saveSoloSkillState();
    }
    this.skillTree?.updateState(this.buildSkillTreeState());
    this.updateHotbarHUD();
  }

  private setClass(classId: ClassId): void {
    if (this.unlockedSkills.size > 0) return; // must respec first
    this.classId = classId;
    if (this.isMultiplayer && this.mp) {
      this.mp.sendSkillClass(classId);
    } else {
      this.saveSoloSkillState();
    }
    this.skillTree?.updateState(this.buildSkillTreeState());
  }

  private respecSkills(): void {
    const refunded = this.unlockedSkills.size;
    this.unlockedSkills.clear();
    this.hotbar = ['', '', '', '', '', ''];
    this.skillPoints += refunded;
    this.skillCooldowns.clear();
    if (this.isMultiplayer && this.mp) {
      this.mp.sendSkillRespec();
    } else {
      this.applyPassiveBonuses();
      this.saveSoloSkillState();
    }
    this.skillTree?.updateState(this.buildSkillTreeState());
    this.updateHotbarHUD();
    this.floatingText(this.player.x, this.player.y - 20, 'Respecced!', '#aaaaff');
  }

  /** Activate skill in hotbar slot i. */
  private activateSkillSlot(slot: number, _time: number): void {
    const skillId = this.hotbar[slot];
    if (!skillId) return;
    const skillDef = SKILL_BY_ID.get(skillId);
    if (!skillDef || skillDef.type !== 'active') return;
    if (!this.unlockedSkills.has(skillId)) return;

    const now = this.time.now;
    const cdExpiry = this.skillCooldowns.get(skillId) ?? 0;
    if (now < cdExpiry) {
      // On cooldown — brief visual feedback
      this.floatingText(this.player.x, this.player.y - 12, 'CD!', '#888888');
      return;
    }

    // Mana check
    const surgeBuff  = now < this.arcaneSurgeUntil;
    const manaCost   = surgeBuff ? 0 : (skillDef.manaCost ?? 0);
    if (this.mana < manaCost) {
      this.floatingText(this.player.x, this.player.y - 12, 'No Mana!', '#9090ff');
      return;
    }

    const bonuses = computePassiveBonuses([...this.unlockedSkills]);
    const cdMult  = Math.max(0.2, 1 - bonuses.allCdReductionPct);
    const cd      = Math.round((skillDef.cooldownMs ?? 0) * cdMult);
    this.skillCooldowns.set(skillId, now + cd);
    this.mana = Math.max(0, this.mana - manaCost);
    this.updateHotbarHUD();

    if (this.isMultiplayer && this.mp) {
      this.mp.sendSkillUse(skillId);
      // Visual-only feedback (server handles effects)
      this.floatingText(this.player.x, this.player.y - 14, skillDef.name, '#aaddff');
    } else {
      this.executeSkillSolo(skillId, now, bonuses.damagePct);
    }
  }

  /** Execute skill effects in solo mode. */
  private executeSkillSolo(skillId: string, now: number, bonusDamagePct: number): void {
    const berserk    = now < this.berserkUntil ? 1.5 : 1.0;
    const surge      = now < this.arcaneSurgeUntil ? 2.0 : 1.0;
    const dmgMult    = (1 + bonusDamagePct) * berserk * surge;
    const baseDmg    = COMBAT.ATTACK_DAMAGE + (this.level - 1) * LEVELS.DAMAGE_BONUS_PER_LEVEL;

    switch (skillId) {
      // ── Berserker ────────────────────────────────────────────────────────
      case 'reckless_strike': {
        const hit = this.nearestEnemySolo(COMBAT.ATTACK_RANGE_PX * 2);
        if (hit) this.applySkillDamageToEnemy(hit, Math.round(baseDmg * 2 * dmgMult));
        this.floatingText(this.player.x, this.player.y - 14, 'Reckless Strike!', '#ff8844');
        break;
      }
      case 'blade_fury': {
        let count = 0;
        this.enemies.getChildren().forEach(obj => {
          const e = obj as Phaser.Physics.Arcade.Sprite;
          if (!e.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) > 110) return;
          this.applySkillDamageToEnemy(e, Math.round(baseDmg * 1.5 * dmgMult));
          count++;
        });
        this.spawnBurst(this.player.x, this.player.y, [0xff8844, 0xffcc44, 0xffffff], 18, 130);
        this.floatingText(this.player.x, this.player.y - 14, `Blade Fury ×${count}`, '#ff8844');
        break;
      }
      case 'berserk_mode': {
        this.berserkUntil = now + 6000;
        this.screenFlash(0xff4400, 0.25);
        this.floatingText(this.player.x, this.player.y - 14, '⚡ BERSERK!', '#ff6600');
        break;
      }
      // ── Guardian ────────────────────────────────────────────────────────
      case 'shield_bash': {
        const hit = this.nearestEnemySolo(COMBAT.ATTACK_RANGE_PX * 2);
        if (hit) {
          this.applySkillDamageToEnemy(hit, Math.round(baseDmg * 0.7 * dmgMult));
          // Visual stun effect
          this.tweens.add({ targets: hit, tint: 0xffffaa, duration: 200, yoyo: true, repeat: 3 });
        }
        this.floatingText(this.player.x, this.player.y - 14, 'Shield Bash!', '#aaddff');
        break;
      }
      case 'taunt': {
        // Visual cue; enemy AI logic continues normally in solo
        this.spawnBurst(this.player.x, this.player.y, [0xaaaaff, 0x8888ff], 8, 80);
        this.floatingText(this.player.x, this.player.y - 14, 'TAUNT', '#aaaaff');
        break;
      }
      // ── Paladin ──────────────────────────────────────────────────────────
      case 'holy_mending': {
        this.hp = Math.min(this.getMaxHp(), this.hp + 50);
        this.spawnBurst(this.player.x, this.player.y, [0xffffff, 0xffe040, 0x88ff88], 12, 90);
        this.floatingText(this.player.x, this.player.y - 14, '+50 HP', '#88ff88');
        break;
      }
      case 'sacred_strike': {
        const hit = this.nearestEnemySolo(COMBAT.ATTACK_RANGE_PX * 2);
        if (hit) this.applySkillDamageToEnemy(hit, Math.round(baseDmg * 1.8 * dmgMult));
        this.floatingText(this.player.x, this.player.y - 14, 'Sacred Strike!', '#ffe040');
        break;
      }
      case 'divine_shield': {
        this.lastHitTime = now;            // reuse lastHitTime as invuln until
        const invulnMs = 3000;
        this.screenFlash(0xffffff, 0.3);
        this.time.delayedCall(invulnMs, () => { /* auto-expires */ });
        this.floatingText(this.player.x, this.player.y - 14, '✦ DIVINE SHIELD', '#ffffff');
        // Mark invuln window
        (this as any)._divineShieldUntil = now + invulnMs;
        break;
      }
      // ── Pyromancer ───────────────────────────────────────────────────────
      case 'fireball': {
        const hit = this.nearestEnemySolo(400);
        if (hit) {
          this.applySkillDamageToEnemy(hit, Math.round(60 * dmgMult));
          this.spawnBurst(hit.x, hit.y, [0xff4400, 0xff8844, 0xffcc44], 10, 100);
        }
        this.floatingText(this.player.x, this.player.y - 14, 'Fireball!', '#ff6622');
        break;
      }
      case 'inferno_ring': {
        this.enemies.getChildren().forEach(obj => {
          const e = obj as Phaser.Physics.Arcade.Sprite;
          if (!e.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) > 110) return;
          this.applySkillDamageToEnemy(e, Math.round(80 * dmgMult));
        });
        this.spawnBurst(this.player.x, this.player.y, [0xff4400, 0xff8844, 0xcc2200], 24, 180);
        this.cameras.main.shake(200, 0.01);
        this.floatingText(this.player.x, this.player.y - 14, '🔥 INFERNO!', '#ff4400');
        break;
      }
      case 'meteor_strike': {
        this.enemies.getChildren().forEach(obj => {
          const e = obj as Phaser.Physics.Arcade.Sprite;
          if (!e.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) > 165) return;
          this.applySkillDamageToEnemy(e, Math.round(150 * dmgMult));
        });
        this.spawnBurst(this.player.x, this.player.y, [0xffffff, 0xff8800, 0xff4400, 0xcc2200], 35, 250);
        this.cameras.main.shake(350, 0.022);
        this.screenFlash(0xff4400, 0.25);
        this.floatingText(this.player.x, this.player.y - 14, '☄ METEOR!', '#ff4400');
        break;
      }
      // ── Frostbinder ──────────────────────────────────────────────────────
      case 'ice_lance': {
        const hit = this.nearestEnemySolo(400);
        if (hit) {
          this.applySkillDamageToEnemy(hit, Math.round(45 * dmgMult));
          this.tweens.add({ targets: hit, tint: 0x88ccff, duration: 300, yoyo: true });
          this.spawnBurst(hit.x, hit.y, [0x88ccff, 0xaaddff, 0xffffff], 8, 80);
        }
        this.floatingText(this.player.x, this.player.y - 14, 'Ice Lance!', '#88ccff');
        break;
      }
      case 'blizzard': {
        this.enemies.getChildren().forEach(obj => {
          const e = obj as Phaser.Physics.Arcade.Sprite;
          if (!e.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) > 130) return;
          const extra = e.getData('extra') as EnemyExtra;
          if (extra) this.applyEffectToEnemy(e, extra, 'freeze', now);
          this.tweens.add({ targets: e, tint: 0x88ccff, alpha: 0.7, duration: 3000, yoyo: true });
        });
        this.spawnBurst(this.player.x, this.player.y, [0x88ccff, 0xaaddff, 0xffffff], 20, 150);
        this.floatingText(this.player.x, this.player.y - 14, '❄ Blizzard!', '#88ccff');
        break;
      }
      case 'glacial_nova': {
        this.enemies.getChildren().forEach(obj => {
          const e = obj as Phaser.Physics.Arcade.Sprite;
          if (!e.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) > 165) return;
          this.applySkillDamageToEnemy(e, Math.round(100 * dmgMult));
          this.tweens.add({ targets: e, tint: 0x44aaff, duration: 3000, yoyo: true });
        });
        this.spawnBurst(this.player.x, this.player.y, [0x44aaff, 0x88ccff, 0xffffff], 30, 220);
        this.cameras.main.shake(280, 0.018);
        this.screenFlash(0x44aaff, 0.2);
        this.floatingText(this.player.x, this.player.y - 14, '❄ GLACIAL NOVA!', '#44aaff');
        break;
      }
      // ── Arcanist ─────────────────────────────────────────────────────────
      case 'arcane_bolt': {
        const hit = this.nearestEnemySolo(400);
        if (hit) {
          this.applySkillDamageToEnemy(hit, Math.round(70 * dmgMult));
          this.spawnBurst(hit.x, hit.y, [0xaa66ff, 0xdd88ff, 0xffffff], 10, 110);
        }
        this.floatingText(this.player.x, this.player.y - 14, 'Arcane Bolt!', '#cc88ff');
        break;
      }
      case 'arcane_shield': {
        this.shieldAbsorb = 80;
        this.screenFlash(0x8844ff, 0.2);
        this.floatingText(this.player.x, this.player.y - 14, '✦ Arcane Shield (80)', '#cc88ff');
        break;
      }
      case 'arcane_surge': {
        this.arcaneSurgeUntil = now + 10000;
        this.screenFlash(0xaa66ff, 0.3);
        this.floatingText(this.player.x, this.player.y - 14, '⚡ ARCANE SURGE!', '#cc88ff');
        break;
      }
      default: break;
    }
    this.updateHUD();
  }

  /** Apply skill damage to an enemy sprite in solo mode. */
  private applySkillDamageToEnemy(
    sprite: Phaser.Physics.Arcade.Sprite,
    damage: number,
  ): void {
    const extra = sprite.getData('extra') as EnemyExtra | undefined;
    if (!extra || extra.hp <= 0) return;

    extra.hp = Math.max(0, extra.hp - damage);
    this.floatingText(sprite.x, sprite.y - 10, `-${damage}`, '#ffcc44');
    this.sfx.playHit();

    if (extra.hp <= 0) {
      // Reuse the standard enemy kill flow
      this.killEnemy(sprite);
    }
  }

  /** Returns the nearest active enemy sprite within maxDist px, or null. */
  private nearestEnemySolo(maxDist: number): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let nearestD = maxDist;
    this.enemies.getChildren().forEach(obj => {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < nearestD) { nearestD = d; nearest = e; }
    });
    return nearest;
  }

  /** Update the hotbar HUD slots. */
  private updateHotbarHUD(): void {
    const now = this.time.now;
    for (let i = 0; i < 6; i++) {
      const skillId  = this.hotbar[i] ?? '';
      const skillDef = skillId ? SKILL_BY_ID.get(skillId) : undefined;
      const label    = this.hotbarSlotLabels[i];
      const cdOverlay = this.hotbarCdOverlays[i];
      const cdTxt    = this.hotbarCdTexts[i];

      if (label) label.setText(skillDef ? skillDef.name.slice(0, 5) : '');

      const cdExpiry = skillId ? (this.skillCooldowns.get(skillId) ?? 0) : 0;
      const onCd     = now < cdExpiry;
      if (cdOverlay) cdOverlay.setVisible(onCd);
      if (cdTxt) {
        if (onCd) {
          const secsLeft = ((cdExpiry - now) / 1000).toFixed(1);
          cdTxt.setText(secsLeft).setVisible(true);
        } else {
          cdTxt.setVisible(false);
        }
      }
    }

    // Skill points badge
    if (this.skillPointsBadge) {
      if (this.skillPoints > 0) {
        this.skillPointsBadge.setText(`${this.skillPoints} SP`).setVisible(true);
      } else {
        this.skillPointsBadge.setVisible(false);
      }
    }
  }

  // ── Achievement helpers ────────────────────────────────────────────────────

  /**
   * Update the achievement-points HUD text from local tracker.
   * Called after events that may unlock achievements.
   */
  private updateAchievementPtsHUD(): void {
    if (!this.achievePtsText) return;
    const pts = AchievementTracker.getTotalPoints();
    this.achievePtsText.setText(`${pts}pts`);
  }

  /**
   * Show a brief achievement unlock popup notification.
   * Appears above the HUD then fades out.
   */
  private showAchievementUnlock(achievement: { icon: string; title: string; points: number }): void {
    // Toast slides in from the right edge at the top-right corner,
    // stays 3 seconds, then fades out.
    const PAD = 4;
    const toastW = 110;
    const toastH = 20;
    const finalX  = CANVAS.WIDTH - toastW / 2 - PAD;
    const startX  = CANVAS.WIDTH + toastW;          // starts off-screen right
    const toastY  = 16;

    // Background pill
    const bg = this.add.rectangle(startX, toastY, toastW, toastH, 0x1a1a2e, 0.92)
      .setOrigin(0.5).setScrollFactor(0).setDepth(90)
      .setStrokeStyle(1, 0xffd700, 0.9);

    // Icon
    const iconTxt = this.add.text(startX - toastW / 2 + 5, toastY, achievement.icon, {
      fontSize: '7px', fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(91);

    // Title + points line
    const label = this.add.text(startX - toastW / 2 + 16, toastY - 3,
      achievement.title,
      { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(91);

    const pts = this.add.text(startX - toastW / 2 + 16, toastY + 4,
      `+${achievement.points} pts`,
      { fontSize: '4px', color: '#aaddff', fontFamily: 'monospace' },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(91);

    const toastObjs = [bg, iconTxt, label, pts];
    const dx = finalX - startX;

    // Slide in
    this.tweens.add({
      targets: toastObjs, x: `+=${dx}`, duration: 300, ease: 'Back.Out',
    });

    // Hold 3 seconds then fade out
    this.tweens.add({
      targets: toastObjs, alpha: 0,
      duration: 400, delay: 3300, ease: 'Power2',
      onComplete: () => toastObjs.forEach(o => o.destroy()),
    });

    this.updateAchievementPtsHUD();
    this.achievementPanel?.notifyUnlock(achievement as AchievementData);
  }

  /**
   * Send an achievement event to the server for multiplayer / auth mode.
   * No-op if no userId is available (solo mode).
   */
  private fireAchievementEvent(
    type: string,
    data: Record<string, unknown> = {},
  ): void {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) return;
    const wsUrl = ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
      ?? 'ws://localhost:2567';
    const base = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    fetch(`${base}/achievements/event`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, type, data }),
    }).then(async (res) => {
      if (!res.ok) return;
      const result = await res.json() as { newlyUnlocked?: AchievementData[] };
      (result.newlyUnlocked ?? []).forEach(a => this.showAchievementUnlock(a));
    }).catch(() => {/* non-fatal */});
  }
}
