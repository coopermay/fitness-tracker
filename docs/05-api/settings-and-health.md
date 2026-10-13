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

App-wide settings, stored as a single database row: the default unit and the theme. (When users are added, this becomes one row per user.)

### The settings object

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `default_unit` | `"lbs"` \| `"kg"` \| `"plates"` | `"lbs"` | The unit preselected the **first** time you log a lift on a machine. After that, the form uses the unit you last used on that lift + machine. |
| `theme_base` | `"system"` \| `"light"` \| `"dark"` \| `"black"` \| `"navy"` | `"system"` | Background colours. `system` follows the phone's light/dark setting. |
| `theme_accent` | `"blue"` \| `"green"` \| `"purple"` \| `"orange"` \| `"red"` \| `"pink"` \| `"teal"` \| `"gold"` | `"blue"` | Accent colour (buttons, highlights, calendar) |

### Read settings
`GET /api/settings`

**Response 200:**
```json
{"default_unit": "lbs", "theme_base": "system", "theme_accent": "blue"}
```

### Update settings
`PATCH /api/settings`

Send only the fields to change; the others are left alone. None of them can be `null`.

| Body field | Type | Required |
| --- | --- | --- |
| `default_unit` | as above | no |
| `theme_base` | as above | no |
| `theme_accent` | as above | no |

| Status | When |
| --- | --- |
| 200 | Saved; returns the settings |
| 422 | An unknown value, or `null` |

```bash
curl -s -X PATCH localhost:8000/api/settings -H 'Content-Type: application/json' -d '{"theme_accent": "teal"}'
# {"default_unit": "lbs", "theme_base": "system", "theme_accent": "teal"}
```

**UI:** Settings → *Default unit*, and Settings → *Change theme*. Tapping saves immediately. The frontend updates its cache optimistically before the response arrives, then writes the response in (`setQueryData`) rather than refetching.

> Adding another setting means adding a column to the `settings` table (with a migration), a field to `SettingsRead`/`SettingsUpdate` in `schemas.py`, and to `Settings` in `frontend/src/api/types.ts`. Give the new `SettingsUpdate` field a default of `None` so it stays optional; the router applies only the fields sent (`exclude_unset`).
