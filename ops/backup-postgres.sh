#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/volume1/docker/vassment-one/backup}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-vassment-postgres}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date '+%Y%m%d-%H%M%S')"
TMP="$BACKUP_DIR/.vassment-one-$STAMP.dump.tmp"
OUT="$BACKUP_DIR/vassment-one-$STAMP.dump"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT INT TERM

docker exec "$CONTAINER_NAME" sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$TMP"

test -s "$TMP"
mv "$TMP" "$OUT"
trap - EXIT INT TERM

find "$BACKUP_DIR" -type f -name 'vassment-one-*.dump' -mtime "+$RETENTION_DAYS" -delete

echo "Backup created: $OUT"
