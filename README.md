# fitness-tracker

A personal gym lift tracker. For each lift on each machine it shows the most reps you've done at each weight, so you know what to beat next session.

- Records grouped by machine, with estimated 1RM and full history
- Log, edit and delete sets; "New best!" when you beat a record at a weight
- Weights are recorded exactly as the machine shows them (lbs, kg or plates per side) and never converted
- Mobile-first, installable on your phone's home screen
- Single user, no login. Meant to run at home and be reached over Tailscale

**Stack:** FastAPI, SQLModel, Alembic, PostgreSQL 16 · React, TypeScript, Vite, TanStack Query, React Router · Docker Compose

## Run it (Docker)

Requires Docker.

```bash
docker compose up -d --build
```

Open **http://localhost:8080**, or `http://<computer's IP or Tailscale name>:8080` from your phone. Database migrations run automatically when the backend starts.

First time on an empty database, load the starter data from `seed_data.json`:

```bash
docker compose exec backend uv run --no-sync python -m scripts.seed
```

The seed is safe to run again: it never creates duplicates, and it skips sets if any already exist.

Useful commands:

```bash
docker compose logs -f backend       # API logs
docker compose up -d --build         # after pulling new code
docker compose stop backend frontend # stop the app, keep the database running
docker compose down                  # stop everything (data is kept in the pgdata volume)
```

## Backups

```bash
scripts/backup.sh                                       # -> backups/lifts-YYYY-MM-DD-HHMMSS.sql.gz
scripts/restore.sh backups/lifts-2026-10-01-120000.sql.gz   # replaces ALL data; asks first
```

Both need the `db` container running. `backups/` is git-ignored, so copy backups somewhere safe yourself.

## Moving to another machine (e.g. a home server)

1. On the old machine: `scripts/backup.sh`
2. On the new machine: install Docker, then clone this repo
3. Copy the backup file into the new machine's `backups/` folder
4. Start the database and restore:
   ```bash
   docker compose up -d db
   scripts/restore.sh backups/<your-backup>.sql.gz
   ```
5. Start everything: `docker compose up -d --build`

The containers restart on their own after a reboot, as long as Docker starts at boot.

## Development

Requires Docker, [uv](https://docs.astral.sh/uv/) and Node.js 20.19+.

```bash
docker compose up -d db                       # Postgres on localhost:5432

cd backend
uv sync                                       # install Python 3.12 + dependencies
uv run alembic upgrade head                   # apply migrations
uv run python -m scripts.seed                 # load seed_data.json
uv run uvicorn app.main:app --reload          # API on :8000, interactive docs at /docs
uv run pytest                                 # tests (uses a separate lifts_test database)

cd frontend
npm install
npm run dev                                   # UI on :5173 (add -- --host to reach it from your phone)
npm run lint
```

The Vite dev server forwards `/api` to the API on port 8000. The dev servers and the Docker stack share the same database, so they can run at the same time.

### Layout

```
backend/
  app/            FastAPI app: models, schemas, routers, records logic
  migrations/     Alembic migrations
  scripts/seed.py imports seed_data.json
  tests/
frontend/
  src/api/        API client, types, TanStack Query hooks
  src/pages/      one component per screen
  src/components/ shared UI
  nginx.conf      serves the built app and proxies /api in Docker
scripts/          backup.sh, restore.sh
seed_data.json    starter data
```

### API

All JSON under `/api`. See `http://localhost:8000/docs` for the full, interactive reference.

- `GET/POST /muscle-groups`, `PATCH /muscle-groups/{id}`
- `GET/POST /lifts`, `PATCH /lifts/{id}`, `GET /lifts/{id}/records`
- `GET/POST /machines`, `PATCH /machines/{id}`
- `GET/POST /gyms`
- `GET/POST /sets`, `PATCH/DELETE /sets/{id}`
- `GET/PATCH /settings`
- `GET/PUT /split`: the weekly split (muscle groups per weekday, Monday = 0)
- `GET /calendar`: every day with sets, newest first, with each set marked as a PR or not

Creating a muscle group, lift, machine or gym with a name that already exists (ignoring case and surrounding spaces) returns the existing one instead of a duplicate, and restores it if it was archived. Nothing except sets is ever deleted: it's archived instead, which hides it from lists while keeping its history.
