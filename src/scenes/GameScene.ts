import Phaser from 'phaser';
import { CANVAS, PLAYER, ENEMIES, SCENES } from '../config/constants';

/**
 * GameScene — core gameplay loop.
 * MVP: player moves around a tiled ground, encounters enemies with basic aggro.
 */
export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private hpText!: Phaser.GameObjects.Text;
  private hp: number = PLAYER.BASE_HP;

  constructor() {
    super(SCENES.GAME);
  }

  create(): void {
    this.buildWorld();
    this.createPlayer();
    this.createEnemies();
    this.setupCollisions();
    this.setupInput();
    this.setupCamera();
    this.createHUD();
  }

  update(): void {
    this.handlePlayerMovement();
    this.updateEnemyAI();
  }

  // ─── World ────────────────────────────────────────────────────────────────

  private buildWorld(): void {
    const worldW = CANVAS.WIDTH * 3;
    const worldH = CANVAS.HEIGHT * 3;

    // Sky / background
    this.add.rectangle(worldW / 2, worldH / 2, worldW, worldH, 0x1a1a2e);

    // Ground tiles
    this.ground = this.physics.add.staticGroup();
    const tileSize = 16;
    const rows = Math.ceil(worldH / tileSize);
    const cols = Math.ceil(worldW / tileSize);

    for (let row = rows - 2; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.ground.create(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2, 'ground');
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

  private createEnemies(): void {
    this.enemies = this.physics.add.group();
    const worldW = CANVAS.WIDTH * 3;
    const groundY = CANVAS.HEIGHT * 3 - 16 * 2 - 12;

    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(80, worldW - 80);
      const enemy = this.enemies.create(x, groundY, 'enemy') as Phaser.Physics.Arcade.Sprite;
      enemy.setCollideWorldBounds(true);
      enemy.setData('patrolDir', Phaser.Math.Between(0, 1) === 0 ? -1 : 1);
    }
  }

  private updateEnemyAI(): void {
    const aggroRange = ENEMIES.AGGRO_RANGE_PX;
    const patrolSpeed = ENEMIES.PATROL_SPEED;

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.player.x, this.player.y
      );

      if (dist < aggroRange) {
        // Chase player
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), patrolSpeed * 1.5, enemy.body!.velocity as Phaser.Math.Vector2);
      } else {
        // Patrol left/right
        const dir = enemy.getData('patrolDir') as number;
        enemy.setVelocityX(dir * patrolSpeed);
        enemy.setVelocityY(0);

        // Reverse at world edges
        if (enemy.x <= 20 || enemy.x >= CANVAS.WIDTH * 3 - 20) {
          enemy.setData('patrolDir', -dir);
        }
      }
    });
  }

  // ─── Collisions ───────────────────────────────────────────────────────────

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.enemies, this.ground);

    // Player takes damage on enemy overlap
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, undefined, this);
  }

  private handlePlayerHit(): void {
    this.hp = Math.max(0, this.hp - 1);
    this.hpText.setText(`HP: ${this.hp}`);

    if (this.hp <= 0) {
      this.cameras.main.shake(400, 0.02);
      this.time.delayedCall(600, () => this.scene.start(SCENES.MENU));
    }
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
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
    // HUD is fixed to camera — use setScrollFactor(0)
    this.hpText = this.add
      .text(4, 4, `HP: ${this.hp}`, {
        fontSize: '6px',
        color: '#00ff88',
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 1,
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.add
      .text(4, 12, 'WASD / Arrows to move', {
        fontSize: '5px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(10);
  }
}
