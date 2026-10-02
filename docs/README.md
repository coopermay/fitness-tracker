# Lift Tracker Wiki

The complete manual for **Lift Tracker**, a personal gym app that records every set you do and shows, for each lift on each machine, the most reps you've done at each weight, so you always know what to beat next.

This wiki covers the whole project: how it's put together, every database table, every API endpoint, every frontend page and component, how to run and deploy it, and why things were built the way they were. Every file in the repository is documented somewhere in here; the [file index](09-reference/file-index.md) maps each one to its page.

---

## Start here

| If you want to… | Read |
| --- | --- |
| Understand the system in 5 minutes | [Architecture](01-overview/architecture.md) |
| Learn the vocabulary (record, PR, est. 1RM, split, overdue…) | [Domain glossary](01-overview/domain-glossary.md) |
| Run the app on your machine | [Setup](02-getting-started/setup.md) |
| Build a new feature end to end | [Development workflow](02-getting-started/development-workflow.md) |
| Call the API | [API overview](05-api/README.md) |
| Find which page documents a file | [File index](09-reference/file-index.md) |
| Fix something that's broken | [Troubleshooting](07-operations/troubleshooting.md) |

---

## Table of contents

### 1. Overview
- [Architecture](01-overview/architecture.md): system diagrams, request lifecycles, repository layout, cross-cutting concerns
- [Domain glossary](01-overview/domain-glossary.md): every term and business rule the app uses
- [Design decisions](01-overview/design-decisions.md): the decision log: what was chosen, and why

### 2. Getting started
- [Setup](02-getting-started/setup.md): prerequisites, first run, ports, environment variables, using it from a phone
- [Development workflow](02-getting-started/development-workflow.md): daily loop, adding features, conventions, quality checks

### 3. Database
- [Database overview](03-database/README.md): ER diagram, conventions, connecting with `psql`
- [Tables](03-database/tables.md): every table, column, constraint and index
- [Migrations](03-database/migrations.md): Alembic setup, every migration, how to write a new one
- [Seed data](03-database/seed-data.md): `seed_data.json` format and the seed script

### 4. Backend
- [Backend overview](04-backend/README.md): module map, layering rules, how a request flows through FastAPI
- [Core modules](04-backend/core-modules.md): `main.py`, `db.py`, `models.py`, `schemas.py`
- [Domain logic](04-backend/domain-logic.md): names, metadata, records, calendar and insights algorithms
- [Routers](04-backend/routers.md): every router file
- [Configuration](04-backend/configuration.md): `pyproject.toml`, `uv.lock`, `alembic.ini`, environment

### 5. API reference
- [API overview](05-api/README.md): conventions, status codes, errors, and an index of all 23 endpoints
- [Gyms, muscle groups, lifts, machines](05-api/metadata-endpoints.md)
- [Sets](05-api/sets.md)
- [Lift records](05-api/records.md)
- [Calendar, weekly split, insights](05-api/calendar-split-insights.md)
- [Settings and health](05-api/settings-and-health.md)

### 6. Frontend
- [Frontend overview](06-frontend/README.md): entry point, providers, route map, component tree, state philosophy
- [Routing and pages](06-frontend/routing-and-pages.md): every page
- [Components](06-frontend/components.md): every shared component
- [Data layer](06-frontend/data-layer.md): API client, TypeScript types, TanStack Query hooks, cache invalidation
- [Utilities](06-frontend/utilities.md): formatting, dates, calendar maths, swipe hook, body regions
- [Styling](06-frontend/styling.md): design tokens, dark mode, CSS modules, mobile rules
- [PWA and assets](06-frontend/pwa-and-assets.md): manifest, icons, installing on a phone
- [Build and tooling](06-frontend/build-and-tooling.md): Vite, TypeScript, oxlint, npm scripts

### 7. Operations
- [Docker and deployment](07-operations/docker-and-deployment.md): Compose stack, Dockerfiles, nginx, home-server deployment
- [Backups and restore](07-operations/backups-and-restore.md)
- [Troubleshooting](07-operations/troubleshooting.md)

### 8. Testing
- [Testing](08-testing/testing.md): strategy, fixtures, every test, manual checks

### 9. Reference
- [File index](09-reference/file-index.md): every file in the repository
- [Roadmap and known limitations](09-reference/roadmap.md)

---

## Reading the diagrams

Diagrams are written in [Mermaid](https://mermaid.js.org/), a text format for diagrams that lives inside the Markdown.

- **On GitHub** they render automatically.
- **In VS Code**, install the *Markdown Preview Mermaid Support* extension, then open the Markdown preview (`Cmd+Shift+V`).

Because diagrams are plain text, you update them the same way you update prose: edit the code block.

---

## Keeping this wiki up to date

The wiki lives next to the code so it can change in the same commit as the code it describes. When you change something, update the matching page:

| You changed… | Update |
| --- | --- |
| A table, column or constraint | [Tables](03-database/tables.md), the ER diagram in [Database overview](03-database/README.md), [Migrations](03-database/migrations.md) |
| An endpoint (path, params, body, response, status codes) | The endpoint's page under [`05-api/`](05-api/README.md) and the endpoint index |
| A business rule (records, PRs, split, insights) | [Domain glossary](01-overview/domain-glossary.md) and [Domain logic](04-backend/domain-logic.md) |
| A page, component, hook or utility | The matching page under [`06-frontend/`](06-frontend/README.md) |
| A query key or what a mutation invalidates | The invalidation matrix in [Data layer](06-frontend/data-layer.md) |
| A design token or global style | [Styling](06-frontend/styling.md) |
| Docker, nginx or scripts | [`07-operations/`](07-operations/docker-and-deployment.md) |
| Added, renamed or deleted a file | [File index](09-reference/file-index.md) |
| Made a significant choice between alternatives | Add an entry to [Design decisions](01-overview/design-decisions.md) |

### Page conventions

- One `#` title per page, then a short paragraph saying what the page covers.
- Link to source files with relative paths (for example `../../backend/app/records.py`) so links work on GitHub and in the editor.
- Avoid line numbers in links; they go stale. Name the function or component instead.
- Show real shapes. API examples on these pages were captured from the running app with the seed data.
- New top-level areas get a new numbered folder; new topics inside an area get a new file, linked from this table of contents.
