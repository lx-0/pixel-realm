import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

export type WeatherState = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';

/** Real milliseconds each weather phase lasts before transitioning. */
const WEATHER_DURATION_MS = 3 * 60 * 1000;

interface ParticleConfig {
  tint:     number;
  alpha:    number;
  speedY:   { min: number; max: number };
  speedX:   { min: number; max: number };
  scale:    number;
  quantity: number;
  freq:     number;   // ms between emissions
  lifespan: number;
}

interface WeatherDef {
  label:     string;
  fogColor:  number;  // overlay fill colour
  fogAlpha:  number;  // target overlay opacity
  speedMult: number;  // player movement multiplier (1 = no change)
  particles: ParticleConfig | null;
}

const WEATHER_DEFS: Record<WeatherState, WeatherDef> = {
  clear: {
    label: 'Clear', fogColor: 0xffffff, fogAlpha: 0.00, speedMult: 1.00,
    particles: null,
  },
  rain: {
    label: 'Rain', fogColor: 0x8899bb, fogAlpha: 0.06, speedMult: 0.90,
    particles: {
      tint: 0x88aaff, alpha: 0.55,
      speedY: { min: 220, max: 320 }, speedX: { min: -15, max: 15 },
      scale: 0.15, quantity: 3, freq: 16, lifespan: 1400,
    },
  },
  snow: {
    label: 'Snow', fogColor: 0xddeeff, fogAlpha: 0.08, speedMult: 1.00,
    particles: {
      tint: 0xeeeeff, alpha: 0.80,
      speedY: { min: 40, max: 90 }, speedX: { min: -30, max: 30 },
      scale: 0.22, quantity: 2, freq: 50, lifespan: 4000,
    },
  },
  fog: {
    label: 'Fog', fogColor: 0xaabbcc, fogAlpha: 0.38, speedMult: 1.00,
    particles: null,
  },
  storm: {
    label: 'Storm', fogColor: 0x445566, fogAlpha: 0.12, speedMult: 0.75,
    particles: {
      tint: 0x6688cc, alpha: 0.65,
      speedY: { min: 380, max: 520 }, speedX: { min: -90, max: -50 },
      scale: 0.18, quantity: 6, freq: 12, lifespan: 900,
    },
  },
};

/**
 * Zone-biome → weighted weather pool.
 * First element of each pair is the WeatherState, second is its relative weight.
 */
const BIOME_WEIGHTS: Record<string, [WeatherState, number][]> = {
  'Forest':          [['rain', 5], ['clear', 3], ['fog', 2]],
  'Plains / Desert': [['clear', 6], ['storm', 3], ['fog', 1]],
  'Dungeon':         [['fog', 6], ['clear', 3], ['rain', 1]],
  'Ocean / Coastal': [['storm', 5], ['rain', 3], ['clear', 2]],
  'Ice / Cave':      [['snow', 6], ['fog', 2], ['clear', 2]],
};

const DEFAULT_WEIGHTS: [WeatherState, number][] = [['clear', 5], ['rain', 2], ['fog', 2], ['storm', 1]];

function weightedRandom(pool: [WeatherState, number][]): WeatherState {
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [state, w] of pool) {
    r -= w;
    if (r <= 0) return state;
  }
  return pool[0][0];
}

/**
 * WeatherSystem
 *
 * Manages zone-biased weather cycles with particle effects and gameplay modifiers.
 *
 * - rain / snow / storm → particle precipitation at depth 14
 * - fog / storm          → semi-transparent overlay at depth 12
 * - storm                → 0.75× player speed multiplier
 * - fog                  → dense overlay reduces visual clarity
 *
 * Zone biases:
 *   Forest        → rain-heavy
 *   Plains/Desert → clear-heavy, storm (sandstorm) possible
 *   Dungeon       → fog-heavy
 *   Ocean/Coastal → storm-heavy
 *   Ice/Cave      → snow-heavy
 *
 * Usage:
 *   const wx = new WeatherSystem(this, this.zone.biome);
 *   // in update():
 *   wx.update(delta);
 *   // in movement:
 *   speed *= wx.speedMultiplier;
 */
export class WeatherSystem {
  private current:  WeatherState = 'clear';
  private biome:    string       = '';
  private timer:    number       = 0;
  private fogAlpha: number       = 0;   // smoothly lerped rendered alpha

  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private readonly fogOverlay:   Phaser.GameObjects.Rectangle;
  private readonly weatherLabel: Phaser.GameObjects.Text;
  private labelTimer = 0;
  private readonly scene: Phaser.Scene;

  /**
   * @param scene  The active Phaser scene (must have 'particle' texture loaded).
   * @param biome  Zone biome string from ZoneConfig (e.g. 'Forest', 'Ice / Cave').
   */
  constructor(scene: Phaser.Scene, biome: string) {
    this.scene = scene;
    this.biome = biome;

    // Fog/haze overlay — depth 12: above day-night overlay (11), below clock (13).
    this.fogOverlay = scene.add
      .rectangle(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, CANVAS.WIDTH, CANVAS.HEIGHT, 0xaabbcc, 0)
      .setScrollFactor(0)
      .setDepth(12);

    // Transient weather-change label — briefly shown when weather transitions.
    this.weatherLabel = scene.add
      .text(CANVAS.WIDTH / 2, 6, '', {
        fontSize: '5px',
        color:    '#ffffff',
        fontFamily: 'monospace',
        stroke:   '#000000',
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);

    // Start with a randomly chosen initial weather for this biome.
    this.applyWeather(this.pickNext('clear'));
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Player speed multiplier — apply to move speed each frame. */
  get speedMultiplier(): number {
    return WEATHER_DEFS[this.current].speedMult;
  }

  /**
   * Enemy detection/aggro range multiplier.
   * Fog and storm reduce how far enemies can see the player.
   *   fog   → 0.50× (dense — enemies nearly blind)
   *   storm → 0.70× (heavy rain limits sight)
   *   others → 1.00× (unaffected)
   */
  get visibilityMultiplier(): number {
    if (this.current === 'fog')   return 0.50;
    if (this.current === 'storm') return 0.70;
    return 1.00;
  }

  get currentState(): WeatherState {
    return this.current;
  }

  /** Call every frame from GameScene.update(). */
  update(delta: number): void {
    this.timer += delta;
    if (this.timer >= WEATHER_DURATION_MS) {
      this.timer = 0;
      this.applyWeather(this.pickNext(this.current));
    }

    // Smoothly lerp fog alpha toward target (3-second transition).
    const targetAlpha = WEATHER_DEFS[this.current].fogAlpha;
    this.fogAlpha += (targetAlpha - this.fogAlpha) * Math.min(1, delta / 3000);
    this.fogOverlay.setFillStyle(WEATHER_DEFS[this.current].fogColor, this.fogAlpha);

    // Fade-out weather label after 4 s.
    if (this.labelTimer > 0) {
      this.labelTimer -= delta;
      if (this.labelTimer <= 0) {
        this.scene.tweens.add({
          targets: this.weatherLabel,
          alpha: 0,
          duration: 600,
          ease: 'Power1',
        });
      }
    }
  }

  destroy(): void {
    this.emitter?.destroy();
    this.fogOverlay.destroy();
    this.weatherLabel.destroy();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** Pick a weighted-random weather state, avoiding immediate repeats. */
  private pickNext(current: WeatherState): WeatherState {
    const pool = BIOME_WEIGHTS[this.biome] ?? DEFAULT_WEIGHTS;
    const filtered = pool.filter(([s]) => s !== current);
    return weightedRandom(filtered.length > 0 ? filtered : pool);
  }

  private applyWeather(next: WeatherState): void {
    this.current = next;
    const def    = WEATHER_DEFS[next];

    // Tear down previous particle emitter.
    if (this.emitter) {
      this.emitter.destroy();
      this.emitter = null;
    }

    // Sync fog overlay colour (alpha is still lerped in update()).
    this.fogOverlay.setFillStyle(def.fogColor, this.fogAlpha);

    // Create precipitation emitter.
    if (def.particles) {
      const pc = def.particles;
      this.emitter = this.scene.add.particles(0, -12, 'particle', {
        x:         { min: 0, max: CANVAS.WIDTH },
        speedY:    pc.speedY,
        speedX:    pc.speedX,
        scale:     pc.scale,
        alpha:     pc.alpha,
        tint:      pc.tint,
        lifespan:  pc.lifespan,
        quantity:  pc.quantity,
        frequency: pc.freq,
      });
      this.emitter.setScrollFactor(0);
      this.emitter.setDepth(14);
    }

    // Briefly show the weather label (except for 'clear' which is self-evident).
    if (next !== 'clear') {
      const labelText =
        next === 'storm' && this.biome === 'Plains / Desert' ? 'Sandstorm' : def.label;
      this.weatherLabel.setText(labelText).setAlpha(1);
      this.labelTimer = 4000;
    }
  }
}
