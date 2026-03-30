# PixelRealm — Disaster Recovery Runbook

This document covers the backup strategy, restore procedure, data loss scenarios, and escalation contacts for the PixelRealm PostgreSQL database.

---

## 1. Backup Strategy

### What is backed up

The full `pixelrealm` PostgreSQL database is exported via `pg_dump` (plain-SQL format, gzip-compressed). This includes all player data: characters, inventories, quest progress, guild data, economy state, and audit logs.

Redis session data is ephemeral and is **not** backed up; sessions will expire and players will be asked to log in again after a restore.

### Backup types and retention

| Type   | Frequency                  | Directory             | Retention |
|--------|----------------------------|-----------------------|-----------|
| Daily  | Every day at 02:00 UTC     | `backups/daily/`      | 7 backups |
| Weekly | Every Sunday at 02:00 UTC  | `backups/weekly/`     | 4 backups |

Weekly backups are a copy of the Sunday daily backup. They are kept independently so a full month of weekly snapshots is always available even after daily ones are pruned.

### Maximum data loss (RPO)

| Scenario                                     | Maximum data loss (RPO) |
|----------------------------------------------|-------------------------|
| Restoring from most-recent daily backup       | ≤ 24 hours              |
| Restoring from weekly backup after daily loss | ≤ 7 days                |

### Scripts

| Script                     | Purpose                                   |
|----------------------------|-------------------------------------------|
| `scripts/backup-db.sh`     | Create daily + weekly backups, prune old ones |
| `scripts/restore-db.sh`    | Validate and restore from a backup file   |

### Backup file naming

```
backups/daily/pixelrealm_daily_YYYYMMDD_HHMMSS.sql.gz
backups/weekly/pixelrealm_weekly_YYYYMMDD_HHMMSS.sql.gz
```

---

## 2. Scheduled Backup (Production)

In production the `db-backup` Docker Compose service runs `backup-db.sh` via cron inside a `postgres:16-alpine` container. It shares the `backend` network with the Postgres service and mounts `./backups` on the host.

To verify the cron service is running:

```bash
docker compose -f docker-compose.prod.yml ps db-backup
docker compose -f docker-compose.prod.yml logs db-backup
```

To run a manual backup immediately:

```bash
docker compose -f docker-compose.prod.yml exec db-backup \
  sh /scripts/backup-db.sh /backups
```

To run a backup from the host (requires `pg_dump` installed locally):

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/pixelrealm" \
  ./scripts/backup-db.sh ./backups
```

Backup logs are also written to the container stdout, which Docker captures. In production forward these to your log aggregator.

---

## 3. Step-by-Step Restore Procedure

### 3.1 Choose a backup file

```bash
# List available daily backups
ls -lh backups/daily/

# List available weekly backups
ls -lh backups/weekly/
```

Use the most recent backup file dated **before** the incident. If the latest daily is corrupt, fall back to the most recent weekly.

### 3.2 Validate the backup before restoring

```bash
./scripts/restore-db.sh --dry-run \
  backups/daily/pixelrealm_daily_YYYYMMDD_HHMMSS.sql.gz
```

The dry-run mode checks gzip integrity and prints the restore plan without modifying the database. **Always run this first.**

### 3.3 Stop the game server

```bash
docker compose -f docker-compose.prod.yml stop game-server
```

This prevents writes during the restore window and avoids partial-state corruption.

### 3.4 Perform the restore

```bash
./scripts/restore-db.sh \
  backups/daily/pixelrealm_daily_YYYYMMDD_HHMMSS.sql.gz
```

When run interactively the script prompts for confirmation before destroying data. When run non-interactively (stdin not a TTY, e.g. from another script) it skips the prompt — ensure you have selected the correct file before running.

### 3.5 Run migrations

After restoring, apply any pending schema migrations to ensure the database matches the deployed code version:

```bash
docker compose -f docker-compose.prod.yml run --rm game-server \
  node -e "require('./dist/db/migrate').runMigrations().then(() => process.exit(0))"
```

### 3.6 Restart the game server

```bash
docker compose -f docker-compose.prod.yml start game-server
```

### 3.7 Verify

```bash
# Check the API is healthy
curl https://yourdomain.com/api/health

# Check game server logs for DB connection errors
docker compose -f docker-compose.prod.yml logs --tail=50 game-server
```

---

## 4. Data Loss Scenarios

### 4.1 Accidental data deletion (row-level)

**Example:** a bug wipes a table; a bad migration drops columns.

**Recovery:**
1. Identify the last good backup (before the deletion timestamp).
2. Run the restore procedure (§3).
3. If only a single table needs recovery, restore to a temporary database and copy the table out.

**RTO estimate:** 15–30 minutes (restore + migrations + verification).

### 4.2 Database server crash / volume corruption

**Example:** the `postgres` container or its volume is corrupted.

**Recovery:**
1. Stop and remove the damaged container and volume:
   ```bash
   docker compose -f docker-compose.prod.yml down postgres
   docker volume rm pixelrealm_postgres_data
   ```
2. Restart Postgres (fresh empty database):
   ```bash
   docker compose -f docker-compose.prod.yml up -d postgres
   ```
3. Wait for healthcheck to pass, then run the restore procedure (§3).

**RTO estimate:** 20–45 minutes.

### 4.3 Full host failure

**Example:** the server is destroyed; backups on local disk are lost.

**Recovery:**
1. Provision a new server and restore the application.
2. Restore backups from off-host storage (S3, rsync remote, etc. — configure separately).
3. Run the restore procedure (§3).

**RTO estimate:** 1–3 hours (depending on off-host restore speed).

> **Recommendation:** Mirror the `backups/` directory to object storage (S3, B2, GCS) with a tool like `rclone`. Run the sync as a post-backup step or on a separate cron. Without off-host storage, a full host failure means data loss back to the last off-host copy.

### 4.4 Ransomware / hostile actor

**Example:** backups on the server are encrypted or deleted.

**Recovery:**
1. Isolate the host immediately (revoke firewall rules, disable network).
2. Provision a clean replacement server.
3. Restore from off-host backup copies (see §4.3).
4. Rotate all secrets (JWT_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD) per the secret-rotation procedures in `docs/DEPLOYMENT.md`.

**RTO estimate:** 2–6 hours.

---

## 5. Monthly Restore Test

Run a full restore drill against the staging environment at least once per month:

```bash
# Copy a production backup to staging server
scp backups/weekly/pixelrealm_weekly_YYYYMMDD_HHMMSS.sql.gz staging-server:/opt/pixelrealm/

# On the staging server:
docker compose -f docker-compose.staging.yml stop game-server
DATABASE_URL="${STAGING_DATABASE_URL}" \
  ./scripts/restore-db.sh /opt/pixelrealm/pixelrealm_weekly_YYYYMMDD_HHMMSS.sql.gz
docker compose -f docker-compose.staging.yml start game-server
```

Document the drill date, backup file used, and restore duration. Update this runbook if anything is found to be inaccurate.

---

## 6. Contact and Escalation

| Role              | Responsibility                                         | How to reach              |
|-------------------|--------------------------------------------------------|---------------------------|
| On-call engineer  | First responder for data incidents; runs restore       | PagerDuty / #ops-alerts   |
| Database owner    | Authorises destructive operations (drop schema)        | Slack DM / email          |
| CTO               | Escalation for multi-hour outages or data-loss events  | Slack DM / phone          |
| Hosting provider  | Volume recovery, host-level issues                     | Provider support portal   |

### Incident declaration criteria

Declare a **data incident** (page the on-call team immediately) if any of the following are true:

- Confirmed data loss affecting player characters, inventories, or economy state.
- Database unavailable for > 5 minutes during peak hours.
- Backup job has not produced a new file in > 26 hours.
- Restore dry-run fails integrity check on the most recent backup.

---

## 7. Checklist — Restore in Progress

Copy this checklist into your incident channel when a restore is underway:

```
[ ] Incident declared, on-call engineer paged
[ ] Root cause identified (accidental deletion / crash / other)
[ ] Backup file chosen: ___________________
[ ] Dry-run passed (gzip integrity OK)
[ ] Game server stopped
[ ] Restore started: <timestamp>
[ ] Restore completed: <timestamp>
[ ] Migrations applied successfully
[ ] Game server restarted
[ ] API health check passing
[ ] Player logins verified
[ ] Incident closed, post-mortem scheduled
```
