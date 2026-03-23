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

  // Admin usernames — comma-separated list of usernames that receive role:"admin" in JWT
  adminUsernames: new Set(
    (optional("ADMIN_USERNAMES", ""))
      .split(",")
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean),
  ),
} as const;
