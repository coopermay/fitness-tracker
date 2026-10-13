# Today

**Code:** [`routers/today.py`](../../backend/app/routers/today.py), logic in [`today.py`](../../backend/app/today.py) (see [Domain logic → today.py](../04-backend/domain-logic.md#todaypy))

Everything the **Today** tab shows, in one request: today's split groups, your usual lifts in each, your best set, the goal, and what you've logged so far today.

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
| `machine_id`, `machine_name` | int \| null, string \| null | The machine of your **most recent** set, **counting today**. Everything else on the card is for this machine + that set's unit, so switching machines today switches the whole card. |
| `best` | `TodaySet` \| null | Your **best set** before today on that machine + unit (rule below); `null` the first time on a machine |
| `best_date` | date \| null | When `best` was done |
| `target` | `{weight_value, weight_unit, reps, move_up}` \| null | The **goal**, worked out from `best` (rule below) |
| `sets_today` | `TodaySet[]` | Sets dated today, in entry order |

**`TodaySet`:** `{id, weight_value, weight_unit, reps, approximate, is_pr}`, where `is_pr` uses the [calendar's PR rule](calendar-split-insights.md#calendar).

### Best set and goal

Both use the sets **before today** on the card's machine + unit.

**Best set** ([`records.best_set`](../04-backend/domain-logic.md#best_setsets---set--none)): the highest **estimated 1RM** among sets of **5+ reps** (ties: the most recent). Heavy low-rep sets inflate est. 1RM, hence the 5-rep floor. If no set has 5+ reps, every set counts. For plates (no 1RM): the heaviest weight, then the most reps.

**Goal**, double progression from the best set:
1. Best reps **within** the range (≤ `rep_range_max`): the same weight, **one more rep**. `move_up: false`.
2. **Past** the range (> `rep_range_max`, e.g. 9 with 6–8): the **next weight up**, aiming for one more rep than your best there if you've tried it, and at least `rep_range_min` (6 by default). `move_up: true`.
3. The **next weight** adds the smallest gap between weights you've used on that machine + unit (a 5 lb cable stack gives 5). With only one weight in your history, it's 5 lbs / 2.5 kg / 1 plate.

Both come from sets before today, so they don't move while you're logging.

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
      "best": {"id": 9, "weight_value": 55, "weight_unit": "lbs", "reps": 9, "approximate": false, "is_pr": true},
      "best_date": "2026-09-28",
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
