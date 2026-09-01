#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "[entrypoint] Secret staging requires root at container start." >&2
  exit 1
fi

run_as="${VASSMENT_RUN_AS:?VASSMENT_RUN_AS is required}"
run_uid="$(id -u "$run_as")"
run_gid="$(id -g "$run_as")"
secret_dir=/run/vassment-private/secrets

umask 077
rm -rf "$secret_dir"
install -d -m 0700 -o "$run_uid" -g "$run_gid" "$secret_dir"

for name in \
  DATABASE_URL \
  ADMIN_PASSWORD_HASH \
  ADMIN_SESSION_SECRET \
  CUSTOMER_PORTAL_SECRET \
  INTEGRATION_WEBHOOK_SECRET \
  AUTOMATION_SECRET \
  TOSS_CLIENT_KEY \
  TOSS_SECRET_KEY
do
  file_var="${name}_FILE"
  source_file="$(printenv "$file_var" 2>/dev/null || true)"
  [ -n "$source_file" ] || continue

  if [ ! -f "$source_file" ]; then
    echo "[entrypoint] Required secret file for $name is unavailable." >&2
    exit 1
  fi

  target_file="$secret_dir/$name"
  cp "$source_file" "$target_file"
  chown "$run_uid:$run_gid" "$target_file"
  chmod 0400 "$target_file"
  export "$file_var=$target_file"
done

exec gosu "$run_as" "$@"
