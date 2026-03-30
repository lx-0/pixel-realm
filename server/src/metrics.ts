// Lightweight runtime metrics module — no external dependencies.
// Rooms call incrementMessageCount() per incoming WS message.
// The /metrics endpoint reads the current snapshot (JSON or Prometheus format).

const startedAt = Date.now();

let totalMessages = 0;
let windowMessages = 0;  // messages counted in the current 1-second window
let msgRatePerSec = 0;

// Sliding window for HTTP latency tracking (last 60 s of request durations)
const latencyWindow: number[] = [];
let errorCount = 0;
let requestCount = 0;
const LATENCY_WINDOW_MS = 60_000;
void LATENCY_WINDOW_MS; // referenced for documentation; window is bounded by sample count

// ── 1-minute sliding window for error rate alerting ───────────────────────────
// Each entry is { timestampMs, isError }.  Entries older than 60 s are pruned
// whenever a new request is recorded so the list stays small.
interface RequestSample { ts: number; isError: boolean }
const recentRequests: RequestSample[] = [];
const ONE_MIN_MS = 60_000;

function pruneOldSamples(): void {
  const cutoff = Date.now() - ONE_MIN_MS;
  while (recentRequests.length > 0 && recentRequests[0]!.ts < cutoff) {
    recentRequests.shift();
  }
}

/** Returns the fraction of HTTP requests that returned 5xx in the last 60 s. */
export function get1MinErrorRate(): number {
  pruneOldSamples();
  if (recentRequests.length === 0) return 0;
  const errors = recentRequests.filter((r) => r.isError).length;
  return errors / recentRequests.length;
}

// ── Game-event counters ───────────────────────────────────────────────────────

let authFailureCount = 0;
let connectionCount = 0;
let disconnectionCount = 0;

interface RoomCounter { created: number; disposed: number }
const roomCounters = new Map<string, RoomCounter>();

interface LlmStats { count: number; errorCount: number; totalLatencyMs: number }
const llmStats: LlmStats = { count: 0, errorCount: 0, totalLatencyMs: 0 };

// DB pool stats are injected by the caller to avoid a circular import.
// The value is updated on each /metrics and /health read.
let _dbPoolStats: { totalCount: number; idleCount: number; waitingCount: number } | null = null;

export function setDbPoolStats(stats: { totalCount: number; idleCount: number; waitingCount: number } | null): void {
  _dbPoolStats = stats;
}

export function getDbPoolStats(): { totalCount: number; idleCount: number; waitingCount: number } | null {
  return _dbPoolStats;
}

// Roll the sliding window every second
setInterval(() => {
  msgRatePerSec = windowMessages;
  windowMessages = 0;
}, 1000).unref();

export function incrementMessageCount(): void {
  totalMessages++;
  windowMessages++;
}

/** Called by the HTTP request logging middleware for every completed request. */
export function recordHttpRequest(durationMs: number, statusCode: number): void {
  requestCount++;
  latencyWindow.push(durationMs);
  // Keep window to last 1000 samples to cap memory usage
  if (latencyWindow.length > 1000) latencyWindow.shift();
  const isError = statusCode >= 500;
  if (isError) errorCount++;
  recentRequests.push({ ts: Date.now(), isError });
}

export function incrementAuthFailure(): void {
  authFailureCount++;
}

export function recordLlmRequest(latencyMs: number, success: boolean): void {
  llmStats.count++;
  llmStats.totalLatencyMs += latencyMs;
  if (!success) llmStats.errorCount++;
}

export function incrementRoomCreated(roomType: string): void {
  const c = roomCounters.get(roomType) ?? { created: 0, disposed: 0 };
  c.created++;
  roomCounters.set(roomType, c);
}

export function incrementRoomDisposed(roomType: string): void {
  const c = roomCounters.get(roomType) ?? { created: 0, disposed: 0 };
  c.disposed++;
  roomCounters.set(roomType, c);
}

export function incrementConnectionCount(): void { connectionCount++; }
export function incrementDisconnectionCount(): void { disconnectionCount++; }

export function getMetricsSnapshot() {
  const mem = process.memoryUsage();
  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    memory: {
      rss:      mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    },
    messages: {
      total:     totalMessages,
      ratePerSec: msgRatePerSec,
    },
  };
}

export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startedAt) / 1000);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return sorted[idx]!;
}

/** Returns the current p95 HTTP response latency in ms (over last 1000 requests). */
export function getP95LatencyMs(): number {
  const sorted = [...latencyWindow].sort((a, b) => a - b);
  return percentile(sorted, 95);
}

/**
 * Render the current metrics in Prometheus text exposition format.
 * Accepts optional runtime data (active rooms / players) from the caller.
 */
export function renderPrometheusMetrics(opts: {
  activeRooms: number;
  connectedPlayers: number;
}): string {
  const snap = getMetricsSnapshot();
  const mem  = process.memoryUsage();
  const lines: string[] = [];

  const sorted = [...latencyWindow].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const errRate = requestCount > 0 ? errorCount / requestCount : 0;
  const errRate1m = get1MinErrorRate();
  const llmAvgMs = llmStats.count > 0 ? llmStats.totalLatencyMs / llmStats.count : 0;

  const metric = (
    name: string,
    help: string,
    type: "gauge" | "counter",
    value: number,
    labels?: Record<string, string>,
  ) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    const lstr = labels
      ? "{" + Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",") + "}"
      : "";
    lines.push(`${name}${lstr} ${value}`);
  };

  // ── Game ────────────────────────────────────────────────────────────────────
  metric("pixelrealm_active_players",
    "Number of players currently connected across all rooms", "gauge", opts.connectedPlayers);
  metric("pixelrealm_active_rooms",
    "Number of active game rooms", "gauge", opts.activeRooms);

  // ── Messages ────────────────────────────────────────────────────────────────
  metric("pixelrealm_ws_messages_total",
    "Total WebSocket messages processed since startup", "counter", snap.messages.total);
  metric("pixelrealm_ws_messages_per_second",
    "WebSocket messages processed in the last second", "gauge", snap.messages.ratePerSec);

  // ── Connections ──────────────────────────────────────────────────────────────
  metric("pixelrealm_player_connections_total",
    "Total player connection events since startup", "counter", connectionCount);
  metric("pixelrealm_player_disconnections_total",
    "Total player disconnection events since startup", "counter", disconnectionCount);

  // ── Auth ────────────────────────────────────────────────────────────────────
  metric("pixelrealm_auth_failures_total",
    "Total authentication failure events since startup", "counter", authFailureCount);

  // ── LLM quest generation ────────────────────────────────────────────────────
  metric("pixelrealm_llm_requests_total",
    "Total LLM quest generation calls since startup", "counter", llmStats.count);
  metric("pixelrealm_llm_errors_total",
    "Total LLM quest generation failures since startup", "counter", llmStats.errorCount);
  metric("pixelrealm_llm_avg_latency_ms",
    "Average LLM quest generation latency in milliseconds", "gauge", +llmAvgMs.toFixed(1));

  // ── Room lifecycle ───────────────────────────────────────────────────────────
  for (const [roomType, c] of roomCounters) {
    metric("pixelrealm_rooms_created_total",
      "Total rooms created by type since startup", "counter", c.created, { room_type: roomType });
    metric("pixelrealm_rooms_disposed_total",
      "Total rooms disposed by type since startup", "counter", c.disposed, { room_type: roomType });
  }

  // ── API latency ─────────────────────────────────────────────────────────────
  lines.push("# HELP pixelrealm_api_latency_ms HTTP API request latency in milliseconds");
  lines.push("# TYPE pixelrealm_api_latency_ms gauge");
  lines.push(`pixelrealm_api_latency_ms{quantile="0.5"} ${p50}`);
  lines.push(`pixelrealm_api_latency_ms{quantile="0.95"} ${p95}`);

  // ── Error rate ──────────────────────────────────────────────────────────────
  metric("pixelrealm_http_error_rate",
    "Fraction of HTTP requests that returned 5xx (lifetime)", "gauge", errRate);
  metric("pixelrealm_http_error_rate_1m",
    "Fraction of HTTP requests that returned 5xx in the last 60 seconds", "gauge", +errRate1m.toFixed(4));

  // ── DB pool ──────────────────────────────────────────────────────────────────
  const pool = getDbPoolStats();
  if (pool !== null) {
    metric("pixelrealm_db_pool_total",
      "Total connections in the pg pool", "gauge", pool.totalCount);
    metric("pixelrealm_db_pool_idle",
      "Idle connections in the pg pool", "gauge", pool.idleCount);
    metric("pixelrealm_db_pool_waiting",
      "Queued requests waiting for a pg pool connection", "gauge", pool.waitingCount);
  }

  // ── Process ─────────────────────────────────────────────────────────────────
  metric("pixelrealm_process_uptime_seconds",
    "Seconds since the game server process started", "counter", snap.uptimeSeconds);
  metric("pixelrealm_process_memory_rss_bytes",
    "Resident set size of the game server process in bytes", "gauge", mem.rss);
  metric("pixelrealm_process_memory_heap_used_bytes",
    "Heap memory used by the game server process in bytes", "gauge", mem.heapUsed);
  metric("pixelrealm_process_memory_heap_total_bytes",
    "Total heap memory allocated for the game server process in bytes", "gauge", mem.heapTotal);

  return lines.join("\n") + "\n";
}
