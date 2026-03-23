# PixelRealm — Deployment Guide

This guide covers deploying PixelRealm from scratch using Docker Compose on a Linux server. It assumes a fresh Ubuntu 22.04 host.

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Docker Engine | 24.x | [Install guide](https://docs.docker.com/engine/install/) |
| Docker Compose plugin | 2.x | Included with Docker Desktop; `apt install docker-compose-plugin` on Linux |
| Open ports | 80 (HTTP), 2567 (WS), 3001 (Auth) | Adjust firewall / security groups |
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

This starts four services:

| Service | Description | Port |
|---|---|---|
| `postgres` | PostgreSQL 16 database | internal |
| `redis` | Redis 7 session store | internal |
| `game-server` | Colyseus + Express + Fastify auth | 2567, 3001 |
| `client` | nginx serving the Vite frontend | 80 |

The game-server waits for `postgres` and `redis` to pass their healthchecks before starting.

---

## 5. Verify the deployment

```bash
# Game server health
curl http://localhost:2567/health
# Expected: {"status":"ok","ts":<timestamp>}

# Auth server health
curl http://localhost:3001/health
# Expected: {"status":"ok","ts":<timestamp>}

# Container status
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f game-server
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
| `GET /health` | game-server (port 2567) | `{"status":"ok"}` |
| `GET /health` | auth-server (port 3001) | `{"status":"ok"}` |
| `GET /health` | nginx client (port 80) | nginx default page or custom health page |

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

## 8. Scaling and reverse proxy (optional)

For TLS termination and domain routing, place nginx or Caddy in front:

```
Client (HTTPS/WSS) → Reverse proxy → game-server:2567 (WS)
                                   → game-server:3001 (Auth HTTP)
                                   → client:80        (Static files)
```

Example Caddy configuration:

```caddyfile
yourdomain.com {
  reverse_proxy /auth/* localhost:3001
  reverse_proxy /* localhost:80
}

ws.yourdomain.com {
  reverse_proxy localhost:2567
}
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

The script reads `DATABASE_URL` from the environment (or your `.env` file). It also prunes backups older than 30 days (configurable via `RETENTION_DAYS`).

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

> **Recommendation:** Back up daily, retain 30 days of backups, and test a restore to a staging environment at least once a month.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Server exits immediately | Missing required env var | Check stdout for `[Config] FATAL:` lines |
| `ECONNREFUSED` on DB | Postgres not ready | Check `docker compose ps` and postgres healthcheck |
| `ECONNREFUSED` on Redis | Redis not ready or wrong password | Verify `REDIS_URL` and `REDIS_PASSWORD` |
| JWT errors | `JWT_SECRET` mismatch | Ensure the same secret is used across restarts |
| CORS errors in browser | `ALLOWED_ORIGINS` missing your domain | Add the frontend origin to `ALLOWED_ORIGINS` |
| WebSocket not connecting | `VITE_COLYSEUS_URL` wrong | Rebuild client with correct `VITE_COLYSEUS_URL` |
