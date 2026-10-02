# Gyms, muscle groups, lifts and machines

The **metadata** endpoints: the named things you organise your training with. They share the same behaviour:
- creating is idempotent,
- there's no deletion, only archiving,
- names are unique ignoring case and surrounding spaces within a scope.

See [API overview → Conventions](README.md#conventions).

**Code:** [`routers/gyms.py`](../../backend/app/routers/gyms.py), [`routers/muscle_groups.py`](../../backend/app/routers/muscle_groups.py), [`routers/lifts.py`](../../backend/app/routers/lifts.py), [`routers/machines.py`](../../backend/app/routers/machines.py), shared logic in [`metadata.py`](../04-backend/domain-logic.md#metadatapy).

### Shared response fields

Every metadata object has:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | |
| `name` | string | Display name as entered (trimmed) |
| `archived` | boolean | |
| `created_at` | string (ISO 8601 UTC) | |

Lifts add `muscle_group_id`; machines add `gym_id`.

### Shared PATCH body (`MetadataUpdate`)

| Field | Type | Required | Effect |
| --- | --- | --- | --- |
| `name` | string (1–100 after trim) \| null | no | Rename. Omitted or `null` = unchanged. |
| `archived` | boolean \| null | no | `true` archives, `false` unarchives. Omitted or `null` = unchanged. |

---

## Gyms

### List gyms
`GET /api/gyms`

| Query param | Type | Default | Effect |
| --- | --- | --- | --- |
| `include_archived` | boolean | `false` | Include archived gyms |

**Response 200:** array of gyms, creation order.

```json
[
  {"id": 1, "name": "Main gym", "archived": false, "created_at": "2026-10-01T02:23:48.475907Z"}
]
```

**Used by:** the set form, which creates new machines in the **first** gym returned.

### Create a gym
`POST /api/gyms`

| Body field | Type | Required |
| --- | --- | --- |
| `name` | string, 1–100 chars after trimming | yes |

| Status | When |
| --- | --- |
| 201 | Created |
| 200 | A gym with this name (ignoring case/spaces) exists; it's returned and unarchived if needed |
| 422 | Blank or too-long name |

```bash
curl -s -X POST localhost:8000/api/gyms -H 'Content-Type: application/json' -d '{"name": "Hotel gym"}'
```

> There's no `PATCH /gyms` yet. Multi-gym management is a future feature.

---

## Muscle groups

### List muscle groups
`GET /api/muscle-groups`

| Query param | Type | Default | Effect |
| --- | --- | --- | --- |
| `include_archived` | boolean | `false` | Include archived groups |

**Response 200:** array of muscle groups, creation order (this is the Home-screen order, before today's split groups are moved to the top).

```json
[
  {"id": 1, "name": "Chest", "archived": false, "created_at": "2026-10-01T02:23:48.475907Z"},
  {"id": 2, "name": "Back", "archived": false, "created_at": "2026-10-01T02:23:48.475907Z"}
]
```

### Create a muscle group
`POST /api/muscle-groups`

| Body field | Type | Required |
| --- | --- | --- |
| `name` | string, 1–100 chars after trimming | yes |

| Status | When |
| --- | --- |
| 201 | Created |
| 200 | Exists (case/space-insensitive); returned, and unarchived if it was archived |
| 422 | Blank or too-long name |

```bash
curl -s -X POST localhost:8000/api/muscle-groups -H 'Content-Type: application/json' -d '{"name": "  cHEST "}'
# → 200 {"id": 1, "name": "Chest", ...}   (existing item, original name kept)
```

### Update a muscle group
`PATCH /api/muscle-groups/{muscle_group_id}`

Body: [`MetadataUpdate`](#shared-patch-body-metadataupdate).

| Status | When |
| --- | --- |
| 200 | Updated; returns the muscle group |
| 404 | No muscle group with that id |
| 409 | `name` is already used by another muscle group (even an archived one) |
| 422 | Blank or too-long name |

```bash
curl -s -X PATCH localhost:8000/api/muscle-groups/2 -H 'Content-Type: application/json' -d '{"name": "chest"}'
# → 409 {"detail": "'Chest' is already used by another item (id 1)"}

curl -s -X PATCH localhost:8000/api/muscle-groups/7 -H 'Content-Type: application/json' -d '{"archived": true}'
# → 200 {"id": 7, "name": "Abs", "archived": true, ...}
```

Archiving a muscle group hides it from Home. Its lifts and sets are untouched.

---

## Lifts

### List lifts
`GET /api/lifts`

| Query param | Type | Default | Effect |
| --- | --- | --- | --- |
| `muscle_group_id` | integer | — | Only lifts in this muscle group |
| `include_archived` | boolean | `false` | Include archived lifts |

**Response 200:** array of `LiftListItem`, creation order. Each lift includes **`last_performed_on`**: the latest `performed_on` across its sets, or `null` if it has no dated sets.

```json
[
  {
    "id": 1,
    "name": "Bench",
    "archived": false,
    "created_at": "2026-10-01T02:23:48.475907Z",
    "muscle_group_id": 1,
    "last_performed_on": "2026-09-25"
  }
]
```

An unknown `muscle_group_id` returns an empty array, not a 404.

### Create a lift
`POST /api/lifts`

| Body field | Type | Required |
| --- | --- | --- |
| `name` | string, 1–100 chars after trimming | yes |
| `muscle_group_id` | integer | yes |

| Status | When |
| --- | --- |
| 201 | Created; returns a `Lift` (without `last_performed_on`) |
| 200 | A lift with this name exists **in this muscle group**; returned, and unarchived if needed |
| 404 | `muscle_group_id` doesn't exist (`"MuscleGroup 99 not found"`) |
| 422 | Missing field, blank or too-long name |

The same name in a **different** muscle group is a different lift (e.g. *Curl* under Biceps and under Forearms).

### Update a lift
`PATCH /api/lifts/{lift_id}`

Body: [`MetadataUpdate`](#shared-patch-body-metadataupdate). Uniqueness is checked within the lift's muscle group. A lift **can't be moved** to another muscle group.

| Status | When |
| --- | --- |
| 200 | Updated; returns the lift |
| 404 | No lift with that id |
| 409 | Another lift in the same muscle group already uses the name |
| 422 | Blank or too-long name |

Archived lifts disappear from the muscle group list. Their page (`/lifts/{id}`) still works, showing "(archived)" with an **Unarchive** button.

### Lift records
`GET /api/lifts/{lift_id}/records` is documented on its own page: [Lift records](records.md).

---

## Machines

### List machines
`GET /api/machines`

| Query param | Type | Default | Effect |
| --- | --- | --- | --- |
| `gym_id` | integer | — | Only machines in this gym (omit for all gyms) |
| `include_archived` | boolean | `false` | Include archived machines |

**Response 200:** array of machines, creation order.

```json
[
  {"id": 1, "name": "Barbell", "archived": false, "created_at": "2026-10-01T02:23:48.475907Z", "gym_id": 1}
]
```

The set form re-orders this list so machines used recently **for the current lift** come first (client-side).

### Create a machine
`POST /api/machines`

| Body field | Type | Required |
| --- | --- | --- |
| `name` | string, 1–100 chars after trimming | yes |
| `gym_id` | integer | yes |

| Status | When |
| --- | --- |
| 201 | Created |
| 200 | Exists in this gym; returned, and unarchived if needed |
| 404 | `gym_id` doesn't exist |
| 422 | Missing field, blank or too-long name |

This is what the set form's **Add “name”** option calls. Thanks to idempotency, typing an existing machine's name in a different case just selects it.

### Update a machine
`PATCH /api/machines/{machine_id}`

Body: [`MetadataUpdate`](#shared-patch-body-metadataupdate). Uniqueness is checked within the machine's gym.

| Status | When |
| --- | --- |
| 200 | Updated; returns the machine |
| 404 | No machine with that id |
| 409 | Another machine in the same gym already uses the name |
| 422 | Blank or too-long name |

Machines are shared between lifts, so a rename shows up on **every** lift that used the machine. Archiving removes it from the set form's picker, but its sets keep showing on lift pages under a card labelled "(archived)".
