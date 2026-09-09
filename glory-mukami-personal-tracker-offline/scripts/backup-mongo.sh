#!/usr/bin/env bash
#
# Backs the journal up out of MongoDB.
#
# Atlas's free M0 tier has no automated backups. If the server is the copy that
# survives losing your phone, and the server itself is never backed up, the
# single point of failure has only moved — it has not gone away. Run this on a
# schedule (cron, Task Scheduler, or a CI cron job).
#
#   ./scripts/backup-mongo.sh                  # writes into ./backups
#   ./scripts/backup-mongo.sh /path/to/backups
#
# Requires mongodump (MongoDB Database Tools) and MONGODB_URI in the
# environment or in .env.

set -euo pipefail

DEST="${1:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

if [ -z "${MONGODB_URI:-}" ] && [ -f .env ]; then
  # Only pull the one variable, rather than sourcing a file that may contain
  # anything.
  MONGODB_URI="$(grep -E '^MONGODB_URI=' .env | head -1 | cut -d= -f2-)"
fi

if [ -z "${MONGODB_URI:-}" ]; then
  echo "MONGODB_URI is not set. Nothing was backed up." >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "mongodump is not installed (MongoDB Database Tools). Nothing was backed up." >&2
  exit 1
fi

STAMP="$(date +%Y-%m-%d-%H%M%S)"
OUT="$DEST/$STAMP"
mkdir -p "$OUT"

echo "Backing up to $OUT"
mongodump --uri="$MONGODB_URI" --out="$OUT" --quiet

# Verified before anything old is deleted: a rotation that runs after a failed
# dump would delete good backups and keep nothing.
if [ -z "$(ls -A "$OUT" 2>/dev/null)" ]; then
  echo "The dump produced nothing. Keeping every existing backup." >&2
  rmdir "$OUT" 2>/dev/null || true
  exit 1
fi

echo "Backed up $(du -sh "$OUT" | cut -f1)"

if [ "$KEEP_DAYS" -gt 0 ]; then
  find "$DEST" -maxdepth 1 -mindepth 1 -type d -mtime "+$KEEP_DAYS" -print -exec rm -rf {} + \
    | sed 's/^/removed old backup: /' || true
fi
