# Lift records

`GET /api/lifts/{lift_id}/records` is the main view of the app: everything the lift page shows, in one response. For each machine you've used for the lift, it has your best set at every weight (per unit), a progress series for the chart, and the full history.

**Code:** [`routers/lifts.py → get_lift_records`](../04-backend/routers.md#liftspy), algorithm in [`records.build_lift_records`](../04-backend/domain-logic.md#build_lift_recordslift-sets-machines_by_id---liftrecords)

---

## Request

| Part | Name | Type | Notes |
| --- | --- | --- | --- |
| Path | `lift_id` | integer | Archived lifts work too |

| Status | When |
| --- | --- |
| 200 | Always, for an existing lift (a lift with no sets has `machine_groups: []`) |
| 404 | No lift with that id (`{"detail": "Lift 999 not found"}`) |

---

## Response shape (`LiftRecords`)

```text
LiftRecords
├── lift: Lift                         id, name, archived, created_at, muscle_group_id
└── machine_groups: MachineRecords[]   most recently used first
    ├── machine: Machine | null        null = sets with no machine; archived machines included
    ├── last_performed_on: date | null newest set's date (null if all undated)
    ├── units: UnitRecords[]           most recently used unit first
    │   ├── weight_unit                lbs | kg | plates
    │   ├── records: RecordRow[]       one per distinct weight, heaviest first
    │   │   ├── set_id, weight_value, weight_unit, reps, approximate, performed_on, notes
    │   │   └── estimated_1rm: number | null   Epley, nearest 0.5; null for plates
    │   └── progress: ProgressPoint[]  one per dated day, oldest first
    │       └── date, value, weight_value, reps, approximate
    └── history: Set[]                 every set on this machine (all units), newest first, undated last
```

### Field reference

**`MachineRecords`**

| Field | Type | Meaning |
| --- | --- | --- |
| `machine` | Machine \| null | The machine, or `null` for the "No machine" group |
| `last_performed_on` | date \| null | Date of this group's newest set |
| `units` | `UnitRecords[]` | One entry per unit used on this machine for this lift |
| `history` | `Set[]` | All sets in the group (every unit), newest first |

**`UnitRecords`**

| Field | Type | Meaning |
| --- | --- | --- |
| `weight_unit` | string | Which unit this section covers |
| `records` | `RecordRow[]` | Best set at each weight |
| `progress` | `ProgressPoint[]` | Chart series (needs 2+ points to be drawn) |

**`RecordRow`**

| Field | Type | Meaning |
| --- | --- | --- |
| `set_id` | integer | The set holding the record (links to its edit page) |
| `weight_value` | number | The weight |
| `weight_unit` | string | Same as the section's unit |
| `reps` | integer | Most reps at this weight |
| `approximate` | boolean | Whether those reps were approximate |
| `performed_on` | date \| null | When the record was set |
| `notes` | string \| null | The set's notes |
| `estimated_1rm` | number \| null | Epley estimate; `null` for plates |

**`ProgressPoint`**

| Field | Type | Meaning |
| --- | --- | --- |
| `date` | date | The session's date |
| `value` | number | The day's best **est. 1RM** (lbs/kg) or **heaviest weight** (plates) |
| `weight_value`, `reps`, `approximate` | | The set that produced `value` |

---

## Ordering rules

| List | Order | Tie-breaker |
| --- | --- | --- |
| `machine_groups` | By each group's newest set (see [recency order](../01-overview/domain-glossary.md#recency-order)), newest first | — |
| `units` | Most recently used unit first | — |
| `records` | Heaviest weight first | — |
| Which set holds a record | Most reps at that weight | Most recent set |
| `progress` | Oldest date first | Day's best `value`; the first one found wins a tie |
| `history` | Newest first, undated last | Higher id (entered later) first |

---

## Example

Bench (seed data), trimmed to two records and two history rows:

```json
{
  "lift": {
    "id": 1, "name": "Bench", "archived": false,
    "created_at": "2026-10-01T02:23:48.475907Z", "muscle_group_id": 1
  },
  "machine_groups": [
    {
      "machine": {
        "id": 1, "name": "Barbell", "archived": false,
        "created_at": "2026-10-01T02:23:48.475907Z", "gym_id": 1
      },
      "last_performed_on": "2026-09-25",
      "units": [
        {
          "weight_unit": "lbs",
          "records": [
            {"set_id": 1, "weight_value": 185.0, "weight_unit": "lbs", "reps": 5, "approximate": false,
             "performed_on": "2026-09-25", "notes": null, "estimated_1rm": 216.0},
            {"set_id": 3, "weight_value": 175.0, "weight_unit": "lbs", "reps": 6, "approximate": false,
             "performed_on": "2026-09-25", "notes": null, "estimated_1rm": 210.0}
          ],
          "progress": [
            {"date": "2026-09-01", "value": 206.5, "weight_value": 155.0, "reps": 10, "approximate": false},
            {"date": "2026-09-11", "value": 209.5, "weight_value": 185.0, "reps": 4, "approximate": false},
            {"date": "2026-09-25", "value": 216.0, "weight_value": 185.0, "reps": 5, "approximate": false}
          ]
        }
      ],
      "history": [
        {"id": 3, "lift_id": 1, "machine_id": 1, "weight_value": 175.0, "weight_unit": "lbs", "reps": 6,
         "approximate": false, "performed_on": "2026-09-25", "notes": null,
         "created_at": "2026-10-01T02:23:48.475907Z", "updated_at": "2026-10-01T02:23:48.475907Z"},
        {"id": 1, "lift_id": 1, "machine_id": 1, "weight_value": 185.0, "weight_unit": "lbs", "reps": 5,
         "approximate": false, "performed_on": "2026-09-25", "notes": null,
         "created_at": "2026-10-01T02:23:48.475907Z", "updated_at": "2026-10-01T02:23:48.475907Z"}
      ]
    }
  ]
}
```

What this shows:
- **185 lbs** has two sets in history (4 reps on Sep 11, 5 on Sep 25). The record keeps the **5**.
- History lists set 3 before set 1: both are Sep 25, so the later-entered one (higher id) comes first.
- The chart has one point per day. On Sep 25 the best est. 1RM (216 from 185 × 5) beats 175 × 6 (210).

---

## How the frontend uses it

| Part of the response | Where it appears |
| --- | --- |
| `lift.name`, `lift.archived`, `lift.muscle_group_id` | Lift page title, "(archived)", back link |
| `machine_groups[]` | One `MachineCard` each, in order |
| `units[].records` | Rows like `185 lbs × 5 · Sep 25` with `1RM 216` on the right |
| `units[].progress` | `ProgressChart`, if there are 2 or more points |
| `history` | "History (n)" list; each row links to `/lifts/{id}/sets/{setId}` |
| `machine_groups[0].machine` | Log set form's preselected machine |
| `units[0].weight_unit` per machine | Log set form's default unit for that machine (`lastUnitFor`) |
| Machine order | Log set form's machine picker order (used machines first) |
| `history` (by set id) | Edit set page finds the set to edit here (there's no `GET /sets/{id}`) |
