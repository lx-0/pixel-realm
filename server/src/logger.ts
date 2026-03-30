/**
 * Structured logger singleton.
 *
 * Uses Pino (bundled with Fastify) so no additional package is needed.
 * In production:  newline-delimited JSON on stdout — ingested by Datadog,
 *                 CloudWatch, Loki, etc.
 * In development: pino-pretty colorised human-readable output.
 * In test:        silent (level "silent" suppresses all output).
 *
 * All game-event log entries carry a mandatory `event` field so log aggregators
 * can filter and alert on specific event types without parsing the message string.
 */

import pino from "pino";
import { config } from "./config";

const isTest = config.nodeEnv === "test";

export const logger = pino(
  isTest
    ? { level: "silent" }
    : config.isProduction
      ? { level: config.logLevel }
      : {
          level: config.logLevel,
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname" },
          },
        },
);

// ── Typed game event helpers ──────────────────────────────────────────────────
// Using typed helpers keeps log shapes consistent across callers.

export function logPlayerConnect(opts: {
  userId: string;
  username: string;
  roomType: string;
  roomId: string;
  sessionId: string;
}): void {
  logger.info({ event: "player_connect", ...opts }, "player connected");
}

export function logPlayerDisconnect(opts: {
  userId: string;
  username: string;
  roomType: string;
  roomId: string;
  sessionId: string;
  consented: boolean;
}): void {
  logger.info({ event: "player_disconnect", ...opts }, "player disconnected");
}

export function logAuthFailure(opts: {
  username?: string;
  reason: string;
  ip?: string;
}): void {
  logger.warn({ event: "auth_failure", ...opts }, "authentication failure");
}

export function logLlmRequest(opts: {
  zoneId: string;
  questType: string;
  latencyMs: number;
  success: boolean;
  fallback: boolean;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}): void {
  const level = opts.success ? "info" : "warn";
  logger[level]({ event: "llm_request", ...opts }, opts.success ? "LLM quest generated" : "LLM quest failed");
}

export function logRoomCreate(opts: {
  roomType: string;
  roomId: string;
  options?: Record<string, unknown>;
}): void {
  logger.info({ event: "room_create", ...opts }, "room created");
}

export function logRoomDispose(opts: {
  roomType: string;
  roomId: string;
  durationMs?: number;
}): void {
  logger.info({ event: "room_dispose", ...opts }, "room disposed");
}

export function logUnhandledException(opts: {
  type: "uncaughtException" | "unhandledRejection";
  err: unknown;
}): void {
  logger.fatal({ event: "unhandled_exception", type: opts.type, err: opts.err }, "unhandled exception");
}
