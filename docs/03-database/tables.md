# Tables

Every table, column, constraint and index in the database, with the SQLModel class that defines it and the code that reads or writes it. Relationships are drawn in the [ER diagram](README.md#entity-relationship-diagram).

Source of truth: [`backend/app/models.py`](../../backend/app/models.py) and the migrations in [`backend/migrations/versions/`](../../backend/migrations/versions/).

---

## gyms

A place you train. The seed creates one ("Main gym"). The UI currently assumes a single gym and creates new machines in the first one.

**Model:** `Gym(MetadataBase, table=True)`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `integer` | no | serial | Primary key |
| `name` | `varchar(100)` | no | — | Trimmed display name |
| `archived` | `boolean` | no | `false` | Hidden from `GET /gyms` unless `include_archived=true` |
| `created_at` | `timestamptz` | no | `now()` | |

| Constraint / index | Definition |
| --- | --- |
| `gyms_pkey` | `PRIMARY KEY (id)` |
| `uq_gyms_name` | `UNIQUE INDEX ON gyms (lower(trim(name)))` |

**Referenced by:** `machines.gym_id`
**Written by:** `POST /api/gyms`, the seed script
**Read by:** `GET /api/gyms` (the set form uses it to pick the gym for new machines)

---

## muscle_groups

A top-level category shown as a tile on Home.

**Model:** `MuscleGroup(MetadataBase, table=True)`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `integer` | no | serial | Primary key |
| `name` | `varchar(100)` | no | — | Trimmed display name; unique across the app |
| `archived` | `boolean` | no | `false` | Archived groups disappear from Home |
| `created_at` | `timestamptz` | no | `now()` | |

| Constraint / index | Definition |
| --- | --- |
| `muscle_groups_pkey` | `PRIMARY KEY (id)` |
| `uq_muscle_groups_name` | `UNIQUE INDEX ON muscle_groups (lower(trim(name)))` |

**Referenced by:** `lifts.muscle_group_id`, `split_days.muscle_group_id`
**Written by:** `POST/PATCH /api/muscle-groups`, the seed script
**Read by:** `GET /api/muscle-groups`, `GET /api/insights` (via lifts), `PUT /api/split` (existence check)

Home shows muscle groups in **creation order** (`id`), except that today's split groups move to the top.

---

## lifts

An exercise. Belongs to exactly one muscle group.

**Model:** `Lift(MetadataBase, table=True)` with an extra `muscle_group_id: int`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `integer` | no | serial | Primary key |
| `name` | `varchar(100)` | no | — | Unique **within its muscle group** |
| `archived` | `boolean` | no | `false` | |
| `created_at` | `timestamptz` | no | `now()` | |
| `muscle_group_id` | `integer` | no | — | → `muscle_groups.id` |

| Constraint / index | Definition |
| --- | --- |
| `lifts_pkey` | `PRIMARY KEY (id)` |
| `lifts_muscle_group_id_fkey` | `FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)` |
| `uq_lifts_muscle_group_name` | `UNIQUE INDEX ON lifts (muscle_group_id, lower(trim(name)))` |

**Referenced by:** `sets.lift_id`
**Written by:** `POST/PATCH /api/lifts`, the seed script
**Read by:** `GET /api/lifts` (joined with `sets` for `last_performed_on`), `GET /api/lifts/{id}/records`, `GET /api/calendar` (names), `GET /api/insights` (muscle group of each set)

> There's no API to move a lift to a different muscle group; `PATCH /lifts/{id}` only renames or archives.

---

## machines

A piece of equipment (including Barbell and Dumbbell). Independent of lifts: any lift can use any machine.

**Model:** `Machine(MetadataBase, table=True)` with an extra `gym_id: int`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `integer` | no | serial | Primary key |
| `name` | `varchar(100)` | no | — | Unique **within its gym** |
| `archived` | `boolean` | no | `false` | Archived machines vanish from the picker but stay on lift pages, labelled "(archived)" |
| `created_at` | `timestamptz` | no | `now()` | |
| `gym_id` | `integer` | no | — | → `gyms.id` |

| Constraint / index | Definition |
| --- | --- |
| `machines_pkey` | `PRIMARY KEY (id)` |
| `machines_gym_id_fkey` | `FOREIGN KEY (gym_id) REFERENCES gyms(id)` |
| `uq_machines_gym_name` | `UNIQUE INDEX ON machines (gym_id, lower(trim(name)))` |

**Referenced by:** `sets.machine_id`
**Written by:** `POST/PATCH /api/machines` (including "Add “name”" in the set form's combobox), the seed script
**Read by:** `GET /api/machines`, `GET /api/lifts/{id}/records`, `GET /api/calendar`

---

## sets

The main table: one row per logged set.

**Model:** `WorkoutSet(SQLModel, table=True)`, named so it doesn't clash with Python's built-in `set`.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `integer` | no | serial | Primary key. Also the tie-breaker for "entered later". |
| `lift_id` | `integer` | no | — | → `lifts.id`, indexed |
| `machine_id` | `integer` | **yes** | `NULL` | → `machines.id`, indexed. NULL = "No machine". |
| `weight_value` | `numeric(7,2)` | no | — | Exact decimal, 0–99999.99 |
| `weight_unit` | `weight_unit` enum | no | — | `lbs`, `kg` or `plates` (per side) |
| `reps` | `integer` | no | — | Must be > 0 |
| `approximate` | `boolean` | no | `false` | Shown as `7~` |
| `performed_on` | `date` | **yes** | `NULL` | NULL = unknown date (imported history) |
| `notes` | `varchar` | **yes** | `NULL` | Free text; the form stores blank as NULL |
| `created_at` | `timestamptz` | no | `now()` | |
| `updated_at` | `timestamptz` | no | `now()` | Bumped by SQLAlchemy on every ORM update |

| Constraint / index | Definition |
| --- | --- |
| `sets_pkey` | `PRIMARY KEY (id)` |
| `sets_lift_id_fkey` | `FOREIGN KEY (lift_id) REFERENCES lifts(id)` |
| `sets_machine_id_fkey` | `FOREIGN KEY (machine_id) REFERENCES machines(id)` |
| `ck_sets_reps_positive` | `CHECK (reps > 0)` |
| `ck_sets_weight_non_negative` | `CHECK (weight_value >= 0)` |
| `ix_sets_lift_id` | `INDEX ON sets (lift_id)` |
| `ix_sets_machine_id` | `INDEX ON sets (machine_id)` |

**Written by:** `POST/PATCH/DELETE /api/sets`, the seed script
**Read by:** `GET /api/sets`, `GET /api/lifts` (`max(performed_on)`), `GET /api/lifts/{id}/records`, `GET /api/calendar`, `GET /api/insights`, `POST /api/sets` (`previous_best_reps` before inserting)

**Rules that live in code, not constraints:**
- Records and PRs compare sets only within the same `(lift_id, machine_id, weight_unit, weight_value)`. `machine_id` NULLs compare equal (`IS NOT DISTINCT FROM`).
- "Most recent" ordering: dated before undated, then date, then `id`. See [Domain glossary → Recency order](../01-overview/domain-glossary.md#recency-order).

---

## settings

App-wide settings. **Exactly one row**, with `id = 1`.

**Model:** `Settings(SQLModel, table=True)`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `integer` | no | `1` | Primary key; must be 1 |
| `default_unit` | `weight_unit` enum | no | `'lbs'` | Unit preselected the first time you log a lift + machine |

| Constraint / index | Definition |
| --- | --- |
| `settings_pkey` | `PRIMARY KEY (id)` |
| `ck_settings_single_row` | `CHECK (id = 1)` |

The row is inserted by migration `0001_initial_schema` (`INSERT INTO settings (id) VALUES (1)`). The API reads and updates `id = 1` (`SETTINGS_ID` in `routers/settings.py`).

**Written by:** `PATCH /api/settings`
**Read by:** `GET /api/settings`

---

## split_days

The weekly split: which muscle groups you train on which weekday. One row per (weekday, muscle group) pair. A weekday with no rows is a rest day.

**Model:** `SplitDay(SQLModel, table=True)`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `weekday` | `integer` | no | — | **0 = Monday … 6 = Sunday** (Python `date.weekday()`) |
| `muscle_group_id` | `integer` | no | — | → `muscle_groups.id` |

| Constraint / index | Definition |
| --- | --- |
| `split_days_pkey` | `PRIMARY KEY (weekday, muscle_group_id)`. The composite key stops the same group appearing twice on one day. |
| `split_days_muscle_group_id_fkey` | `FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)` |
| `ck_split_days_weekday` | `CHECK (weekday BETWEEN 0 AND 6)` |

**Written by:** `PUT /api/split`, which deletes **all** rows and inserts the new week in one transaction.
**Read by:** `GET /api/split`, `GET /api/insights` (overdue calculation)

Rows may point at **archived** muscle groups. The API returns them, and the UI ignores ids it can't find among visible muscle groups.

---

## alembic_version

Alembic's bookkeeping: a single row with the revision id the database is at.

| Column | Type | Notes |
| --- | --- | --- |
| `version_num` | `varchar(32)` | Primary key. The current head is `0002_split_days`. |

Never edit it by hand except to recover from a broken migration. See [Migrations](migrations.md).

---

## Enum type: weight_unit

```sql
CREATE TYPE weight_unit AS ENUM ('lbs', 'kg', 'plates');
```

| Value | Meaning | Est. 1RM? |
| --- | --- | --- |
| `lbs` | Pounds, as shown on the machine/bar | Yes |
| `kg` | Kilograms, as shown | Yes |
| `plates` | Number of plates **per side** on a plate-loaded machine | No (null) |

In Python it's `WeightUnit(StrEnum)` (`models.py`); in TypeScript it's `type WeightUnit = 'lbs' | 'kg' | 'plates'` (`api/types.ts`). The migration's downgrade drops the type explicitly (`sa.Enum(name='weight_unit').drop(...)`), because Alembic doesn't drop enum types on its own.
