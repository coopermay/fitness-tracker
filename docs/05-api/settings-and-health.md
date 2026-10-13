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

App-wide settings, stored as a single database row: the default unit, the theme, the target rep range and your body stats. (When users are added, this becomes one row per user.)

### The settings object

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `default_unit` | `"lbs"` \| `"kg"` \| `"plates"` | `"lbs"` | The unit preselected the **first** time you log a lift on a machine. After that, the form uses the unit you last used on that lift + machine. |
| `theme_base` | `"system"` \| `"light"` \| `"dark"` \| `"black"` \| `"navy"` | `"system"` | Background colours. `system` follows the phone's light/dark setting. |
| `rep_range_min` | int, 1–50 | `6` | Bottom of the target rep range on the Today page |
| `rep_range_max` | int, 1–50 | `8` | Top of the range: beat it (e.g. 9 reps) and Today suggests the next weight up. Must be ≥ `rep_range_min`. |
| `sex` | `"male"` \| `"female"` \| null | `null` | For the calorie formula |
| `birth_date` | date \| null | `null` | For your age; between 1900-01-01 and today |
| `height_cm` | number \| null | `null` | 50–275, stored to 0.1 cm |
| `weight_kg` | number \| null | `null` | 20–400, stored to 0.01 kg |
| `activity_level` | `"sedentary"` \| `"light"` \| `"moderate"` \| `"active"` \| `"very_active"` | `"moderate"` | Multiplier for maintenance calories |
| `body_units` | `"imperial"` \| `"metric"` | `"imperial"` | How the Body stats page shows and takes height/weight (always stored metric) |
| `theme_accent` | `"blue"` \| `"green"` \| `"purple"` \| `"orange"` \| `"red"` \| `"pink"` \| `"teal"` \| `"gold"` | `"blue"` | Accent colour (buttons, highlights, calendar) |

### Read settings
`GET /api/settings`

**Response 200:**
```json
{"default_unit": "lbs", "theme_base": "system", "theme_accent": "blue",
 "rep_range_min": 6, "rep_range_max": 8,
 "sex": null, "birth_date": null, "height_cm": null, "weight_kg": null,
 "activity_level": "moderate", "body_units": "imperial"}
```

### Update settings
`PATCH /api/settings`

Send only the fields to change; the others are left alone. `sex`, `birth_date`, `height_cm` and `weight_kg` can be sent as `null` to clear them; the other fields can't be `null`.

| Body field | Type | Required |
| --- | --- | --- |
| `default_unit` | as above | no |
| `theme_base` | as above | no |
| `theme_accent` | as above | no |
| `rep_range_min`, `rep_range_max` | int, 1–50 | no. If you send only one, it's checked against the saved other one. |
| `sex`, `birth_date`, `height_cm`, `weight_kg`, `activity_level`, `body_units` | as above | no |

| Status | When |
| --- | --- |
| 200 | Saved; returns the settings |
| 422 | An unknown value, `null`, a rep count outside 1–50, a range whose min would end up above its max, a height/weight out of range, or a birth date in the future or before 1900 (nothing is saved) |

```bash
curl -s -X PATCH localhost:8000/api/settings -H 'Content-Type: application/json' -d '{"theme_accent": "teal"}'
# {"default_unit": "lbs", "theme_base": "system", "theme_accent": "teal", "rep_range_min": 6, "rep_range_max": 8, ...}
```

**UI:** Settings → *Default unit* and *Target reps*, Settings → *Change theme*, and Settings → *Edit body stats* (whose calculations come from [`GET /body`](body.md)). Tapping saves immediately. The frontend updates its cache optimistically before the response arrives, then writes the response in (`setQueryData`) rather than refetching.

> Adding another setting means adding a column to the `settings` table (with a migration), a field to `SettingsRead`/`SettingsUpdate` in `schemas.py`, and to `Settings` in `frontend/src/api/types.ts`. Give the new `SettingsUpdate` field a default of `None` so it stays optional; the router applies only the fields sent (`exclude_unset`).
