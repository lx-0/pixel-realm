#!/usr/bin/env bash
# backup-db.sh — PostgreSQL database backup for PixelRealm
#
# Usage:
#   ./scripts/backup-db.sh [backup-dir]
#
# Arguments:
#   backup-dir  Directory to write the dump file (default: ./backups)
#
# Environment variables:
#   DATABASE_URL      Full PostgreSQL connection string (required)
#                     e.g. postgresql://user:pass@localhost:5432/pixelrealm
#   RETENTION_DAILY   Number of daily backups to retain (default: 7)
#   RETENTION_WEEKLY  Number of weekly backups to retain (default: 4)
#
# Retention policy:
#   - Daily backups are created every run and pruned after RETENTION_DAILY days.
#   - Weekly backups are created on Sundays (day-of-week = 0) and the oldest
#     ones beyond RETENTION_WEEKLY are removed.
#
# Recommended cron (daily at 2 AM):
#   0 2 * * * cd /opt/pixelrealm && ./scripts/backup-db.sh >> /var/log/pixelrealm-backup.log 2>&1

set -euo pipefail

# ── Logging helpers ───────────────────────────────────────────────────────────

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [backup] $*"
}

log_error() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [backup] [ERROR] $*" >&2
}

# Trap unexpected failures so we always emit a failure log line.
trap 'log_error "Backup script exited unexpectedly (exit code $?)."; exit 1' ERR

# ── Configuration ─────────────────────────────────────────────────────────────

BACKUP_DIR="${1:-./backups}"
RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-4}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%w")   # 0 = Sunday

# ── Load DATABASE_URL from .env if not already set ────────────────────────────

if [[ -z "${DATABASE_URL:-}" ]] && [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  log_error "DATABASE_URL is not set. Export it or add it to .env."
  exit 1
fi

# ── Ensure backup directories exist ──────────────────────────────────────────

DAILY_DIR="${BACKUP_DIR}/daily"
WEEKLY_DIR="${BACKUP_DIR}/weekly"
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

# ── Run pg_dump (daily backup) ────────────────────────────────────────────────

DAILY_FILE="${DAILY_DIR}/pixelrealm_daily_${TIMESTAMP}.sql.gz"
log "Starting daily dump → ${DAILY_FILE}"

if pg_dump \
     --dbname="$DATABASE_URL" \
     --format=plain \
     --no-owner \
     --no-acl \
   | gzip -9 > "$DAILY_FILE"; then
  BACKUP_SIZE=$(du -sh "$DAILY_FILE" | cut -f1)
  log "Daily dump complete. Size: ${BACKUP_SIZE}"
else
  log_error "pg_dump failed for daily backup."
  rm -f "$DAILY_FILE"
  exit 1
fi

# ── Weekly backup (Sundays only) ──────────────────────────────────────────────

if [[ "$DAY_OF_WEEK" -eq 0 ]]; then
  WEEKLY_FILE="${WEEKLY_DIR}/pixelrealm_weekly_${TIMESTAMP}.sql.gz"
  log "Sunday detected — copying daily dump as weekly backup → ${WEEKLY_FILE}"
  cp "$DAILY_FILE" "$WEEKLY_FILE"
  log "Weekly backup created. Size: $(du -sh "$WEEKLY_FILE" | cut -f1)"
fi

# ── Prune old daily backups ───────────────────────────────────────────────────

log "Pruning daily backups older than ${RETENTION_DAILY} days from ${DAILY_DIR}"
find "$DAILY_DIR" -maxdepth 1 -name "pixelrealm_daily_*.sql.gz" \
  -mtime "+${RETENTION_DAILY}" -delete

DAILY_COUNT=$(find "$DAILY_DIR" -maxdepth 1 -name "pixelrealm_daily_*.sql.gz" | wc -l)
log "Daily backup directory now contains ${DAILY_COUNT} file(s)."

# ── Prune old weekly backups (keep last N) ────────────────────────────────────

WEEKLY_COUNT=$(find "$WEEKLY_DIR" -maxdepth 1 -name "pixelrealm_weekly_*.sql.gz" | wc -l)
if [[ "$WEEKLY_COUNT" -gt "$RETENTION_WEEKLY" ]]; then
  EXCESS=$(( WEEKLY_COUNT - RETENTION_WEEKLY ))
  log "Pruning ${EXCESS} old weekly backup(s) from ${WEEKLY_DIR}"
  # Sort by modification time (oldest first), delete the excess.
  find "$WEEKLY_DIR" -maxdepth 1 -name "pixelrealm_weekly_*.sql.gz" \
    -printf '%T@ %p\n' \
    | sort -n \
    | head -n "$EXCESS" \
    | awk '{print $2}' \
    | xargs -r rm --
fi

WEEKLY_REMAINING=$(find "$WEEKLY_DIR" -maxdepth 1 -name "pixelrealm_weekly_*.sql.gz" | wc -l)
log "Weekly backup directory now contains ${WEEKLY_REMAINING} file(s)."

log "Backup run finished successfully."
