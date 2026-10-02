# Settings and health

**Code:** [`routers/settings.py`](../../backend/app/routers/settings.py), `health()` in [`main.py`](../../backend/app/main.py)

---

## Health check
`GET /api/health`

A liveness check. It returns as soon as the app is running and **doesn't touch the database**, so a 200 here doesn't prove Postgres is reachable.

**Response 200:**
```json
{"status": "ok"}
```

Useful for "is the API up?" checks:
```bash
curl -s localhost:8000/api/health           # dev
curl -s localhost:8080/api/health           # Docker, through nginx
```

Through nginx you'll get a **502 Bad Gateway** for a few seconds after `docker compose up`, while the backend container is still running migrations.

---

## Settings

App-wide settings, stored as a single database row. Today there's one setting.

### The settings object

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `default_unit` | `"lbs"` \| `"kg"` \| `"plates"` | `"lbs"` | The unit preselected the **first** time you log a lift on a machine. After that, the form uses the unit you last used on that lift + machine. |

### Read settings
`GET /api/settings`

**Response 200:**
```json
{"default_unit": "lbs"}
```

### Update settings
`PATCH /api/settings`

| Body field | Type | Required |
| --- | --- | --- |
| `default_unit` | `"lbs"` \| `"kg"` \| `"plates"` | yes |

| Status | When |
| --- | --- |
| 200 | Saved; returns the settings |
| 422 | Missing or unknown unit |

```bash
curl -s -X PATCH localhost:8000/api/settings -H 'Content-Type: application/json' -d '{"default_unit": "kg"}'
# {"default_unit": "kg"}
```

**UI:** Settings → *Default unit* (lbs / kg / plates). Tapping a unit saves immediately. The response is written straight into the frontend cache (`setQueryData`) rather than refetched.

> Adding another setting means adding a column to the `settings` table (with a migration), a field to `SettingsRead`/`SettingsUpdate` in `schemas.py`, and to `Settings` in `frontend/src/api/types.ts`. `SettingsUpdate.default_unit` is currently **required**, so make new fields optional if you want true partial updates.
