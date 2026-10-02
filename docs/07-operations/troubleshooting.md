# Troubleshooting

Problems that have actually come up while building and running Lift Tracker, and how to fix them. Search this page for the error message you're seeing.

---

## Setup and tooling

### `uv: command not found` after `brew install uv`
On the Intel Mac this project was built on, Homebrew didn't produce a working `uv` (`brew list uv` showed it wasn't installed). Use the official installer:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env        # or open a new terminal
uv --version
```

### `pip: command not found` / should I `pip install` something?
No. This project uses **uv**, never pip. Run things with `uv run …` and add packages with `uv add …` (from `backend/`). Your Python 3.13 install only provides `pip3`, and using it would install into the wrong Python anyway.

### `To use the fastapi command, please install "fastapi[standard]"`
`fastapi dev` needs an extra that isn't installed. Use:
```bash
uv run uvicorn app.main:app --reload
```

### `warning: VIRTUAL_ENV=…/fitness-tracker/.venv does not match the project environment path .venv`
A virtual environment exists at the repo root (created by an editor or `python -m venv`) and is active in your shell. uv ignores it and correctly uses `backend/.venv`. It's harmless. Deactivate it (`deactivate`) or delete the root `.venv` folder.

### `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2`
Printed by pytest. It's harmless; tests still pass. Switching to `httpx2` is a dependency change to make deliberately.

### Port 5432 already in use
Another Postgres (e.g. installed with Homebrew) is running. Stop it (`brew services stop postgresql`), or change the host port in `docker-compose.yml` (e.g. `"5433:5432"`) and set `DATABASE_URL`/`TEST_DATABASE_URL` to match.

---

## Database

### Tests fail with "connection refused"
The `db` container isn't running: `docker compose up -d db`. Tests need Postgres.

### The database looks empty / seed "didn't work"
Check what's actually there:
```bash
docker compose exec db psql -U lifts -d lifts -c "\dt" -c "SELECT count(*) FROM sets"
uv run alembic current
```
- No tables → run `uv run alembic upgrade head`.
- Tables but no sets → run `uv run python -m scripts.seed`.
- The seed says "skipping sets" → the sets table already has rows (by design; see [Seed data](../03-database/seed-data.md#why-sets-are-all-or-nothing)).

### psql seems stuck (prompt shows `lifts-#`)
It's waiting for the end of a statement. Type `;` and Enter, or `\q` to quit.

### An `INSERT` fails with `duplicate key value violates unique constraint "uq_muscle_groups_name"`
Working as intended: a group with that name already exists, ignoring case and spaces. Use the API's create endpoint, which returns the existing item instead.

### `alembic check` reports index changes I didn't make
The four `uq_*_name` expression indexes always show up. That's a known Alembic limitation. See [Migrations → Known false positive](../03-database/migrations.md#known-false-positive-in-alembic-check).

### `type "weight_unit" already exists` during upgrade
A previous downgrade didn't drop the enum. The current migrations do drop it. If you hit this after manual changes: `DROP TYPE weight_unit;` (only when no table uses it), then upgrade again.

---

## Running the app

### `502 Bad Gateway` from `localhost:8080/api/...`
The backend container is still starting (it runs migrations first). Wait a few seconds. If it persists, check `docker compose logs backend` for a migration or connection error.

### Changes made in `/docs` or with curl don't appear in the app
Metadata queries are cached until the app itself changes them (`staleTime: Infinity`). Reload the page.

### My phone can't open the app
- The phone and Mac must be on the **same Wi-Fi**, and the **Mac must be awake** (closing the lid sleeps it and stops Docker).
- Use the **Docker** URL `http://<mac-ip>:8080`, or start Vite with `npm run dev -- --host` and use `:5173`. Vite only accepts connections from the Mac itself by default.
- Find the Mac's IP in *System Settings → Wi-Fi → Details*. It can change; reinstall the home-screen app if it does.
- Away from home it won't work until the app runs on an always-on server with Tailscale (see [Deployment](docker-and-deployment.md#deploying-to-a-home-server)).

### Android doesn't offer "Install app"
That needs HTTPS. Over plain HTTP use *Add to Home screen*, or serve the app over HTTPS with `tailscale serve`.

### "New best!" banner shows again after refreshing
It shouldn't any more: the lift page clears the flash message from history after showing it. If you see it, check `LiftPage.tsx`'s `useEffect` that calls `navigate(…, { replace: true, state: null })`.

### OVERDUE labels look wrong right after midnight, or in another timezone
"Today" comes from the phone. Insights are cached per date (`['insights', today]`) and update when a page re-renders with the new date (navigate or reload). The server's UTC clock isn't used when the app passes `today`.

### A scroll indicator still flashes on iPhone
Scrollbars are hidden with CSS, but iOS Safari may still briefly show its own thin indicator on the main page. Websites can't fully disable it.

---

## Development

### Headless Chrome hangs when taking screenshots
Don't point headless Chrome at the **Vite dev server**: its live-reload websocket keeps `--virtual-time-budget` waiting forever. Use a production build with `npm run build && npx vite preview`. Also:
- macOS has no `timeout` command. Run Chrome in the background and kill it after a delay.
- Headless Chrome won't render windows narrower than about 500px. To check phone widths, screenshot a page containing `<iframe width="360">`, served from the same origin. See [Testing → Headless screenshots](../08-testing/testing.md#headless-chrome-screenshots).

### `npm run build` fails with a type error the editor didn't show
`tsc -b` checks the whole project with strict "unused" rules (`noUnusedLocals`, `noUnusedParameters`). Remove the unused import or variable.

### Lint warning `react(purity): Cannot call impure function during render`
You called `new Date()` (or similar) directly in a component body. Use `todayIsoDate()` or `currentWeekday()`, or add a similar helper. See [Utilities → dates.ts](../06-frontend/utilities.md#datests).

### Lint warning `only-export-components`
A component file exports a non-component function. Move the helper to a plain `.ts` module (as was done with `lastUnitFor` → `records.ts`). Exporting **types** is fine.

### `'FormEvent' is deprecated`
React 19's types deprecate `FormEvent`. Use `SubmitEvent` for form submit handlers (`import { type SubmitEvent } from 'react'`).

### The IDE shows errors right after an edit, but the build passes
The editor checked a file between two edits (e.g. before an import was added). Trust `npm run build`.

### A screen briefly flashes "Not found" after archiving or deleting
That's a sign a mutation is awaiting a refetch that removes the item before navigation. Metadata updates deliberately don't await invalidation, and `EditSetPage` renders nothing while a delete is pending or succeeded. Follow the same patterns for new flows. See [Data layer → Awaited vs not awaited](../06-frontend/data-layer.md#awaited-vs-not-awaited).
