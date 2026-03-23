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
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  findSession: vi.fn(),
  deleteSession: vi.fn(),
  rotateSession: vi.fn(),
  updateUserPassword: vi.fn(),
  createPasswordResetToken: vi.fn(),
  findPasswordResetToken: vi.fn(),
  deletePasswordResetToken: vi.fn(),
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

const RESET_RECORD = {
  token: "reset-token-uuid",
  userId: USER.id,
  username: USER.username,
  expiresAt: Date.now() + 60 * 60 * 1000,
};

// Strong password that satisfies all policy requirements
const STRONG_PASSWORD = "Password1!";

// ── Shared helper: a valid Origin header ─────────────────────────────────────
const ALLOWED_ORIGIN = "http://localhost:3000";

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
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("refreshToken");
      expect(body.user).toMatchObject({ id: USER.id, username: USER.username });
    });

    it("accepts optional email field and validates format", async () => {
      vi.mocked(store.createUser).mockResolvedValue(USER);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD, email: "user@example.com" },
      });

      expect(res.statusCode).toBe(201);
      expect(store.createUser).toHaveBeenCalledWith("testuser", STRONG_PASSWORD, "user@example.com");
    });

    it("returns 400 for invalid email format", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD, email: "not-an-email" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 409 when username is already taken", async () => {
      vi.mocked(store.createUser).mockRejectedValue(new Error("USERNAME_TAKEN"));

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "taken", password: STRONG_PASSWORD },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error).toMatch(/taken/i);
    });

    it("returns 400 when username is too short", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "ab", password: STRONG_PASSWORD },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when password is too short", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "validuser", password: "short" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when username contains invalid characters", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "bad user!", password: STRONG_PASSWORD },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when password has no number", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "validuser", password: "Password!" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/number/i);
    });

    it("returns 400 when password has no special character", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "validuser", password: "Password1" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/special/i);
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
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD },
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
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: "wrongpass" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 401 when user does not exist", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "nobody", password: STRONG_PASSWORD },
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
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD },
      });
      const { refreshToken } = regRes.json() as { refreshToken: string };

      // Step 2: exchange refresh token
      vi.mocked(store.findSession).mockResolvedValue(SESSION);
      vi.mocked(store.rotateSession).mockResolvedValue(SESSION2);
      vi.mocked(store.findUserById).mockResolvedValue(USER);

      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        headers: { origin: ALLOWED_ORIGIN },
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
        headers: { origin: ALLOWED_ORIGIN },
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
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD },
      });
      const { refreshToken } = regRes.json() as { refreshToken: string };

      // Session is gone (e.g. already logged out)
      vi.mocked(store.findSession).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        headers: { origin: ALLOWED_ORIGIN },
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
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD },
      });
      const { accessToken } = regRes.json() as { accessToken: string };

      const res = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { authorization: `Bearer ${accessToken}`, origin: ALLOWED_ORIGIN },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true });
      expect(store.deleteSession).toHaveBeenCalledWith(SESSION.jti);
    });

    it("returns 401 when no token is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { origin: ALLOWED_ORIGIN },
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
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD },
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

  // ── CSRF protection ───────────────────────────────────────────────────────

  describe("CSRF protection (Origin header validation)", () => {
    it("blocks POST requests from disallowed origins", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        headers: { origin: "https://evil.example.com" },
        payload: { username: "testuser", password: STRONG_PASSWORD },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toMatch(/origin/i);
    });

    it("allows POST requests without Origin header (server-to-server)", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(USER);
      vi.mocked(store.verifyPassword).mockResolvedValue(true);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        // No origin header
        payload: { username: "testuser", password: STRONG_PASSWORD },
      });
      expect(res.statusCode).toBe(200);
    });

    it("allows POST requests from allowed origin", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(USER);
      vi.mocked(store.verifyPassword).mockResolvedValue(true);
      vi.mocked(store.createSession).mockResolvedValue(SESSION);

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser", password: STRONG_PASSWORD },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST /auth/forgot-password ────────────────────────────────────────────

  describe("POST /auth/forgot-password", () => {
    it("returns reset token when user exists (by username)", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(USER);
      vi.mocked(store.createPasswordResetToken).mockResolvedValue(RESET_RECORD);

      const res = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "testuser" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message).toMatch(/reset token/i);
      expect(body.resetToken).toBe(RESET_RECORD.token);
    });

    it("returns reset token when user exists (by email)", async () => {
      vi.mocked(store.findUserByEmail).mockResolvedValue(USER);
      vi.mocked(store.createPasswordResetToken).mockResolvedValue(RESET_RECORD);

      const res = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { email: "user@example.com" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().resetToken).toBe(RESET_RECORD.token);
    });

    it("returns 200 without reset token when user does not exist (no enumeration)", async () => {
      vi.mocked(store.findUserByUsername).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { username: "nobody" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).not.toHaveProperty("resetToken");
    });

    it("returns 400 for invalid email format", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { email: "not-an-email" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when neither username nor email provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST /auth/reset-password ─────────────────────────────────────────────

  describe("POST /auth/reset-password", () => {
    it("resets password with a valid token", async () => {
      vi.mocked(store.findPasswordResetToken).mockResolvedValue(RESET_RECORD);
      vi.mocked(store.updateUserPassword).mockResolvedValue(undefined);
      vi.mocked(store.deletePasswordResetToken).mockResolvedValue(undefined);

      const res = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { token: RESET_RECORD.token, newPassword: STRONG_PASSWORD },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true });
      expect(store.updateUserPassword).toHaveBeenCalledWith(USER.id, STRONG_PASSWORD);
      expect(store.deletePasswordResetToken).toHaveBeenCalledWith(RESET_RECORD.token);
    });

    it("returns 400 for invalid or expired token", async () => {
      vi.mocked(store.findPasswordResetToken).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { token: "expired-token", newPassword: STRONG_PASSWORD },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/invalid|expired/i);
    });

    it("returns 400 when new password has no number", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { token: RESET_RECORD.token, newPassword: "Password!" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/number/i);
    });

    it("returns 400 when new password has no special character", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/reset-password",
        headers: { origin: ALLOWED_ORIGIN },
        payload: { token: RESET_RECORD.token, newPassword: "Password1" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/special/i);
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
