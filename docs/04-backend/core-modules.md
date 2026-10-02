# Core modules

The backbone of the backend: the app object, database connection, table definitions and API schemas.

- [`app/__init__.py` and `app/routers/__init__.py`](#package-markers)
- [`app/main.py`](#mainpy)
- [`app/db.py`](#dbpy)
- [`app/models.py`](#modelspy)
- [`app/schemas.py`](#schemaspy)

---

## Package markers

**Files:** [`backend/app/__init__.py`](../../backend/app/__init__.py), [`backend/app/routers/__init__.py`](../../backend/app/routers/__init__.py)

Both files are empty. Their only job is to make `app` and `app.routers` regular Python packages, so imports like `from app.routers import lifts` work. Python finds `app` because:
- pytest is configured with `pythonpath = ["."]` (`pyproject.toml`),
- Alembic has `prepend_sys_path = .` (`alembic.ini`),
- uvicorn and `python -m scripts.seed` are run from `backend/`.

---

## main.py

**File:** [`backend/app/main.py`](../../backend/app/main.py)
**Role:** creates the FastAPI application and wires every router under `/api`.

| Name | What it is |
| --- | --- |
| `app` | `FastAPI(title="Lift Tracker API")`. uvicorn loads it as `app.main:app`. |
| `api` | `APIRouter(prefix="/api")`, the parent router. Every endpoint lives under `/api` so the frontend (Vite in dev, nginx in Docker) only has to proxy one prefix. |
| `health()` | `GET /api/health` → `{"status": "ok"}`. A liveness check that **doesn't touch the database**. |

Routers are included in this order (the order only affects how `/docs` groups them):

```python
api.include_router(gyms.router)
api.include_router(muscle_groups.router)
api.include_router(lifts.router)
api.include_router(machines.router)
api.include_router(sets.router)
api.include_router(settings.router)
api.include_router(calendar.router)
api.include_router(split.router)
api.include_router(insights.router)
app.include_router(api)
```

**Adding a router:** import the module in the `from app.routers import …` line and add an `api.include_router(...)` call.

There's no CORS middleware, because the browser always reaches the API through a same-origin proxy. See [Design decisions → Same origin](../01-overview/design-decisions.md#17-same-origin-no-cors).

---

## db.py

**File:** [`backend/app/db.py`](../../backend/app/db.py)
**Role:** the single place that knows how to connect to the database.

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | `os.environ.get("DATABASE_URL", "postgresql+psycopg://lifts:lifts@localhost:5432/lifts")`. The default matches `docker-compose.yml`. Docker sets it to `…@db:5432/lifts`. The `postgresql+psycopg` scheme selects the psycopg 3 driver. |
| `engine` | `create_engine(DATABASE_URL)`. A SQLAlchemy engine with a connection pool, created at import time. |
| `get_session()` | Generator dependency: opens `Session(engine)`, yields it for one request, closes it afterwards. |
| `SessionDep` | `Annotated[Session, Depends(get_session)]`. Write `session: SessionDep` in a route signature to get a session. |

**Who uses it:**
- every router (`SessionDep`),
- `migrations/env.py` (`DATABASE_URL`),
- `scripts/seed.py` (`engine`),
- the tests, which replace `get_session` via `app.dependency_overrides` so requests use the test database's session.

---

## models.py

**File:** [`backend/app/models.py`](../../backend/app/models.py)
**Role:** defines every database table as a SQLModel class. These classes are used for queries and inserts. They're **not** the API's request/response shapes; those live in `schemas.py`.

### `WeightUnit(StrEnum)`
Members `lbs`, `kg`, `plates`. As a `StrEnum` it compares equal to its string value (`WeightUnit.lbs == "lbs"`).

### `weight_unit_type`
`SAEnum(WeightUnit, name="weight_unit")`. One shared SQLAlchemy enum type so both `sets.weight_unit` and `settings.default_unit` use the same Postgres type named `weight_unit`.

### `created_at_field()`
A factory returning a fresh `Field(...)` for `created_at`: `timestamptz`, `server_default=func.now()`, `nullable=False`, Python default `None` (the database fills it in). It's a function rather than a shared constant so each table gets its own column object.

### `MetadataBase(SQLModel)`
**Not a table.** The shared columns for the metadata tables:

| Field | Python type | Column |
| --- | --- | --- |
| `id` | `int \| None` | primary key (`None` until inserted) |
| `name` | `str` | `varchar(100)` |
| `archived` | `bool` | `server_default false` |
| `created_at` | `datetime \| None` | see `created_at_field()` |

### Table classes

| Class | Table | Extra fields | Table args |
| --- | --- | --- | --- |
| `Gym(MetadataBase)` | `gyms` | — | `Index("uq_gyms_name", text("lower(trim(name))"), unique=True)` |
| `MuscleGroup(MetadataBase)` | `muscle_groups` | — | `uq_muscle_groups_name` on `lower(trim(name))` |
| `Lift(MetadataBase)` | `lifts` | `muscle_group_id: int` (FK) | `uq_lifts_muscle_group_name` on `(muscle_group_id, lower(trim(name)))` |
| `Machine(MetadataBase)` | `machines` | `gym_id: int` (FK) | `uq_machines_gym_name` on `(gym_id, lower(trim(name)))` |
| `WorkoutSet(SQLModel)` | `sets` | see below | `ck_sets_reps_positive`, `ck_sets_weight_non_negative` |
| `Settings(SQLModel)` | `settings` | `id: int = 1`, `default_unit: WeightUnit` | `ck_settings_single_row` (`id = 1`) |
| `SplitDay(SQLModel)` | `split_days` | `weekday: int` (PK), `muscle_group_id: int` (PK, FK) | `ck_split_days_weekday` (`0..6`) |

### `WorkoutSet` fields

| Field | Python type | Column details |
| --- | --- | --- |
| `id` | `int \| None` | primary key |
| `lift_id` | `int` | FK `lifts.id`, `index=True` |
| `machine_id` | `int \| None` | FK `machines.id`, `index=True`, nullable |
| `weight_value` | `Decimal` | `Numeric(7, 2)` |
| `weight_unit` | `WeightUnit` | `weight_unit_type` |
| `reps` | `int` | |
| `approximate` | `bool` | `server_default false` |
| `performed_on` | `date \| None` | nullable |
| `notes` | `str \| None` | nullable |
| `created_at` | `datetime \| None` | `created_at_field()` |
| `updated_at` | `datetime \| None` | `server_default now()` and `onupdate now()` |

Full column/constraint reference: [Tables](../03-database/tables.md).

> **Changing models** requires a migration. See [Migrations → Writing a new migration](../03-database/migrations.md#writing-a-new-migration).

---

## schemas.py

**File:** [`backend/app/schemas.py`](../../backend/app/schemas.py)
**Role:** Pydantic models for every request body and response. FastAPI uses them to validate input, serialise output, and generate the `/docs` schema.

### Shared types

| Name | Definition | Effect |
| --- | --- | --- |
| `Name` | `Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]` | Trims, then requires 1–100 characters. `"   "` → 422. |
| `Weight` | `Annotated[Decimal, Field(ge=0, max_digits=7, decimal_places=2)]` | 0 ≤ value ≤ 99999.99, at most 2 decimals; parsed exactly. |
| `ReadModel` | `BaseModel` with `ConfigDict(from_attributes=True)` | Lets a response be built straight from an ORM object (`Model.model_validate(orm_obj)`). |

### Metadata schemas

| Schema | Fields | Used as |
| --- | --- | --- |
| `MetadataRead(ReadModel)` | `id`, `name`, `archived`, `created_at` | Base for read models |
| `GymRead` | (same) | `GET/POST /gyms` responses |
| `MuscleGroupRead` | (same) | `GET/POST/PATCH /muscle-groups` responses |
| `LiftRead` | + `muscle_group_id` | `POST/PATCH /lifts` responses; `lift` in records |
| `LiftListItem(LiftRead)` | + `last_performed_on: date \| None` | `GET /lifts` items |
| `MachineRead` | + `gym_id` | `GET/POST/PATCH /machines`; `machine` in records |
| `GymCreate` | `name: Name` | `POST /gyms` body |
| `MuscleGroupCreate` | `name: Name` | `POST /muscle-groups` body |
| `LiftCreate` | `name: Name`, `muscle_group_id: int` | `POST /lifts` body |
| `MachineCreate` | `name: Name`, `gym_id: int` | `POST /machines` body |
| `MetadataUpdate` | `name: Name \| None = None`, `archived: bool \| None = None` | `PATCH` body for muscle groups, lifts, machines. Omitted (or null) fields are unchanged. |

### Set schemas

| Schema | Fields | Used as |
| --- | --- | --- |
| `SetCreate` | `lift_id`, `machine_id: int \| None = None`, `weight_value: Weight`, `weight_unit`, `reps: int (gt=0)`, `approximate = False`, `performed_on: date \| None = None`, `notes: str \| None = None` | `POST /sets` body |
| `SetUpdate` | every `SetCreate` field except `lift_id`, all optional | `PATCH /sets/{id}` body |
| `SetRead(ReadModel)` | all `sets` columns; `weight_value: float` | `GET /sets`, `PATCH` response, `history` in records |
| `SetCreated(SetRead)` | + `is_new_record: bool` | `POST /sets` response |

**How `SetUpdate` handles nulls.** The handler uses `model_dump(exclude_unset=True)`, so only the fields you send are changed. Fields declared with `| None` (`machine_id`, `performed_on`, `notes`) can be **set to null**. Fields declared without it (`weight_value`, `weight_unit`, `reps`, `approximate`) have a default of `None` that is **never validated**: you can leave them out, but sending `null` explicitly fails validation with a 422. That's a deliberate Pydantic idiom, documented in the class docstring.

### Records schemas

| Schema | Fields |
| --- | --- |
| `RecordRow` | `set_id`, `weight_value: float`, `weight_unit`, `reps`, `approximate`, `performed_on`, `notes`, `estimated_1rm: float \| None` |
| `ProgressPoint` | `date`, `value: float` (est. 1RM, or weight for plates), `weight_value`, `reps`, `approximate` |
| `UnitRecords` | `weight_unit`, `records: list[RecordRow]` (heaviest first), `progress: list[ProgressPoint]` (oldest first) |
| `MachineRecords` | `machine: MachineRead \| None`, `last_performed_on`, `units: list[UnitRecords]`, `history: list[SetRead]` |
| `LiftRecords` | `lift: LiftRead`, `machine_groups: list[MachineRecords]` |

### Calendar schemas

| Schema | Fields |
| --- | --- |
| `CalendarSet` | `id`, `machine_name: str \| None`, `weight_value`, `weight_unit`, `reps`, `approximate`, `is_pr` |
| `CalendarLift` | `lift_id`, `lift_name`, `sets: list[CalendarSet]` (entry order) |
| `CalendarDay` | `date`, `set_count`, `pr_count`, `lifts: list[CalendarLift]` (order first trained) |

### Split, insights, settings schemas

| Schema | Fields |
| --- | --- |
| `SplitDayBody` | `weekday: int (0..6)`, `muscle_group_ids: list[int]` |
| `SplitBody` | `days: list[SplitDayBody]`, used for both the `PUT /split` body and the `GET`/`PUT` response |
| `Insights` | `plateaued_lift_ids: list[int]`, `overdue_muscle_group_ids: list[int]` |
| `SettingsRead(ReadModel)` | `default_unit` |
| `SettingsUpdate` | `default_unit` (required) |

### Why weights change type
Input weights are `Decimal`, so validation is exact and they match `NUMERIC` in the database. Output weights are `float`, so JSON carries plain numbers (`185.0`, `72.5`) rather than strings, which is what Pydantic does with `Decimal` by default. Values have at most 2 decimals, so floats represent them closely enough for display.

The frontend mirrors these shapes in [`frontend/src/api/types.ts`](../06-frontend/data-layer.md#typests).
