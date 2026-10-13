# Today

**Code:** [`routers/today.py`](../../backend/app/routers/today.py), logic in [`today.py`](../../backend/app/today.py) (see [Domain logic → today.py](../04-backend/domain-logic.md#todaypy))

Everything the **Today** tab shows, in one request: today's split groups, your usual lifts in each, what you did last time, what to beat, and what you've logged so far today.

---

## Get today

`GET /api/today`

| Query param | Type | Default | Notes |
| --- | --- | --- | --- |
| `today` | `"YYYY-MM-DD"` | the **server's** date | **Always pass this from the client.** The server runs on UTC, which can already be tomorrow in your timezone. |

### Response 200 (`TodayResponse`)

| Field | Type | Meaning |
| --- | --- | --- |
| `date` | date | The `today` used |
| `groups` | `TodayGroup[]` | Today's split groups (non-archived), in creation order. **Empty on a rest day.** |
| `next_training` | `{date, muscle_groups: string[]}` \| null | On a rest day, the next day (within a week) with groups in the split; otherwise `null` |
| `lifts_done` | int | Distinct lifts with a set dated today (any group) |
| `set_count` | int | Sets dated today |
| `pr_count` | int | Of those, how many were PRs (calendar rule) |
| `rep_range_min`, `rep_range_max` | int | The target rep range from [settings](settings-and-health.md#settings) |

**`TodayGroup`**

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `name` | | The muscle group |
| `lifts` | `TodayLift[]` | Your **usual lifts**: up to 2, the ones trained on the most days in the last 6 weeks (ties: most recent, then creation order). Any other lift already done today is added after them. |
| `other_lifts` | `TodayLift[]` | The group's other non-archived lifts, for "Show all": most recently done first, never-done last |

**`TodayLift`**

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `name` | | The lift |
| `plateaued` | bool | Same as [insights](calendar-split-insights.md#insights) |
| `machine_id`, `machine_name` | int \| null, string \| null | The machine of your **most recent** set before today (or today's, if there's nothing earlier) |
| `last_session` | `{date, machine_name, sets: TodaySet[]}` \| null | The latest **dated** day before today on that machine + unit, with all its sets in entry order |
| `target` | `{weight_value, weight_unit, reps, move_up}` \| null | What to beat (rule below); `null` with no history before today |
| `sets_today` | `TodaySet[]` | Sets dated today, in entry order |

**`TodaySet`:** `{id, weight_value, weight_unit, reps, approximate, is_pr}`, where `is_pr` uses the [calendar's PR rule](calendar-split-insights.md#calendar).

### The target rule

Double progression, using the sets **before today** on the lift's most recent machine + unit:

1. The **working weight** is the heaviest weight in your most recent session.
2. If your best reps there are **within** the range (≤ `rep_range_max`): beat it by one rep. `move_up: false`.
3. If you've gone **past** the range (> `rep_range_max`, e.g. 9 with 6–8): the next weight up, aiming for one more rep than your best there if you've tried it, and at least `rep_range_min`. `move_up: true`.
4. The **next weight** is the working weight plus the smallest gap between weights you've used on that machine + unit (so a 5 lb cable stack gives 5). With only one weight in your history, it's 5 lbs / 2.5 kg / 1 plate.

The target is computed from sets before today, so it doesn't move while you're logging.

```bash
curl -s "localhost:8000/api/today?today=2026-10-01"
```
```json
{
  "date": "2026-10-01",
  "groups": [{
    "id": 1, "name": "Chest",
    "lifts": [{
      "id": 2, "name": "Fly", "plateaued": false,
      "machine_id": 2, "machine_name": "Cable",
      "last_session": {"date": "2026-09-28", "machine_name": "Cable",
                       "sets": [{"id": 9, "weight_value": 55, "weight_unit": "lbs", "reps": 9, "approximate": false, "is_pr": true}]},
      "target": {"weight_value": 60, "weight_unit": "lbs", "reps": 6, "move_up": true},
      "sets_today": []
    }],
    "other_lifts": []
  }],
  "next_training": null,
  "lifts_done": 0, "set_count": 0, "pr_count": 0,
  "rep_range_min": 6, "rep_range_max": 8
}
```

**Used by:** the Today tab (`useToday`). Set changes, split saves, rep-range changes, lift/machine/muscle group updates and new lifts refresh it.
