# Calendar, weekly split and insights

The endpoints behind the Calendar tab, the weekly split in Settings, and the plateau/overdue flags.

**Code:** [`routers/calendar.py`](../../backend/app/routers/calendar.py), [`routers/split.py`](../../backend/app/routers/split.py), [`routers/insights.py`](../../backend/app/routers/insights.py), logic in [`calendar.py`](../04-backend/domain-logic.md#calendarpy) and [`insights.py`](../04-backend/domain-logic.md#insightspy)

---

## Calendar
`GET /api/calendar`

Every **date** that has at least one set, **newest first**, with the sets grouped by lift and each set marked as a PR or not. There are no parameters; it returns your whole history.

### Response 200: `CalendarDay[]`

| Field | Type | Meaning |
| --- | --- | --- |
| `date` | `"YYYY-MM-DD"` | The day |
| `set_count` | integer | Sets logged that day (drives the square's colour) |
| `pr_count` | integer | How many of them were PRs |
| `lifts` | `CalendarLift[]` | Lifts trained, in the order you **first** trained them that day |

**`CalendarLift`**

| Field | Type | Meaning |
| --- | --- | --- |
| `lift_id` | integer | Links to `/lifts/{id}` |
| `lift_name` | string | Includes archived lifts |
| `sets` | `CalendarSet[]` | That lift's sets that day, in entry order |

**`CalendarSet`**

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | Set id |
| `machine_name` | string \| null | `null` = no machine |
| `weight_value`, `weight_unit`, `reps`, `approximate` | | As on a set |
| `is_pr` | boolean | A PR **at the time it was done**: the first at its lift + machine + unit + weight, or more reps there than any earlier set. History is replayed in date order. |

### Rules
- **Undated sets aren't returned** (they can't go on a calendar), but they **do** count as earliest history when deciding `is_pr`.
- Days with no sets aren't in the list. The frontend fills in empty squares.
- Archived lifts and machines are included by name.
- The PR rule matches the "New best" banner, except that it orders by **date** rather than by when you entered the set. See [Domain glossary → PR](../01-overview/domain-glossary.md#pr-personal-record-in-the-calendar-and-insights).

### Example (seed data, 2026-09-25)

```json
[
  {
    "date": "2026-09-25",
    "set_count": 4,
    "pr_count": 4,
    "lifts": [
      {
        "lift_id": 1,
        "lift_name": "Bench",
        "sets": [
          {"id": 1, "machine_name": "Barbell", "weight_value": 185.0, "weight_unit": "lbs", "reps": 5, "approximate": false, "is_pr": true},
          {"id": 3, "machine_name": "Barbell", "weight_value": 175.0, "weight_unit": "lbs", "reps": 6, "approximate": false, "is_pr": true}
        ]
      },
      {
        "lift_id": 3,
        "lift_name": "Lat pulldown",
        "sets": [
          {"id": 13, "machine_name": "Power tower - dual pulley", "weight_value": 80.0, "weight_unit": "lbs", "reps": 9, "approximate": false, "is_pr": true},
          {"id": 14, "machine_name": "Power tower - dual pulley", "weight_value": 72.5, "weight_unit": "lbs", "reps": 9, "approximate": false, "is_pr": true}
        ]
      }
    ]
  }
]
```

---

## Weekly split

The split says which muscle groups you train on which weekday. **Weekdays are numbered 0 = Monday … 6 = Sunday.** A day with no muscle groups is a rest day.

### Body / response shape (`SplitBody`)

```json
{
  "days": [
    {"weekday": 0, "muscle_group_ids": [1, 5]},
    {"weekday": 1, "muscle_group_ids": []},
    {"weekday": 2, "muscle_group_ids": [2]}
  ]
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `days[].weekday` | integer | 0–6 (422 otherwise); each weekday at most once per request (422 otherwise) |
| `days[].muscle_group_ids` | integer[] | Must exist (404 otherwise); duplicates within a day are ignored; `[]` = rest day |

### Get the weekly split
`GET /api/split`

**Response 200:** always **all 7 days**, Monday first. Ids are sorted ascending within a day. It may include **archived** muscle groups; the UI ignores ids it can't find among visible groups.

```json
{"days": [
  {"weekday": 0, "muscle_group_ids": []}, {"weekday": 1, "muscle_group_ids": []},
  {"weekday": 2, "muscle_group_ids": []}, {"weekday": 3, "muscle_group_ids": []},
  {"weekday": 4, "muscle_group_ids": []}, {"weekday": 5, "muscle_group_ids": []},
  {"weekday": 6, "muscle_group_ids": []}
]}
```

### Replace the weekly split
`PUT /api/split`

Replaces the **whole** week in one transaction. **Weekdays you leave out become rest days.** The Settings screen always sends all 7.

| Status | When |
| --- | --- |
| 200 | Saved; returns the new split (all 7 days) |
| 404 | A `muscle_group_ids` entry doesn't exist (nothing is changed) |
| 422 | A weekday outside 0–6, or the same weekday listed twice (`"Each weekday may appear only once"`) |

```bash
curl -s -X PUT localhost:8000/api/split -H 'Content-Type: application/json' -d '{
  "days": [{"weekday": 0, "muscle_group_ids": [1, 5]}, {"weekday": 3, "muscle_group_ids": [2]}]
}'
# Monday: Chest + Triceps, Thursday: Back, every other day: rest
```

---

## Insights
`GET /api/insights`

Flags used for badges in the UI.

| Query param | Type | Default | Notes |
| --- | --- | --- | --- |
| `today` | `"YYYY-MM-DD"` | the **server's** date | **Always pass this from the client.** The server runs on UTC, which can already be tomorrow in your timezone. |

### Response 200 (`Insights`)

| Field | Type | Meaning |
| --- | --- | --- |
| `plateaued_lift_ids` | integer[] | Lifts with at least one set dated in the last 28 days (including `today`) and **no PR** among those sets |
| `overdue_muscle_group_ids` | integer[] | Muscle groups with more split days earlier **this week** (Monday up to yesterday) than distinct days trained this week (Monday to today) |

Both lists are sorted ascending. They may contain archived ids; the UI only shows badges on visible items.

```bash
curl -s "localhost:8000/api/insights?today=2026-10-01"
```
```json
{"plateaued_lift_ids": [], "overdue_muscle_group_ids": [3, 4]}
```

### Rules in brief
- **Plateau:** a lift you haven't trained in 28 days is never flagged. Any PR in the window clears it. The PR rule is the calendar's.
- **Overdue:** training a group on any day this week counts toward its scheduled days. Today's scheduled groups are never overdue yet. Last week doesn't count. A group scheduled twice needs two distinct training days.

Worked examples are in [Domain logic → insights.py](../04-backend/domain-logic.md#insightspy).

**Used by:** Home (OVERDUE labels on tiles) and the muscle group page (Plateau pills on lifts). Logging/editing/deleting a set or saving the split refreshes it.
