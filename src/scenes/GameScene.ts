import Phaser from 'phaser';
import {
  CANVAS, PLAYER, ENEMIES, COMBAT,
  MANA, LEVELS, SCENES,
} from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import type { GameOverData } from './GameOverScene';

/**
 * GameScene — polished vertical slice arena.
 *
 * Loop: Move → Attack enemies → Loot XP orbs → Level up → Next wave (harder).
 * Controls: WASD / Arrow keys to move. SPACE to attack. ESC to pause.
 */
export class GameScene extends Phaser.Scene {
  private readonly worldW = CANVAS.WIDTH * 2;
  private readonly worldH = CANVAS.HEIGHT * 2;

  private player!:  Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;

  private cursors!:   Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!:      { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private attackKey!: Phaser.Input.Keyboard.Key;
  private escKey!:    Phaser.Input.Keyboard.Key;

  private hp:    number = PLAYER.BASE_HP;
  private mana:  number = PLAYER.BASE_MANA;
  private xp:    number = 0;
  private level: number = 1;
  private lastAttackTime = 0;
  private lastHitTime    = 0;
  private isDead         = false;

  private wave              = 1;
  private kills             = 0;
  private waveTransitioning = false;
  private gameStartTime     = 0;

  private hpBar!:          Phaser.GameObjects.Rectangle;
  private manaBar!:        Phaser.GameObjects.Rectangle;
  private xpBar!:          Phaser.GameObjects.Rectangle;
  private levelText!:      Phaser.GameObjects.Text;
  private waveText!:       Phaser.GameObjects.Text;
  private killText!:       Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;

  private sfx!: SoundManager;

  constructor() {
    super(SCENES.GAME);
  }

  create(): void {
    this.hp    = PLAYER.BASE_HP;
    this.mana  = PLAYER.BASE_MANA;
    this.xp    = 0;
    this.level = 1;
    this.lastAttackTime    = 0;
    this.lastHitTime       = 0;
    this.isDead            = false;
    this.wave              = 1;
    this.kills             = 0;
    this.waveTransitioning = false;
    this.gameStartTime     = this.time.now;

    this.sfx = new SoundManager();

    this.buildWorld();
    this.createPlayer();

    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.setupCollisions();
    this.setupInput();
    this.setupCamera();
    this.createHUD();
    this.spawnWave();

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  update(time: number, delta: number): void {
    if (this.isDead) return;

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.launch(SCENES.PAUSE);
      this.scene.pause();
      return;
    }

    this.handlePlayerMovement();
    this.regenMana(delta);
    this.updateEnemyAI();
    this.handleAttack(time);
    this.handleEnemyContact(time);
  }

  private buildWorld(): void {
    const W    = this.worldW;
    const H    = this.worldH;
    const WALL = 32;

    this.add.tileSprite(W / 2, H / 2, W, H, 'ground').setDepth(0);

    const wc = 0x2b2b2b;
    this.add.rectangle(W / 2,        WALL / 2,    W, WALL, wc).setDepth(3);
    this.add.rectangle(W / 2,    H - WALL / 2,    W, WALL, wc).setDepth(3);
    this.add.rectangle(WALL / 2,        H / 2, WALL,    H, wc).setDepth(3);
    this.add.rectangle(W - WALL / 2,    H / 2, WALL,    H, wc).setDepth(3);

    this.drawWallTiles(W, H, WALL);
    this.physics.world.setBounds(WALL, WALL, W - WALL * 2, H - WALL * 2);
    this.addArenaDecor(W, H, WALL);
  }

  private drawWallTiles(W: number, H: number, WALL: number): void {
    const T    = 16;
    const cols = Math.ceil(W / T);
    const rows = Math.ceil((H - WALL * 2) / T);

    for (let c = 0; c < cols; c++) {
      const x = c * T + T / 2;
      for (let r = 0; r < WALL / T; r++) {
        this.add.image(x, r * T + T / 2,           'wall').setDepth(4);
        this.add.image(x, H - WALL + r * T + T / 2, 'wall').setDepth(4);
      }
    }
    for (let r = 0; r < rows; r++) {
      const y = WALL + r * T + T / 2;
      for (let c = 0; c < WALL / T; c++) {
        this.add.image(c * T + T / 2,           y, 'wall').setDepth(4);
        this.add.image(W - WALL + c * T + T / 2, y, 'wall').setDepth(4);
      }
    }
  }

  private addArenaDecor(W: number, H: number, WALL: number): void {
    const cx = W / 2;
    const cy = H / 2;
    const pts: [number, number][] = [
      [110, 90], [530, 90], [110, 270], [530, 270],
      [230, 70], [410, 70], [230, 290], [410, 290],
      [160, 180], [480, 180],
    ];
    for (const [x, y] of pts) {
      if (x < WALL + 12 || x > W - WALL - 12) continue;
      if (y < WALL + 12 || y > H - WALL - 12) continue;
      if (Phaser.Math.Distance.Between(x, y, cx, cy) < 60) continue;
      const g = this.add.graphics().setDepth(5);
      g.fillStyle(0x4a4a4a); g.fillRect(x - 7, y - 4, 14, 8);
      g.fillStyle(0x6e6e6e); g.fillRect(x - 6, y - 6,  5, 5);
      g.fillStyle(0x2b2b2b); g.fillRect(x + 3,  y + 2,  5, 3);
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.worldW / 2, this.worldH / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    if (this.anims.exists('player-idle')) this.player.play('player-idle');
  }

  private handlePlayerMovement(): void {
    const speed = PLAYER.MOVE_SPEED + (this.level - 1) * LEVELS.SPEED_BONUS_PER_LEVEL;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown  || this.wasd.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx =  speed;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown  || this.wasd.S.isDown) vy =  speed;
    this.player.setVelocity(vx, vy);

    if (this.anims.exists('player-walk') && this.anims.exists('player-idle')) {
      const moving  = vx !== 0 || vy !== 0;
      const current = this.player.anims.currentAnim?.key;
      if (moving  && current !== 'player-walk')  this.player.play('player-walk');
      if (!moving && current !== 'player-idle') this.player.play('player-idle');
    }
  }

  private regenMana(delta: number): void {
    this.mana = Math.min(PLAYER.BASE_MANA, this.mana + MANA.REGEN_PER_SEC * delta / 1000);
    if (this.manaBar) this.manaBar.scaleX = this.mana / PLAYER.BASE_MANA;
  }

  private spawnWave(): void {
    this.enemies.clear(true, true);
    this.waveTransitioning = false;

    const count   = COMBAT.WAVE_BASE_ENEMY_COUNT + (this.wave - 1) * 2;
    const hpScale = Math.pow(ENEMIES.HP_SCALE_PER_TIER, this.wave - 1);
    const enemyHp = Math.floor(COMBAT.ENEMY_HP * hpScale);
    const WALL    = 52;
    const cx      = this.worldW / 2;
    const cy      = this.worldH / 2;

    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = Phaser.Math.Between(WALL, this.worldW - WALL);
        y = Phaser.Math.Between(WALL, this.worldH - WALL);
      } while (Phaser.Math.Distance.Between(x, y, cx, cy) < 90);

      const e = this.enemies.create(x, y, 'enemy') as Phaser.Physics.Arcade.Sprite;
      e.setCollideWorldBounds(true);
      e.setDepth(10);
      e.setData('hp', enemyHp);
      e.setData('patrolAngle', Phaser.Math.FloatBetween(0, Math.PI * 2));
      if (this.anims.exists('enemy-walk')) e.play('enemy-walk');
    }

    this.physics.add.collider(this.enemies, this.enemies);
    this.updateHUD();
  }

  private updateEnemyAI(): void {
    const aggro  = ENEMIES.AGGRO_RANGE_PX;
    const patrol = ENEMIES.PATROL_SPEED;

    this.enemies.getChildren().forEach(obj => {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;

      const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (dist < aggro) {
        const dx  = this.player.x - e.x;
        const dy  = this.player.y - e.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        e.setVelocity((dx / len) * patrol * 1.6, (dy / len) * patrol * 1.6);
      } else {
        const angle = (e.getData('patrolAngle') as number) + 0.013;
        e.setData('patrolAngle', angle);
        e.setVelocity(Math.cos(angle) * patrol, Math.sin(angle) * patrol);
      }
    });
  }

  private handleAttack(time: number): void {
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return;
    if (time - this.lastAttackTime < COMBAT.ATTACK_COOLDOWN_MS) return;

    this.lastAttackTime = time;
    this.mana = Math.max(0, this.mana - MANA.ATTACK_COST);
    this.sfx.playAttack();

    this.tweens.add({
      targets: this.player,
      scaleX: 1.25, scaleY: 0.82,
      duration: 55,
      yoyo: true,
      ease: 'Power2',
    });

    if (this.anims.exists('player-attack')) {
      this.player.play('player-attack');
      this.player.once('animationcomplete', () => {
        if (!this.isDead && this.anims.exists('player-idle')) this.player.play('player-idle');
      });
    }

    this.showAttackRing();

    const dmg = COMBAT.ATTACK_DAMAGE + (this.level - 1) * LEVELS.DAMAGE_BONUS_PER_LEVEL;
    let hitAny = false;

    this.enemies.getChildren().forEach(obj => {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist > COMBAT.ATTACK_RANGE_PX) return;

      hitAny = true;

      const newHp = (e.getData('hp') as number) - dmg;
      e.setData('hp', newHp);

      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      e.setVelocity((dx / len) * COMBAT.ATTACK_KNOCKBACK, (dy / len) * COMBAT.ATTACK_KNOCKBACK);

      e.setTint(0xffffff);
      this.time.delayedCall(80, () => { if (e.active) e.clearTint(); });

      this.spawnBurst(e.x, e.y, [0xffffff, 0xffe040, 0xf0f0f0], 5, 110);
      this.sfx.playHit();
      this.floatingText(e.x, e.y - 10, `-${dmg}`, '#ff8888');

      if (newHp <= 0) this.killEnemy(e);
    });

    if (hitAny) this.cameras.main.shake(70, 0.004);
    this.updateHUD();
  }

  private killEnemy(e: Phaser.Physics.Arcade.Sprite): void {
    this.kills++;
    this.spawnBurst(e.x, e.y, [0xd42020, 0xf06020, 0x2b2b2b, 0x4a4a4a], 10, 140);
    this.sfx.playKill();
    this.cameras.main.shake(100, 0.006);
    this.hitStop(55);
    this.spawnXpOrb(e.x, e.y);
    e.destroy();
    this.updateHUD();
    if (!this.waveTransitioning) this.checkWaveComplete();
  }

  private handleEnemyContact(time: number): void {
    if (time - this.lastHitTime < COMBAT.PLAYER_INVINCIBILITY_MS) return;

    const pb  = this.player.getBounds();
    let   hit = false;
    this.enemies.getChildren().forEach(obj => {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (e.active && Phaser.Geom.Intersects.RectangleToRectangle(pb, e.getBounds())) hit = true;
    });
    if (!hit) return;

    this.lastHitTime = time;
    this.hp = Math.max(0, this.hp - COMBAT.PLAYER_HIT_DAMAGE);

    this.player.setTint(0xff4444);
    this.time.delayedCall(300, () => { if (!this.isDead) this.player.clearTint(); });
    this.cameras.main.shake(200, 0.014);
    this.screenFlash(0xff2020, 0.28);
    this.sfx.playPlayerHit();
    this.spawnBurst(this.player.x, this.player.y, [0xff4444, 0xffffff, 0xffaa00], 5, 80);

    this.updateHUD();
    if (this.hp <= 0) this.playerDead();
  }

  private playerDead(): void {
    this.isDead = true;
    this.sfx.playDeath();
    this.cameras.main.shake(350, 0.02);
    this.screenFlash(0xff0000, 0.55);
    this.spawnBurst(this.player.x, this.player.y, [0x888888, 0x444444, 0x0d0d0d], 16, 110);

    if (this.anims.exists('player-death')) this.player.play('player-death');
    this.tweens.add({
      targets: this.player,
      alpha: 0, scaleX: 0.15, scaleY: 0.15,
      duration: 850,
      ease: 'Power3',
    });

    this.time.delayedCall(1700, () => {
      const timeSecs = Math.floor((this.time.now - this.gameStartTime) / 1000);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start(SCENES.GAME_OVER, {
          wave: this.wave, kills: this.kills,
          level: this.level, timeSecs,
        } satisfies GameOverData);
      });
    });
  }

  private checkWaveComplete(): void {
    if (this.enemies.countActive(true) > 0) return;
    this.waveTransitioning = true;
    const cleared = this.wave;
    this.wave++;

    this.sfx.playWaveClear();
    this.screenFlash(0xffe040, 0.12);

    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    const banner = this.add
      .text(cx, cy + 5, `✦  Wave ${cleared} Cleared!  ✦`, {
        fontSize: '13px', color: '#ffd700',
        fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);

    this.tweens.add({ targets: banner, alpha: 1, duration: 280, ease: 'Power2' });
    this.tweens.add({
      targets: banner, y: cy - 20, alpha: 0,
      duration: 1400, delay: 650, ease: 'Power2',
      onComplete: () => banner.destroy(),
    });

    const nextLabel = this.add
      .text(cx, cy + 22, `Wave ${this.wave} incoming...`, {
        fontSize: '6px', color: '#ff8888',
        fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);

    this.tweens.add({ targets: nextLabel, alpha: 1, duration: 200, delay: 900 });
    this.time.delayedCall(2100, () => { nextLabel.destroy(); this.spawnWave(); });
  }

  // ── VFX helpers ───────────────────────────────────────────────────────────────

  private showAttackRing(): void {
    const gfx = this.add.graphics().setDepth(20);
    gfx.lineStyle(2, 0xffff44, 0.95);
    gfx.strokeCircle(this.player.x, this.player.y, COMBAT.ATTACK_RANGE_PX);
    this.tweens.add({
      targets: gfx, alpha: 0, scaleX: 1.6, scaleY: 1.6,
      duration: 220, ease: 'Power2',
      onComplete: () => gfx.destroy(),
    });
  }

  private spawnBurst(x: number, y: number, tints: number[], count = 8, speed = 120): void {
    const emitter = this.add.particles(x, y, 'particle', {
      speed:    { min: speed * 0.3, max: speed },
      angle:    { min: 0, max: 360 },
      scale:    { start: 0.7, end: 0, ease: 'Power2' },
      lifespan: { min: 280, max: 480 },
      tint:     tints,
      emitting: false,
    });
    emitter.setDepth(22);
    emitter.explode(count);
    this.time.delayedCall(600, () => { if (emitter?.active) emitter.destroy(); });
  }

  private screenFlash(color: number, alpha = 0.3): void {
    const flash = this.add
      .rectangle(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, CANVAS.WIDTH, CANVAS.HEIGHT, color, alpha)
      .setScrollFactor(0).setDepth(100);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 230, ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  private floatingText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, { fontSize: '6px', color, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 })
      .setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: t, y: y - 24, alpha: 0,
      duration: 900, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  private hitStop(ms: number): void {
    this.physics.pause();
    setTimeout(() => {
      if (this.scene.isActive(SCENES.GAME) && !this.isDead) this.physics.resume();
    }, ms);
  }

  // ── Pickups ────────────────────────────────────────────────────────────────────

  private spawnXpOrb(x: number, y: number): void {
    const orb = this.pickups.create(
      x + Phaser.Math.Between(-14, 14),
      y + Phaser.Math.Between(-14, 14),
      'pickup',
    ) as Phaser.Physics.Arcade.Sprite;
    orb.setDepth(8);
    orb.setData('value', PLAYER.XP_PER_KILL_BASE + this.wave * 2);
    this.tweens.add({
      targets: orb, y: orb.y - 5,
      duration: 600 + Phaser.Math.Between(0, 200),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private collectPickup(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    pickup:  Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const orb = pickup as Phaser.Physics.Arcade.Sprite;
    if (!orb.active) return;

    const value = orb.getData('value') as number;
    this.xp += value;
    this.sfx.playPickup();
    this.spawnBurst(orb.x, orb.y, [0xe8b800, 0xffe040, 0xffffff], 5, 80);
    this.floatingText(orb.x, orb.y - 8, `+${value} XP`, '#ffe040');
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
    this.hp = Math.min(maxHp, this.hp + 40);

    this.spawnBurst(this.player.x, this.player.y, [0xffe040, 0xf0f0f0, 0x9050e0, 0xd090ff], 22, 160);
    this.cameras.main.shake(280, 0.016);
    this.screenFlash(0xffe040, 0.4);
    this.sfx.playLevelUp();

    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;
    const lvText = this.add
      .text(cx, cy, `✦  LEVEL ${this.level}  ✦`, {
        fontSize: '12px', color: '#ffe040',
        fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(35).setAlpha(0).setScale(0.6);

    this.tweens.add({ targets: lvText, alpha: 1, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.out' });
    this.tweens.add({
      targets: lvText, alpha: 0, y: cy - 30,
      duration: 1200, delay: 1000, ease: 'Power2',
      onComplete: () => lvText.destroy(),
    });

    this.updateHUD();
  }

  // ── Collisions / Input / Camera ──────────────────────────────────────────────

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.player, this.pickups,
      this.collectPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
  }

  private setupInput(): void {
    this.cursors   = this.input.keyboard!.createCursorKeys();
    this.wasd      = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const lx = 4;
    const bx = 18;
    const bw = 58;
    const Z  = 12;

    this.add.rectangle(bx + bw / 2 + 4, 32, bw + 36, 66, 0x000000, 0.5)
      .setScrollFactor(0).setDepth(Z - 1);

    this.add.text(lx, 5, 'HP', { fontSize: '5px', color: '#ff8888', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(Z);
    this.add.rectangle(bx + bw / 2, 5, bw, 4, 0x440000).setScrollFactor(0).setDepth(Z - 1);
    this.hpBar = this.add.rectangle(bx, 5, bw, 4, 0x00ee44).setOrigin(0, 0.5).setScrollFactor(0).setDepth(Z);

    this.add.text(lx, 13, 'MP', { fontSize: '5px', color: '#9090ff', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(Z);
    this.add.rectangle(bx + bw / 2, 13, bw, 3, 0x1a0a3a).setScrollFactor(0).setDepth(Z - 1);
    this.manaBar = this.add.rectangle(bx, 13, bw, 3, 0x9050e0).setOrigin(0, 0.5).setScrollFactor(0).setDepth(Z);

    this.add.text(lx, 20, 'XP', { fontSize: '5px', color: '#ffe040', fontFamily: 'monospace' })
      .setScrollFactor(0).setDepth(Z);
    this.add.rectangle(bx + bw / 2, 20, bw, 3, 0x3a2a00).setScrollFactor(0).setDepth(Z - 1);
    this.xpBar = this.add.rectangle(bx, 20, bw, 3, 0xe8b800).setOrigin(0, 0.5).setScrollFactor(0).setDepth(Z);

    this.levelText = this.add.text(bx + bw + 4, 5, 'Lv.1', {
      fontSize: '5px', color: '#ffffff', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(Z);

    this.waveText = this.add.text(lx, 28, 'Wave 1', {
      fontSize: '5px', color: '#ffd700', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(Z);

    this.killText = this.add.text(lx, 37, 'Kills: 0', {
      fontSize: '5px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(Z);

    this.enemyCountText = this.add.text(CANVAS.WIDTH - 4, 4, '', {
      fontSize: '5px', color: '#ff8888', fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(Z);

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 3, 'WASD: Move  |  SPACE: Attack  |  ESC: Pause', {
      fontSize: '4px', color: '#333344', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(Z);

    this.updateHUD();
  }

  private updateHUD(): void {
    const maxHp = PLAYER.BASE_HP + (this.level - 1) * LEVELS.HP_BONUS_PER_LEVEL;
    const hpPct = Math.max(0, this.hp / maxHp);
    this.hpBar.scaleX = hpPct;
    this.hpBar.setFillStyle(hpPct > 0.5 ? 0x00ee44 : hpPct > 0.25 ? 0xffaa00 : 0xff2222);

    if (this.manaBar) this.manaBar.scaleX = Math.max(0, this.mana / PLAYER.BASE_MANA);

    const atMax = this.level >= LEVELS.MAX_LEVEL;
    if (this.xpBar) {
      this.xpBar.scaleX = atMax ? 1 : Math.min(1, this.xp / LEVELS.XP_THRESHOLDS[this.level - 1]);
    }

    this.levelText?.setText(`Lv.${this.level}${atMax ? ' MAX' : ''}`);
    this.waveText?.setText(`Wave ${this.wave}`);
    this.killText?.setText(`Kills: ${this.kills}`);

    const alive = this.enemies?.countActive(true) ?? 0;
    this.enemyCountText?.setText(alive > 0 ? `Enemies: ${alive}` : '');
  }
}
