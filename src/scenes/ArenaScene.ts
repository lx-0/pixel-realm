/**
 * ArenaScene — PvP arena combat.
 *
 * Receives an ArenaInstance from the matchmaking system and runs a
 * round-based or timed 1v1 / 2v2 match using the existing combat constants.
 *
 * Flow:
 *   1. Scene receives ArenaSceneData (instance + local player id).
 *   2. Arena map (Gladiator Pit or Shadow Sanctum) is drawn procedurally.
 *   3. Players spawn at fixed start positions; simulated opponents use
 *      simple chase-and-attack AI so the scene is playable solo.
 *   4. Match ends when one side's HP drops to 0, or when the timer expires
 *      (whoever has more HP remaining wins).
 *   5. Results are resolved through ArenaManager and stored; scene
 *      transitions to MENU carrying ArenaResultData.
 */

import Phaser from 'phaser';
import {
  CANVAS, SCENES, ARENA,
} from '../config/constants';
import {
  ArenaManager,
  type ArenaInstance,
  type ArenaPlayer,
  type ArenaMatchResult,
} from '../systems/ArenaManager';
import { ArenaHUD }              from '../ui/ArenaHUD';
import { ArenaResultsPanel }     from '../ui/ArenaResultsPanel';
import { ArenaSpectatorOverlay } from '../ui/ArenaSpectatorOverlay';

// ── Data contracts ─────────────────────────────────────────────────────────────

export interface ArenaSceneData {
  instance:      ArenaInstance;
  localPlayerId: string;
  spectating?:   boolean;
}

export interface ArenaResultData {
  won:        boolean;
  ratingDelta: number;
  newRating:  number;
  kills:      number;
  deaths:     number;
}

// ── Internal per-combatant state ───────────────────────────────────────────────

interface Combatant {
  player:        ArenaPlayer;
  sprite:        Phaser.Physics.Arcade.Sprite;
  hp:            number;
  mana:          number;
  lastAttackAt:  number;
  lastHitAt:     number;
  isLocal:       boolean;
  kills:         number;
  deaths:        number;
  team:          0 | 1;
  nameLabel:     Phaser.GameObjects.Text;
  hpBarBg:       Phaser.GameObjects.Rectangle;
  hpBarFill:     Phaser.GameObjects.Rectangle;
}

// ── Map palette ────────────────────────────────────────────────────────────────

const MAP_PALETTES = {
  gladiator_pit: {
    bg:       0x1a0e05,
    floor:    0x3a2510,
    wall:     0x2a1808,
    accent:   0xcc6633,
    tileset:  'tileset_arena_gladiator',
  },
  shadow_sanctum: {
    bg:       0x060412,
    floor:    0x120a28,
    wall:     0x080316,
    accent:   0x6633cc,
    tileset:  'tileset_arena_shadow',
  },
} as const;

// ── ArenaScene ────────────────────────────────────────────────────────────────

export class ArenaScene extends Phaser.Scene {
  constructor() { super(SCENES.ARENA); }

  // Data
  private instance!:      ArenaInstance;
  private localPlayerId!: string;
  private spectating      = false;

  // Combatants
  private combatants: Combatant[] = [];
  private localCombatant?: Combatant;

  // Physics groups
  private playerGroup!: Phaser.Physics.Arcade.Group;
  private wallGroup!:   Phaser.Physics.Arcade.StaticGroup;

  // Input
  private cursors!:    Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!:       { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private attackKey!:  Phaser.Input.Keyboard.Key;

  // Match state
  private matchStartTime  = 0;
  private matchActive     = false;
  private matchFinished   = false;
  private countdownSecs   = 3;
  private matchTimer?: Phaser.Time.TimerEvent;
  private roundKills:      Record<string, number> = {};

  // UI
  private hud!:             ArenaHUD;
  private resultsPanel?:    ArenaResultsPanel;
  private spectatorOverlay?: ArenaSpectatorOverlay;
  private countdownText!:   Phaser.GameObjects.Text;

  // ── Scene lifecycle ────────────────────────────────────────────────────────

  init(data: ArenaSceneData): void {
    this.instance      = data.instance;
    this.localPlayerId = data.localPlayerId;
    this.spectating    = data.spectating ?? false;
    this.matchActive   = false;
    this.matchFinished = false;
    this.countdownSecs = 3;
    this.combatants    = [];
    this.roundKills    = {};
  }

  create(): void {

    const pal = MAP_PALETTES[this.instance.map];
    this.cameras.main.setBackgroundColor(pal.bg);

    this.buildArena(pal);
    this.spawnCombatants();
    this.setupInput();
    this.setupPhysics();
    this.buildHUD();
    this.startCountdown();

    if (this.spectating) {
      this.spectatorOverlay = new ArenaSpectatorOverlay(this, this.instance);
    }
  }

  update(_time: number, delta: number): void {
    if (this.matchFinished) return;

    if (!this.matchActive) return;

    for (const c of this.combatants) {
      if (c.isLocal && !this.spectating) {
        this.updateLocalInput(c, delta);
      } else {
        this.updateAI(c, delta);
      }
      this.updateHpBar(c);
    }

    this.hud.update(this.getRemainingMs(), this.combatants);
    this.spectatorOverlay?.update(this.combatants);
  }

  // ── Map construction ───────────────────────────────────────────────────────

  private buildArena(pal: typeof MAP_PALETTES[keyof typeof MAP_PALETTES]): void {
    const W = CANVAS.WIDTH;
    const H = CANVAS.HEIGHT;

    // Floor
    this.add.rectangle(W / 2, H / 2, W - 20, H - 20, pal.floor).setDepth(0);

    // Border walls (physics-enabled)
    this.wallGroup = this.physics.add.staticGroup();
    const thickness = 8;
    const makeWall = (x: number, y: number, w: number, h: number) => {
      const r = this.add.rectangle(x, y, w, h, pal.wall).setDepth(1);
      this.physics.add.existing(r, true);
      this.wallGroup.add(r);
    };

    // top, bottom, left, right
    makeWall(W / 2, thickness / 2,  W, thickness);
    makeWall(W / 2, H - thickness / 2, W, thickness);
    makeWall(thickness / 2, H / 2, thickness, H);
    makeWall(W - thickness / 2, H / 2, thickness, H);

    // Central pillars (map-specific)
    if (this.instance.map === 'gladiator_pit') {
      // Four corner pillars
      [[64, 48],[W-64, 48],[64, H-48],[W-64, H-48]].forEach(([px, py]) => {
        const p = this.add.rectangle(px, py, 12, 12, pal.accent).setDepth(1);
        this.physics.add.existing(p, true);
        this.wallGroup.add(p);
      });
    } else {
      // Shadow sanctum: central barrier
      const bar = this.add.rectangle(W / 2, H / 2, 8, 40, pal.accent).setDepth(1);
      this.physics.add.existing(bar, true);
      this.wallGroup.add(bar);
    }

    // Arena decorative border line
    const gfx = this.add.graphics().setDepth(2);
    gfx.lineStyle(1, pal.accent, 0.4);
    gfx.strokeRect(thickness, thickness, W - thickness * 2, H - thickness * 2);
  }

  // ── Spawning ───────────────────────────────────────────────────────────────

  private spawnCombatants(): void {
    this.playerGroup = this.physics.add.group();

    const W = CANVAS.WIDTH;
    const H = CANVAS.HEIGHT;

    const spawns = this.instance.mode === '1v1'
      ? [
          { x: W * 0.25, y: H / 2, team: 0 as const },
          { x: W * 0.75, y: H / 2, team: 1 as const },
        ]
      : [
          { x: W * 0.20, y: H * 0.35, team: 0 as const },
          { x: W * 0.20, y: H * 0.65, team: 0 as const },
          { x: W * 0.80, y: H * 0.35, team: 1 as const },
          { x: W * 0.80, y: H * 0.65, team: 1 as const },
        ];

    this.instance.players.forEach((player, i) => {
      const sp = spawns[i] ?? spawns[0];
      const isLocal = player.id === this.localPlayerId;

      const sprite = this.physics.add.sprite(sp.x, sp.y, 'player')
        .setDepth(5)
        .setCollideWorldBounds(true)
        .setBounce(0.1)
        .setTint(sp.team === 0 ? 0x88ccff : 0xff8888);

      sprite.setData('combatantIdx', i);

      // Name label
      const nameLabel = this.add.text(sp.x, sp.y - 14, player.name.slice(0, 12), {
        fontSize: '4px', color: isLocal ? '#88ffcc' : (sp.team === 0 ? '#88ccff' : '#ff9999'),
        fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 1).setDepth(6).setScrollFactor(1);

      // HP bar bg + fill
      const hpBarBg   = this.add.rectangle(sp.x, sp.y - 10, 18, 2, 0x330000).setDepth(6).setOrigin(0.5, 0.5);
      const hpBarFill = this.add.rectangle(sp.x - 9, sp.y - 10, 18, 2, sp.team === 0 ? 0x44aa44 : 0xcc3333).setDepth(7).setOrigin(0, 0.5);

      const combatant: Combatant = {
        player,
        sprite,
        hp:           ARENA.ROUND_HP,
        mana:         ARENA.ROUND_MANA,
        lastAttackAt: 0,
        lastHitAt:    0,
        isLocal,
        kills:        0,
        deaths:       0,
        team:         sp.team,
        nameLabel,
        hpBarBg,
        hpBarFill,
      };

      this.combatants.push(combatant);
      this.playerGroup.add(sprite);
      this.roundKills[player.id] = 0;

      if (isLocal) this.localCombatant = combatant;
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.cursors   = this.input.keyboard!.createCursorKeys();
    this.wasd      = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // ── Physics ────────────────────────────────────────────────────────────────

  private setupPhysics(): void {
    this.physics.add.collider(this.playerGroup, this.wallGroup);
    this.physics.add.collider(this.playerGroup, this.playerGroup);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private buildHUD(): void {
    this.hud = new ArenaHUD(this, this.instance, this.localPlayerId);

    this.countdownText = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, '', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  private startCountdown(): void {
    this.countdownText.setText(`${this.countdownSecs}`);
    this.time.addEvent({
      delay: 1000,
      repeat: this.countdownSecs,
      callback: () => {
        this.countdownSecs--;
        if (this.countdownSecs > 0) {
          this.countdownText.setText(`${this.countdownSecs}`);
        } else {
          this.countdownText.setText('FIGHT!');
          this.time.delayedCall(600, () => {
            this.countdownText.setVisible(false);
            this.beginMatch();
          });
        }
      },
    });
  }

  private beginMatch(): void {
    this.matchActive    = true;
    this.matchStartTime = this.time.now;
    ArenaManager.getInstance().startInstance(this.instance.id);

    this.matchTimer = this.time.addEvent({
      delay: ARENA.MATCH_DURATION_MS,
      callback: this.onTimeExpired,
      callbackScope: this,
    });
  }

  // ── Input processing ───────────────────────────────────────────────────────

  private updateLocalInput(c: Combatant, _delta: number): void {
    const speed = ARENA.MOVE_SPEED;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown  || this.wasd.A.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx =  speed;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) vy = -speed;
    if (this.cursors.down.isDown  || this.wasd.S.isDown) vy =  speed;

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    c.sprite.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      c.sprite.anims.play('player-walk', true);
    } else {
      c.sprite.anims.play('player-idle', true);
    }

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.tryAttack(c);
    }
  }

  // ── AI ─────────────────────────────────────────────────────────────────────

  private updateAI(c: Combatant, _delta: number): void {
    // Find nearest enemy
    const enemies = this.combatants.filter(o => o.team !== c.team && o.hp > 0);
    if (enemies.length === 0) { c.sprite.setVelocity(0, 0); return; }

    const target = enemies.reduce((closest, e) => {
      const d  = Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, e.sprite.x, e.sprite.y);
      const dc = Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, closest.sprite.x, closest.sprite.y);
      return d < dc ? e : closest;
    }, enemies[0]);

    const dist = Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, target.sprite.x, target.sprite.y);
    const speed = ARENA.MOVE_SPEED * 0.8;

    if (dist > ARENA.ATTACK_RANGE_PX + 4) {
      // Chase
      const angle = Phaser.Math.Angle.Between(c.sprite.x, c.sprite.y, target.sprite.x, target.sprite.y);
      c.sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      c.sprite.anims.play('player-walk', true);
    } else {
      c.sprite.setVelocity(0, 0);
      c.sprite.anims.play('player-idle', true);
      this.tryAttack(c);
    }
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  private tryAttack(attacker: Combatant): void {
    const now = this.time.now;
    if (now - attacker.lastAttackAt < ARENA.ATTACK_COOLDOWN_MS) return;
    attacker.lastAttackAt = now;
    attacker.sprite.anims.play('player-attack', true);

    const targets = this.combatants.filter(c => c.team !== attacker.team && c.hp > 0);
    for (const target of targets) {
      const dist = Phaser.Math.Distance.Between(
        attacker.sprite.x, attacker.sprite.y,
        target.sprite.x,   target.sprite.y,
      );
      if (dist <= ARENA.ATTACK_RANGE_PX) {
        this.dealDamage(attacker, target);
      }
    }
  }

  private dealDamage(attacker: Combatant, target: Combatant): void {
    const now = this.time.now;
    if (now - target.lastHitAt < ARENA.PLAYER_INVINCIBILITY_MS) return;
    target.lastHitAt = now;

    target.hp = Math.max(0, target.hp - ARENA.ATTACK_DAMAGE);

    // Knockback
    const angle = Phaser.Math.Angle.Between(
      attacker.sprite.x, attacker.sprite.y,
      target.sprite.x,   target.sprite.y,
    );
    target.sprite.setVelocity(
      Math.cos(angle) * ARENA.ATTACK_KNOCKBACK,
      Math.sin(angle) * ARENA.ATTACK_KNOCKBACK,
    );

    // Hit flash
    target.sprite.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (target.sprite?.active) {
        target.sprite.setTint(target.team === 0 ? 0x88ccff : 0xff8888);
      }
    });

    if (target.hp <= 0) {
      this.onCombatantDied(attacker, target);
    }
  }

  private onCombatantDied(killer: Combatant, victim: Combatant): void {
    killer.kills++;
    victim.deaths++;
    this.roundKills[killer.player.id] = (this.roundKills[killer.player.id] ?? 0) + 1;

    victim.sprite.anims.play('player-death', true);
    victim.sprite.setActive(false);
    victim.nameLabel.setVisible(false);
    victim.hpBarBg.setVisible(false);
    victim.hpBarFill.setVisible(false);

    this.time.delayedCall(400, () => {
      if (victim.sprite?.active === false) {
        victim.sprite.setVisible(false);
      }
    });

    // Check win condition
    this.checkWinCondition();
  }

  // ── Win condition ──────────────────────────────────────────────────────────

  private checkWinCondition(): void {
    if (this.matchFinished) return;

    const team0Alive = this.combatants.filter(c => c.team === 0 && c.hp > 0).length;
    const team1Alive = this.combatants.filter(c => c.team === 1 && c.hp > 0).length;

    if (team0Alive === 0 || team1Alive === 0) {
      const team1Won = team0Alive === 0;
      this.endMatch(team1Won ? 1 : 0);
    }
  }

  private onTimeExpired(): void {
    if (this.matchFinished) return;
    // Whoever has more total HP remaining wins
    const hp0 = this.combatants.filter(c => c.team === 0).reduce((s, c) => s + c.hp, 0);
    const hp1 = this.combatants.filter(c => c.team === 1).reduce((s, c) => s + c.hp, 0);
    this.endMatch(hp1 > hp0 ? 1 : 0);
  }

  private endMatch(winningTeam: 0 | 1): void {
    this.matchFinished = true;
    this.matchActive   = false;
    this.matchTimer?.remove();

    const winnerIds = this.combatants.filter(c => c.team === winningTeam).map(c => c.player.id);
    const loserIds  = this.combatants.filter(c => c.team !== winningTeam).map(c => c.player.id);

    const result: ArenaMatchResult = {
      instance:   this.instance,
      winnerIds,
      loserIds,
      kills:      this.roundKills,
      durationMs: this.time.now - this.matchStartTime,
    };

    const deltas = ArenaManager.getInstance().resolveMatch(result);
    const local  = this.localCombatant;
    const won    = local ? winnerIds.includes(local.player.id) : false;
    const delta  = local ? (deltas[local.player.id] ?? 0) : 0;
    const newRat = local ? ArenaManager.getInstance().getPlayer(local.player.id)?.rating ?? 0 : 0;

    const resultData: ArenaResultData = {
      won,
      ratingDelta: delta,
      newRating:   newRat,
      kills:       local?.kills ?? 0,
      deaths:      local?.deaths ?? 0,
    };

    // Pause all sprites
    this.combatants.forEach(c => c.sprite.setVelocity(0, 0));

    // Show results panel after brief delay
    this.time.delayedCall(800, () => {
      this.hud.hide();
      this.resultsPanel = new ArenaResultsPanel(this, resultData);
      this.resultsPanel.show();
      this.resultsPanel.onContinue = () => {
        this.scene.start(SCENES.MENU);
      };
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getRemainingMs(): number {
    if (!this.matchActive && !this.matchFinished) return ARENA.MATCH_DURATION_MS;
    return Math.max(0, ARENA.MATCH_DURATION_MS - (this.time.now - this.matchStartTime));
  }

  private updateHpBar(c: Combatant): void {
    const pct    = c.hp / ARENA.ROUND_HP;
    const barW   = 18;
    const fillW  = Math.max(0, barW * pct);
    c.hpBarFill.setSize(fillW, 2);
    c.hpBarFill.setPosition(c.sprite.x - barW / 2, c.sprite.y - 10);
    c.hpBarBg.setPosition(c.sprite.x, c.sprite.y - 10);
    c.nameLabel.setPosition(c.sprite.x, c.sprite.y - 14);
  }
}
