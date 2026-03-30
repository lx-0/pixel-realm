# PixelRealm Game Server

Colyseus WebSocket + Express HTTP server for the PixelRealm MMORPG.

## Quick Start

```bash
npm install
npm run dev        # development (pino-pretty output, no DB required)
npm run build      # compile TypeScript → dist/
npm start          # production
```

---

## Monitoring

### Health Endpoints

| Endpoint   | Purpose                                              |
|------------|------------------------------------------------------|
| `GET /health` | Server status, uptime, component health, DB/Redis probe |
| `GET /ready`  | Strict readiness check — 503 when DB or Redis is down |
| `GET /metrics`| Prometheus text format for Grafana / dashboard scraping |

#### `/health` response

```json
{
  "status": "ok",
  "ts": 1711800000000,
  "uptimeSeconds": 3600,
  "activeRooms": 4,
  "connectedPlayers": 12,
  "components": {
    "database": { "ok": true, "latencyMs": 2, "pool": { "totalCount": 3, "idleCount": 2, "waitingCount": 0 } },
    "redis":    { "ok": true, "latencyMs": 1 }
  },
  "memory": {
    "rssBytes": 104857600,
    "heapUsedBytes": 52428800,
    "heapTotalBytes": 67108864
  },
  "cpu": { "userMs": 230, "systemMs": 45 }
}
```

`status` is `"ok"` when all components are healthy, `"degraded"` otherwise.
HTTP status is always `200` so load-balancer health checks don't cycle the process.

#### `/ready` response

Returns `200` only when DB and Redis are both reachable.
Returns `503` otherwise — safe to use as a Kubernetes `readinessProbe`.

```json
{ "ready": true, "ts": 1711800000000, "components": { "database": { "ok": true }, "redis": { "ok": true } } }
```

---

### Structured Logging

All log output is **newline-delimited JSON** in production (stdout), suitable for ingestion by Datadog, CloudWatch, Loki, Splunk, etc.

In development, logs are pretty-printed via `pino-pretty`.

#### Log Level

Set via `LOG_LEVEL` env var (default: `info`). Valid values: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

#### Event Types

Every game-significant log entry carries an `event` field for easy filtering:

| `event`               | Level  | When emitted                                          |
|-----------------------|--------|-------------------------------------------------------|
| `http_request`        | info/warn/error | Every HTTP request with method, path, status, durationMs |
| `player_connect`      | info   | Player joins a game room                             |
| `player_disconnect`   | info   | Player leaves a game room                            |
| `auth_failure`        | warn   | Login failure (invalid credentials or banned account) |
| `llm_request`         | info/warn | LLM quest generation — success, fallback, or error   |
| `room_create`         | info   | Colyseus room created                                |
| `room_dispose`        | info   | Colyseus room disposed                               |
| `unhandled_exception` | fatal  | Uncaught exception or unhandled promise rejection    |
| `alert`               | warn   | Alerting threshold breached (see below)              |
| `server_start`        | info   | Server started successfully                          |

#### Example log entries

```json
{"level":30,"time":"2026-03-30T12:00:00.000Z","event":"player_connect","userId":"u1","username":"Hero","roomType":"zone","roomId":"zone_abc","sessionId":"s1","msg":"player connected"}
{"level":40,"time":"2026-03-30T12:00:05.000Z","event":"auth_failure","username":"badguy","reason":"invalid_credentials","ip":"1.2.3.4","msg":"authentication failure"}
{"level":30,"time":"2026-03-30T12:00:10.000Z","event":"llm_request","zoneId":"zone1","questType":"kill","latencyMs":450,"success":true,"fallback":false,"msg":"LLM quest generated"}
{"level":40,"time":"2026-03-30T12:01:00.000Z","event":"alert","alert":"high_error_rate","errorRate":0.07,"threshold":0.05,"msg":"ALERT: high_error_rate"}
```

---

### Alerting

The server evaluates alert thresholds on a configurable interval (default: 30 s) and emits structured `event: "alert"` log entries at `warn` level when a threshold is breached.

Wire up your log aggregator to watch for `event == "alert"` and route to PagerDuty, OpsGenie, Slack, or CloudWatch Alarms.

| Alert name                  | Default threshold        | Env var to override           |
|-----------------------------|--------------------------|-------------------------------|
| `high_error_rate`           | Error rate > 5% (1-min)  | `ALERT_ERROR_RATE=0.05`       |
| `high_p95_latency`          | p95 HTTP latency > 2000ms| `ALERT_P95_LATENCY_MS=2000`   |
| `high_memory_usage`         | RSS > 80% of system total| `ALERT_MEMORY_FRACTION=0.80`  |
| `db_pool_near_exhaustion`   | Pool connections ≥ 24/25 | `ALERT_DB_POOL_EXHAUSTED=24`  |
| _(check interval)_          | Every 30 s               | `ALERT_CHECK_INTERVAL_MS=30000` |

---

### Prometheus Metrics

`GET /metrics` returns Prometheus text exposition format (version 0.0.4).

Key metrics:

| Metric                                | Type    | Description                               |
|---------------------------------------|---------|-------------------------------------------|
| `pixelrealm_active_players`           | gauge   | Connected players across all rooms        |
| `pixelrealm_active_rooms`             | gauge   | Active Colyseus rooms                     |
| `pixelrealm_ws_messages_total`        | counter | Total WebSocket messages since startup    |
| `pixelrealm_ws_messages_per_second`   | gauge   | WS message throughput (last 1 s)          |
| `pixelrealm_player_connections_total` | counter | Total player connection events            |
| `pixelrealm_player_disconnections_total` | counter | Total disconnection events             |
| `pixelrealm_auth_failures_total`      | counter | Total auth failures                       |
| `pixelrealm_llm_requests_total`       | counter | LLM quest generation calls                |
| `pixelrealm_llm_errors_total`         | counter | LLM quest generation failures             |
| `pixelrealm_llm_avg_latency_ms`       | gauge   | Average LLM call latency                  |
| `pixelrealm_rooms_created_total`      | counter | Rooms created by type                     |
| `pixelrealm_rooms_disposed_total`     | counter | Rooms disposed by type                    |
| `pixelrealm_api_latency_ms{quantile}` | gauge   | HTTP latency at p50 / p95                 |
| `pixelrealm_http_error_rate`          | gauge   | Lifetime 5xx fraction                     |
| `pixelrealm_http_error_rate_1m`       | gauge   | 1-minute sliding window 5xx fraction      |
| `pixelrealm_db_pool_total`            | gauge   | pg pool total connections                 |
| `pixelrealm_db_pool_idle`             | gauge   | pg pool idle connections                  |
| `pixelrealm_db_pool_waiting`          | gauge   | Requests queued for a pool connection     |
| `pixelrealm_process_uptime_seconds`   | counter | Process uptime                            |
| `pixelrealm_process_memory_rss_bytes` | gauge   | RSS memory usage                          |

Scrape config example (Prometheus `prometheus.yml`):

```yaml
scrape_configs:
  - job_name: pixelrealm
    static_configs:
      - targets: ['your-server:2567']
    metrics_path: /metrics
    scrape_interval: 15s
```

---

## Environment Variables

| Variable                    | Default                                | Description                           |
|-----------------------------|----------------------------------------|---------------------------------------|
| `NODE_ENV`                  | `development`                          | `production` enables strict mode      |
| `PORT`                      | `2567`                                 | Game server port                      |
| `AUTH_PORT`                 | `3001`                                 | Auth server port                      |
| `DATABASE_URL`              | _(local dev default)_                  | PostgreSQL connection string          |
| `REDIS_URL`                 | `redis://localhost:6379`               | Redis connection string               |
| `JWT_SECRET`                | _(dev default)_                        | HS256 signing key — required in prod  |
| `ALLOWED_ORIGINS`           | `http://localhost:3000`                | Comma-separated CORS origins          |
| `ADMIN_USERNAMES`           | _(empty)_                              | Comma-separated admin usernames       |
| `LOG_LEVEL`                 | `info`                                 | Pino log level                        |
| `ALERT_ERROR_RATE`          | `0.05`                                 | 5xx error rate alert threshold        |
| `ALERT_P95_LATENCY_MS`      | `2000`                                 | p95 latency alert threshold (ms)      |
| `ALERT_MEMORY_FRACTION`     | `0.80`                                 | Memory RSS alert fraction             |
| `ALERT_DB_POOL_EXHAUSTED`   | `24`                                   | DB pool connection count alert        |
| `ALERT_CHECK_INTERVAL_MS`   | `30000`                                | Alert evaluation interval (ms)        |
