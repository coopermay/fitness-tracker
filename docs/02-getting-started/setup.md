# Setup

Everything you need to get Lift Tracker running on a Mac, for development or just to use it. Deploying to a server is covered in [Docker and deployment](../07-operations/docker-and-deployment.md).

---

## Prerequisites

| Tool | Why | Install |
| --- | --- | --- |
| **Docker Desktop** | Runs Postgres (and optionally the whole app) | Download from docker.com, then open it once |
| **uv** | Installs Python 3.12 and the backend dependencies | `curl -LsSf https://astral.sh/uv/install.sh \| sh`, then open a new terminal |
| **Node.js 20.19+ or 22.12+** | Frontend dev server and build | nodejs.org, or `brew install node` |
| **git** | Source control | Comes with Xcode Command Line Tools |

> **uv on Intel Macs:** `brew install uv` failed to produce a working install on the Intel Mac this project was built on. Use the official installer above. It puts `uv` in `~/.local/bin`; if the command isn't found, run `source $HOME/.local/bin/env` or open a new terminal.

> **Never use `pip`** in this project. `uv` owns the backend's virtual environment (`backend/.venv`). Use `uv run <command>` to run things inside it and `uv add <package>` to add dependencies.

---

## Option A: just use the app (Docker only)

```bash
git clone https://github.com/coopermay/fitness-tracker.git
cd fitness-tracker
docker compose up -d --build
docker compose exec backend uv run --no-sync python -m scripts.seed   # first time only
```

Open **http://localhost:8080**. That's it: migrations run automatically when the backend starts.

---

## Option B: development setup

Development runs the API and the UI directly on your Mac (with live reload), and only Postgres in Docker.

### 1. Start the database

```bash
docker compose up -d db
docker compose ps           # db should show "healthy"
```

### 2. Backend

```bash
cd backend
uv sync                                   # creates .venv, installs Python 3.12 + all dependencies
uv run alembic upgrade head               # create/upgrade the tables
uv run python -m scripts.seed             # load seed_data.json (safe to re-run)
uv run uvicorn app.main:app --reload      # API on http://localhost:8000
```

Check it: open **http://localhost:8000/docs** (FastAPI's interactive API docs) or `curl localhost:8000/api/health` → `{"status":"ok"}`.

> `fastapi dev` is **not** available. It needs the `fastapi[standard]` extra, which isn't installed. `uvicorn … --reload` does the same job.

### 3. Frontend (second terminal)

```bash
cd frontend
npm install
npm run dev                               # UI on http://localhost:5173
```

Vite forwards every `/api/...` request to `localhost:8000`, so keep the API running.

### 4. Run the tests

```bash
cd backend && uv run pytest               # needs the db container; uses a separate lifts_test database
cd frontend && npm run build && npm run lint
```

---

## Ports

| Port | What | Started by |
| --- | --- | --- |
| 5432 | PostgreSQL | `docker compose up -d db` |
| 8000 | FastAPI (dev) | `uv run uvicorn app.main:app --reload` |
| 5173 | Vite dev server | `npm run dev` |
| 8080 | Full app in Docker (nginx) | `docker compose up -d --build` |
| 4173 | `vite preview` of a production build (optional) | `npm run preview` |

If 5432 is taken by a Postgres installed directly on your Mac, stop that one, or change the left-hand port in `docker-compose.yml` and set `DATABASE_URL` to match.

---

## Environment variables

None are required for local development; the defaults match `docker-compose.yml`.

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Backend app, Alembic, seed script | `postgresql+psycopg://lifts:lifts@localhost:5432/lifts` | Which database to use. Docker sets it to `…@db:5432/lifts`. |
| `TEST_DATABASE_URL` | pytest (`tests/conftest.py`) | `postgresql+psycopg://lifts:lifts@localhost:5432/lifts_test` | The test database (created automatically if missing). |
| `RESTORE_DB` | `scripts/restore.sh` | `lifts` | Restore a backup into a different database, e.g. to test a backup. |

---

## Using the app from your phone

Your phone must be on the **same Wi-Fi** as your Mac, and the Mac must be awake. Find the Mac's IP in *System Settings → Wi-Fi → Details* (e.g. `192.168.1.23`).

| Setup | URL on the phone | Notes |
| --- | --- | --- |
| Docker stack running | `http://<mac-ip>:8080` | **Recommended.** It's the production build. |
| Dev servers | `http://<mac-ip>:5173` | Start Vite with `npm run dev -- --host`; by default it only accepts connections from the Mac itself. uvicorn can stay on localhost, because Vite proxies to it. |

To install it as an app:
- **iPhone:** Share → **Add to Home Screen**.
- **Android:** Chrome menu → *Add to Home screen*. The full "Install app" prompt needs HTTPS.

Once the app lives on a home server behind Tailscale, it'll work away from home too. See [Docker and deployment](../07-operations/docker-and-deployment.md#deploying-to-a-home-server).

---

## Starting over

| Goal | Command | Destroys data? |
| --- | --- | --- |
| Stop the app, keep the database | `docker compose stop backend frontend` | No |
| Stop everything | `docker compose down` | No (the `pgdata` volume is kept) |
| Re-run the seed | `uv run python -m scripts.seed` | No (it's idempotent) |
| Roll the schema all the way back and forward | `uv run alembic downgrade base && uv run alembic upgrade head` | **Yes**, every table is dropped |
| Wipe the database completely | `docker compose down -v` | **Yes**, the volume is deleted |

Take a backup first (`scripts/backup.sh`) before anything destructive. See [Backups and restore](../07-operations/backups-and-restore.md).
