/**
 * Auth flow integration tests.
 *
 * Tests the Fastify auth HTTP layer end-to-end using inject() — no real
 * PostgreSQL or Redis required.  The store and Redis modules are mocked so
 * we focus purely on routing, validation, JWT issuance, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { MockRedis } from "./helpers/mock-redis";

// ── Module mocks (hoisted before imports) ────────────────────────────────────

const mockRedisInstance = new MockRedis();

vi.mock("../auth/redis", () => ({
  getRedis: () => mockRedisInstance,
  closeRedis: vi.fn(),
}));

vi.mock("../auth/store", () => ({
  createUser: vi.fn(),
  findUserByUsername: vi.fn(),
  findUserById: vi.fn(),
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  findSession: vi.fn(),
  deleteSession: vi.fn(),
  rotateSession: vi.fn(),
}));

import * as store from "../auth/store";
import { buildAuthApp } from "../auth/fastify";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "testuser",
  passwordHash: "$2a$12$fakehash",
  createdAt: Date.now(),
};

const SESSION = {
  jti: "session-abc",
  userId: USER.id,
  username: USER.username,
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
};

const SESSION2 = {
  jti: "session-def",
  userId: USER.id,
  username: USER.username,
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("Auth API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedisInstance.flush();
    app = await buildAuthApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /auth/register ───────────────────────────────────────────────────

  describe("POST /auth/register", () => {
    it("registers a new user and returns tokens + user", async () => {
      vi.mocked(store.createUser).mockResolvedValue(USER);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "testuser", password: "password123" },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("refreshToken");
      expect(body.user).toMatchObject({ id: USER.id, username: USER.username });
    });

    it("returns 409 when username is already taken", async () => {
      vi.mocked(store.createUser).mockRejectedValue(new Error("USERNAME_TAKEN"));

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "taken", password: "password123" },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error).toMatch(/taken/i);
    });

    it("returns 400 when username is too short", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "ab", password: "password123" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when password is too short", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "validuser", password: "short" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when username contains invalid characters", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "bad user!", password: "password123" },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST /auth/login ──────────────────────────────────────────────────────

  describe("POST /auth/login", () => {
    it("logs in with valid credentials and returns tokens", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(USER);
      vi.mocked(store.verifyPassword).mockResolvedValue(true);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { username: "testuser", password: "password123" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("refreshToken");
      expect(body.user.username).toBe("testuser");
    });

    it("returns 401 when password is wrong", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(USER);
      vi.mocked(store.verifyPassword).mockResolvedValue(false);

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { username: "testuser", password: "wrongpass" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 401 when user does not exist", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { username: "nobody", password: "password123" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /auth/refresh ────────────────────────────────────────────────────

  describe("POST /auth/refresh", () => {
    it("issues new tokens given a valid refresh token", async () => {
      // Step 1: register to obtain a real refresh token
      vi.mocked(store.createUser).mockResolvedValue(USER);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);

      const regRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "testuser", password: "password123" },
      });
      const { refreshToken } = regRes.json() as { refreshToken: string };

      // Step 2: exchange refresh token
      vi.mocked(store.findSession).mockResolvedValue(SESSION);
      vi.mocked(store.rotateSession).mockResolvedValue(SESSION2);
      vi.mocked(store.findUserById).mockResolvedValue(USER);

      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("refreshToken");
      expect(store.rotateSession).toHaveBeenCalledWith(
        SESSION.jti,
        USER.id,
        USER.username,
      );
    });

    it("returns 401 for a completely invalid refresh token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken: "not-a-valid-jwt" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 when session has been invalidated", async () => {
      // Obtain real token first
      vi.mocked(store.createUser).mockResolvedValue(USER);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);

      const regRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "testuser", password: "password123" },
      });
      const { refreshToken } = regRes.json() as { refreshToken: string };

      // Session is gone (e.g. already logged out)
      vi.mocked(store.findSession).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /auth/logout ─────────────────────────────────────────────────────

  describe("POST /auth/logout", () => {
    it("logs out an authenticated user and deletes the session", async () => {
      vi.mocked(store.createUser).mockResolvedValue(USER);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);
      vi.mocked(store.deleteSession).mockResolvedValue(undefined);

      const regRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "testuser", password: "password123" },
      });
      const { accessToken } = regRes.json() as { accessToken: string };

      const res = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true });
      expect(store.deleteSession).toHaveBeenCalledWith(SESSION.jti);
    });

    it("returns 401 when no token is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/logout",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────────────

  describe("GET /auth/me", () => {
    it("returns user profile for authenticated request", async () => {
      vi.mocked(store.createUser).mockResolvedValue(USER);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);
      vi.mocked(store.findUserById).mockResolvedValue(USER);

      const regRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "testuser", password: "password123" },
      });
      const { accessToken } = regRes.json() as { accessToken: string };

      const res = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        id: USER.id,
        username: USER.username,
      });
    });

    it("returns 401 without authentication", async () => {
      const res = await app.inject({ method: "GET", url: "/auth/me" });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /health ───────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns ok", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("ok");
    });
  });
});
