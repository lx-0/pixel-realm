// Lightweight runtime metrics module — no external dependencies.
// Rooms call incrementMessageCount() per incoming WS message.
// The /metrics endpoint reads the current snapshot.

const startedAt = Date.now();

let totalMessages = 0;
let windowMessages = 0;  // messages counted in the current 1-second window
let msgRatePerSec = 0;

// Roll the sliding window every second
setInterval(() => {
  msgRatePerSec = windowMessages;
  windowMessages = 0;
}, 1000).unref();

export function incrementMessageCount(): void {
  totalMessages++;
  windowMessages++;
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
