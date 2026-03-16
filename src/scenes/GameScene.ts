import Phaser from 'phaser';
import { CANVAS, PLAYER, ENEMIES, COMBAT, SCENES } from '../config/constants';

/**
 * GameScene — core mechanic prototype.
 *
 * Loop: Move → Attack enemies → Enemies die → Wave cleared → Next wave (harder).
 * Controls: WASD / Arrow keys to move. SPACE to melee attack.
 * Player takes contact damage with invincibility frames.
 */
export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private attackKey!: Phaser.Input.Keyboard.Key;

  // Player state
  private hp: number = PLAYER.BASE_HP;
  private lastAttackTime: number = 0;
  private lastHitTime: number = 0;
  private isDead: boolean = false;

  // Wave state
  private wave: number = 1;
  private kills: number = 0;
  // HUD
  private hpBar!: Phaser.GameObjects.Rectangle;
  private waveText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.GAME);
  }

  create(): void {
    // Reset state on scene (re)start
    this.hp = PLAYER.BASE_HP;
    this.lastAttackTime = 0;
    this.lastHitTime = 0;
    this.isDead = false;
    this.wave = 1;
    this.kills = 0;

    this.buildWorld();
    this.createPlayer();

    // Create enemy group once; reused across waves
    this.enemies = this.physics.add.group();

    this.setupCollisions();
    this.setupInput();
    this.setupCamera();
    this.createHUD();

    this.spawnWave();
  }

  update(time: number): void {
    if (this.isDead) return;

    this.handlePlayerMovement();
    this.updateEnemyAI();
    this.handleAttack(time);
    this.handleEnemyContact(time);
  }

  // ─── World ────────────────────────────────────────────────────────────────

  private buildWorld(): void {
    const worldW = CANVAS.WIDTH * 3;
    const worldH = CANVAS.HEIGHT * 3;

    // Dark background
    this.add.rectangle(worldW / 2, worldH / 2, worldW, worldH, 0x1a1a2e);

    // Ground tiles (bottom two rows)
    this.ground = this.physics.add.staticGroup();
    const tileSize = 16;
    const rows = Math.ceil(worldH / tileSize);
    const cols = Math.ceil(worldW / tileSize);

    for (let row = rows - 2; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.ground.create(
          col * tileSize + tileSize / 2,
          row * tileSize + tileSize / 2,
          'ground'
        );
      }
    }

    this.physics.world.setBounds(0, 0, worldW, worldH);
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  private createPlayer(): void {
    const worldW = CANVAS.WIDTH * 3;
    const groundY = CANVAS.HEIGHT * 3 - 16 * 2 - 12;
    this.player = this.physics.add.sprite(worldW / 2, groundY, 'player');
    this.player.setCollideWorldBounds(true);
  }

  private handlePlayerMovement(): void {
    const vel = PLAYER.MOVE_SPEED;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -vel;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = vel;

    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -vel;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = vel;

    this.player.setVelocity(vx, vy);
  }

  // ─── Enemies ──────────────────────────────────────────────────────────────

  private spawnWave(): void {
    this.enemies.clear(true, true);

    const count = COMBAT.WAVE_BASE_ENEMY_COUNT + (this.wave - 1) * 2;
    const worldW = CANVAS.WIDTH * 3;
    const groundY = CANVAS.HEIGHT * 3 - 16 * 2 - 12;

    for (let i = 0; i < count; i++) {
      // Keep enemies at least 60px from player spawn
      let x: number;
      do {
        x = Phaser.Math.Between(80, worldW - 80);
      } while (Math.abs(x - this.player.x) < 60);

      const enemy = this.enemies.create(x, groundY, 'enemy') as Phaser.Physics.Arcade.Sprite;
      enemy.setCollideWorldBounds(true);
      enemy.setData('hp', COMBAT.ENEMY_HP);
      enemy.setData('patrolDir', Phaser.Math.Between(0, 1) === 0 ? -1 : 1);
    }

    // Re-apply enemy-ground collision for the newly populated group
    this.physics.add.collider(this.enemies, this.ground);

    this.updateHUD();
  }

  private updateEnemyAI(): void {
    const aggroRange = ENEMIES.AGGRO_RANGE_PX;
    const patrolSpeed = ENEMIES.PATROL_SPEED;
    const worldW = CANVAS.WIDTH * 3;

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.player.x, this.player.y
      );

      if (dist < aggroRange) {
        // Chase player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        enemy.setVelocity((dx / len) * patrolSpeed * 1.5, (dy / len) * patrolSpeed * 1.5);
      } else {
        // Patrol left/right
        const dir = enemy.getData('patrolDir') as number;
        enemy.setVelocityX(dir * patrolSpeed);
        enemy.setVelocityY(0);

        if (enemy.x <= 20 || enemy.x >= worldW - 20) {
          enemy.setData('patrolDir', -dir);
        }
      }
    });
  }

  // ─── Combat ───────────────────────────────────────────────────────────────

  private handleAttack(time: number): void {
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return;
    if (time - this.lastAttackTime < COMBAT.ATTACK_COOLDOWN_MS) return;

    this.lastAttackTime = time;

    // Player flash
    this.tweens.add({
      targets: this.player,
      alpha: 0.4,
      duration: 60,
      yoyo: true,
    });

    // Show attack ring
    this.showAttackRing();

    // Hit all enemies in range
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      if (dist > COMBAT.ATTACK_RANGE_PX) return;

      // Apply damage
      const newHp = (enemy.getData('hp') as number) - COMBAT.ATTACK_DAMAGE;
      enemy.setData('hp', newHp);

      // Knockback
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      enemy.setVelocity((dx / len) * COMBAT.ATTACK_KNOCKBACK, (dy / len) * COMBAT.ATTACK_KNOCKBACK);

      // Hit flash (white → normal)
      enemy.setTint(0xffffff);
      this.time.delayedCall(120, () => { if (enemy.active) enemy.clearTint(); });

      if (newHp <= 0) {
        this.kills++;
        enemy.destroy();
        this.updateHUD();
        this.checkWaveComplete();
      }
    });

    this.updateHUD();
  }

  private showAttackRing(): void {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0xffff44, 0.9);
    gfx.strokeCircle(this.player.x, this.player.y, COMBAT.ATTACK_RANGE_PX);
    this.tweens.add({
      targets: gfx,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 180,
      onComplete: () => gfx.destroy(),
    });
  }

  private handleEnemyContact(time: number): void {
    // Invincibility frames after last hit
    if (time - this.lastHitTime < COMBAT.PLAYER_INVINCIBILITY_MS) return;

    const playerBounds = this.player.getBounds();
    let touching = false;

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, enemy.getBounds())) {
        touching = true;
      }
    });

    if (!touching) return;

    this.lastHitTime = time;
    this.hp = Math.max(0, this.hp - COMBAT.PLAYER_HIT_DAMAGE);

    // Hit feedback
    this.player.setTint(0xff4444);
    this.time.delayedCall(300, () => { if (!this.isDead) this.player.clearTint(); });
    this.cameras.main.shake(150, 0.008);
    this.updateHUD();

    if (this.hp <= 0) {
      this.playerDead();
    }
  }

  private playerDead(): void {
    this.isDead = true;
    this.player.setTint(0x888888);

    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    this.add.text(cx, cy - 10, 'GAME OVER', {
      fontSize: '14px',
      color: '#ff4444',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    this.add.text(cx, cy + 8, `Wave ${this.wave}  |  Kills: ${this.kills}`, {
      fontSize: '6px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    this.time.delayedCall(2500, () => this.scene.start(SCENES.MENU));
  }

  private checkWaveComplete(): void {
    if (this.enemies.countActive(true) > 0) return;

    const clearedWave = this.wave;
    this.wave++;

    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    const text = this.add
      .text(cx, cy, `Wave ${clearedWave} Cleared!`, {
        fontSize: '12px',
        color: '#ffd700',
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.time.delayedCall(1500, () => {
      text.destroy();
      this.spawnWave();
    });
  }

  // ─── Collisions ───────────────────────────────────────────────────────────

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.ground);
    // Enemy-ground colliders added in spawnWave after group is populated
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  private setupCamera(): void {
    const worldW = CANVAS.WIDTH * 3;
    const worldH = CANVAS.HEIGHT * 3;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const barX = 28;
    const barY = 7;
    const barW = 60;
    const barH = 5;

    // HP label
    this.add
      .text(4, barY, 'HP', { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace' })
      .setScrollFactor(0)
      .setDepth(12);

    // HP bar background
    this.add
      .rectangle(barX, barY, barW, barH, 0x440000)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10);

    // HP bar fill
    this.hpBar = this.add
      .rectangle(barX, barY, barW, barH, 0x00ee44)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(11);

    // Wave label
    this.waveText = this.add
      .text(4, 14, 'Wave 1', { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' })
      .setScrollFactor(0)
      .setDepth(10);

    // Kill counter
    this.killText = this.add
      .text(4, 22, 'Kills: 0', { fontSize: '5px', color: '#aaaaaa', fontFamily: 'monospace' })
      .setScrollFactor(0)
      .setDepth(10);

    // Enemy count
    this.enemyCountText = this.add
      .text(CANVAS.WIDTH - 4, 4, '', { fontSize: '5px', color: '#ff8888', fontFamily: 'monospace' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);

    // Controls hint (bottom center)
    this.add
      .text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 4, 'WASD: Move  |  SPACE: Attack', {
        fontSize: '5px',
        color: '#444466',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(10);

    this.updateHUD();
  }

  private updateHUD(): void {
    const hpPct = Math.max(0, this.hp / PLAYER.BASE_HP);
    this.hpBar.scaleX = hpPct;
    this.hpBar.setFillStyle(
      hpPct > 0.5 ? 0x00ee44 : hpPct > 0.25 ? 0xffaa00 : 0xff2222
    );

    this.waveText?.setText(`Wave ${this.wave}`);
    this.killText?.setText(`Kills: ${this.kills}`);

    const alive = this.enemies?.countActive(true) ?? 0;
    this.enemyCountText?.setText(`Enemies: ${alive}`);
  }
}
