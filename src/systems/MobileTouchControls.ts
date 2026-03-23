/**
 * MobileTouchControls — virtual joystick + action buttons for touch devices.
 *
 * Usage:
 *   const touch = new MobileTouchControls(scene);
 *   // in update():
 *   const { dx, dy } = touch.joystick;   // normalised -1..1
 *   if (touch.attack.justPressed)  { … }
 *   if (touch.dodge.justPressed)   { … }
 *   if (touch.sprint.isDown)       { … }
 *   if (touch.menu.justPressed)    { … }
 *   touch.update();  // call at start of each frame
 *
 * The overlay is only created on touch-capable devices. On desktop it is a
 * no-op so callers can always read the state without device-guarding.
 */

export interface JoystickState {
  dx: number;   // -1 (left) … +1 (right)
  dy: number;   // -1 (up)   … +1 (down)
}

export interface ButtonState {
  isDown:      boolean;
  justPressed: boolean;   // true only on the first frame of a press
  _prevDown:   boolean;   // internal — previous frame state
}

function makeButton(): ButtonState {
  return { isDown: false, justPressed: false, _prevDown: false };
}

/** Returns true when the browser reports touch support. */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints !== undefined
  );
}

// ── Layout constants (in Phaser game pixels — internal 320×180 space) ────────
const JOYSTICK_BASE_X  = 40;    // centre of joystick base from left
const JOYSTICK_BASE_Y  = 140;   // centre from top (bottom-left area)
const JOYSTICK_RADIUS  = 22;    // outer dead-zone ring radius
const JOYSTICK_KNOB_R  = 9;     // movable knob radius
const MAX_KNOB_TRAVEL  = 16;    // max pixels the knob moves from centre

// Action button layout — bottom-right quadrant
const BTN_ATTACK_X  = 288;
const BTN_ATTACK_Y  = 150;
const BTN_DODGE_X   = 268;
const BTN_DODGE_Y   = 132;
const BTN_SPRINT_X  = 306;
const BTN_SPRINT_Y  = 132;
const BTN_MENU_X    = 306;
const BTN_MENU_Y    = 110;
const BTN_RADIUS    = 10;

const ALPHA_IDLE    = 0.35;
const ALPHA_PRESSED = 0.70;
const DEPTH         = 50;       // above everything else

export class MobileTouchControls {
  readonly joystick: JoystickState = { dx: 0, dy: 0 };
  readonly attack:  ButtonState = makeButton();
  readonly dodge:   ButtonState = makeButton();
  readonly sprint:  ButtonState = makeButton();
  readonly menu:    ButtonState = makeButton();

  readonly isActive: boolean;

  // ── Phaser game objects ───────────────────────────────────────────────────
  private base!:     Phaser.GameObjects.Arc;
  private knob!:     Phaser.GameObjects.Arc;
  private btnAtk!:   Phaser.GameObjects.Arc;
  private btnDodge!: Phaser.GameObjects.Arc;
  private btnSprint!:Phaser.GameObjects.Arc;
  private btnMenu!:  Phaser.GameObjects.Arc;

  // text labels on buttons
  private lblAtk!:    Phaser.GameObjects.Text;
  private lblDodge!:  Phaser.GameObjects.Text;
  private lblSprint!: Phaser.GameObjects.Text;
  private lblMenu!:   Phaser.GameObjects.Text;

  // ── Touch tracking ────────────────────────────────────────────────────────
  private joystickTouchId: number | null = null;
  private joystickOriginX = JOYSTICK_BASE_X;
  private joystickOriginY = JOYSTICK_BASE_Y;

  constructor(private readonly scene: Phaser.Scene) {
    this.isActive = isTouchDevice();
    if (!this.isActive) return;
    this.createGraphics();
    this.registerPointerEvents();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Call once per frame at the start of update() */
  update(): void {
    if (!this.isActive) return;
    this.tickButton(this.attack);
    this.tickButton(this.dodge);
    this.tickButton(this.sprint);
    this.tickButton(this.menu);
  }

  destroy(): void {
    if (!this.isActive) return;
    [this.base, this.knob,
     this.btnAtk, this.btnDodge, this.btnSprint, this.btnMenu,
     this.lblAtk, this.lblDodge, this.lblSprint, this.lblMenu,
    ].forEach(o => o?.destroy());
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private createGraphics(): void {
    const add = this.scene.add;

    // Joystick base ring
    this.base = add.circle(JOYSTICK_BASE_X, JOYSTICK_BASE_Y, JOYSTICK_RADIUS, 0x224466, 0.5)
      .setScrollFactor(0).setDepth(DEPTH);

    // Joystick knob
    this.knob = add.circle(JOYSTICK_BASE_X, JOYSTICK_BASE_Y, JOYSTICK_KNOB_R, 0x66aadd, ALPHA_IDLE)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // Action buttons
    this.btnAtk    = this.makeBtn(BTN_ATTACK_X,  BTN_ATTACK_Y,  0xff4444);
    this.btnDodge  = this.makeBtn(BTN_DODGE_X,   BTN_DODGE_Y,   0x44aaff);
    this.btnSprint = this.makeBtn(BTN_SPRINT_X,  BTN_SPRINT_Y,  0x44ff88);
    this.btnMenu   = this.makeBtn(BTN_MENU_X,    BTN_MENU_Y,    0xdddddd);

    const textStyle = { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace' };
    this.lblAtk    = add.text(BTN_ATTACK_X,  BTN_ATTACK_Y,  'ATK',  textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblDodge  = add.text(BTN_DODGE_X,   BTN_DODGE_Y,   'DOG',  textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblSprint = add.text(BTN_SPRINT_X,  BTN_SPRINT_Y,  'RUN',  textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblMenu   = add.text(BTN_MENU_X,    BTN_MENU_Y,    'MENU', textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
  }

  private makeBtn(x: number, y: number, color: number): Phaser.GameObjects.Arc {
    return this.scene.add.circle(x, y, BTN_RADIUS, color, ALPHA_IDLE)
      .setScrollFactor(0).setDepth(DEPTH + 1);
  }

  private registerPointerEvents(): void {
    // Use Phaser's multi-touch pointer system
    this.scene.input.on('pointerdown',  this.onDown,  this);
    this.scene.input.on('pointermove',  this.onMove,  this);
    this.scene.input.on('pointerup',    this.onUp,    this);
    this.scene.input.on('pointercancel', this.onUp,   this);
  }

  private onDown = (ptr: Phaser.Input.Pointer): void => {
    const gx = ptr.x / this.scaleX();
    const gy = ptr.y / this.scaleY();

    // Joystick zone: left half of screen
    if (gx < CANVAS_W / 2) {
      if (this.joystickTouchId === null) {
        this.joystickTouchId = ptr.id;
        this.joystickOriginX = gx;
        this.joystickOriginY = gy;
        this.base.setPosition(gx, gy);
        this.knob.setPosition(gx, gy);
      }
      return;
    }

    // Button zone: right half
    if (this.hitTest(gx, gy, BTN_ATTACK_X,  BTN_ATTACK_Y))  { this.pressBtn(this.attack,  this.btnAtk);    return; }
    if (this.hitTest(gx, gy, BTN_DODGE_X,   BTN_DODGE_Y))   { this.pressBtn(this.dodge,   this.btnDodge);  return; }
    if (this.hitTest(gx, gy, BTN_SPRINT_X,  BTN_SPRINT_Y))  { this.pressBtn(this.sprint,  this.btnSprint); return; }
    if (this.hitTest(gx, gy, BTN_MENU_X,    BTN_MENU_Y))    { this.pressBtn(this.menu,    this.btnMenu);   return; }
  };

  private onMove = (ptr: Phaser.Input.Pointer): void => {
    if (ptr.id !== this.joystickTouchId) return;
    const gx = ptr.x / this.scaleX();
    const gy = ptr.y / this.scaleY();
    const rawDx = gx - this.joystickOriginX;
    const rawDy = gy - this.joystickOriginY;
    const dist  = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const clamp = Math.min(dist, MAX_KNOB_TRAVEL);
    const angle = Math.atan2(rawDy, rawDx);
    const knobX = this.joystickOriginX + Math.cos(angle) * clamp;
    const knobY = this.joystickOriginY + Math.sin(angle) * clamp;
    this.knob.setPosition(knobX, knobY);

    const norm = dist > 2 ? 1 / dist : 0;
    this.joystick.dx = rawDx * norm * Math.min(dist / MAX_KNOB_TRAVEL, 1);
    this.joystick.dy = rawDy * norm * Math.min(dist / MAX_KNOB_TRAVEL, 1);
  };

  private onUp = (ptr: Phaser.Input.Pointer): void => {
    if (ptr.id === this.joystickTouchId) {
      this.joystickTouchId = null;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.knob.setPosition(this.base.x, this.base.y);
    }
    // Release all buttons (multi-touch: only release if no other active pointer)
    this.releaseAllButtons();
  };

  /** Convert screen coords to game coords using the current scale */
  private scaleX(): number {
    return this.scene.scale.displaySize.width  / CANVAS_W;
  }
  private scaleY(): number {
    return this.scene.scale.displaySize.height / CANVAS_H;
  }

  private hitTest(gx: number, gy: number, cx: number, cy: number): boolean {
    const dx = gx - cx;
    const dy = gy - cy;
    return Math.sqrt(dx * dx + dy * dy) <= BTN_RADIUS * 1.5;
  }

  private pressBtn(state: ButtonState, graphic: Phaser.GameObjects.Arc): void {
    state.isDown = true;
    graphic.setAlpha(ALPHA_PRESSED);
  }

  private releaseAllButtons(): void {
    const pairs: [ButtonState, Phaser.GameObjects.Arc][] = [
      [this.attack, this.btnAtk],
      [this.dodge,  this.btnDodge],
      [this.sprint, this.btnSprint],
      [this.menu,   this.btnMenu],
    ];
    for (const [state, gfx] of pairs) {
      state.isDown = false;
      gfx.setAlpha(ALPHA_IDLE);
    }
  }

  private tickButton(btn: ButtonState): void {
    btn.justPressed = btn.isDown && !btn._prevDown;
    btn._prevDown   = btn.isDown;
  }
}

// Internal canvas dimensions (must match CANVAS constants)
const CANVAS_W = 320;
const CANVAS_H = 180;
