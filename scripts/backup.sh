#!/usr/bin/env bash
# Back up the database to backups/lifts-YYYY-MM-DD-HHMMSS.sql.gz
# Usage: scripts/backup.sh        (the db container must be running)
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
file="backups/lifts-$(date +%Y-%m-%d-%H%M%S).sql.gz"

# --clean --if-exists: the dump starts by dropping existing tables, so restoring
# it replaces whatever is in the target database.
# Write to a temp file first so a failed dump never leaves a half-written backup.
docker compose exec -T db pg_dump -U lifts -d lifts --clean --if-exists --no-owner \
  | gzip > "$file.partial"
mv "$file.partial" "$file"

echo "Saved $file ($(du -h "$file" | cut -f1))"
