# Domain logic

The business rules of Lift Tracker live in six modules. Apart from two small exceptions (noted below), they're **plain functions**: they take lists of model objects, return schema objects, and know nothing about HTTP. That makes them easy to read, test and reuse.

| Module | Rules it owns |
| --- | --- |
| [`names.py`](#namespy) | How names are cleaned and matched case-insensitively |
| [`metadata.py`](#metadatapy) | Shared list / create / rename / archive behaviour for gyms, muscle groups, lifts, machines |
| [`records.py`](#recordspy) | Records per weight, recency order, Epley est. 1RM, progress points, "new best" check |
| [`calendar.py`](#calendarpy) | Which sets were PRs (history replay), per-day activity |
| [`insights.py`](#insightspy) | Plateaued lifts |
| [`today.py`](#todaypy) | The Today page: usual lifts, last session, targets (double progression) |

The vocabulary used here (record, PR, session, plateau…) is defined in the [Domain glossary](../01-overview/domain-glossary.md).

---

## names.py

**File:** [`backend/app/names.py`](../../backend/app/names.py)

### `clean_name(name: str) -> str`
Returns `name.strip()`. This is the display name that gets stored: your casing is kept, surrounding whitespace is removed. (The API's `Name` type already strips input; this is used again by the seed and by `metadata.py` for safety.)

### `find_by_name(session, model, name, **scope) -> model | None`
Finds a row whose name matches **case-insensitively**, whether archived or not.

```python
select(model).where(func.lower(func.trim(model.name)) == func.lower(clean_name(name)))
# plus, for each scope keyword: .where(model.<column> == value)
```

- The SQL expression mirrors the unique indexes (`lower(trim(name))`) exactly. Keep them in sync.
- `scope` narrows the search the same way the index does:
  - `find_by_name(session, Lift, "Curl", muscle_group_id=4)`
  - `find_by_name(session, Machine, "Barbell", gym_id=1)`
  - no scope for gyms and muscle groups.
- Used by `metadata.create_or_restore`, `metadata.update_item` and the seed script.

---

## metadata.py

**File:** [`backend/app/metadata.py`](../../backend/app/metadata.py)
Shared behaviour for the four metadata tables. This module (with `routers/split.py`) is the only place outside routers that raises `HTTPException`.

### `get_or_404(session, model, item_id)`
`session.get(model, item_id)`. If it's missing, raises **404** with `detail = "<ModelName> <id> not found"` (e.g. `"Lift 999 not found"`). Works for any table, and is used for ids from both the URL **and** the request body.

### `list_items(session, model, include_archived, **filters)`
- Orders by `id` (creation order).
- Excludes archived rows unless `include_archived` is true.
- Adds `where column == value` for each filter whose value **isn't None**, so `gym_id=None` means "all gyms".

### `create_or_restore(session, model, name, **scope) -> (item, created)`
The idempotent create:

```mermaid
flowchart TD
    A["find_by_name(name, scope)"] --> B{"found?"}
    B -- "no" --> C["insert model(name=clean_name(name), **scope)<br/>commit, refresh"]
    C --> D["return (item, True) → HTTP 201"]
    B -- "yes" --> E{"archived?"}
    E -- "yes" --> F["archived = False<br/>commit, refresh"]
    E -- "no" --> G["leave as is"]
    F --> H["return (existing, False) → HTTP 200"]
    G --> H
```

The existing item's **stored name is kept**: creating `"  cHEST "` when `"Chest"` exists returns `"Chest"`.

### `update_item(session, item, changes: MetadataUpdate, **scope)`
Rename and/or archive:
- **Rename** (`changes.name` not None): looks for a clash with `find_by_name(..., **scope)`. If another item (`clash.id != item.id`) already has that name, it raises **409** with `"'<name>' is already used by another item (id N)"` (or "…by an archived item…"). Otherwise it stores `clean_name(changes.name)`. Renaming an item to a different casing of its own name is allowed.
- **Archive** (`changes.archived` not None): sets the flag.
- Then commits, refreshes and returns the item.

The scope passed by routers: lifts use `muscle_group_id=lift.muscle_group_id`, machines use `gym_id=machine.gym_id`, muscle groups pass no scope.

---

## records.py

**File:** [`backend/app/records.py`](../../backend/app/records.py)
Everything behind the lift page.

### `estimated_one_rep_max(weight, reps, unit) -> float | None`
The Epley formula with exact decimal arithmetic:

```python
raw = Decimal(weight) * (1 + Decimal(reps) / 30)
halves = (raw * 2).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
return float(halves / 2)          # nearest 0.5, ties round up
```

It returns `None` for `plates`. Examples: 185 × 5 → 216.0, 100 × 1 → 103.5, 72.5 × 9 → 94.5 (94.25 rounds **up**).

### `recency_key(set) -> (bool, date, int)`
The **one** definition of "most recent" used across the backend:

```python
(performed_on is not None, performed_on or date.min, id)
```

Sorting ascending goes oldest to newest. Undated sets sort before every dated set, and ties fall back to `id` (entry order). `reverse=True` gives newest first.

### `best_set_per_weight(sets) -> list[set]`
For sets of **one unit**, keeps one set per distinct `weight_value`: the one with the most reps, comparing `(reps, recency_key)` so **ties go to the more recent set**. Returns them sorted heaviest first. `Decimal` keys mean `185` and `185.00` are the same weight.

### `chart_value(set) -> float`
What the progress chart plots: `estimated_one_rep_max(...)`, or for plates the weight itself.

### `progress_points(sets) -> list[ProgressPoint]`
For sets of one unit: groups **dated** sets by `performed_on` and keeps each day's set with the highest `chart_value` (the first one wins a tie). Returns one point per day, oldest first. Undated sets are skipped.

### `to_record_row(set) -> RecordRow`
Converts a set to a `RecordRow`, adding `estimated_1rm`.

### `build_lift_records(lift, sets, machines_by_id) -> LiftRecords`
The heart of `GET /lifts/{id}/records`:

```mermaid
flowchart TD
    A["All sets for the lift"] --> B["Group by machine_id<br/>(None = 'No machine')"]
    B --> C["Each group: history = sorted newest first<br/>(recency_key, reverse)"]
    C --> D["Split history by unit<br/>(dict insertion order = most recently used unit first)"]
    D --> E["records = best_set_per_weight → to_record_row<br/>(heaviest first, with est. 1RM)"]
    D --> F["progress = progress_points<br/>(one point per dated day)"]
    C --> G["history → SetRead list"]
    E & F & G --> H["MachineRecords(machine, last_performed_on = history[0].performed_on)"]
    H --> I["Sort groups by recency_key of their newest set, newest first"]
    I --> J["LiftRecords(lift, machine_groups)"]
```

Notes:
- `machines_by_id` must contain every machine referenced by the sets. The router loads them, **including archived ones**, which then appear with `archived: true`.
- `last_performed_on` is the newest set's date, which is `null` if every set in the group is undated.
- A lift with no sets returns `machine_groups: []`.

### `previous_best_reps(session, lift_id, machine_id, unit, weight) -> int | None`
The one function here that queries the database: `SELECT max(reps)` over sets with the same lift, unit and exact weight, and the same machine using `IS NOT DISTINCT FROM`, so `NULL` matches `NULL`. `POST /sets` calls it **before** inserting:

```python
is_new_record = previous_best is None or body.reps > previous_best
```

It considers **every** existing set regardless of date. That's why it can occasionally disagree with the calendar's date-ordered PR replay for backdated entries.

---

## calendar.py

**File:** [`backend/app/calendar.py`](../../backend/app/calendar.py)

### `find_pr_set_ids(sets) -> set[int]`
Replays the whole history in `recency_key` order and records which sets were PRs **when they were done**:

```python
best_reps = {}                                   # (lift, machine, unit, weight) -> reps
for s in sorted(sets, key=recency_key):
    key = (s.lift_id, s.machine_id, s.weight_unit, s.weight_value)
    if key not in best_reps or s.reps > best_reps[key]:
        pr_ids.add(s.id); best_reps[key] = s.reps
```

Worked example (Bench, Barbell, lbs, 185):

| Order | Date | Reps | Best so far | PR? |
| --- | --- | --- | --- | --- |
| 1 | (undated) | 3 | — | ✅ first at weight |
| 2 | Sep 01 | 4 | 3 | ✅ beat 3 |
| 3 | Sep 08 | 4 | 4 | ❌ tie |
| 4 | Sep 15 | 6 | 4 | ✅ beat 4 |
| 5 | Sep 15 (entered later) | 5 | 6 | ❌ |

Used by `build_calendar` and by `insights.plateaued_lift_ids`.

### `build_calendar(sets, lifts_by_id, machines_by_id) -> list[CalendarDay]`
1. Computes `pr_ids` over **all** sets (undated ones included, as earliest history).
2. Groups **dated** sets by date. Undated sets are left out of the output.
3. For each date, **newest date first**:
   - groups the day's sets by lift, in order of **first set id** (so lifts appear in the order you trained them),
   - keeps each lift's sets in id order,
   - returns `set_count`, `pr_count` and the nested `lifts`.

### `to_calendar_set(set, machines_by_id, pr_ids) -> CalendarSet`
Flattens a set for the calendar: machine **name** (not id; `None` for no machine) and the `is_pr` flag.

---

## insights.py

**File:** [`backend/app/insights.py`](../../backend/app/insights.py)

`PLATEAU_WINDOW_DAYS = 21` means "the last 3 weeks", including today.

### `plateaued_lift_ids(sets, today) -> list[int]`
```text
window = [today - 20 days, today]
trained = lifts with any set dated in the window
had_pr  = lifts with a PR (find_pr_set_ids) dated in the window
return sorted(trained - had_pr)
```

A lift you haven't done in the last 21 days is never plateaued. Example (today = Oct 1):

| Bench sets | In window? | PR? | Result |
| --- | --- | --- | --- |
| Aug 1: 185 × 5 | no | yes | — |
| Sep 20: 185 × 5 | yes | no (tie) | |
| Sep 27: 185 × 4 | yes | no | **plateaued** |

---

## today.py

**File:** [`backend/app/today.py`](../../backend/app/today.py) — everything behind [`GET /today`](../05-api/today.md).

| Constant | Value | Meaning |
| --- | --- | --- |
| `USUAL_WINDOW_DAYS` | `42` | "The last 6 weeks", including today |
| `USUAL_LIFTS_PER_GROUP` | `2` | The user trains two lifts per muscle group |
| `DEFAULT_INCREMENT` | lbs 5, kg 2.5, plates 1 | Weight step when there's no history to learn it from |

### `weight_increment(sets, unit) -> Decimal`
The smallest gap between distinct weights in `sets` (one machine + unit), or `DEFAULT_INCREMENT[unit]` if there's only one weight. Machines and dumbbells go up in fixed steps, so your own history is the best guide.

### `target_for(sets, rep_min, rep_max) -> Target | None`
Double progression, the user's own method. `sets` are the sets **before today** on one machine + unit.

```mermaid
flowchart TD
    A["working weight = heaviest weight<br/>in the most recent session"] --> B{"best reps at it<br/>above rep_max?"}
    B -- "no" --> C["target: working weight x best + 1"]
    B -- "yes" --> D["next = working + weight_increment"]
    D --> E["target: next x max of rep_min and best at next + 1<br/>move_up = true"]
```

Examples with a 6–8 range:

| History (same machine + unit) | Target |
| --- | --- |
| 185 × 6 (Sep 24), 185 × 7 + 175 × 8 (Sep 28) | 185 × **8** (working weight 185, best 7) |
| 50 × 8, then 55 × **9** | **60** × 6, move up (9 > 8; step 5 from 50 → 55) |
| 60 × 6 (old), then 55 × 9 | **60** × 7, move up (beat the old 60 × 6) |
| 20 kg × 13, nothing else, range 8–12 | **22.5 kg** × 8 (default kg step) |

### `usual_lift_ids(lifts, sets_by_lift, today) -> list[int]`
Ranks the group's lifts by **distinct days trained** in the window, then the most recent of those days, then creation order, and returns the top 2. Lifts not trained in the window are never "usual".

### `build_today_lift(...) -> TodayLift`
For one lift: today's sets, then the machine + unit of the most recent set before today. From those sets it builds `last_session` (the latest dated day) and `target_for(...)`.

### `next_training_day(split_days, groups_by_id, today) -> NextTraining | None`
Looks 1–7 days ahead for a weekday with visible groups in the split.

### `build_today(today, sets, lifts, muscle_groups, machines_by_id, split_days, rep_min, rep_max) -> TodayResponse`
Today's split groups (non-archived, creation order). For each: the usual lifts plus anything else done today, then the rest as `other_lifts` (most recently done first). Also the day's totals, using `find_pr_set_ids` for PRs and `plateaued_lift_ids` for the pills.

---

## Performance notes

`GET /calendar` and `GET /insights` load **every set**, and `GET /lifts/{id}/records` loads every set for one lift, then compute in Python. For one person training for years (tens of thousands of sets) that's still fast. If the app ever served many users or huge histories, the natural next steps would be to:

- filter by date range in SQL (`performed_on >= …`) for insights,
- page the calendar by month,
- or materialise PR flags in a column updated on write.
