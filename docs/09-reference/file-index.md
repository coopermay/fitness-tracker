# File index

Every file in the repository: what it is, and where it's documented. Generated folders (`node_modules/`, `dist/`, `.venv/`, `__pycache__/`, `backups/`) aren't in git and aren't listed.

When you add, rename or delete a file, update this page.

---

## Repository root

| File | What it is | Docs |
| --- | --- | --- |
| `README.md` | Project readme: features, how to run, backups, moving to a server, dev setup, API summary | — |
| `docker-compose.yml` | The `db`, `backend` and `frontend` services, and the `pgdata` volume | [Docker and deployment](../07-operations/docker-and-deployment.md#docker-composeyml) |
| `seed_data.json` | Starter training history (1 gym, 8 muscle groups, 12 machines, 18 lifts, 40 sets) | [Seed data](../03-database/seed-data.md) |
| `.gitignore` | Ignores `.DS_Store`, `.env`, `backups/` | [Backups](../07-operations/backups-and-restore.md) |
| `scripts/backup.sh` | `pg_dump` → `backups/lifts-<timestamp>.sql.gz` | [Backups](../07-operations/backups-and-restore.md#taking-a-backup) |
| `scripts/restore.sh` | Restore a backup (asks first; one transaction; `RESTORE_DB`) | [Backups](../07-operations/backups-and-restore.md#restoring-a-backup) |

## docs/ (this wiki)

| File | Topic |
| --- | --- |
| `docs/README.md` | Wiki home and table of contents |
| `docs/01-overview/architecture.md` | System diagrams, request lifecycles, layout, cross-cutting rules |
| `docs/01-overview/domain-glossary.md` | Terms and business rules |
| `docs/01-overview/design-decisions.md` | Decision log |
| `docs/02-getting-started/setup.md` | Prerequisites, first run, ports, env vars, phone access |
| `docs/02-getting-started/development-workflow.md` | Dev loop, recipes, conventions, checks |
| `docs/03-database/README.md` | ER diagram, conventions, psql |
| `docs/03-database/tables.md` | Every table, column, constraint, index |
| `docs/03-database/migrations.md` | Alembic setup and every migration |
| `docs/03-database/seed-data.md` | Seed file format and script |
| `docs/04-backend/README.md` | Module map, request anatomy, transactions |
| `docs/04-backend/core-modules.md` | `main.py`, `db.py`, `models.py`, `schemas.py` |
| `docs/04-backend/domain-logic.md` | `names.py`, `metadata.py`, `records.py`, `calendar.py`, `insights.py` |
| `docs/04-backend/routers.md` | Every router |
| `docs/04-backend/configuration.md` | `pyproject.toml`, `uv.lock`, `alembic.ini`, env |
| `docs/05-api/README.md` | API conventions and endpoint index |
| `docs/05-api/metadata-endpoints.md` | Gyms, muscle groups, lifts, machines |
| `docs/05-api/sets.md` | Sets |
| `docs/05-api/records.md` | Lift records |
| `docs/05-api/calendar-split-insights.md` | Calendar, split, insights |
| `docs/05-api/settings-and-health.md` | Settings, health |
| `docs/06-frontend/README.md` | Frontend architecture, routes, component tree |
| `docs/06-frontend/routing-and-pages.md` | `main.tsx`, `App.tsx`, every page |
| `docs/06-frontend/components.md` | Every component |
| `docs/06-frontend/data-layer.md` | `client.ts`, `types.ts`, `queries.ts`, invalidation |
| `docs/06-frontend/utilities.md` | Helper modules and `useSwipe` |
| `docs/06-frontend/styling.md` | Tokens and CSS modules |
| `docs/06-frontend/pwa-and-assets.md` | `index.html`, manifest, icons |
| `docs/06-frontend/build-and-tooling.md` | npm, Vite, TypeScript, oxlint |
| `docs/07-operations/docker-and-deployment.md` | Compose, Dockerfiles, nginx, deployment, security |
| `docs/07-operations/backups-and-restore.md` | Backup and restore |
| `docs/07-operations/troubleshooting.md` | Known problems and fixes |
| `docs/08-testing/testing.md` | Test suite and manual checks |
| `docs/09-reference/file-index.md` | This page |
| `docs/09-reference/roadmap.md` | Ideas and known limitations |

---

## backend/

| File | What it is | Docs |
| --- | --- | --- |
| `backend/pyproject.toml` | Python project: dependencies, dev group, pytest settings | [Configuration](../04-backend/configuration.md#pyprojecttoml) |
| `backend/uv.lock` | Exact versions of every Python package | [Configuration](../04-backend/configuration.md#uvlock) |
| `backend/.python-version` | `3.12` | [Configuration](../04-backend/configuration.md#python-version) |
| `backend/alembic.ini` | Alembic config (no URL; it comes from `app.db`) | [Configuration](../04-backend/configuration.md#alembicini), [Migrations](../03-database/migrations.md) |
| `backend/Dockerfile` | Backend image: Python 3.12 + uv; migrate then serve | [Docker](../07-operations/docker-and-deployment.md#backend-image) |
| `backend/.dockerignore` | Keeps `.venv` and caches out of the image | [Configuration](../04-backend/configuration.md#ignore-files) |
| `backend/.gitignore` | Ignores `.venv`, caches | [Configuration](../04-backend/configuration.md#ignore-files) |

### backend/app/

| File | What it is | Docs |
| --- | --- | --- |
| `app/__init__.py` | Empty package marker | [Core modules](../04-backend/core-modules.md#package-markers) |
| `app/main.py` | FastAPI app; `/api` router; `/api/health`; includes all routers | [Core modules](../04-backend/core-modules.md#mainpy) |
| `app/db.py` | `DATABASE_URL`, engine, `get_session`, `SessionDep` | [Core modules](../04-backend/core-modules.md#dbpy) |
| `app/models.py` | Table classes: `Gym`, `MuscleGroup`, `Lift`, `Machine`, `WorkoutSet`, `Settings`, `SplitDay`; `WeightUnit` | [Core modules](../04-backend/core-modules.md#modelspy), [Tables](../03-database/tables.md) |
| `app/schemas.py` | Every API request/response model | [Core modules](../04-backend/core-modules.md#schemaspy) |
| `app/names.py` | `clean_name`, `find_by_name` | [Domain logic](../04-backend/domain-logic.md#namespy) |
| `app/metadata.py` | `get_or_404`, `list_items`, `create_or_restore`, `update_item` | [Domain logic](../04-backend/domain-logic.md#metadatapy) |
| `app/records.py` | Epley, `recency_key`, records, progress points, `previous_best_reps` | [Domain logic](../04-backend/domain-logic.md#recordspy) |
| `app/calendar.py` | `find_pr_set_ids`, `build_calendar` | [Domain logic](../04-backend/domain-logic.md#calendarpy) |
| `app/insights.py` | `plateaued_lift_ids`, `overdue_muscle_group_ids` | [Domain logic](../04-backend/domain-logic.md#insightspy) |

### backend/app/routers/

| File | Endpoints | Docs |
| --- | --- | --- |
| `routers/__init__.py` | Empty package marker | [Core modules](../04-backend/core-modules.md#package-markers) |
| `routers/gyms.py` | `GET/POST /gyms` | [Routers](../04-backend/routers.md#gymspy), [API](../05-api/metadata-endpoints.md#gyms) |
| `routers/muscle_groups.py` | `GET/POST /muscle-groups`, `PATCH /muscle-groups/{id}` | [Routers](../04-backend/routers.md#muscle_groupspy), [API](../05-api/metadata-endpoints.md#muscle-groups) |
| `routers/lifts.py` | `GET/POST /lifts`, `PATCH /lifts/{id}`, `GET /lifts/{id}/records` | [Routers](../04-backend/routers.md#liftspy), [API](../05-api/metadata-endpoints.md#lifts), [Records](../05-api/records.md) |
| `routers/machines.py` | `GET/POST /machines`, `PATCH /machines/{id}` | [Routers](../04-backend/routers.md#machinespy), [API](../05-api/metadata-endpoints.md#machines) |
| `routers/sets.py` | `GET/POST /sets`, `PATCH/DELETE /sets/{id}` | [Routers](../04-backend/routers.md#setspy), [API](../05-api/sets.md) |
| `routers/settings.py` | `GET/PATCH /settings` | [Routers](../04-backend/routers.md#settingspy), [API](../05-api/settings-and-health.md) |
| `routers/calendar.py` | `GET /calendar` | [Routers](../04-backend/routers.md#calendarpy), [API](../05-api/calendar-split-insights.md#calendar) |
| `routers/split.py` | `GET/PUT /split` | [Routers](../04-backend/routers.md#splitpy), [API](../05-api/calendar-split-insights.md#weekly-split) |
| `routers/insights.py` | `GET /insights` | [Routers](../04-backend/routers.md#insightspy), [API](../05-api/calendar-split-insights.md#insights) |

### backend/migrations/

| File | What it is | Docs |
| --- | --- | --- |
| `migrations/env.py` | Runs migrations; registers models; picks the URL | [Migrations](../03-database/migrations.md#files) |
| `migrations/script.py.mako` | Template for new migration files (adds `import sqlmodel`) | [Migrations](../03-database/migrations.md#files) |
| `migrations/README` | Alembic's one-line placeholder | [Migrations](../03-database/migrations.md#files) |
| `migrations/versions/0001_initial_schema.py` | All core tables, the enum, the settings row | [Migrations](../03-database/migrations.md#0001_initial_schemapy-revision-ba7a79739cdb) |
| `migrations/versions/0002_split_days.py` | The `split_days` table | [Migrations](../03-database/migrations.md#0002_split_dayspy-revision-0002_split_days) |

### backend/scripts/

| File | What it is | Docs |
| --- | --- | --- |
| `scripts/seed.py` | Idempotent import of `seed_data.json` | [Seed data](../03-database/seed-data.md#how-the-script-works) |

### backend/tests/

| File | Tests | Docs |
| --- | --- | --- |
| `tests/conftest.py` | Fixtures: test DB, migrations, truncation, client | [Testing](../08-testing/testing.md#test-infrastructure-testsconftestpy) |
| `tests/test_health.py` | 1 | [Testing](../08-testing/testing.md#test_healthpy-1) |
| `tests/test_metadata.py` | 15 | [Testing](../08-testing/testing.md#test_metadatapy-15-idempotent-create-archive-rename) |
| `tests/test_records.py` | 19 | [Testing](../08-testing/testing.md#test_recordspy-19-epley-records-new-best-flag-progress) |
| `tests/test_sets.py` | 8 | [Testing](../08-testing/testing.md#test_setspy-8-set-validation-and-settings) |
| `tests/test_calendar.py` | 6 | [Testing](../08-testing/testing.md#test_calendarpy-6) |
| `tests/test_split.py` | 5 | [Testing](../08-testing/testing.md#test_splitpy-5) |
| `tests/test_insights.py` | 7 | [Testing](../08-testing/testing.md#test_insightspy-7) |

---

## frontend/

| File | What it is | Docs |
| --- | --- | --- |
| `frontend/package.json` | npm scripts and dependencies | [Build and tooling](../06-frontend/build-and-tooling.md#packagejson) |
| `frontend/package-lock.json` | Exact npm dependency versions | [Build and tooling](../06-frontend/build-and-tooling.md#package-lockjson) |
| `frontend/vite.config.ts` | React plugin; `/api` proxy to `:8000` | [Build and tooling](../06-frontend/build-and-tooling.md#viteconfigts) |
| `frontend/tsconfig.json` | Project references | [Build and tooling](../06-frontend/build-and-tooling.md#tsconfigjson) |
| `frontend/tsconfig.app.json` | Compiler options for `src/` | [Build and tooling](../06-frontend/build-and-tooling.md#tsconfigappjson) |
| `frontend/tsconfig.node.json` | Compiler options for `vite.config.ts` | [Build and tooling](../06-frontend/build-and-tooling.md#tsconfignodejson) |
| `frontend/.oxlintrc.json` | Lint rules | [Build and tooling](../06-frontend/build-and-tooling.md#oxlintrcjson) |
| `frontend/.gitignore` | Vite template ignores | [Build and tooling](../06-frontend/build-and-tooling.md#ignore-files) |
| `frontend/.dockerignore` | `node_modules`, `dist` | [Build and tooling](../06-frontend/build-and-tooling.md#ignore-files) |
| `frontend/index.html` | HTML shell; PWA and mobile meta tags | [PWA and assets](../06-frontend/pwa-and-assets.md#indexhtml) |
| `frontend/nginx.conf` | Production web server: static files, `/api` proxy, SPA fallback, caching | [Docker](../07-operations/docker-and-deployment.md#nginxconf) |
| `frontend/Dockerfile` | Two-stage build: Node → nginx | [Docker](../07-operations/docker-and-deployment.md#frontend-image) |

### frontend/public/

| File | What it is | Docs |
| --- | --- | --- |
| `public/manifest.webmanifest` | PWA manifest | [PWA](../06-frontend/pwa-and-assets.md#manifestwebmanifest) |
| `public/icon.svg` | Source icon; favicon | [PWA](../06-frontend/pwa-and-assets.md#the-icon) |
| `public/icon-192.png` | 192px app icon | [PWA](../06-frontend/pwa-and-assets.md#public) |
| `public/icon-512.png` | 512px app icon (also maskable) | [PWA](../06-frontend/pwa-and-assets.md#public) |
| `public/apple-touch-icon.png` | 180px iOS icon | [PWA](../06-frontend/pwa-and-assets.md#public) |

### frontend/src/

| File | What it is | Docs |
| --- | --- | --- |
| `src/main.tsx` | Entry: QueryClient (retry rule), providers, StrictMode | [Pages](../06-frontend/routing-and-pages.md#maintsx) |
| `src/App.tsx` | Route table, tab swipe, slide-in, TabBar | [Pages](../06-frontend/routing-and-pages.md#apptsx) |
| `src/App.module.css` | Page wrapper height; slide animations | [Styling](../06-frontend/styling.md#appmodulecss) |
| `src/index.css` | Design tokens (light/dark) and global rules | [Styling](../06-frontend/styling.md#design-tokens-indexcss) |
| `src/api/client.ts` | `fetch` wrapper, `ApiError` | [Data layer](../06-frontend/data-layer.md#clientts) |
| `src/api/types.ts` | TypeScript mirrors of API schemas | [Data layer](../06-frontend/data-layer.md#typests) |
| `src/api/queries.ts` | Query keys, query and mutation hooks | [Data layer](../06-frontend/data-layer.md#queriests) |
| `src/format.ts` | Date/weight/reps formatting; `todayIsoDate` | [Utilities](../06-frontend/utilities.md#formatts) |
| `src/dates.ts` | Local date maths; `currentWeekday` | [Utilities](../06-frontend/utilities.md#datests) |
| `src/calendar.ts` | `buildWeeks`, `heatLevel` | [Utilities](../06-frontend/utilities.md#calendarts) |
| `src/records.ts` | `lastUnitFor` | [Utilities](../06-frontend/utilities.md#recordsts) |
| `src/flash.ts` | Flash message types | [Utilities](../06-frontend/utilities.md#flashts) |
| `src/tabs.ts` | Tab order and slide direction | [Utilities](../06-frontend/utilities.md#tabsts) |
| `src/useSwipe.ts` | Swipe-detection custom hook | [Utilities](../06-frontend/utilities.md#useswipets) |
| `src/bodyRegions.ts` | Muscle group name → body region | [Utilities](../06-frontend/utilities.md#bodyregionsts) |

### frontend/src/pages/

| File | Route | Docs |
| --- | --- | --- |
| `pages/HomePage.tsx` + `.module.css` | `/` | [Pages](../06-frontend/routing-and-pages.md#homepage) |
| `pages/MuscleGroupPage.tsx` + `.module.css` | `/muscle-groups/:id` | [Pages](../06-frontend/routing-and-pages.md#musclegrouppage) |
| `pages/LiftPage.tsx` + `.module.css` | `/lifts/:id` | [Pages](../06-frontend/routing-and-pages.md#liftpage) |
| `pages/LogSetPage.tsx` | `/lifts/:id/log` | [Pages](../06-frontend/routing-and-pages.md#logsetpage) |
| `pages/EditSetPage.tsx` | `/lifts/:id/sets/:setId` | [Pages](../06-frontend/routing-and-pages.md#editsetpage) |
| `pages/FormPage.module.css` | Shared by log/edit pages | [Pages](../06-frontend/routing-and-pages.md#formpagemodulecss) |
| `pages/CalendarPage.tsx` + `.module.css` | `/calendar` | [Pages](../06-frontend/routing-and-pages.md#calendarpage) |
| `pages/SettingsPage.tsx` + `.module.css` | `/settings` | [Pages](../06-frontend/routing-and-pages.md#settingspage) |
| `pages/NotFoundPage.tsx` | `*` | [Pages](../06-frontend/routing-and-pages.md#notfoundpage) |

### frontend/src/components/

| File | What it is | Docs |
| --- | --- | --- |
| `components/AddByName.tsx` + `.module.css` | "+ Add" button → one-field form | [Components](../06-frontend/components.md#addbyname) |
| `components/BackLink.tsx` + `.module.css` | Back pill | [Components](../06-frontend/components.md#backlink) |
| `components/BodyFigure.tsx` + `.module.css` | SVG figure with a highlighted region | [Components](../06-frontend/components.md#bodyfigure) |
| `components/DayDetails.tsx` + `.module.css` | Calendar day panel | [Components](../06-frontend/components.md#daydetails) |
| `components/EditItem.tsx` + `.module.css` | Rename/archive panel | [Components](../06-frontend/components.md#edititem) |
| `components/HistoryList.tsx` + `.module.css` | Set history rows | [Components](../06-frontend/components.md#historylist) |
| `components/MachineCard.tsx` + `.module.css` | Per-machine card | [Components](../06-frontend/components.md#machinecard) |
| `components/MachineCombobox.tsx` + `.module.css` | Machine picker | [Components](../06-frontend/components.md#machinecombobox) |
| `components/ProgressChart.tsx` + `.module.css` | SVG line chart | [Components](../06-frontend/components.md#progresschart) |
| `components/QueryStatus.tsx` | Loading / error line | [Components](../06-frontend/components.md#querystatus) |
| `components/SetForm.tsx` + `.module.css` | Set form | [Components](../06-frontend/components.md#setform) |
| `components/SplitEditor.tsx` + `.module.css` | Weekly split editor | [Components](../06-frontend/components.md#spliteditor) |
| `components/TabBar.tsx` + `.module.css` | Bottom navigation | [Components](../06-frontend/components.md#tabbar) |
