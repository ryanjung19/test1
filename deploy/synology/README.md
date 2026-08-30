# Synology DS1821+ deployment

Target: Synology DSM 7.4 / Container Manager / VASSMENT ONE Booking OS.

## Directory layout

Keep application source and persistent data separate.

```text
/volume1/docker/vassment-one/
├─ repo/       # this Git repository checkout / uploaded source
├─ postgres/   # PostgreSQL persistent data
└─ backup/     # pg_dump backups
```

Do not place PostgreSQL data inside the Git checkout.

## 1. Prepare source

Place the repository source in:

```text
/volume1/docker/vassment-one/repo
```

During the current pre-production phase use branch:

```text
feat/vassment-one-booking-v0.1
```

Before production secrets or customer data are introduced, move the source to the dedicated PRIVATE operating repository.

## 2. Create NAS environment file

Copy:

```text
deploy/synology/.env.nas.example
```

to:

```text
deploy/synology/.env
```

Edit every `CHANGE_TO_...` value. Never commit this `.env` file.

For the first LAN test use:

```text
APP_URL=http://192.168.123.103:3100
APP_PORT=3100
```

If PostgreSQL was already initialized in `/volume1/docker/vassment-one/postgres`, reuse the exact `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values from that first initialization. Changing the container environment later does not change the password of an existing PostgreSQL role.

For a new database, use a long URL-safe PostgreSQL password because it is also embedded in `DATABASE_URL`.

Leave Toss keys empty until the sandbox E2E phase.

## 3. Container Manager project

Create or update the existing Container Manager project `vassment-one` using:

```text
deploy/synology/compose.yaml
```

The stack contains:

- `vassment-postgres` — PostgreSQL 17
- `vassment-schema-init` — one-shot guarded initial schema/bootstrap/hardening job
- `vassment-app` — Next.js production application

Persistent PostgreSQL data remains at:

```text
/volume1/docker/vassment-one/postgres
```

The app is exposed on NAS port `3100` for the LAN validation phase. PostgreSQL has no published host port.

## 4. Safe initial database behavior

`vassment-schema-init` checks the production database before applying schema changes.

- Empty database: initial Drizzle schema push is allowed, then bootstrap and hardening SQL run.
- Complete existing VASSMENT ONE schema: destructive schema push is skipped; idempotent bootstrap/hardening run again.
- Partial/ambiguous schema: deployment fails instead of guessing or modifying production data.

This automatic initializer is for the initial v0.1 production baseline only. Future schema changes must be represented by reviewed, committed migration files before deployment.

## 5. Acceptance checks

Container Manager should show:

```text
vassment-postgres     running / healthy
vassment-schema-init  exited successfully (0)
vassment-app          running / healthy
```

From a device on the same LAN or an approved Tailscale path, verify:

```text
http://192.168.123.103:3100/
http://192.168.123.103:3100/reserve
http://192.168.123.103:3100/api/health
```

The health response must be HTTP 200 and include:

```json
{
  "status": "ok",
  "database": true,
  "configuration": "ok"
}
```

Do not proceed to public exposure if `/api/health` is not ready.

## 6. Network policy

Do not publish these services to the Internet:

- DSM 5000/5001
- SMB 445
- PostgreSQL 5432

NAS administration remains over Tailscale / trusted LAN.

The later public path is:

```text
booking.vassment.com
  -> Cloudflare Tunnel
  -> vassment-app:3000 (or NAS port 3100 during transition)
```

After the public hostname is live, change:

```text
APP_URL=https://booking.vassment.com
```

and recreate the app container.

## 7. Backup

`ops/backup-postgres.sh` creates a compressed PostgreSQL custom-format dump and removes dumps older than 14 days by default.

Recommended DSM Task Scheduler command:

```sh
BACKUP_DIR=/volume1/docker/vassment-one/backup RETENTION_DAYS=14 /volume1/docker/vassment-one/repo/ops/backup-postgres.sh
```

Run daily. Also replicate the backup directory to storage outside this NAS. A backup stored only on the same NAS is not sufficient for disaster recovery.

## 8. Release gate after LAN validation

Only after the NAS application and database pass the internal checks:

1. attach Cloudflare Tunnel and `booking.vassment.com`
2. connect Wix VASSMENT ONE booking surface
3. configure HOLD expiry scheduler
4. add Toss test keys and run payment/refund/webhook sandbox E2E
5. connect the existing chatbot endpoint
6. enable monitoring and off-device backup
7. switch Toss to live keys only after all sandbox tests pass
