/**
 * World Boss Scheduler
 *
 * Manages the lifecycle of world boss events:
 *   1. On startup: check if a boss should be scheduled/spawned.
 *   2. Every minute: check if a pending boss's spawn time has arrived.
 *   3. On boss defeat/expiry: schedule the next boss after the interval.
 *
 * Schedule:
 *   - One boss active at a time.
 *   - Bosses cycle through BOSS_ROTATION (storm_titan → ancient_dracolich → void_herald).
 *   - Default interval: 4 hours between events (configurable via WORLD_BOSS_INTERVAL_MS).
 *   - Seasonal variant: void_herald spawns during active seasonal events.
 *
 * Server-wide announcements:
 *   Sent via ZoneRoom broadcast to all connected zones when boss spawns/is defeated.
 *   Clients display the WorldBossPanel on receipt.
 */

import { matchMaker } from "@colyseus/core";
import {
  getActiveBossInstance,
  scheduleNextBoss,
  activateBossInstance,
  getBossInstanceById,
  WORLD_BOSS_DEFS,
  WORLD_BOSS_INTERVAL_MS,
  type WorldBossInstance,
} from "./db/worldBoss";
import { getActiveSeasonalEvent } from "./db/seasonalEvents";

// ── Globals ───────────────────────────────────────────────────────────────────

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/** The active WorldBossRoom room ID (once the room is created). */
let activeRoomId: string | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Starts the world boss scheduler. Call once on server startup.
 * Safe to call multiple times (idempotent — no duplicate intervals).
 */
export async function startWorldBossScheduler(): Promise<void> {
  if (schedulerInterval) return;

  console.log("[WorldBoss] Scheduler starting...");

  // Bootstrap: ensure a boss is scheduled if none exists
  try {
    await ensureBossScheduled();
  } catch (err) {
    console.warn("[WorldBoss] Bootstrap error:", (err as Error).message);
  }

  // Tick every 60 seconds
  schedulerInterval = setInterval(() => {
    tick().catch(err =>
      console.warn("[WorldBoss] Scheduler tick error:", (err as Error).message),
    );
  }, 60_000);
}

/**
 * Stops the scheduler (for graceful shutdown).
 */
export function stopWorldBossScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// ── Scheduler logic ───────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  const instance = await getActiveBossInstance();

  if (!instance) {
    // No active boss — schedule the next one
    await ensureBossScheduled();
    return;
  }

  const now = Date.now();

  if (instance.status === "pending" && now >= instance.spawnsAt.getTime()) {
    // Spawn time has arrived — activate the boss
    await spawnBoss(instance);
  } else if (instance.status === "active" && now >= instance.expiresAt.getTime()) {
    // Expiry handled by WorldBossRoom tick — just log
    console.log("[WorldBoss] Active boss expiry detected in scheduler (room should handle this).");
    // Schedule next after a brief delay
    await scheduleNextAfterEvent();
  }
}

async function ensureBossScheduled(): Promise<void> {
  const instance = await getActiveBossInstance();
  if (instance) return; // already scheduled

  // Check if seasonal event is active (void_herald gets priority during events)
  let seasonalEventId: string | undefined;
  try {
    const event = await getActiveSeasonalEvent();
    if (event) seasonalEventId = event.id;
  } catch { /* non-fatal */ }

  const newInstance = await scheduleNextBoss(seasonalEventId);
  const def = WORLD_BOSS_DEFS[newInstance.bossId];
  console.log(
    `[WorldBoss] Scheduled: ${def.name} at ${newInstance.spawnsAt.toISOString()} ` +
    `(in ${Math.round((newInstance.spawnsAt.getTime() - Date.now()) / 60000)} min)`,
  );

  // Announce the upcoming boss to all connected zones
  await broadcastToAllZones("world_boss_incoming", {
    bossId: newInstance.bossId,
    bossName: def.name,
    spawnsAt: newInstance.spawnsAt.getTime(),
    zoneId: newInstance.zoneId,
    description: def.description,
    intervalMs: WORLD_BOSS_INTERVAL_MS,
  });
}

async function spawnBoss(instance: WorldBossInstance): Promise<void> {
  const def = WORLD_BOSS_DEFS[instance.bossId];
  console.log(`[WorldBoss] Spawning: ${def.name} (${instance.id})`);

  // Create or reuse the WorldBossRoom Colyseus room
  try {
    let roomId = activeRoomId;

    if (!roomId) {
      // Create a new room
      const room = await matchMaker.createRoom("world_boss", {
        instanceId: instance.id,
      });
      roomId = room.roomId;
      activeRoomId = roomId;
    }

    // Activate in DB
    await activateBossInstance(instance.id);

    // Announce spawn to all connected zones
    await broadcastToAllZones("world_boss_spawned", {
      bossId: instance.bossId,
      bossName: def.name,
      maxHp: instance.maxHp,
      zoneId: instance.zoneId,
      roomId,
      description: def.description,
    });

    console.log(`[WorldBoss] ${def.name} is now ACTIVE! Room: ${roomId}`);
  } catch (err) {
    console.error("[WorldBoss] Failed to spawn boss room:", (err as Error).message);
  }
}

async function scheduleNextAfterEvent(): Promise<void> {
  // Delay scheduling slightly to let room cleanup finish
  setTimeout(async () => {
    activeRoomId = null;
    try {
      await ensureBossScheduled();
    } catch (err) {
      console.warn("[WorldBoss] Re-schedule error:", (err as Error).message);
    }
  }, 5_000);
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────

/**
 * Broadcasts a message to all active ZoneRooms so every connected client
 * receives world boss announcements regardless of which zone they're in.
 */
async function broadcastToAllZones(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const rooms = await matchMaker.query({ name: "zone" });
    for (const room of rooms) {
      try {
        await matchMaker.remoteRoomCall(room.roomId, "broadcastWorldBossEvent", [type, payload]);
      } catch {
        // Room may have been disposed — skip silently
      }
    }
  } catch (err) {
    console.warn("[WorldBoss] broadcastToAllZones failed:", (err as Error).message);
  }
}
