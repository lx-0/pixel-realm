/**
 * MobileTouchControls — virtual joystick + action buttons for touch devices.
 *
 * Usage:
 *   const touch = new MobileTouchControls(scene);
 *   // in update():
 *   const { dx, dy } = touch.joystick;   // normalised -1..1
 *   if (touch.attack.justPressed)    { … }
 *   if (touch.dodge.justPressed)     { … }
 *   if (touch.interact.justPressed)  { … }  // E key equivalent
 *   if (touch.sprint.isDown)         { … }
 *   if (touch.menu.justPressed)      { … }
 *   if (touch.inventory.justPressed) { … }  // I key equivalent
 *   if (touch.questLog.justPressed)  { … }  // J key equivalent
 *   touch.update();  // call at start of each frame
 *
 * Pinch-to-zoom (minimap):
 *   touch.pinchDeltaThisFrame  — positive = zoom in, negative = zoom out (0 if idle)
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
  _pointerId:  number | null; // internal — which pointer is holding this button
}

function makeButton(): ButtonState {
  return { isDown: false, justPressed: false, _prevDown: false, _pointerId: null };
}

/** Returns true when the browser reports touch support. */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints !== undefined
  );
}

// Internal canvas dimensions (must match CANVAS constants)
const CANVAS_W = 320;
const CANVAS_H = 180;

// ── Layout constants (in Phaser game pixels — internal 320×180 space) ────────
const JOYSTICK_BASE_X  = 40;    // centre of joystick base from left
const JOYSTICK_BASE_Y  = 140;   // centre from top (bottom-left area)
const JOYSTICK_RADIUS  = 22;    // outer dead-zone ring radius
const JOYSTICK_KNOB_R  = 9;     // movable knob radius
const MAX_KNOB_TRAVEL  = 16;    // max pixels the knob moves from centre

// Action button layout — bottom-right quadrant
const BTN_ATTACK_X    = 288;
const BTN_ATTACK_Y    = 150;
const BTN_DODGE_X     = 268;
const BTN_DODGE_Y     = 132;
const BTN_SPRINT_X    = 306;
const BTN_SPRINT_Y    = 132;
const BTN_INTERACT_X  = 248;   // E key — to the left of ATK
const BTN_INTERACT_Y  = 150;
const BTN_MENU_X      = 306;
const BTN_MENU_Y      = 110;
const BTN_RADIUS      = 10;

// HUD panel toggle buttons — top-center area, visible only on touch
const BTN_INV_X   = CANVAS_W / 2 - 14;   // inventory  (I)
const BTN_INV_Y   = 6;
const BTN_QL_X    = CANVAS_W / 2 + 14;   // quest log  (J)
const BTN_QL_Y    = 6;
const BTN_HUD_R   = 8;

const ALPHA_IDLE    = 0.35;
const ALPHA_PRESSED = 0.70;
const DEPTH         = 50;       // above everything else

export class MobileTouchControls {
  readonly joystick:  JoystickState = { dx: 0, dy: 0 };
  readonly attack:    ButtonState = makeButton();
  readonly dodge:     ButtonState = makeButton();
  readonly sprint:    ButtonState = makeButton();
  readonly interact:  ButtonState = makeButton();   // E key
  readonly menu:      ButtonState = makeButton();
  readonly inventory: ButtonState = makeButton();   // I key
  readonly questLog:  ButtonState = makeButton();   // J key

  /** Pinch zoom delta this frame (positive = zoom in, negative = zoom out). */
  pinchDeltaThisFrame = 0;

  readonly isActive: boolean;

  // ── Phaser game objects ───────────────────────────────────────────────────
  private base!:        Phaser.GameObjects.Arc;
  private knob!:        Phaser.GameObjects.Arc;
  private btnAtk!:      Phaser.GameObjects.Arc;
  private btnDodge!:    Phaser.GameObjects.Arc;
  private btnSprint!:   Phaser.GameObjects.Arc;
  private btnInteract!: Phaser.GameObjects.Arc;
  private btnMenu!:     Phaser.GameObjects.Arc;
  private btnInv!:      Phaser.GameObjects.Arc;
  private btnQl!:       Phaser.GameObjects.Arc;

  // text labels on buttons
  private lblAtk!:      Phaser.GameObjects.Text;
  private lblDodge!:    Phaser.GameObjects.Text;
  private lblSprint!:   Phaser.GameObjects.Text;
  private lblInteract!: Phaser.GameObjects.Text;
  private lblMenu!:     Phaser.GameObjects.Text;
  private lblInv!:      Phaser.GameObjects.Text;
  private lblQl!:       Phaser.GameObjects.Text;

  // ── Touch tracking ────────────────────────────────────────────────────────
  private joystickTouchId: number | null = null;
  private joystickOriginX = JOYSTICK_BASE_X;
  private joystickOriginY = JOYSTICK_BASE_Y;

  // Pinch tracking — two non-joystick pointers
  private pinchPointers: Map<number, { x: number; y: number }> = new Map();
  private prevPinchDist = 0;

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
    this.tickButton(this.interact);
    this.tickButton(this.menu);
    this.tickButton(this.inventory);
    this.tickButton(this.questLog);
    // Reset per-frame pinch delta (set during pointer events)
    // It was already set during event processing; clear for next frame here.
    this.pinchDeltaThisFrame = this._pendingPinchDelta;
    this._pendingPinchDelta  = 0;
  }

  destroy(): void {
    if (!this.isActive) return;
    [this.base, this.knob,
     this.btnAtk, this.btnDodge, this.btnSprint, this.btnInteract, this.btnMenu,
     this.btnInv, this.btnQl,
     this.lblAtk, this.lblDodge, this.lblSprint, this.lblInteract, this.lblMenu,
     this.lblInv, this.lblQl,
    ].forEach(o => o?.destroy());
  }

  // ── Private ───────────────────────────────────────────────────────────────

  // Accumulated pinch delta between update() calls
  private _pendingPinchDelta = 0;

  private createGraphics(): void {
    const add = this.scene.add;

    // Joystick base ring
    this.base = add.circle(JOYSTICK_BASE_X, JOYSTICK_BASE_Y, JOYSTICK_RADIUS, 0x224466, 0.5)
      .setScrollFactor(0).setDepth(DEPTH);

    // Joystick knob
    this.knob = add.circle(JOYSTICK_BASE_X, JOYSTICK_BASE_Y, JOYSTICK_KNOB_R, 0x66aadd, ALPHA_IDLE)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // Action buttons
    this.btnAtk      = this.makeBtn(BTN_ATTACK_X,   BTN_ATTACK_Y,   0xff4444);
    this.btnDodge    = this.makeBtn(BTN_DODGE_X,    BTN_DODGE_Y,    0x44aaff);
    this.btnSprint   = this.makeBtn(BTN_SPRINT_X,   BTN_SPRINT_Y,   0x44ff88);
    this.btnInteract = this.makeBtn(BTN_INTERACT_X, BTN_INTERACT_Y, 0xffcc44);
    this.btnMenu     = this.makeBtn(BTN_MENU_X,     BTN_MENU_Y,     0xdddddd);

    // HUD panel toggle buttons (top center)
    this.btnInv = this.makeHudBtn(BTN_INV_X, BTN_INV_Y, 0x4488ff);
    this.btnQl  = this.makeHudBtn(BTN_QL_X,  BTN_QL_Y,  0xffaa44);

    const textStyle = { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace' };
    const hudStyle  = { fontSize: '4px', color: '#ffffff', fontFamily: 'monospace' };
    this.lblAtk      = add.text(BTN_ATTACK_X,   BTN_ATTACK_Y,   'ATK', textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblDodge    = add.text(BTN_DODGE_X,    BTN_DODGE_Y,    'DOG', textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblSprint   = add.text(BTN_SPRINT_X,   BTN_SPRINT_Y,   'RUN', textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblInteract = add.text(BTN_INTERACT_X, BTN_INTERACT_Y, 'USE', textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblMenu     = add.text(BTN_MENU_X,     BTN_MENU_Y,     'MENU',textStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblInv      = add.text(BTN_INV_X, BTN_INV_Y, 'INV', hudStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this.lblQl       = add.text(BTN_QL_X,  BTN_QL_Y,  'QST', hudStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
  }

  private makeBtn(x: number, y: number, color: number): Phaser.GameObjects.Arc {
    return this.scene.add.circle(x, y, BTN_RADIUS, color, ALPHA_IDLE)
      .setScrollFactor(0).setDepth(DEPTH + 1);
  }

  private makeHudBtn(x: number, y: number, color: number): Phaser.GameObjects.Arc {
    return this.scene.add.circle(x, y, BTN_HUD_R, color, ALPHA_IDLE)
      .setScrollFactor(0).setDepth(DEPTH + 1);
  }

  private registerPointerEvents(): void {
    // Use Phaser's multi-touch pointer system
    this.scene.input.on('pointerdown',   this.onDown,  this);
    this.scene.input.on('pointermove',   this.onMove,  this);
    this.scene.input.on('pointerup',     this.onUp,    this);
    this.scene.input.on('pointercancel', this.onUp,    this);
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

    // HUD panel buttons (top area — full width)
    if (this.hitTest(gx, gy, BTN_INV_X, BTN_INV_Y, BTN_HUD_R)) { this.pressBtn(this.inventory, this.btnInv, ptr.id); return; }
    if (this.hitTest(gx, gy, BTN_QL_X,  BTN_QL_Y,  BTN_HUD_R)) { this.pressBtn(this.questLog,  this.btnQl,  ptr.id); return; }

    // Button zone: right half
    if (this.hitTest(gx, gy, BTN_ATTACK_X,   BTN_ATTACK_Y))   { this.pressBtn(this.attack,   this.btnAtk,      ptr.id); return; }
    if (this.hitTest(gx, gy, BTN_DODGE_X,    BTN_DODGE_Y))    { this.pressBtn(this.dodge,    this.btnDodge,    ptr.id); return; }
    if (this.hitTest(gx, gy, BTN_SPRINT_X,   BTN_SPRINT_Y))   { this.pressBtn(this.sprint,   this.btnSprint,   ptr.id); return; }
    if (this.hitTest(gx, gy, BTN_INTERACT_X, BTN_INTERACT_Y)) { this.pressBtn(this.interact, this.btnInteract, ptr.id); return; }
    if (this.hitTest(gx, gy, BTN_MENU_X,     BTN_MENU_Y))     { this.pressBtn(this.menu,     this.btnMenu,     ptr.id); return; }

    // Track pointer for pinch detection (right-side non-button touches)
    this.pinchPointers.set(ptr.id, { x: gx, y: gy });
    this.updatePinch();
  };

  private onMove = (ptr: Phaser.Input.Pointer): void => {
    const gx = ptr.x / this.scaleX();
    const gy = ptr.y / this.scaleY();

    if (ptr.id === this.joystickTouchId) {
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
      return;
    }

    // Update pinch pointer position
    if (this.pinchPointers.has(ptr.id)) {
      this.pinchPointers.set(ptr.id, { x: gx, y: gy });
      this.updatePinch();
    }
  };

  private onUp = (ptr: Phaser.Input.Pointer): void => {
    // Release joystick
    if (ptr.id === this.joystickTouchId) {
      this.joystickTouchId = null;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.knob.setPosition(this.base.x, this.base.y);
    }

    // Release pinch pointer
    this.pinchPointers.delete(ptr.id);
    this.prevPinchDist = 0;

    // Release only the button held by this specific pointer
    const pairs: [ButtonState, Phaser.GameObjects.Arc][] = [
      [this.attack,   this.btnAtk],
      [this.dodge,    this.btnDodge],
      [this.sprint,   this.btnSprint],
      [this.interact, this.btnInteract],
      [this.menu,     this.btnMenu],
      [this.inventory,this.btnInv],
      [this.questLog, this.btnQl],
    ];
    for (const [state, gfx] of pairs) {
      if (state._pointerId === ptr.id) {
        state.isDown      = false;
        state._pointerId  = null;
        gfx.setAlpha(ALPHA_IDLE);
      }
    }
  };

  /** Compute pinch zoom delta from the two active pinch pointers. */
  private updatePinch(): void {
    const ptrs = [...this.pinchPointers.values()];
    if (ptrs.length < 2) {
      this.prevPinchDist = 0;
      return;
    }
    const [a, b] = ptrs;
    const dx   = a.x - b.x;
    const dy   = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.prevPinchDist > 0) {
      this._pendingPinchDelta += dist - this.prevPinchDist;
    }
    this.prevPinchDist = dist;
  }

  /** Convert screen coords to game coords using the current scale */
  private scaleX(): number {
    return this.scene.scale.displaySize.width  / CANVAS_W;
  }
  private scaleY(): number {
    return this.scene.scale.displaySize.height / CANVAS_H;
  }

  private hitTest(gx: number, gy: number, cx: number, cy: number, r = BTN_RADIUS): boolean {
    const dx = gx - cx;
    const dy = gy - cy;
    return Math.sqrt(dx * dx + dy * dy) <= r * 1.5;
  }

  private pressBtn(state: ButtonState, graphic: Phaser.GameObjects.Arc, pointerId: number): void {
    state.isDown     = true;
    state._pointerId = pointerId;
    graphic.setAlpha(ALPHA_PRESSED);
  }

  private tickButton(btn: ButtonState): void {
    btn.justPressed = btn.isDown && !btn._prevDown;
    btn._prevDown   = btn.isDown;
  }
}
