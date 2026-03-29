/**
 * Dodge/roll system integration tests.
 *
 * Covers:
 *   - DODGE constants — all values present, physically-sensible ranges
 *   - Dodge state transitions — cooldown enforced, i-frames >= duration
 *   - Mana cost validation — MANA_COST is positive and within budget constraints
 *   - Cooldown gating — cannot start dodge before cooldown expires
 *   - Duration vs i-frame relationship — i-frames always >= animation duration
 *   - STAMINA system consistency — BASE / REGEN / SPRINT_COST values are balanced
 */

import { describe, it, expect } from "vitest";
import { DODGE, MANA, STAMINA } from "../../../src/config/constants";

// ── DODGE constants ───────────────────────────────────────────────────────────

describe("DODGE constants", () => {
  it("DASH_SPEED is a positive pixels-per-second value", () => {
    expect(DODGE.DASH_SPEED).toBeGreaterThan(0);
  });

  it("DURATION_MS is a positive millisecond value", () => {
    expect(DODGE.DURATION_MS).toBeGreaterThan(0);
  });

  it("INVULN_MS is greater than or equal to DURATION_MS (i-frames cover full animation)", () => {
    expect(DODGE.INVULN_MS).toBeGreaterThanOrEqual(DODGE.DURATION_MS);
  });

  it("COOLDOWN_MS is greater than DURATION_MS (dodge cannot be chained instantly)", () => {
    expect(DODGE.COOLDOWN_MS).toBeGreaterThan(DODGE.DURATION_MS);
  });

  it("MANA_COST is a positive number", () => {
    expect(DODGE.MANA_COST).toBeGreaterThan(0);
  });

  it("DASH_SPEED is faster than normal player movement (> 100 px/s)", () => {
    expect(DODGE.DASH_SPEED).toBeGreaterThan(100);
  });

  it("COOLDOWN_MS is under 5 seconds (dodge remains responsive)", () => {
    expect(DODGE.COOLDOWN_MS).toBeLessThan(5000);
  });

  it("INVULN_MS is under 1 second (not excessively long)", () => {
    expect(DODGE.INVULN_MS).toBeLessThan(1000);
  });
});

// ── Dodge gating logic (mirrors GameScene.handleDodgeRoll) ────────────────────
//
// The dodge roll logic lives in GameScene but the rules are purely derived from
// constants.  We verify the invariants here without needing Phaser.

describe("Dodge cooldown gating logic", () => {
  const { DURATION_MS, COOLDOWN_MS } = DODGE;

  function canDodge(time: number, dodgeEndTime: number, cooldownEndTime: number): boolean {
    if (time < dodgeEndTime)     return false; // still dashing
    if (time < cooldownEndTime)  return false; // on cooldown
    return true;
  }

  it("dodge is available at time 0 when never used before", () => {
    expect(canDodge(0, 0, 0)).toBe(true);
  });

  it("dodge is blocked during the dash animation", () => {
    const start      = 1000;
    const dodgeEnd   = start + DURATION_MS;
    const cooldownEnd = start + COOLDOWN_MS;
    expect(canDodge(start + 10, dodgeEnd, cooldownEnd)).toBe(false);
  });

  it("dodge is blocked immediately after animation ends but before cooldown expires", () => {
    const start      = 1000;
    const dodgeEnd   = start + DURATION_MS;
    const cooldownEnd = start + COOLDOWN_MS;
    // Check at dodge end + 1 ms (animation done, still on cooldown)
    expect(canDodge(dodgeEnd + 1, dodgeEnd, cooldownEnd)).toBe(false);
  });

  it("dodge becomes available immediately when cooldown expires", () => {
    const start      = 1000;
    const dodgeEnd   = start + DURATION_MS;
    const cooldownEnd = start + COOLDOWN_MS;
    expect(canDodge(cooldownEnd, dodgeEnd, cooldownEnd)).toBe(true);
  });

  it("cooldown end is always after dodge end", () => {
    // Invariant: COOLDOWN_MS > DURATION_MS → cooldownEnd always > dodgeEnd
    const start      = 5000;
    const dodgeEnd   = start + DURATION_MS;
    const cooldownEnd = start + COOLDOWN_MS;
    expect(cooldownEnd).toBeGreaterThan(dodgeEnd);
  });
});

// ── Mana cost constraints ─────────────────────────────────────────────────────

describe("Dodge mana cost constraints", () => {
  it("MANA_COST is less than base mana pool (player can always dodge once)", () => {
    expect(DODGE.MANA_COST).toBeLessThan(MANA.BASE);
  });

  it("player can perform at least 3 dodges on a full mana pool without regen", () => {
    const dodgesBeforeEmpty = Math.floor(MANA.BASE / DODGE.MANA_COST);
    expect(dodgesBeforeEmpty).toBeGreaterThanOrEqual(3);
  });
});

// ── STAMINA system balance ────────────────────────────────────────────────────

describe("STAMINA system balance", () => {
  it("STAMINA.BASE is a positive value", () => {
    expect(STAMINA.BASE).toBeGreaterThan(0);
  });

  it("REGEN_PER_SEC is positive (stamina recovers when not sprinting)", () => {
    expect(STAMINA.REGEN_PER_SEC).toBeGreaterThan(0);
  });

  it("SPRINT_COST_PER_SEC is positive (sprinting drains stamina)", () => {
    expect(STAMINA.SPRINT_COST_PER_SEC).toBeGreaterThan(0);
  });

  it("SPRINT_COST_PER_SEC is greater than REGEN_PER_SEC (sprint drains faster than regen)", () => {
    expect(STAMINA.SPRINT_COST_PER_SEC).toBeGreaterThan(STAMINA.REGEN_PER_SEC);
  });

  it("full stamina pool supports at least 2 seconds of sprinting", () => {
    const sprintSeconds = STAMINA.BASE / STAMINA.SPRINT_COST_PER_SEC;
    expect(sprintSeconds).toBeGreaterThanOrEqual(2);
  });

  it("stamina fully recovers from zero within 10 seconds of resting", () => {
    const recoverySeconds = STAMINA.BASE / STAMINA.REGEN_PER_SEC;
    expect(recoverySeconds).toBeLessThanOrEqual(10);
  });
});
