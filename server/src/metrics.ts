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
  if (statusCode >= 500) errorCount++;
}

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

  // ── API latency ─────────────────────────────────────────────────────────────
  lines.push("# HELP pixelrealm_api_latency_ms HTTP API request latency in milliseconds");
  lines.push("# TYPE pixelrealm_api_latency_ms gauge");
  lines.push(`pixelrealm_api_latency_ms{quantile="0.5"} ${p50}`);
  lines.push(`pixelrealm_api_latency_ms{quantile="0.95"} ${p95}`);

  // ── Error rate ──────────────────────────────────────────────────────────────
  metric("pixelrealm_http_error_rate",
    "Fraction of HTTP requests that returned 5xx (lifetime)", "gauge", errRate);

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
