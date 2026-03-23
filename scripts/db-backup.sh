#!/usr/bin/env bash
# db-backup.sh — PostgreSQL database backup for PixelRealm
#
# Usage:
#   ./scripts/db-backup.sh [backup-dir]
#
# Arguments:
#   backup-dir  Directory to write the dump file (default: ./backups)
#
# Environment variables (can also be set in .env):
#   DATABASE_URL  Full PostgreSQL connection string (required)
#                 e.g. postgresql://user:pass@localhost:5432/pixelrealm
#
# The script creates a timestamped .sql.gz dump and removes backups older
# than RETENTION_DAYS (default: 30) from the backup directory.
#
# Recommended cron (daily at 2 AM):
#   0 2 * * * /path/to/pixelrealm/scripts/db-backup.sh >> /var/log/pixelrealm-backup.log 2>&1

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pixelrealm_${TIMESTAMP}.sql.gz"

# ── Load DATABASE_URL from .env if not already set ────────────────────────────

if [[ -z "${DATABASE_URL:-}" ]] && [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL is not set. Export it or add it to .env." >&2
  exit 1
fi

# ── Ensure backup directory exists ────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

# ── Run pg_dump ───────────────────────────────────────────────────────────────

echo "[backup] Starting dump → ${BACKUP_FILE}"

pg_dump \
  --dbname="$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[backup] Done. Size: ${BACKUP_SIZE}"

# ── Prune old backups ─────────────────────────────────────────────────────────

echo "[backup] Removing backups older than ${RETENTION_DAYS} days from ${BACKUP_DIR}"
find "$BACKUP_DIR" -maxdepth 1 -name "pixelrealm_*.sql.gz" \
  -mtime "+${RETENTION_DAYS}" -delete

REMAINING=$(find "$BACKUP_DIR" -maxdepth 1 -name "pixelrealm_*.sql.gz" | wc -l)
echo "[backup] Backup directory now contains ${REMAINING} file(s)."
