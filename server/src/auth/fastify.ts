/**
 * Fastify 4.x auth server.
 *
 * Endpoints:
 *   POST /auth/register
 *   POST /auth/login
 *   POST /auth/refresh
 *   POST /auth/logout
 *   GET  /auth/me
 *   POST /auth/forgot-password
 *   POST /auth/reset-password
 *
 * Access tokens  – short-lived (15 min), signed HS256
 * Refresh tokens – long-lived  (7 days), backed by Redis session
 *
 * Security hardening:
 *   - Password policy: min 8 chars, 1 number, 1 special char
 *   - Rate limits: register 3/min, login 5/min, refresh 10/min
 *   - CSRF: Origin header validation on all state-mutating routes
 *   - Input validation: email format, username length, sanitization via schema
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyJwt from "@fastify/jwt";
import { logAuthFailure } from "../logger";
import { incrementAuthFailure } from "../metrics";
import {
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  verifyPassword,
  createSession,
  findSession,
  deleteSession,
  rotateSession,
  updateUserPassword,
  createPasswordResetToken,
  findPasswordResetToken,
  deletePasswordResetToken,
} from "./store";
import { getRedis } from "./redis";
import { config } from "../config";
import { isPlayerBanned } from "../db/moderation";

// ── Env / config ──────────────────────────────────────────────────────────────

const JWT_SECRET = config.jwtSecret;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const AUTH_PORT = config.authPort;
const ALLOWED_ORIGINS = config.allowedOrigins;

// ── JWT payload types ─────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;       // userId
  username: string;
  jti: string;       // session id
  role?: string;     // "admin" for admin users, absent otherwise
}

export interface RefreshTokenPayload {
  sub: string;
  username: string;
  jti: string;
  type: "refresh";
}

// ── Password policy ───────────────────────────────────────────────────────────

const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/;

function validatePasswordStrength(password: string): string | null {
  if (!HAS_NUMBER.test(password)) {
    return "Password must contain at least one number";
  }
  if (!HAS_SPECIAL.test(password)) {
    return "Password must contain at least one special character";
  }
  return null;
}

// ── Build the Fastify app ─────────────────────────────────────────────────────

export async function buildAuthApp(): Promise<FastifyInstance> {
  // In production: structured JSON. In test: silent. In dev: pretty human-readable output.
  const isTest = config.nodeEnv === "test";
  const logger = config.isProduction
    ? { level: "info" }
    : isTest
      ? false
      : { level: "debug", transport: { target: "pino-pretty", options: { colorize: true } } };

  const app = Fastify({ logger });

  // ── Plugins ──────────────────────────────────────────────────────────────────

  await app.register(fastifyCors, { origin: ALLOWED_ORIGINS, credentials: true });

  // Rate limiting – uses Redis store when available
  await app.register(fastifyRateLimit, {
    global: false, // apply per-route only
    redis: getRedis() as unknown as Parameters<typeof fastifyRateLimit>[1] extends { redis?: infer R } ? R : never,
  });

  await app.register(fastifyJwt, { secret: JWT_SECRET });

  // ── CSRF protection: Origin header validation ─────────────────────────────
  // Reject state-mutating requests that carry an Origin header not in the
  // allowed list. Requests without Origin (server-to-server, CLI tools) are
  // allowed through — CSRF attacks only originate from browsers.

  const allowedOriginSet = new Set(
    Array.isArray(ALLOWED_ORIGINS) ? ALLOWED_ORIGINS : [ALLOWED_ORIGINS],
  );

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    const method = req.method.toUpperCase();
    if (method !== "POST" && method !== "PATCH" && method !== "DELETE") return;

    const origin = req.headers["origin"];
    if (!origin) return; // non-browser client — skip

    if (!allowedOriginSet.has(origin)) {
      reply.code(403).send({ error: "CSRF: Origin not allowed" });
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  // Sign access token (short-lived, stateless)
  function signAccess(payload: AccessTokenPayload): string {
    return app.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
  }

  // Sign refresh token (long-lived, session-backed)
  function signRefresh(payload: Omit<RefreshTokenPayload, "type">): string {
    return app.jwt.sign({ ...payload, type: "refresh" }, { expiresIn: REFRESH_TOKEN_TTL });
  }

  // Auth guard decorator
  async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  }

  // ── Routes ────────────────────────────────────────────────────────────────────

  // POST /auth/register
  app.post(
    "/auth/register",
    {
      config: {
        rateLimit: { max: 3, timeWindow: "1 minute" },
      },
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", minLength: 3, maxLength: 20, pattern: "^[a-zA-Z0-9_]+$" },
            password: { type: "string", minLength: 8, maxLength: 72 },
            email: { type: "string", format: "email", maxLength: 255 },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { username: string; password: string; email?: string } }>, reply: FastifyReply) => {
      const { username, password, email } = req.body;

      const strengthError = validatePasswordStrength(password);
      if (strengthError) {
        return reply.code(400).send({ error: strengthError });
      }

      try {
        const user = await createUser(username, password, email);
        const isAdmin = config.adminUsernames.has(user.username.toLowerCase());
        const session = await createSession(user.id, user.username);
        const tokenPayload = { sub: user.id, username: user.username, jti: session.jti, ...(isAdmin ? { role: "admin" } : {}) };
        return reply.code(201).send({
          accessToken: signAccess(tokenPayload),
          refreshToken: signRefresh(tokenPayload),
          user: { id: user.id, username: user.username },
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "USERNAME_TAKEN") {
          return reply.code(409).send({ error: "Username already taken" });
        }
        req.log.error(err);
        return reply.code(500).send({ error: "Registration failed" });
      }
    },
  );

  // POST /auth/login
  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { username: string; password: string } }>, reply: FastifyReply) => {
      const { username, password } = req.body;
      const user = await findUserByUsername(username);
      if (!user || !(await verifyPassword(user, password))) {
        // Constant-time-ish: always return same error to prevent user enumeration
        incrementAuthFailure();
        logAuthFailure({ username, reason: "invalid_credentials", ip: req.ip });
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      // Reject banned players at login
      const banned = await isPlayerBanned(user.id).catch(() => false);
      if (banned) {
        incrementAuthFailure();
        logAuthFailure({ username, reason: "account_banned", ip: req.ip });
        return reply.code(403).send({ error: "Account banned" });
      }

      const isAdmin = config.adminUsernames.has(user.username.toLowerCase());
      const session = await createSession(user.id, user.username);
      const tokenPayload = { sub: user.id, username: user.username, jti: session.jti, ...(isAdmin ? { role: "admin" } : {}) };
      return reply.send({
        accessToken: signAccess(tokenPayload),
        refreshToken: signRefresh(tokenPayload),
        user: { id: user.id, username: user.username, role: isAdmin ? "admin" : undefined },
      });
    },
  );

  // POST /auth/refresh
  app.post(
    "/auth/refresh",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => {
      let payload: RefreshTokenPayload;
      try {
        payload = app.jwt.verify<RefreshTokenPayload>(req.body.refreshToken);
      } catch {
        return reply.code(401).send({ error: "Invalid or expired refresh token" });
      }

      if (payload.type !== "refresh") {
        return reply.code(401).send({ error: "Invalid token type" });
      }

      const session = await findSession(payload.jti);
      if (!session) {
        return reply.code(401).send({ error: "Session not found or expired" });
      }

      // Rotate session (invalidate old, issue new)
      const newSession = await rotateSession(payload.jti, session.userId, session.username);
      const user = await findUserById(session.userId);
      if (!user) {
        return reply.code(401).send({ error: "User not found" });
      }

      return reply.send({
        accessToken: signAccess({ sub: user.id, username: user.username, jti: newSession.jti }),
        refreshToken: signRefresh({ sub: user.id, username: user.username, jti: newSession.jti }),
        user: { id: user.id, username: user.username },
      });
    },
  );

  // POST /auth/logout
  app.post(
    "/auth/logout",
    { preHandler: requireAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const payload = req.user as AccessTokenPayload;
      await deleteSession(payload.jti);
      return reply.send({ ok: true });
    },
  );

  // GET /auth/me
  app.get(
    "/auth/me",
    { preHandler: requireAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const payload = req.user as AccessTokenPayload;
      const user = await findUserById(payload.sub);
      if (!user) return reply.code(404).send({ error: "User not found" });
      return reply.send({ id: user.id, username: user.username, createdAt: user.createdAt });
    },
  );

  // POST /auth/forgot-password
  // Accepts username or email. Always returns 200 to prevent user enumeration.
  // For MVP: the reset token is included in the response when the user exists.
  app.post(
    "/auth/forgot-password",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        body: {
          type: "object",
          properties: {
            username: { type: "string" },
            email: { type: "string", format: "email" },
          },
          anyOf: [
            { required: ["username"] },
            { required: ["email"] },
          ],
        },
      },
    },
    async (req: FastifyRequest<{ Body: { username?: string; email?: string } }>, reply: FastifyReply) => {
      const { username, email } = req.body;

      let user = null;
      if (username) {
        user = await findUserByUsername(username);
      } else if (email) {
        user = await findUserByEmail(email);
      }

      // Always return 200 — prevents user enumeration
      if (!user) {
        return reply.send({ message: "If that account exists, a reset token has been issued" });
      }

      const resetRecord = await createPasswordResetToken(user.id, user.username);

      // MVP: display token in response (production would email this)
      return reply.send({
        message: "If that account exists, a reset token has been issued",
        resetToken: resetRecord.token, // Remove in production — send via email instead
      });
    },
  );

  // POST /auth/reset-password
  app.post(
    "/auth/reset-password",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        body: {
          type: "object",
          required: ["token", "newPassword"],
          properties: {
            token: { type: "string" },
            newPassword: { type: "string", minLength: 8, maxLength: 72 },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { token: string; newPassword: string } }>, reply: FastifyReply) => {
      const { token, newPassword } = req.body;

      const strengthError = validatePasswordStrength(newPassword);
      if (strengthError) {
        return reply.code(400).send({ error: strengthError });
      }

      const resetRecord = await findPasswordResetToken(token);
      if (!resetRecord) {
        return reply.code(400).send({ error: "Invalid or expired reset token" });
      }

      await updateUserPassword(resetRecord.userId, newPassword);
      await deletePasswordResetToken(token);

      return reply.send({ ok: true });
    },
  );

  // Health
  app.get("/health", async (_req, reply) => reply.send({ status: "ok", ts: Date.now() }));

  return app;
}

/** Start the auth Fastify server and return the instance. */
export async function startAuthServer(): Promise<FastifyInstance> {
  const app = await buildAuthApp();
  await app.listen({ port: AUTH_PORT, host: "0.0.0.0" });
  app.log.info({ port: AUTH_PORT }, "[Auth] Fastify auth server listening");
  return app;
}
