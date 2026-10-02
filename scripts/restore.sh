#!/usr/bin/env bash
# Replace everything in the database with a backup made by scripts/backup.sh.
# Usage: scripts/restore.sh backups/lifts-2026-10-01-120000.sql.gz
# Set RESTORE_DB to restore into a different database (e.g. to test a backup).
set -euo pipefail
cd "$(dirname "$0")/.."

file="${1:?Usage: scripts/restore.sh <backup.sql.gz>}"
db="${RESTORE_DB:-lifts}"

read -r -p "This replaces ALL data in database '$db' with $file. Continue? [y/N] " answer
if [[ "$answer" != [yY] ]]; then
  echo "Cancelled."
  exit 1
fi

# One transaction: if anything fails, the database is left as it was.
gunzip -c "$file" \
  | docker compose exec -T db psql -U lifts -d "$db" --quiet -v ON_ERROR_STOP=1 --single-transaction -o /dev/null

echo "Restored $file into '$db'."
