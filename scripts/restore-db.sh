#!/usr/bin/env bash
# restore-db.sh — PostgreSQL database restore for PixelRealm
#
# Usage:
#   ./scripts/restore-db.sh [--dry-run] <backup-file.sql.gz>
#
# Options:
#   --dry-run   Validate the backup file and print the restore plan without
#               touching the database.
#
# Arguments:
#   backup-file  Path to a gzip-compressed SQL dump produced by backup-db.sh.
#
# Environment variables:
#   DATABASE_URL  Full PostgreSQL connection string (required)
#                 e.g. postgresql://user:pass@localhost:5432/pixelrealm
#
# WARNING: This script DROPS and re-creates the public schema before restoring.
# All existing data will be permanently deleted.  Stop the game server before
# running to prevent writes during the restore window.
#
# Example:
#   # Stop the game server first
#   docker compose -f docker-compose.prod.yml stop game-server
#
#   # Dry-run to validate backup
#   ./scripts/restore-db.sh --dry-run backups/daily/pixelrealm_daily_20260323_020000.sql.gz
#
#   # Actual restore
#   ./scripts/restore-db.sh backups/daily/pixelrealm_daily_20260323_020000.sql.gz

set -euo pipefail

# ── Logging helpers ───────────────────────────────────────────────────────────

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [restore] $*"
}

log_error() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [restore] [ERROR] $*" >&2
}

trap 'log_error "Restore script exited unexpectedly (exit code $?)."; exit 1' ERR

# ── Parse arguments ───────────────────────────────────────────────────────────

DRY_RUN=false
BACKUP_FILE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -*) log_error "Unknown option: $arg"; exit 1 ;;
    *)  BACKUP_FILE="$arg" ;;
  esac
done

if [[ -z "$BACKUP_FILE" ]]; then
  log_error "No backup file specified."
  echo "Usage: $0 [--dry-run] <backup-file.sql.gz>" >&2
  exit 1
fi

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

# ── Validate backup file ──────────────────────────────────────────────────────

log "Backup file: ${BACKUP_FILE}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  log_error "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Backup file size: ${BACKUP_SIZE}"

log "Validating gzip integrity…"
if gzip -t "$BACKUP_FILE" 2>&1; then
  log "Integrity check passed."
else
  log_error "Integrity check FAILED — backup file is corrupt or incomplete."
  exit 1
fi

# ── Dry-run: print plan and exit ──────────────────────────────────────────────

if [[ "$DRY_RUN" == "true" ]]; then
  log "--- DRY-RUN MODE — no changes will be made ---"
  log "Would drop and re-create the public schema in: ${DATABASE_URL//:*@/:***@}"
  log "Would restore from: ${BACKUP_FILE}"
  log "Dry-run complete. Re-run without --dry-run to perform the actual restore."
  exit 0
fi

# ── Safety prompt (when run interactively) ────────────────────────────────────

if [[ -t 0 ]]; then
  log "WARNING: This will DROP all data in the target database and restore from backup."
  log "Target DB : ${DATABASE_URL//:*@/:***@}"
  log "Backup    : ${BACKUP_FILE}"
  read -r -p "Type 'yes' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "yes" ]]; then
    log "Restore cancelled by user."
    exit 0
  fi
fi

# ── Drop and re-create the public schema ──────────────────────────────────────

log "Dropping public schema and re-creating…"
psql "$DATABASE_URL" \
  --no-psqlrc \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" \
  2>&1 | while IFS= read -r line; do log "psql: $line"; done

log "Schema reset complete."

# ── Restore from backup ───────────────────────────────────────────────────────

log "Restoring from ${BACKUP_FILE}…"
gunzip -c "$BACKUP_FILE" \
  | psql "$DATABASE_URL" \
         --no-psqlrc \
         --quiet \
  2>&1 | while IFS= read -r line; do log "psql: $line"; done

log "Restore complete."

# ── Post-restore reminder ─────────────────────────────────────────────────────

log "REMINDER: Run database migrations before restarting the game server:"
log "  docker compose -f docker-compose.prod.yml run --rm game-server \\"
log "    node -e \"require('./dist/db/migrate').runMigrations().then(() => process.exit(0))\""
log "Then restart: docker compose -f docker-compose.prod.yml start game-server"
log "Restore run finished successfully."
