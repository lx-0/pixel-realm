# PixelRealm — Playtest Results

**Date:** 2026-03-16
**Build:** v0.1.0
**Reviewer:** Engineer (code-review playtest — browser server not running in this environment; analysis derived from full source review of `GameScene.ts`, `BootScene.ts`, `MenuScene.ts`, and `constants.ts`)

---

## 1. Core Mechanic — Is It Fun?

**Verdict: Promising skeleton, not yet fun.**

The core loop — Move → Attack → Kill → Next Wave — is the right shape. Wave-based survival with melee combat is a well-understood genre. The game compiles cleanly, the scene flow (Boot → Menu → Game) is solid, and the placeholder sprites are readable.

What's missing right now is *feedback juice* and *player agency*. There is no audio, no damage numbers, no XP pickup animation, no death particle — only a hit-flash tween. The world also feels like a dark empty plane. Until there is more sensory payoff on each kill, the loop won't feel compelling.

---

## 2. Controls

| Input | Works? | Notes |
|-------|--------|-------|
| WASD movement | ✅ | Responsive, no lag |
| Arrow key movement | ✅ | Dual-binding is good |
| SPACE attack | ✅ | Uses `JustDown`, correct |
| Click to start (menu) | ✅ | Handled in MenuScene |

**Bug: Diagonal movement is ~41% faster than cardinal movement.**
`handlePlayerMovement()` sets `vx = ±vel` and `vy = ±vel` independently. When both are non-zero the net speed is `vel * √2 ≈ 170 px/s` instead of 120. Players will learn to strafe diagonally to kite enemies — unintended and exploitable.
**Fix:** Normalize the velocity vector before applying it.

**Observation: 500 ms attack cooldown feels correct** for the 2-hit-to-kill enemy HP. No issue there.

---

## 3. Difficulty

**Early waves: Too easy. Later waves: Unbalanced spike.**

| Wave | Enemies | Total enemy HP | Player DPS |
|------|---------|----------------|------------|
| 1 | 5 | 250 | 2 hits/0.5 s = 50 dmg/s |
| 5 | 13 | 650 | same |
| 10 | 23 | 1150 | same |

Enemy HP does **not scale with wave** — `ENEMIES.HP_SCALE_PER_TIER = 1.5` is defined but `spawnWave()` always uses the flat `COMBAT.ENEMY_HP = 50`. The only difficulty increase is enemy count (+2 per wave). This creates a linear HP wall rather than escalating challenge.

**Enemy AI aggro range (80 px) is too short.**
The visible canvas at 4× zoom is 1280×720 px (screen pixels). The internal resolution is 320×180 with world bounds 960×540. Aggro triggers at 80 internal px — about ¼ of the visible screen width. Enemies appear to sleep until you almost walk into them. Raise to 120–140 px.

**Chase speed (90 px/s) vs. player speed (120 px/s):**
Players can always outrun enemies in cardinal directions. Combined with 1000 ms invincibility frames and 10 HP contact damage, a skilled player can kite indefinitely. Enemies have no ranged attack, no projectile, no encirclement behaviour. The game can be trivialized at any wave count.

**Recommended tuning adjustments:**
```
ENEMIES.AGGRO_RANGE_PX:  80  → 130
ENEMIES.PATROL_SPEED:    60  → 70   (chase = 105)
COMBAT.ENEMY_HP:         50  (add wave scaling: wave * HP_SCALE_PER_TIER ^ (wave-1))
COMBAT.ATTACK_RANGE_PX:  28  → 36   (see below)
```

---

## 4. What's Missing That Would Make It Fun

### Must-haves for the next milestone
- **Audio** — hit sounds, death sound, wave-clear jingle. Silence kills immersion completely.
- **Damage numbers** — floating "+25" on enemy hit. Essential feedback.
- **XP / progression bar** — `XP_PER_KILL_BASE = 10` is defined but nothing uses it. Players need a visible reward per kill beyond the kill counter.
- **Item drops** — `DROP_RATE_COMMON = 0.30` and `DROP_RATE_RARE = 0.05` are defined; implement at least a placeholder XP orb pickup (`icon_pickup_xp.png` is already loaded).
- **Diagonal movement normalization** — see §2.

### Nice-to-have for polish
- Attack range visual radius is shown for the attack flash (`showAttackRing()`) but at 28 px the ring appears to originate from inside the enemy sprite. Raising attack range to 36 px makes it feel satisfying.
- Player death → restart flow: `playerDead()` forces a 2500 ms wait before returning to menu. Add a **"Press SPACE to restart"** prompt that skips the delay.
- Camera follow lerp (`0.1`) feels slightly sluggish when enemies force quick retreats. Try `0.14–0.16`.

### What should be cut (for now)
- **Economy constants** (`MARKETPLACE_FEE_PCT`, `CRAFTING_FAIL_RATE_HIGH_TIER`, `LAND_AUCTION_FLOOR`, etc.) — none are wired to gameplay. They are harmless at this stage but create noise. Leave them for the economy milestone.
- **`BOSS_RESPAWN_MS = 24 * 60 * 60 * 1000`** — no bosses exist yet; this is fine as a future constant.

---

## 5. What Should Be Cut from the World Design

The world is **960 × 540 internal pixels** but gameplay is confined to a narrow strip at the very bottom (`groundY ≈ 508`). The upper 90% of the world bounds is dark empty space. Players who press W can walk into that void — and enemies will follow. This is confusing.

**Options:**
1. Shrink the world to a single-screen arena for the prototype (`worldW = CANVAS.WIDTH`, `worldH = CANVAS.HEIGHT`). Simpler and keeps action dense.
2. Keep the large world but add environmental content (platforms, hazard tiles, obstacles) to make movement meaningful.

For a playtest prototype, option 1 is faster.

---

## 6. Recommended Tuning Parameter Changes

| Constant | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `PLAYER.MOVE_SPEED` | 120 | 110 | Slightly slower player makes enemies feel more threatening |
| `COMBAT.ATTACK_RANGE_PX` | 28 | 36 | 28 px at 16 px sprites means you have to overlap; 36 feels melee-natural |
| `COMBAT.ATTACK_COOLDOWN_MS` | 500 | 450 | Snappier feel; still not spammable |
| `ENEMIES.AGGRO_RANGE_PX` | 80 | 130 | See §3 |
| `ENEMIES.PATROL_SPEED` | 60 | 70 | Slightly more active when idle |
| `COMBAT.PLAYER_HIT_DAMAGE` | 10 | 15 | With 1000 ms i-frames, 10 HP is trivial; 15 creates real tension |
| `COMBAT.WAVE_BASE_ENEMY_COUNT` | 5 | 4 | Wave 1 with 5 enemies and 28 px attack range is crowded immediately |

Wave HP scaling should be added in code (not just constants):
```typescript
// In spawnWave(), when setting enemy hp:
const waveHp = Math.floor(COMBAT.ENEMY_HP * Math.pow(ENEMIES.HP_SCALE_PER_TIER, this.wave - 1));
enemy.setData('hp', waveHp);
```

---

## 7. Summary

| Question | Answer |
|----------|--------|
| Is the core mechanic fun? | Not yet — skeleton is right, feedback/juice is missing |
| Are controls responsive? | Yes, WASD + SPACE work well; diagonal speed bug needs a fix |
| Difficulty: too easy / hard / unclear? | Early waves too easy; no HP scaling makes later waves a raw number wall rather than skill challenge |
| What's missing to make it fun? | Audio, damage numbers, XP pickups, diagonal normalization |
| What should be cut? | Large empty world; delay-only death screen; unimplemented economy constants (leave, don't delete) |
| Tuning needed? | Yes — see table in §6 |

---

## Next Steps

1. **Fix diagonal movement normalization** (code change, ~5 lines)
2. **Add wave-based HP scaling** (code change, ~2 lines in `spawnWave`)
3. **Implement XP orb drops** on enemy death — spawn a `pickup` sprite, overlap-collect for kill counter
4. **Add damage number text** — brief floating text per hit
5. **Audio pass** — even placeholder Web Audio API tones would improve feel dramatically
6. **Adjust tuning constants** per §6 table
7. **Shrink world or populate it** — single-screen arena is fastest to test
