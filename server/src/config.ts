/**
 * Production-safe configuration.
 *
 * In production (NODE_ENV=production) every REQUIRED_* variable must be set
 * or the process exits immediately — no silent defaults.
 *
 * In development, safe fallbacks are used so the server starts without any
 * environment setup.
 */

const IS_PROD = process.env.NODE_ENV === "production";

/** Resolve a required env var. Exits in production if absent. */
function required(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value) {
    if (IS_PROD) {
      console.error(`[Config] FATAL: required env var ${name} is not set. Refusing to start in production.`);
      process.exit(1);
    }
    return devDefault;
  }
  return value;
}

/** Resolve an optional env var with a fallback. */
function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: IS_PROD,

  // Game / WebSocket server
  port: Number(optional("PORT", "2567")),

  // Auth server
  authPort: Number(optional("AUTH_PORT", "3001")),

  // Database
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://pixelrealm:pixelrealm_dev@localhost:5432/pixelrealm",
  ),

  // Redis
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),

  // JWT
  jwtSecret: required("JWT_SECRET", "pixelrealm-dev-secret-change-in-prod"),

  // CORS
  allowedOrigins: (optional("ALLOWED_ORIGINS", "http://localhost:3000"))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // SIWE (Sign-In with Ethereum) — wallet linking challenge config
  siweDomain: optional("SIWE_DOMAIN", "localhost"),
  siweUri:    optional("SIWE_URI",    "http://localhost:3001"),

  // Admin usernames — comma-separated list of usernames that receive role:"admin" in JWT
  adminUsernames: new Set(
    (optional("ADMIN_USERNAMES", ""))
      .split(",")
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean),
  ),

  // Logging
  logLevel: optional("LOG_LEVEL", "info"),

  // Alert thresholds — used by alerting.ts to fire structured log events.
  // All thresholds can be overridden at deploy time via environment variables.
  alerts: {
    /** Fraction of HTTP requests returning 5xx in the last 60 s (default 0.05 = 5%). */
    errorRateThreshold:  Number(optional("ALERT_ERROR_RATE",     "0.05")),
    /** p95 HTTP response latency in milliseconds (default 2000). */
    p95LatencyMs:        Number(optional("ALERT_P95_LATENCY_MS", "2000")),
    /** Process memory RSS as a fraction of system total (default 0.80 = 80%). */
    memoryRssFraction:   Number(optional("ALERT_MEMORY_FRACTION", "0.80")),
    /** DB pool total connection count that triggers a pool-exhaustion alert (default 24/25). */
    dbPoolExhaustedCount: Number(optional("ALERT_DB_POOL_EXHAUSTED", "24")),
    /** How often (ms) to evaluate alert thresholds (default 30 s). */
    checkIntervalMs:     Number(optional("ALERT_CHECK_INTERVAL_MS", "30000")),
  },
} as const;
