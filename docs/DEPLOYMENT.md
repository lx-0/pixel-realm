# PixelRealm — Deployment Guide

This guide covers deploying PixelRealm from scratch using Docker Compose on a Linux server. It assumes a fresh Ubuntu 22.04 host.

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Docker Engine | 24.x | [Install guide](https://docs.docker.com/engine/install/) |
| Docker Compose plugin | 2.x | Included with Docker Desktop; `apt install docker-compose-plugin` on Linux |
| Open ports | 80 (HTTP), 443 (HTTPS/WSS) | Internal ports 2567/3001 are not exposed to host when using nginx-proxy |
| certbot | latest | For Let's Encrypt TLS certificate provisioning |
| DNS | A record pointing to your server IP | Required for TLS / CORS |

---

## 1. Clone the repository

```bash
git clone <repo-url> pixelrealm
cd pixelrealm
```

---

## 2. Set up environment variables

Copy the production example and fill in **every** `CHANGE_ME` value:

```bash
cp .env.production.example .env
```

Open `.env` and set:

| Variable | Description |
|---|---|
| `NODE_ENV` | Must be `production` |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `POSTGRES_PASSWORD` | Password for the Postgres container |
| `REDIS_URL` | Full Redis connection string (include password) |
| `REDIS_PASSWORD` | Password for the Redis container |
| `JWT_SECRET` | Random secret ≥ 32 chars — `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | Your production client URL, e.g. `https://yourdomain.com` |
| `VITE_COLYSEUS_URL` | Public WebSocket URL, e.g. `wss://yourdomain.com` |
| `PORT` | Game server port (default `2567`) |
| `AUTH_PORT` | Auth server port (default `3001`) |

> **The server will refuse to start in production if `DATABASE_URL`, `REDIS_URL`, or `JWT_SECRET` are missing.**

---

## 3. Database migration

Migrations run automatically on server startup via `runMigrations()`.

To run them manually (before first boot or after adding new migrations):

```bash
# Inside the container
docker compose -f docker-compose.prod.yml run --rm game-server \
  node -e "require('./dist/db/migrate').runMigrations().then(() => process.exit(0))"

# Or using ts-node in the server directory (dev/staging only)
cd server && npm run db:migrate
```

Migration files live in `server/src/db/migrations/`. They are applied in alphabetical order and are idempotent (tracked in `_migrations` table).

---

## 4. Build and start

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

This starts five services:

| Service | Description | Port |
|---|---|---|
| `postgres` | PostgreSQL 16 database | internal |
| `redis` | Redis 7 session store | internal |
| `game-server` | Colyseus + Express + Fastify auth | internal |
| `client` | nginx serving the Vite frontend | internal |
| `nginx-proxy` | TLS termination (HTTPS + WSS) | **80, 443** → host |

The game-server and client are only reachable through `nginx-proxy` — their ports are not exposed to the host directly. The game-server waits for `postgres` and `redis` to pass their healthchecks before starting.

---

## 5. Verify the deployment

```bash
# HTTPS client
curl https://yourdomain.com/health
# Expected: nginx health page or SPA index

# Game server health (via nginx-proxy)
curl https://yourdomain.com/api/health
# Expected: {"status":"ok","ts":<timestamp>}

# Prometheus metrics
curl https://yourdomain.com/api/metrics
# Expected: # HELP pixelrealm_active_players ...

# WSS connectivity (requires wscat: npm install -g wscat)
wscat -c wss://yourdomain.com/colyseus

# Container status
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f game-server
docker compose -f docker-compose.prod.yml logs -f nginx-proxy
```

---

## 6. Monitoring and logging

The game server outputs **structured JSON logs** in production:

```json
{"level":"info","time":"2026-01-01T00:00:00.000Z","msg":"request","method":"GET","path":"/health","status":200,"durationMs":2}
```

Fields logged on every HTTP request: `method`, `path`, `status`, `durationMs`.

### Recommended log aggregation setup

- **systemd / journald**: logs are captured automatically; use `journalctl -u docker` or ship via `journald` driver.
- **Docker logging driver**: add `--log-driver=journald` or `--log-driver=json-file` to your compose service.
- **Cloud**: pipe stdout/stderr to CloudWatch Logs, Datadog, or your preferred sink.

### Health check endpoints

| Endpoint | Service | Expected response |
|---|---|---|
| `GET /api/health` | game-server (via nginx-proxy) | `{"status":"ok"}` |
| `GET /auth/health` | auth-server (via nginx-proxy) | `{"status":"ok"}` |
| `GET /nginx-health` | nginx-proxy | `{"status":"ok"}` |
| `GET /api/metrics` | game-server — Prometheus format | `# HELP pixelrealm_active_players ...` |

### Prometheus / Grafana scraping

The `/metrics` endpoint returns standard [Prometheus text exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/). Metrics exposed:

| Metric | Type | Description |
|---|---|---|
| `pixelrealm_active_players` | gauge | Connected players across all rooms |
| `pixelrealm_active_rooms` | gauge | Active game rooms |
| `pixelrealm_ws_messages_total` | counter | Total WebSocket messages since start |
| `pixelrealm_ws_messages_per_second` | gauge | WS message rate (last second) |
| `pixelrealm_api_latency_ms` | gauge | HTTP p50/p95 latency |
| `pixelrealm_http_error_rate` | gauge | Fraction of 5xx responses |
| `pixelrealm_process_uptime_seconds` | counter | Process uptime |
| `pixelrealm_process_memory_*_bytes` | gauge | RSS / heap used / heap total |

Example Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: pixelrealm
    static_configs:
      - targets: ['yourdomain.com']
    metrics_path: /api/metrics
    scheme: https
```

---

## 7. Graceful shutdown and restarts

All services are configured with `restart: unless-stopped`. To apply updates:

```bash
# Pull latest code
git pull

# Rebuild and restart (zero-downtime for stateless services)
docker compose -f docker-compose.prod.yml up --build -d
```

Database and Redis data are persisted in named Docker volumes (`postgres_data`, `redis_data`) and survive container restarts.

---

## 8. TLS setup (Let's Encrypt)

TLS is terminated by the `nginx-proxy` service using `nginx.tls.conf`. Follow these steps once on a fresh host:

### 8.1 Obtain a certificate with certbot

```bash
# Install certbot
sudo apt install -y certbot

# Issue certificate (port 80 must be free or temporarily stopped)
sudo certbot certonly --standalone -d yourdomain.com

# Certificates are written to:
#   /etc/letsencrypt/live/yourdomain.com/fullchain.pem
#   /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 8.2 Configure nginx.tls.conf

Replace all occurrences of `yourdomain.com` in `nginx.tls.conf` with your actual domain:

```bash
sed -i 's/yourdomain.com/mygame.example.com/g' nginx.tls.conf
```

### 8.3 Auto-renew certificates

Let's Encrypt certificates expire every 90 days. Add a cron job to renew automatically:

```cron
0 3 * * * certbot renew --quiet && docker compose -f /opt/pixelrealm/docker-compose.prod.yml exec nginx-proxy nginx -s reload
```

### 8.4 WebSocket URL

After TLS is enabled, set `VITE_COLYSEUS_URL=wss://yourdomain.com/colyseus` in `.env` and rebuild the client:

```bash
docker compose -f docker-compose.prod.yml up --build -d client nginx-proxy
```

---

## 9. Database backup and restore

### Backup

The `scripts/db-backup.sh` script creates a timestamped, gzip-compressed pg_dump of the entire database.

```bash
# Run a manual backup (writes to ./backups/ by default)
./scripts/db-backup.sh

# Write to a custom directory
./scripts/db-backup.sh /mnt/backup/pixelrealm
```

The script reads `DATABASE_URL` from the environment (or your `.env` file). It prunes backups older than **7 days** by default (override with `RETENTION_DAYS=N`).

**Recommended schedule — daily at 2 AM:**

```cron
0 2 * * * cd /opt/pixelrealm && ./scripts/db-backup.sh >> /var/log/pixelrealm-backup.log 2>&1
```

**From inside Docker Compose:**

```bash
docker compose -f docker-compose.prod.yml run --rm game-server \
  bash scripts/db-backup.sh /backups
```

Mount a host volume for `/backups` so the files are accessible outside the container.

### Restore

```bash
# 1. Stop the game server to prevent writes during restore
docker compose -f docker-compose.prod.yml stop game-server

# 2. Drop and re-create the database (adjust DB name / connection as needed)
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Restore from a backup file
gunzip -c backups/pixelrealm_20260323_020000.sql.gz | psql "$DATABASE_URL"

# 4. Run migrations to ensure the schema is fully up to date
docker compose -f docker-compose.prod.yml run --rm game-server \
  node -e "require('./dist/db/migrate').runMigrations().then(() => process.exit(0))"

# 5. Restart the game server
docker compose -f docker-compose.prod.yml start game-server
```

> **Recommendation:** Back up daily, retain 7 days of backups, and test a restore to the staging environment at least once a month.

---

## 10. Staging environment

The staging environment mirrors production topology without TLS (plain HTTP). It uses separate named volumes (`postgres_staging_data`, `redis_staging_data`) so it never touches production data.

### Start staging

```bash
# Copy and fill in staging env vars
cp .env.staging.example .env.staging
# Edit .env.staging — use a separate DB password and JWT_SECRET from production

docker compose -f docker-compose.staging.yml --env-file .env.staging up --build
```

Staging services:

| Service | Description | Default host port |
|---|---|---|
| `postgres` | PostgreSQL 16 | internal |
| `redis` | Redis 7 | internal |
| `game-server` | Colyseus + Express + Fastify | `2567`, `3001` |
| `client` | nginx SPA | `8080` |

### Differences from production

| Setting | Production | Staging |
|---|---|---|
| `NODE_ENV` | `production` | `staging` |
| TLS | yes (nginx-proxy) | no |
| WebSocket scheme | `wss://` | `ws://` |
| Client port | `80` / `443` | `8080` |
| DB name | `pixelrealm` | `pixelrealm_staging` |

---

## 11. Secret rotation

Rotate secrets without downtime using the procedures below. Always update the target secret first, then restart services.

### 11.1 JWT_SECRET

JWT tokens are short-lived (default 15 min access / 7 day refresh). Rotating `JWT_SECRET` invalidates all existing sessions — all players will be logged out.

```bash
# 1. Generate a new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update .env on the server
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_SECRET}/" /opt/pixelrealm/.env

# 3. Restart game-server only (postgres and redis stay up)
docker compose -f docker-compose.prod.yml up -d --no-deps game-server
```

**Impact:** all active sessions invalidated; players re-login automatically on next request.

### 11.2 POSTGRES_PASSWORD / DATABASE_URL

```bash
# 1. Connect to the running postgres container and change the password
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U pixelrealm -c "ALTER USER pixelrealm PASSWORD 'NEW_PASSWORD';"

# 2. Update .env with the new password
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=NEW_PASSWORD|" /opt/pixelrealm/.env
sed -i "s|@postgres:5432|@postgres:5432|" /opt/pixelrealm/.env
# Update DATABASE_URL and REDIS_URL lines to match

# 3. Restart game-server to pick up the new DATABASE_URL
docker compose -f docker-compose.prod.yml up -d --no-deps game-server
```

**Impact:** zero downtime if game-server restart is fast (< healthcheck timeout).

### 11.3 REDIS_PASSWORD

```bash
# 1. Update the Redis password in-flight
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli CONFIG SET requirepass NEW_REDIS_PASSWORD

# 2. Update .env
sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=NEW_REDIS_PASSWORD/" /opt/pixelrealm/.env
# Also update REDIS_URL

# 3. Restart game-server
docker compose -f docker-compose.prod.yml up -d --no-deps game-server

# 4. Restart redis container to persist the new password in the command args
docker compose -f docker-compose.prod.yml up -d --no-deps redis
```

**Impact:** brief session disruption while game-server reconnects to Redis.

### 11.4 ANTHROPIC_API_KEY

```bash
# 1. Issue a new key at console.anthropic.com and copy it

# 2. Update .env
sed -i "s/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=sk-ant-NEW_KEY/" /opt/pixelrealm/.env

# 3. Restart game-server
docker compose -f docker-compose.prod.yml up -d --no-deps game-server

# 4. Revoke the old key in the Anthropic console
```

**Impact:** zero downtime if the restart completes before in-flight AI requests time out.

---

## 12. Deployment notifications

The CI/CD workflow (`.github/workflows/deploy.yml`) posts a Slack/Discord-compatible webhook payload on deploy start, success, and failure.

To enable:

1. Create an incoming webhook in your Slack workspace or Discord server.
2. Add the URL as a GitHub Actions secret named `DEPLOY_WEBHOOK_URL` in the repository settings (`Settings → Secrets and variables → Actions`).
3. The workflow sends messages automatically — no other configuration required.

If `DEPLOY_WEBHOOK_URL` is not set, the notification steps are skipped silently.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Server exits immediately | Missing required env var | Check stdout for `[Config] FATAL:` lines |
| `ECONNREFUSED` on DB | Postgres not ready | Check `docker compose ps` and postgres healthcheck |
| `ECONNREFUSED` on Redis | Redis not ready or wrong password | Verify `REDIS_URL` and `REDIS_PASSWORD` |
| JWT errors | `JWT_SECRET` mismatch | Ensure the same secret is used across restarts |
| CORS errors in browser | `ALLOWED_ORIGINS` missing your domain | Add the frontend origin to `ALLOWED_ORIGINS` |
| WebSocket not connecting | `VITE_COLYSEUS_URL` wrong | Rebuild client with correct `VITE_COLYSEUS_URL` |
