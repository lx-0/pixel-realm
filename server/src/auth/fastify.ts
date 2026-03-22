/**
 * Fastify 4.x auth server.
 *
 * Endpoints:
 *   POST /auth/register
 *   POST /auth/login
 *   POST /auth/refresh
 *   POST /auth/logout
 *   GET  /auth/me
 *
 * Access tokens  – short-lived (15 min), signed HS256
 * Refresh tokens – long-lived  (7 days), backed by Redis session
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyJwt from "@fastify/jwt";
import {
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  createSession,
  findSession,
  deleteSession,
  rotateSession,
} from "./store";
import { getRedis } from "./redis";

// ── Env / config ──────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? "pixelrealm-dev-secret-change-in-prod";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const AUTH_PORT = Number(process.env.AUTH_PORT ?? 3001);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ── JWT payload types ─────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;   // userId
  username: string;
  jti: string;   // session id
}

export interface RefreshTokenPayload {
  sub: string;
  username: string;
  jti: string;
  type: "refresh";
}

// ── Build the Fastify app ─────────────────────────────────────────────────────

export async function buildAuthApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // ── Plugins ──────────────────────────────────────────────────────────────────

  await app.register(fastifyCors, { origin: ALLOWED_ORIGINS, credentials: true });

  // Rate limiting – uses Redis store when available
  await app.register(fastifyRateLimit, {
    global: false, // apply per-route only
    redis: getRedis() as unknown as Parameters<typeof fastifyRateLimit>[1] extends { redis?: infer R } ? R : never,
  });

  await app.register(fastifyJwt, { secret: JWT_SECRET });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  // Sign access token (short-lived, stateless)
  function signAccess(payload: Omit<AccessTokenPayload, "type">): string {
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
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", minLength: 3, maxLength: 20, pattern: "^[a-zA-Z0-9_]+$" },
            password: { type: "string", minLength: 8, maxLength: 72 },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { username: string; password: string } }>, reply: FastifyReply) => {
      const { username, password } = req.body;
      try {
        const user = await createUser(username, password);
        const session = await createSession(user.id, user.username);
        return reply.code(201).send({
          accessToken: signAccess({ sub: user.id, username: user.username, jti: session.jti }),
          refreshToken: signRefresh({ sub: user.id, username: user.username, jti: session.jti }),
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
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      const session = await createSession(user.id, user.username);
      return reply.send({
        accessToken: signAccess({ sub: user.id, username: user.username, jti: session.jti }),
        refreshToken: signRefresh({ sub: user.id, username: user.username, jti: session.jti }),
        user: { id: user.id, username: user.username },
      });
    },
  );

  // POST /auth/refresh
  app.post(
    "/auth/refresh",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
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

  // Health
  app.get("/health", async (_req, reply) => reply.send({ status: "ok", ts: Date.now() }));

  return app;
}

/** Start the auth Fastify server and return the instance. */
export async function startAuthServer(): Promise<FastifyInstance> {
  const app = await buildAuthApp();
  await app.listen({ port: AUTH_PORT, host: "0.0.0.0" });
  console.log(`[Auth] Fastify auth server listening on http://0.0.0.0:${AUTH_PORT}`);
  return app;
}
