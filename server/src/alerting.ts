/**
 * Log-based alerting for production monitoring.
 *
 * Evaluates key health metrics on a configurable interval and emits a
 * structured "alert" log event (level: "warn") whenever a threshold is
 * breached.  Log aggregators (Datadog, CloudWatch Alarms, Grafana Loki) can
 * subscribe to `event: "alert"` entries to send pages or notifications.
 *
 * Thresholds are all configurable via env vars — see config.ts for defaults.
 *
 * Call startAlertLoop() once at server startup.  It returns a cleanup
 * function that clears the interval (useful in tests).
 */

import os from "os";
import { logger } from "./logger";
import { config } from "./config";
import { get1MinErrorRate, getP95LatencyMs, getDbPoolStats } from "./metrics";

export type AlertName =
  | "high_error_rate"
  | "high_p95_latency"
  | "high_memory_usage"
  | "db_pool_near_exhaustion";

function emitAlert(name: AlertName, details: Record<string, unknown>): void {
  logger.warn({ event: "alert", alert: name, ...details }, `ALERT: ${name}`);
}

function evaluateThresholds(): void {
  const thresholds = config.alerts;

  // ── Error rate (1-minute sliding window) ─────────────────────────────────
  const errorRate = get1MinErrorRate();
  if (errorRate > thresholds.errorRateThreshold) {
    emitAlert("high_error_rate", {
      errorRate: +errorRate.toFixed(4),
      threshold: thresholds.errorRateThreshold,
    });
  }

  // ── p95 HTTP latency ──────────────────────────────────────────────────────
  const p95 = getP95LatencyMs();
  if (p95 > thresholds.p95LatencyMs) {
    emitAlert("high_p95_latency", {
      p95LatencyMs: p95,
      threshold: thresholds.p95LatencyMs,
    });
  }

  // ── Memory usage ──────────────────────────────────────────────────────────
  const totalMem = os.totalmem();
  const rss = process.memoryUsage().rss;
  const fraction = rss / totalMem;
  if (fraction > thresholds.memoryRssFraction) {
    emitAlert("high_memory_usage", {
      rssBytes: rss,
      totalBytes: totalMem,
      fraction: +fraction.toFixed(4),
      threshold: thresholds.memoryRssFraction,
    });
  }

  // ── DB pool utilisation ───────────────────────────────────────────────────
  const pool = getDbPoolStats();
  if (pool !== null && pool.totalCount >= thresholds.dbPoolExhaustedCount) {
    emitAlert("db_pool_near_exhaustion", {
      totalCount: pool.totalCount,
      idleCount:  pool.idleCount,
      waitingCount: pool.waitingCount,
      threshold: thresholds.dbPoolExhaustedCount,
    });
  }
}

/** Start the recurring alert evaluation loop.  Returns a cleanup function. */
export function startAlertLoop(): () => void {
  const interval = setInterval(evaluateThresholds, config.alerts.checkIntervalMs);
  interval.unref(); // don't keep the process alive for this alone
  return () => clearInterval(interval);
}
