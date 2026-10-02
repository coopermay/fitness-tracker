# API overview

Lift Tracker's backend is a JSON REST API. Everything is under **`/api`**. The frontend is its only client today, but the API is deliberately a clean standalone service so a native app could use it later.

This page covers the conventions that apply to every endpoint, then indexes all 23 endpoints. Each area has its own page with full request/response details and real examples.

---

## Basics

| | |
| --- | --- |
| **Base URL (dev)** | `http://localhost:8000/api` (direct), or `http://localhost:5173/api` through Vite |
| **Base URL (Docker)** | `http://<host>:8080/api` through nginx |
| **Format** | JSON in and out (`Content-Type: application/json`) |
| **Authentication** | None. Single user, private network only. |
| **CORS** | Not configured; the browser always uses a same-origin proxy |
| **Interactive docs** | `http://localhost:8000/docs` (Swagger UI), `/redoc`, `/openapi.json` |
| **Versioning** | None yet; the API and frontend ship together |

---

## Conventions

### Status codes

| Code | When |
| --- | --- |
| **200 OK** | Successful read or update. Also an idempotent create that found an **existing** item. |
| **201 Created** | An item was actually created (metadata or a set) |
| **204 No Content** | `DELETE /sets/{id}` succeeded (empty body) |
| **404 Not Found** | An id in the **path or the body** doesn't exist |
| **409 Conflict** | Renaming onto a name that another item in the same scope already uses |
| **422 Unprocessable Entity** | Validation failed: missing/invalid fields, blank name, `reps` ≤ 0, bad unit, weekday out of range, repeated weekday in a split, `null` for a required PATCH field |
| **500** | A bug. Nothing returns 500 by design. |

### Error bodies
FastAPI's standard format: always an object with `detail`.

```json
{"detail": "Lift 999 not found"}
```
```json
{"detail": "'Chest' is already used by another item (id 1)"}
```

Validation errors (422 from FastAPI itself) have a **list** in `detail`:

```json
{"detail": [{"type": "string_too_short", "loc": ["body", "name"],
             "msg": "String should have at least 1 character", "input": "  ",
             "ctx": {"min_length": 1}}]}
```

The frontend shows string `detail`s as-is, and falls back to `"Request failed (HTTP 422)"` for list-style details.

### Names
Every `name` field (gyms, muscle groups, lifts, machines) is trimmed and must be **1–100 characters** after trimming. Names are **unique ignoring case and surrounding spaces** within a scope:

| Resource | Scope |
| --- | --- |
| Gym | Whole app |
| Muscle group | Whole app |
| Lift | Its muscle group |
| Machine | Its gym |

### Idempotent create
`POST` on a metadata resource with a name that already exists **in scope**:
- returns the **existing** item with **200** (not 201),
- **unarchives** it if it was archived,
- keeps its original stored name (`"  cHEST "` returns `"Chest"`).

A genuinely new name returns **201**. This makes "type a name and tap Add" safe from duplicates. Clients should treat both 200 and 201 as success.

### Archived items
`GET` on gyms, muscle groups, lifts and machines **excludes archived items** by default. Add `?include_archived=true` to include them. Archived items still appear wherever historical data needs them (records, calendar).

Nothing except sets can be deleted. "Removing" metadata means `PATCH … {"archived": true}`.

### Ordering
| List | Order |
| --- | --- |
| Gyms, muscle groups, lifts, machines | Creation order (`id`) |
| Sets (`GET /sets`) | `performed_on` newest first, undated last, then `id` newest first |
| Records | See [records](records.md#ordering-rules) |
| Calendar days | Newest date first |
| Split days | Monday (0) to Sunday (6) |

### Dates and times
| Field type | Format | Example |
| --- | --- | --- |
| Dates (`performed_on`, `last_performed_on`, calendar `date`) | `YYYY-MM-DD`, no timezone | `"2026-09-25"` |
| Timestamps (`created_at`, `updated_at`) | ISO 8601 UTC | `"2026-10-01T02:23:48.475907Z"` |
| Weekdays (split) | Integer, **0 = Monday … 6 = Sunday** | `3` (Thursday) |

### Weights
- **Request:** a JSON number (or numeric string), ≥ 0, at most 2 decimal places, at most 99999.99. Parsed as an exact decimal.
- **Response:** a JSON number, e.g. `185.0`, `72.5`.
- **Units:** `"lbs"`, `"kg"`, `"plates"` (plates per side). **Never converted.**

### Partial updates (PATCH)
Only the fields you **send** are changed. For sets, nullable fields (`machine_id`, `performed_on`, `notes`) can be cleared by sending `null`. Sending `null` for a required field (e.g. `reps`) is a 422. For metadata, `name: null` or `archived: null` mean "unchanged".

---

## Endpoint index

| Method | Path | Purpose | Success | Docs |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Liveness check | 200 | [settings-and-health](settings-and-health.md#health-check) |
| GET | `/api/gyms` | List gyms | 200 | [metadata](metadata-endpoints.md#list-gyms) |
| POST | `/api/gyms` | Create (or find) a gym | 201 / 200 | [metadata](metadata-endpoints.md#create-a-gym) |
| GET | `/api/muscle-groups` | List muscle groups | 200 | [metadata](metadata-endpoints.md#list-muscle-groups) |
| POST | `/api/muscle-groups` | Create (or find / unarchive) a muscle group | 201 / 200 | [metadata](metadata-endpoints.md#create-a-muscle-group) |
| PATCH | `/api/muscle-groups/{muscle_group_id}` | Rename / archive / unarchive | 200 | [metadata](metadata-endpoints.md#update-a-muscle-group) |
| GET | `/api/lifts` | List lifts with last-performed date | 200 | [metadata](metadata-endpoints.md#list-lifts) |
| POST | `/api/lifts` | Create (or find / unarchive) a lift | 201 / 200 | [metadata](metadata-endpoints.md#create-a-lift) |
| PATCH | `/api/lifts/{lift_id}` | Rename / archive / unarchive | 200 | [metadata](metadata-endpoints.md#update-a-lift) |
| GET | `/api/lifts/{lift_id}/records` | Records, progress and history per machine | 200 | [records](records.md) |
| GET | `/api/machines` | List machines | 200 | [metadata](metadata-endpoints.md#list-machines) |
| POST | `/api/machines` | Create (or find / unarchive) a machine | 201 / 200 | [metadata](metadata-endpoints.md#create-a-machine) |
| PATCH | `/api/machines/{machine_id}` | Rename / archive / unarchive | 200 | [metadata](metadata-endpoints.md#update-a-machine) |
| GET | `/api/sets` | List sets | 200 | [sets](sets.md#list-sets) |
| POST | `/api/sets` | Log a set (+ "new best" flag) | 201 | [sets](sets.md#log-a-set) |
| PATCH | `/api/sets/{set_id}` | Edit a set | 200 | [sets](sets.md#edit-a-set) |
| DELETE | `/api/sets/{set_id}` | Delete a set | 204 | [sets](sets.md#delete-a-set) |
| GET | `/api/calendar` | Per-day activity with PR flags | 200 | [calendar](calendar-split-insights.md#calendar) |
| GET | `/api/split` | The weekly split | 200 | [split](calendar-split-insights.md#get-the-weekly-split) |
| PUT | `/api/split` | Replace the weekly split | 200 | [split](calendar-split-insights.md#replace-the-weekly-split) |
| GET | `/api/insights` | Plateaued lifts, overdue muscle groups | 200 | [insights](calendar-split-insights.md#insights) |
| GET | `/api/settings` | Read settings | 200 | [settings-and-health](settings-and-health.md#read-settings) |
| PATCH | `/api/settings` | Change the default unit | 200 | [settings-and-health](settings-and-health.md#update-settings) |

---

## Which frontend hook calls which endpoint

| Endpoint | Hook (`frontend/src/api/queries.ts`) | Used on |
| --- | --- | --- |
| `GET /muscle-groups` | `useMuscleGroups` | Home, muscle group page, lift page (back label), Settings |
| `POST /muscle-groups` | `useCreateMuscleGroup` | Settings |
| `PATCH /muscle-groups/{id}` | `useUpdateMuscleGroup` | Muscle group page (Edit) |
| `GET /lifts?muscle_group_id=` | `useLifts` | Muscle group page |
| `POST /lifts` | `useCreateLift` | Muscle group page ("+ Add lift") |
| `PATCH /lifts/{id}` | `useUpdateLift` | Lift page (Edit) |
| `GET /lifts/{id}/records` | `useLiftRecords` | Lift page, log set page, edit set page |
| `GET /machines` | `useMachines` | Set form (machine picker) |
| `POST /machines` | `useCreateMachine` | Set form ("Add “name”") |
| `PATCH /machines/{id}` | `useUpdateMachine` | Lift page machine cards (Edit) |
| `GET /gyms` | `useGyms` | Set form (gym for new machines) |
| `POST /sets` | `useCreateSet` | Log set page |
| `PATCH /sets/{id}` | `useUpdateSet` | Edit set page |
| `DELETE /sets/{id}` | `useDeleteSet` | Edit set page |
| `GET /calendar` | `useCalendar` | Calendar |
| `GET /split` | `useSplit` | Home, Settings |
| `PUT /split` | `useUpdateSplit` | Settings (Save split) |
| `GET /insights` | `useInsights` | Home (overdue), muscle group page (plateau) |
| `GET /settings` | `useSettings` | Settings, log set page, edit set page |
| `PATCH /settings` | `useUpdateSettings` | Settings |
| `POST /gyms`, `GET /sets`, `GET /health` | — | Not used by the UI (available for scripts, tooling and future clients) |

---

## Trying endpoints

- **Browser:** `http://localhost:8000/docs`. Expand an endpoint, click *Try it out*, then *Execute*.
- **curl:**
  ```bash
  curl -s localhost:8000/api/muscle-groups
  curl -s -X POST localhost:8000/api/lifts -H 'Content-Type: application/json' \
       -d '{"name": "Incline press", "muscle_group_id": 1}'
  ```
- Writes made outside the app (curl, `/docs`) won't show in an open app until you reload the page, because metadata is cached indefinitely (see [Data layer](../06-frontend/data-layer.md)).
