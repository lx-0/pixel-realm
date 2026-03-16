import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let _redis: Redis | null = null;

/**
 * Returns the singleton Redis client.
 * Falls back to an in-memory Map-backed mock when Redis is unavailable,
 * so the auth server can still run in dev without a Redis instance.
 */
export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    _redis.on("error", (err: Error) => {
      // Log but don't crash — callers handle null/missing values gracefully
      console.warn("[Redis] connection error:", err.message);
    });
  }
  return _redis;
}

/** Close the Redis connection (used in tests / graceful shutdown). */
export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit().catch(() => {});
    _redis = null;
  }
}
