# Sets

Endpoints for logging, editing, listing and deleting individual sets. Sets are the only thing in the app that can be **deleted** outright.

**Code:** [`routers/sets.py`](../../backend/app/routers/sets.py), [`records.previous_best_reps`](../04-backend/domain-logic.md#previous_best_repssession-lift_id-machine_id-unit-weight---int--none)

### The set object (`SetRead`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | |
| `lift_id` | integer | |
| `machine_id` | integer \| null | `null` = "No machine" |
| `weight_value` | number | e.g. `185.0`, `72.5` |
| `weight_unit` | `"lbs"` \| `"kg"` \| `"plates"` | Plates = per side |
| `reps` | integer | > 0 |
| `approximate` | boolean | Shown as `7~` |
| `performed_on` | `"YYYY-MM-DD"` \| null | `null` = unknown date |
| `notes` | string \| null | |
| `created_at` | ISO 8601 UTC | |
| `updated_at` | ISO 8601 UTC | Changes on every edit |

---

## List sets
`GET /api/sets`

| Query param | Type | Default | Effect |
| --- | --- | --- | --- |
| `lift_id` | integer | — | Only this lift's sets |

**Response 200:** array of sets, ordered by `performed_on` **newest first, undated last**, then `id` newest first.

```bash
curl -s "localhost:8000/api/sets?lift_id=1"
```

The UI doesn't use this endpoint; lift pages get history from [records](records.md). It's there for tooling and future clients.

---

## Log a set
`POST /api/sets`

### Body (`SetCreate`)

| Field | Type | Required | Default | Rules |
| --- | --- | --- | --- | --- |
| `lift_id` | integer | yes | — | Must exist (404) |
| `machine_id` | integer \| null | no | `null` | If given, must exist (404) |
| `weight_value` | number | yes | — | ≥ 0, ≤ 99999.99, max 2 decimals |
| `weight_unit` | `"lbs"` \| `"kg"` \| `"plates"` | yes | — | |
| `reps` | integer | yes | — | > 0 |
| `approximate` | boolean | no | `false` | |
| `performed_on` | `"YYYY-MM-DD"` \| null | no | `null` | The UI defaults this to today |
| `notes` | string \| null | no | `null` | |

### Response 201 (`SetCreated`)
The [set object](#the-set-object-setread) plus:

| Field | Type | Meaning |
| --- | --- | --- |
| `is_new_record` | boolean | `true` if no **existing** set on the same lift + machine + unit + weight had at least as many reps, i.e. it's the first at this weight, or more reps than ever. A tie is `false`. |

`is_new_record` is computed **before** the insert, against every set already stored, whatever its date.

### Example

```bash
curl -s -X POST localhost:8000/api/sets -H 'Content-Type: application/json' -d '{
  "lift_id": 1, "machine_id": 1,
  "weight_value": 185, "weight_unit": "lbs",
  "reps": 6, "performed_on": "2026-10-02"
}'
```

```json
{
  "id": 41, "lift_id": 1, "machine_id": 1,
  "weight_value": 185.0, "weight_unit": "lbs", "reps": 6, "approximate": false,
  "performed_on": "2026-10-02", "notes": null,
  "created_at": "2026-10-02T15:04:05.123456Z", "updated_at": "2026-10-02T15:04:05.123456Z",
  "is_new_record": true
}
```

| Status | When |
| --- | --- |
| 201 | Created |
| 404 | `lift_id` or `machine_id` doesn't exist |
| 422 | Missing/invalid field: `reps` ≤ 0, negative weight, too many decimals, unknown unit |

**UI behaviour:** the log page navigates back to the lift and shows **"New best at 185 lbs!"** when `is_new_record` is true, otherwise "Logged 185 lbs × 6".

---

## Edit a set
`PATCH /api/sets/{set_id}`

### Body (`SetUpdate`)
Send **only** the fields you want to change.

| Field | Type | Can be `null`? |
| --- | --- | --- |
| `machine_id` | integer \| null | ✅ clears the machine ("No machine") |
| `weight_value` | number | ❌ 422 |
| `weight_unit` | `"lbs"` \| `"kg"` \| `"plates"` | ❌ 422 |
| `reps` | integer > 0 | ❌ 422 |
| `approximate` | boolean | ❌ 422 |
| `performed_on` | `"YYYY-MM-DD"` \| null | ✅ marks the date unknown |
| `notes` | string \| null | ✅ clears notes |

`lift_id` can't be changed: to move a set to another lift, delete it and log it again. Unknown fields are ignored.

### Response 200
The updated [set object](#the-set-object-setread). There's no `is_new_record` on edits.

```bash
curl -s -X PATCH localhost:8000/api/sets/41 -H 'Content-Type: application/json' \
     -d '{"reps": 7, "approximate": true}'
```

| Status | When |
| --- | --- |
| 200 | Updated |
| 404 | No set with that id, or a new non-null `machine_id` doesn't exist |
| 422 | Invalid value, or `null` for a non-nullable field |

The edit page always sends **every** editable field (the full form), so it's effectively a replace.

---

## Delete a set
`DELETE /api/sets/{set_id}`

| Status | When |
| --- | --- |
| 204 | Deleted (empty body) |
| 404 | No set with that id |

```bash
curl -s -X DELETE -o /dev/null -w "%{http_code}\n" localhost:8000/api/sets/41   # 204
```

Deletion is permanent. The UI asks *"Delete this set? This can't be undone."* first. Records, charts, the calendar and insights all recompute from the remaining sets.
