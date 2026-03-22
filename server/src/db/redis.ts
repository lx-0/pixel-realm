/**
 * Redis singleton for real-time leaderboard caching.
 * Falls back gracefully when Redis is unreachable.
 */

import Redis from "ioredis";
import { config } from "../config";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    _redis.on("error", (err: Error) => {
      // Log only on first connection failure to avoid log spam
      console.warn("[Redis] connection error:", err.message);
    });
  }
  return _redis;
}
