/**
 * WorldEventManager — server-side dynamic world events system.
 *
 * Manages 5 event types that trigger on a configurable timer, broadcast to all
 * connected players, track participation, and award rewards on completion.
 *
 * Event types:
 *   monster_invasion — enemy swarm spawns in the zone, sky darkens
 *   treasure_hunt    — rare loot spawns with sparkle markers, map clues
 *   boss_spawn       — elite boss with boosted stats appears mid-zone
 *   resource_surge   — double material drops for the event duration
 *   faction_conflict — two factions clash; players pick sides for rep
 *
 * Usage (inside ZoneRoom):
 *   this.worldEventManager = new WorldEventManager(zoneId, biome, broadcast, addEnemyFn);
 *   // In tick():
 *   this.worldEventManager.tick(now);
 *   // On enemy kill:
 *   this.worldEventManager.onEnemyKill(sessionId);
 *   // On player join:
 *   this.worldEventManager.sendCurrentEvent(client);
 */

import { upsertWorldEvent, deactivateWorldEvent } from "./db/content";
import type { Client } from "@colyseus/core";

// ── Event type definitions ────────────────────────────────────────────────────

export type WorldEventType =
  | "monster_invasion"
  | "treasure_hunt"
  | "boss_spawn"
  | "resource_surge"
  | "faction_conflict";

export interface WorldEventDef {
  type:         WorldEventType;
  name:         string;
  description:  string;
  durationMs:   number;   // event active duration
  weight:       number;   // relative selection weight
  rewardXp:     number;   // bonus XP per participant on completion
  rewardItemId: string;   // bonus loot item on completion
  biomeBonus?:  string[]; // biomes that increase weight by 2×
}

const EVENT_DEFINITIONS: WorldEventDef[] = [
  {
    type:         "monster_invasion",
    name:         "Monster Invasion",
    description:  "A horde of monsters has invaded! Repel the attackers for bonus rewards.",
    durationMs:   10 * 60 * 1000,  // 10 minutes
    weight:       30,
    rewardXp:     120,
    rewardItemId: "mat_bone_fragment",
    biomeBonus:   ["Forest", "Plains / Desert", "Dungeon"],
  },
  {
    type:         "treasure_hunt",
    name:         "Treasure Hunt",
    description:  "Rare loot has appeared! Follow the glowing markers to claim your prize.",
    durationMs:   8 * 60 * 1000,   // 8 minutes
    weight:       25,
    rewardXp:     100,
    rewardItemId: "mat_magic_crystal",
    biomeBonus:   ["Ocean / Coastal", "Sky / Celestial"],
  },
  {
    type:         "boss_spawn",
    name:         "Elite Boss Awakens",
    description:  "A powerful elite boss has appeared in the zone. Slay it for legendary rewards!",
    durationMs:   12 * 60 * 1000,  // 12 minutes
    weight:       20,
    rewardXp:     200,
    rewardItemId: "mat_magic_crystal",
    biomeBonus:   ["Volcanic", "Ice / Mountain", "Swamp"],
  },
  {
    type:         "resource_surge",
    name:         "Resource Surge",
    description:  "Materials are flowing freely! All drops doubled for a limited time.",
    durationMs:   10 * 60 * 1000,  // 10 minutes
    weight:       25,
    rewardXp:     80,
    rewardItemId: "mat_leather_scraps",
    biomeBonus:   ["Forest", "Volcanic", "Swamp"],
  },
  {
    type:         "faction_conflict",
    name:         "Faction Conflict",
    description:  "Two factions clash in this zone! Choose a side and fight for their cause.",
    durationMs:   15 * 60 * 1000,  // 15 minutes
    weight:       20,
    rewardXp:     150,
    rewardItemId: "mat_iron_ore",
    biomeBonus:   ["Plains / Desert", "Dungeon", "Ocean / Coastal"],
  },
];

// ── Active event state ────────────────────────────────────────────────────────

export interface ActiveWorldEvent {
  id:          string;
  type:        WorldEventType;
  name:        string;
  description: string;
  zoneId:      string;
  startsAt:    number;   // epoch ms
  endsAt:      number;   // epoch ms
  /** world-space X coordinate of the event focal point */
  eventX:      number;
  /** world-space Y coordinate of the event focal point */
  eventY:      number;
  /** sessionIds of players who participated (killed enemies, interacted) */
  participants: Set<string>;
}

// Interval between event triggers (30 real minutes)
const EVENT_INTERVAL_MS = 30 * 60 * 1000;

// World dimensions (matches GameScene WORLD_W/H)
const WORLD_W = 640;
const WORLD_H = 360;
const WALL    = 32;

// ── Manager ───────────────────────────────────────────────────────────────────

export interface EventEndPayload {
  type:             WorldEventType;
  name:             string;
  participants:     string[];   // sessionIds
  rewardXp:         number;
  rewardItemId:     string;
}

export class WorldEventManager {
  private zoneId:   string;
  private biome:    string;
  private broadcastFn: (type: string, payload: object) => void;
  private sendFn:      (client: Client, type: string, payload: object) => void;

  /** Called when an event ends so ZoneRoom can award server-side rewards. */
  onEventEnd?: (payload: EventEndPayload) => void;

  private activeEvent: ActiveWorldEvent | null = null;
  private lastEventEndAt: number = 0;   // when last event ended (or startup)
  private initialized = false;

  /** Tracks resource_surge state; ZoneRoom checks this to double drops. */
  public isResourceSurgeActive = false;

  constructor(
    zoneId: string,
    biome: string,
    broadcastFn: (type: string, payload: object) => void,
    sendFn: (client: Client, type: string, payload: object) => void,
  ) {
    this.zoneId      = zoneId;
    this.biome       = biome;
    this.broadcastFn = broadcastFn;
    this.sendFn      = sendFn;
    // Stagger first event between 5 and 15 minutes after room creation
    this.lastEventEndAt = Date.now() - EVENT_INTERVAL_MS + (5 + Math.random() * 10) * 60_000;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Call from ZoneRoom.tick() every server frame. */
  tick(now: number): void {
    if (!this.initialized) {
      this.initialized = true;
      this.lastEventEndAt = now - EVENT_INTERVAL_MS + (5 + Math.random() * 10) * 60_000;
    }

    if (this.activeEvent) {
      // Check if event has ended
      if (now >= this.activeEvent.endsAt) {
        this.endEvent(now);
      }
    } else {
      // Check if it's time to start the next event
      if (now - this.lastEventEndAt >= EVENT_INTERVAL_MS) {
        this.startEvent(now);
      }
    }
  }

  /** Record that a player participated in the active event (e.g. killed an enemy). */
  onEnemyKill(sessionId: string): void {
    this.activeEvent?.participants.add(sessionId);
  }

  /** Record faction conflict side choice as participation. */
  onFactionChoice(sessionId: string): void {
    this.activeEvent?.participants.add(sessionId);
  }

  /** Send current event state to a newly joining player. */
  sendCurrentEvent(client: Client): void {
    if (!this.activeEvent) return;
    this.sendFn(client, "world_event_start", this.buildStartPayload(this.activeEvent));
  }

  /** Return active event type for drop-multiplier checks, or null. */
  getActiveEventType(): WorldEventType | null {
    return this.activeEvent?.type ?? null;
  }

  /** Snapshot for analytics / tests. */
  getActiveEvent(): ActiveWorldEvent | null {
    return this.activeEvent;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private startEvent(now: number): void {
    const def = this.selectEvent();
    const endsAt = now + def.durationMs;

    // Pick a focal point in the playable area (avoiding walls)
    const eventX = WALL + Math.random() * (WORLD_W - WALL * 2);
    const eventY = WALL + Math.random() * (WORLD_H - WALL * 2);

    // Persist to DB best-effort
    const dbEndsAt = new Date(endsAt);
    upsertWorldEvent(
      this.zoneId,
      def.name,
      def.description,
      { type: def.type, eventX, eventY },
      dbEndsAt,
    ).then((id) => {
      if (!this.activeEvent) return;
      this.activeEvent.id = id;
    }).catch(() => { /* best-effort */ });

    this.activeEvent = {
      id:           "",  // filled async after DB insert
      type:         def.type,
      name:         def.name,
      description:  def.description,
      zoneId:       this.zoneId,
      startsAt:     now,
      endsAt,
      eventX,
      eventY,
      participants: new Set(),
    };

    this.isResourceSurgeActive = def.type === "resource_surge";

    this.broadcastFn("world_event_start", this.buildStartPayload(this.activeEvent));
    console.log(`[WorldEventManager] ${this.zoneId}: event started — ${def.type} (${Math.round(def.durationMs / 60_000)}m)`);
  }

  private endEvent(now: number): void {
    if (!this.activeEvent) return;
    const ev = this.activeEvent;

    // Deactivate in DB best-effort
    if (ev.id) {
      deactivateWorldEvent(ev.id).catch(() => { /* best-effort */ });
    }

    const def = EVENT_DEFINITIONS.find((d) => d.type === ev.type)!;
    const participantCount = ev.participants.size;
    const participantList  = [...ev.participants];

    this.broadcastFn("world_event_end", {
      type:             ev.type,
      name:             ev.name,
      zoneId:           ev.zoneId,
      participantCount,
      rewardXp:         def.rewardXp,
      rewardItemId:     def.rewardItemId,
    });

    // Notify ZoneRoom so it can award server-side rewards (XP, items)
    this.onEventEnd?.({
      type:         ev.type,
      name:         ev.name,
      participants: participantList,
      rewardXp:     def.rewardXp,
      rewardItemId: def.rewardItemId,
    });

    console.log(
      `[WorldEventManager] ${this.zoneId}: event ended — ${ev.type} (${participantCount} participant${participantCount !== 1 ? "s" : ""})`,
    );

    this.activeEvent = null;
    this.isResourceSurgeActive = false;
    this.lastEventEndAt = now;
  }

  private selectEvent(): WorldEventDef {
    // Build weighted pool, doubling weight for biome-boosted events
    const pool: { def: WorldEventDef; weight: number }[] = EVENT_DEFINITIONS.map((def) => {
      const biomeMatch = def.biomeBonus?.some((b) => this.biome.startsWith(b)) ?? false;
      return { def, weight: biomeMatch ? def.weight * 2 : def.weight };
    });

    // Optionally bias by time of day (server local hour)
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 20;
    if (isNight) {
      // Invasion and boss_spawn are more likely at night
      pool.forEach((p) => {
        if (p.def.type === "monster_invasion" || p.def.type === "boss_spawn") {
          p.weight = Math.round(p.weight * 1.5);
        }
      });
    }

    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * total;
    for (const { def, weight } of pool) {
      roll -= weight;
      if (roll <= 0) return def;
    }
    return pool[pool.length - 1].def;
  }

  private buildStartPayload(ev: ActiveWorldEvent): object {
    return {
      id:          ev.id,
      type:        ev.type,
      name:        ev.name,
      description: ev.description,
      zoneId:      ev.zoneId,
      startsAt:    new Date(ev.startsAt).toISOString(),
      endsAt:      new Date(ev.endsAt).toISOString(),
      eventX:      ev.eventX,
      eventY:      ev.eventY,
    };
  }
}
