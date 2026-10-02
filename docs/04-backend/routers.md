# Routers

Each file in [`backend/app/routers/`](../../backend/app/routers/) defines one `APIRouter` for one resource. Routers are deliberately thin: they validate ids, call [domain logic](domain-logic.md), choose status codes and return schemas. Request/response details for every endpoint are in the [API reference](../05-api/README.md); this page documents the **code**.

All routers are mounted under `/api` by [`main.py`](core-modules.md#mainpy).

| File | Prefix | OpenAPI tag | Endpoints | Main helpers used |
| --- | --- | --- | --- | --- |
| [`gyms.py`](#gymspy) | `/gyms` | gyms | GET, POST | `list_items`, `create_or_restore` |
| [`muscle_groups.py`](#muscle_groupspy) | `/muscle-groups` | muscle groups | GET, POST, PATCH | `list_items`, `create_or_restore`, `get_or_404`, `update_item` |
| [`lifts.py`](#liftspy) | `/lifts` | lifts | GET, POST, PATCH, GET records | `create_or_restore`, `get_or_404`, `update_item`, `build_lift_records` |
| [`machines.py`](#machinespy) | `/machines` | machines | GET, POST, PATCH | `list_items`, `create_or_restore`, `get_or_404`, `update_item` |
| [`sets.py`](#setspy) | `/sets` | sets | GET, POST, PATCH, DELETE | `get_or_404`, `previous_best_reps` |
| [`settings.py`](#settingspy) | `/settings` | settings | GET, PATCH | — |
| [`calendar.py`](#calendarpy) | `/calendar` | calendar | GET | `build_calendar` |
| [`split.py`](#splitpy) | `/split` | split | GET, PUT | `get_or_404` |
| [`insights.py`](#insightspy) | `/insights` | insights | GET | `plateaued_lift_ids`, `overdue_muscle_group_ids` |

### Patterns every router follows
- Every handler takes **`session: SessionDep`**, a database session for the request (see [db.py](core-modules.md#dbpy)).
- **Collection paths are `""`** (e.g. `@router.get("")`), so the URL is `/api/lifts`, not `/api/lifts/`.
- **Idempotent creates** declare `status_code=201` and take `response: Response`. When `create_or_restore` reports the item already existed, they set `response.status_code = 200`.
- **Ids in request bodies** are checked with `get_or_404` before use (e.g. `POST /lifts` checks `muscle_group_id`).
- **`response_model`** is always set, so `/docs` shows exact shapes and extra fields never leak.

---

## gyms.py

| Handler | Route | Behaviour |
| --- | --- | --- |
| `list_gyms(session, include_archived=False)` | `GET /gyms` | `list_items(Gym, include_archived)` |
| `create_gym(body: GymCreate, session, response)` | `POST /gyms` | `create_or_restore(Gym, body.name)` → 201 or 200 |

There's no PATCH for gyms yet: multi-gym management is a future feature.

---

## muscle_groups.py

| Handler | Route | Behaviour |
| --- | --- | --- |
| `list_muscle_groups(session, include_archived=False)` | `GET /muscle-groups` | `list_items(MuscleGroup, include_archived)` |
| `create_muscle_group(body, session, response)` | `POST /muscle-groups` | `create_or_restore(MuscleGroup, body.name)` → 201 or 200 |
| `update_muscle_group(muscle_group_id, body: MetadataUpdate, session)` | `PATCH /muscle-groups/{id}` | `get_or_404`, then `update_item(...)` with no scope (names are global) |

---

## lifts.py

| Handler | Route | Behaviour |
| --- | --- | --- |
| `list_lifts(session, muscle_group_id=None, include_archived=False)` | `GET /lifts` | Custom query (below) adding `last_performed_on` |
| `create_lift(body: LiftCreate, session, response)` | `POST /lifts` | `get_or_404(MuscleGroup, body.muscle_group_id)`, then `create_or_restore(Lift, name, muscle_group_id=…)` |
| `update_lift(lift_id, body, session)` | `PATCH /lifts/{id}` | `update_item(..., muscle_group_id=lift.muscle_group_id)` |
| `get_lift_records(lift_id, session)` | `GET /lifts/{id}/records` | Loads the lift, its sets, and the machines those sets reference, including archived ones, then `build_lift_records` |

### The `list_lifts` query
`list_lifts` doesn't use `list_items` because it adds a computed column:

```python
select(Lift, func.max(WorkoutSet.performed_on))
  .outerjoin(WorkoutSet, WorkoutSet.lift_id == Lift.id)   # lifts with no sets still appear
  .group_by(Lift.id)
  .order_by(Lift.id)
  [.where(Lift.muscle_group_id == …)]
  [.where(Lift.archived == False)]
```

Each `(lift, last_date)` row becomes `LiftListItem(**LiftRead.model_validate(lift).model_dump(), last_performed_on=last_date)`. `max()` ignores NULLs, so undated sets don't count, and a lift with only undated sets has `last_performed_on: null`.

### Loading machines for records
```python
machine_ids = {s.machine_id for s in sets if s.machine_id is not None}
machines = session.exec(select(Machine).where(col(Machine.id).in_(machine_ids)))
```
There's no `archived` filter, so archived machines still label their old sets.

---

## machines.py

| Handler | Route | Behaviour |
| --- | --- | --- |
| `list_machines(session, gym_id=None, include_archived=False)` | `GET /machines` | `list_items(Machine, include_archived, gym_id=gym_id)`. `gym_id=None` lists every gym. |
| `create_machine(body: MachineCreate, session, response)` | `POST /machines` | `get_or_404(Gym, body.gym_id)`, then `create_or_restore(Machine, name, gym_id=…)` |
| `update_machine(machine_id, body, session)` | `PATCH /machines/{id}` | `update_item(..., gym_id=machine.gym_id)` |

---

## sets.py

| Handler | Route | Behaviour |
| --- | --- | --- |
| `list_sets(session, lift_id=None)` | `GET /sets` | Orders by `performed_on DESC NULLS LAST, id DESC`. Optional `lift_id` filter. |
| `create_set(body: SetCreate, session)` | `POST /sets` | Validates `lift_id` and `machine_id` (if given), computes `previous_best_reps` **before** inserting, inserts, returns `SetCreated` with `is_new_record` |
| `update_set(set_id, body: SetUpdate, session)` | `PATCH /sets/{id}` | `changes = body.model_dump(exclude_unset=True)`. Validates a new non-null `machine_id`, `setattr`s each change, commits. `updated_at` is bumped by `onupdate`. |
| `delete_set(set_id, session)` | `DELETE /sets/{id}` | `get_or_404`, then `session.delete`, commit, return an empty `Response(status_code=204)` |

`WorkoutSet(**body.model_dump())` works because `SetCreate`'s field names match the model's columns exactly.

---

## settings.py

| Name | Behaviour |
| --- | --- |
| `SETTINGS_ID = 1` | The single row's id, created by the first migration |
| `get_settings(session)` → `GET /settings` | `session.get(Settings, 1)` |
| `update_settings(body: SettingsUpdate, session)` → `PATCH /settings` | Sets `default_unit`, commits, returns the row |

There's no 404 handling. The row always exists unless someone deletes it by hand.

---

## calendar.py

| Handler | Route | Behaviour |
| --- | --- | --- |
| `get_calendar(session)` | `GET /calendar` | Loads **all** sets, all lifts (by id) and all machines (by id), including archived ones, then `build_calendar` |

---

## split.py

| Name | Behaviour |
| --- | --- |
| `read_split(session) -> SplitBody` | Starts with `{0: [], …, 6: []}`, fills it from `split_days` ordered by `(weekday, muscle_group_id)`, and returns all 7 days, Monday first. |
| `get_split(session)` → `GET /split` | `read_split` |
| `replace_split(body: SplitBody, session)` → `PUT /split` | 1. Rejects repeated weekdays with **422** (`"Each weekday may appear only once"`). 2. `get_or_404(MuscleGroup, id)` for every distinct id, so an unknown id returns **404** before anything changes. 3. `DELETE FROM split_days`. 4. Inserts one row per `(weekday, muscle_group_id)`, de-duplicating ids within a day. 5. Commits once and returns `read_split`. |

Weekday range (0–6) is validated by the `SplitDayBody` schema (`ge=0, le=6`) before the handler runs.

---

## insights.py

| Handler | Route | Behaviour |
| --- | --- | --- |
| `get_insights(session, today: date \| None = None)` | `GET /insights` | `today = today or date.today()`. Loads all sets, all lifts and all split rows, then returns `Insights(plateaued_lift_ids=…, overdue_muscle_group_ids=…)` |

The frontend always passes `today` from the phone. The server-date fallback exists for manual use (e.g. in `/docs`).
