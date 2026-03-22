import Phaser from 'phaser';
import {
  CANVAS, PLAYER, COMBAT, MANA, LEVELS, SCENES, SPRINT, DODGE,
  ZONES, ENEMY_TYPES, BOSS_TYPES,
  STATUS_EFFECTS, MELEE_STATUS_ON_HIT, PROJECTILE_STATUS_ON_HIT,
  type EnemyTypeName, type BossTypeName, type ZoneConfig, type EffectKey,
} from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import { SaveManager }  from '../systems/SaveManager';
import { MultiplayerClient, type RemotePlayer, type RemoteEnemy } from '../systems/MultiplayerClient';
import { ChatOverlay }        from '../ui/ChatOverlay';
import { PlayerListPanel }    from '../ui/PlayerListPanel';
import { QuestLogPanel }      from '../ui/QuestLogPanel';
import { InventoryPanel }     from '../ui/InventoryPanel';
import { NpcDialogueOverlay } from '../ui/NpcDialogueOverlay';
import { CraftingPanel }      from '../ui/CraftingPanel';
import { MiniMapOverlay }    from '../ui/MiniMapOverlay';
import { TutorialOverlay }  from '../ui/TutorialOverlay';
import { TradeWindow }       from '../ui/TradeWindow';
import { MarketplacePanel }  from '../ui/MarketplacePanel';

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

  /** Mini-map HUD overlay (always present, M key toggles). */
  private miniMap?: MiniMapOverlay;

  /** Tutorial overlay — shown only for first-time players on zone1. */
  private tutorial?: TutorialOverlay;

  /** P2P trade window (multiplayer only). */
  private tradeWindow?: TradeWindow;

  /** Marketplace / auction-house panel (multiplayer only). */
  private marketplace?: MarketplacePanel;

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
    this.waveTransitioning = false;
    this.gameStartTime     = this.time.now;
    this.bossAlive         = false;
    this.pillars           = [];
    this.tentacles         = [];
    this.bossSprite        = undefined;
    this.bossHudVisible    = false;
    this.isMultiplayer     = false;

    this.sfx = SoundManager.getInstance();

    // Unlock audio + start zone music on first user interaction (autoplay policy)
    const unlockAudio = (): void => { this.sfx.unlock(); };
    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard!.once('keydown', unlockAudio);
    this.sfx.startZoneMusic(this.zone.id);

    this.buildWorld();
    this.createPlayer();

    this.enemies     = this.physics.add.group();
    this.pickups     = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    this.setupCollisions();
    this.setupInput();
    this.setupCamera();
    this.createHUD();

    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Show tutorial for first-time players entering zone1
    if (!save.tutorialCompleted && zoneId === 'zone1') {
      this.tutorial = new TutorialOverlay(this);
      this.tutorial.onComplete = () => {
        SaveManager.completeTutorial();
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

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      // Escape closes any open panel before pausing
      const panelClosed =
        this.tradeWindow?.closeIfOpen()   ||
        this.marketplace?.closeIfOpen()   ||
        this.npcDialogue?.closeIfOpen()   ||
        this.craftingPanel?.closeIfOpen() ||
        this.questLog?.closeIfOpen()      ||
        this.inventory?.closeIfOpen()     ||
        this.chat?.active;
      if (!panelClosed) {
        this.scene.launch(SCENES.PAUSE, { zoneId: this.zone.id });
        this.scene.pause();
        return;
      }
    }

    // NPC interact key (E) — triggers quest dialogue in multiplayer
    if (this.npcKey && Phaser.Input.Keyboard.JustDown(this.npcKey) && this.isMultiplayer) {
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

    // Panel updates with mutual exclusion — opening one closes the others
    const qlWas   = this.questLog?.isVisible     ?? false;
    const invWas  = this.inventory?.isVisible    ?? false;
    const crftWas = this.craftingPanel?.isVisible ?? false;
    const mkWas   = this.marketplace?.isVisible  ?? false;
    this.questLog?.update();
    this.inventory?.update();
    this.craftingPanel?.update();
    this.marketplace?.update();
    const qlNow   = this.questLog?.isVisible     ?? false;
    const invNow  = this.inventory?.isVisible    ?? false;
    const crftNow = this.craftingPanel?.isVisible ?? false;
    const mkNow   = this.marketplace?.isVisible  ?? false;
    if (!qlWas && qlNow) {
      // Quest log just opened — close others
      this.inventory?.hide();
      this.craftingPanel?.hide();
      this.npcDialogue?.hide();
      this.marketplace?.hide();
    } else if (!invWas && invNow) {
      // Inventory just opened — close others
      this.questLog?.hide();
      this.craftingPanel?.hide();
      this.npcDialogue?.hide();
      this.marketplace?.hide();
    } else if (!crftWas && crftNow) {
      // Crafting panel just opened — close others
      this.questLog?.hide();
      this.inventory?.hide();
      this.npcDialogue?.hide();
      this.marketplace?.hide();
    } else if (!mkWas && mkNow) {
      // Marketplace just opened — close others
      this.questLog?.hide();
      this.inventory?.hide();
      this.craftingPanel?.hide();
      this.npcDialogue?.hide();
    }

    // Crafting station proximity hint
    this.updateCraftingStationHint();

    this.handleDodgeRoll(time);
    this.handlePlayerMovement(delta);
    this.regenMana(delta);
    this.updateDodgeCooldownHUD(time);

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
    );

    this.tutorial?.update(time, delta);
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
      this.mp?.sendChat(text, whisperTo);
    };

    // Player list panel
    this.playerList = new PlayerListPanel(this);

    // Quest log panel
    this.questLog = new QuestLogPanel(this);

    // Inventory panel
    this.inventory = new InventoryPanel(this);

    // Crafting panel
    this.craftingPanel = new CraftingPanel(this);
    this.craftingPanel.onCraftSuccess = (_itemId) => {
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
      this.chat?.addMessage('Quest completed! Rewards granted.', '#88ee88');
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

    // Show control hints once
    this.time.delayedCall(2000, () => {
      this.chat?.addMessage('[T] chat  [Tab] players  [Q] quests  [I] inventory  [E] NPC  [F] craft  [M] market  [RClick] trade', '#555577');
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

    client.onDisconnected = () => {
      this.isMultiplayer = false;
      this.mp = null;
      this.clearRemoteSprites();
      this.chat?.destroy();
      this.chat = undefined;
      this.playerList?.destroy();
      this.playerList = undefined;
      this.questLog?.destroy();
      this.questLog = undefined;
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
      this.floatingText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20, 'Disconnected — solo mode', '#ff8888');
      // Resume local simulation
      if (!this.isDead && !this.waveTransitioning) this.spawnWave();
    };

    // Create the online player count HUD item
    this.onlineCountText = this.add.text(CANVAS.WIDTH / 2, 4, '', {
      fontSize: '4px', color: '#88ffcc', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(12);

    this.updateHUD();
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
          if (ptr.rightButtonDown() && this.tradeWindow && !this.tradeWindow.isVisible) {
            this.tradeWindow.requestTrade(capturedSessionId, capturedName);
          }
        });

        // Name label
        const label = this.add.text(rp.x, rp.y - 12, rp.name, {
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

      if (label)  { label.x  = s.x; label.y  = s.y - 12; }
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

    let speed = PLAYER.MOVE_SPEED + (this.level - 1) * LEVELS.SPEED_BONUS_PER_LEVEL;
    let vx = 0;
    let vy = 0;
    const left  = this.cursors.left.isDown  || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up    = this.cursors.up.isDown    || this.wasd.W.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.S.isDown;

    if (this.charmed) {
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

    // Sprint: hold Shift while moving, mana must be available
    const wantsToSprint = this.sprintKey.isDown && (vx !== 0 || vy !== 0) && this.mana > 0;
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
    this.mana = Math.min(PLAYER.BASE_MANA as number, this.mana + (MANA.REGEN_PER_SEC as number) * delta / 1000);
    if (this.manaBar) this.manaBar.scaleX = this.mana / (PLAYER.BASE_MANA as number);
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

    // Trigger new dodge on Q press
    if (!Phaser.Input.Keyboard.JustDown(this.dodgeKey)) return;
    if (this.isDodging) return;
    if (time < this.dodgeCooldownEndTime) return;
    if (this.mana < DODGE.MANA_COST) return;

    // Determine dash direction from movement input (fallback: right)
    const left  = this.cursors.left.isDown  || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up    = this.cursors.up.isDown    || this.wasd.W.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.S.isDown;
    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    let dy = (down  ? 1 : 0) - (up   ? 1 : 0);
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
    } else {
      this.spawnNormalWave();
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
      const hpScale  = 1 + (this.wave - 1) * COMBAT.WAVE_HP_SCALE_PER_WAVE + (this.level - 1) * 0.15;
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
    const hpScale = 1 + (this.level - 1) * 0.25;
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
    if (this.chat?.active) return; // don't attack while chat is open
    if (this.playerEffects.stun) return; // stunned — can't attack
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return;
    if (time - this.lastAttackTime < COMBAT.ATTACK_COOLDOWN_MS) return;

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
    const dmg    = COMBAT.ATTACK_DAMAGE + (this.level - 1) * LEVELS.DAMAGE_BONUS_PER_LEVEL;
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

      const isCrit = Math.random() < 0.20;
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
      this.sfx.playHit();
      if (isCrit) {
        this.floatingText(e.x, e.y - 10, `✦${hitDmg}!`, '#ffe040');
      } else {
        this.floatingText(e.x, e.y - 10, `-${hitDmg}`, '#ffffff');
      }

      if (extra.hp <= 0) this.killEnemy(e);
    });

    if (hitAny) this.cameras.main.shake(70, 0.004);
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
    const xpGain  = isBoss
      ? BOSS_TYPES[extra.bossType!].xpValue
      : (ENEMY_TYPES[extra.typeName as EnemyTypeName]?.xpValue ?? 10);

    this.kills++;
    this.xp    += xpGain;
    this.score += xpGain * 10;

    this.spawnBurst(e.x, e.y, [0xd42020, 0xf06020, 0x2b2b2b, 0x4a4a4a], isBoss ? 18 : 10, isBoss ? 200 : 140);
    this.sfx.playKill();
    this.cameras.main.shake(isBoss ? 300 : 100, isBoss ? 0.02 : 0.006);
    this.hitStop(isBoss ? 100 : 55);
    this.spawnXpOrb(e.x, e.y, xpGain);
    this.floatingText(e.x, e.y - 14, `+${xpGain} XP`, '#44ff88');

    if (isBoss) {
      this.bossAlive    = false;
      this.bossSprite   = undefined;
      this.bossHudVisible = false;
    }

    e.destroy();
    this.checkLevelUp();
    this.updateHUD();
    if (!this.waveTransitioning) this.checkWaveComplete();
  }

  // ── Player damage ─────────────────────────────────────────────────────────

  private handleEnemyContact(time: number): void {
    if (this.isDodging || time < this.dodgeEndTime + (DODGE.INVULN_MS - DODGE.DURATION_MS)) return;
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
    this.applyDamageToPlayer(COMBAT.PLAYER_HIT_DAMAGE + Math.floor((this.wave - 1) * 1.5), time, 0xff4444);
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
    this.sfx.playDeath();
    this.cameras.main.shake(350, 0.02);
    this.screenFlash(0xff0000, 0.55);
    this.spawnBurst(this.player.x, this.player.y, [0x888888, 0x444444, 0x0d0d0d], 16, 110);

    if (this.anims.exists('player-death')) this.player.play('player-death');
    this.tweens.add({ targets: this.player, alpha: 0, scaleX: 0.15, scaleY: 0.15, duration: 850, ease: 'Power3' });

    this.time.delayedCall(1700, () => {
      const timeSecs = Math.floor((this.time.now - this.gameStartTime) / 1000);

      this.mp?.disconnect().catch(() => {});
      this.chat?.destroy();
      this.playerList?.destroy();
      this.sfx.stopMusic();

      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start(SCENES.GAME_OVER, {
          wave:     this.wave,
          kills:    this.kills,
          level:    this.level,
          timeSecs,
          zoneId:   this.zone.id,
          zoneName: this.zone.name,
          victory:  false,
          score:    this.score,
        } satisfies GameOverData);
      });
    });
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
    this.xp    += value;
    this.score += value;
    this.sfx.playPickup();
    this.spawnBurst(orb.x, orb.y, [0xe8b800, 0xffe040, 0xffffff], 5, 80);
    this.floatingText(orb.x, orb.y - 8, `+${value} XP`, '#ffe040');
    (orb.getData('sparkleTimer') as Phaser.Time.TimerEvent)?.destroy();
    orb.destroy();
    this.checkLevelUp();
    this.updateHUD();
  }

  private checkLevelUp(): void {
    if (this.level >= LEVELS.MAX_LEVEL) return;
    const threshold = LEVELS.XP_THRESHOLDS[this.level - 1];
    if (this.xp < threshold) return;

    this.level++;
    const maxHp = PLAYER.BASE_HP + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL;
    this.hp = Math.min(maxHp, this.hp + 30);

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

    this.waveText = this.add.text(lx, 28, 'Wave 1', { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);
    this.killText = this.add.text(lx, 37, 'Kills: 0', { fontSize: '5px', color: '#aaaaaa', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);

    this.dodgeCooldownText = this.add.text(lx, 46, 'Q DODGE', { fontSize: '5px', color: '#44ffaa', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(Z);

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

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 3, 'WASD: Move  |  SHIFT: Sprint  |  Q: Dodge  |  SPACE: Attack  |  M: Map  |  F: Craft  |  ESC: Pause', {
      fontSize: '4px', color: '#333344', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(Z);

    this.miniMap = new MiniMapOverlay(this);

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
    const maxHp = PLAYER.BASE_HP + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL;
    const hpPct = Math.max(0, this.hp / maxHp);
    this.hpBar.scaleX = hpPct;
    this.hpBar.setFillStyle(hpPct > 0.5 ? 0x00ee44 : hpPct > 0.25 ? 0xffaa00 : 0xff2222);
    if (this.manaBar) this.manaBar.scaleX = Math.max(0, this.mana / (PLAYER.BASE_MANA as number));
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
}
