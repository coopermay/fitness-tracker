# Development workflow

How to work on Lift Tracker day to day: the dev loop, step-by-step recipes for common changes, coding conventions, and the checks to run before committing.

---

## The daily loop

Three terminals:

```bash
# 1. Database (once; it keeps running)
docker compose up -d db

# 2. API with auto-reload
cd backend && uv run uvicorn app.main:app --reload

# 3. UI with hot reload
cd frontend && npm run dev
```

- Edit Python → uvicorn restarts automatically.
- Edit TypeScript/CSS → the browser updates in place.
- Try API calls at **http://localhost:8000/docs**. Every endpoint has a **Try it out** button.
- Inspect the database with `docker compose exec db psql -U lifts -d lifts` (see [Database overview](../03-database/README.md#connecting-with-psql)).

---

## Recipe: adding a feature end to end

Most features touch every layer. Work from the bottom up:

```mermaid
flowchart TD
    A["1. Model<br/>backend/app/models.py"] --> B["2. Migration<br/>backend/migrations/versions/"]
    B --> C["3. Schemas<br/>backend/app/schemas.py"]
    C --> D["4. Domain logic<br/>backend/app/*.py (pure functions)"]
    D --> E["5. Router<br/>backend/app/routers/*.py + main.py"]
    E --> F["6. Tests<br/>backend/tests/test_*.py"]
    F --> G["7. TS types<br/>frontend/src/api/types.ts"]
    G --> H["8. Query hooks + invalidation<br/>frontend/src/api/queries.ts"]
    H --> I["9. Components / pages<br/>frontend/src/components, pages"]
    I --> J["10. Styles<br/>*.module.css, tokens in index.css"]
    J --> K["11. Docs<br/>docs/"]
```

| Step | What to do | Watch out for |
| --- | --- | --- |
| 1. Model | Add or change a SQLModel class. | Name constraints/indexes explicitly (`uq_…`, `ck_…`). |
| 2. Migration | Generate against a scratch DB, review, rename to `NNNN_description.py`. See [Migrations](../03-database/migrations.md#writing-a-new-migration). | Add data changes (like inserting default rows) by hand. Make `downgrade()` undo everything, including enum types. |
| 3. Schemas | Add request/response models. | Weights are `Decimal` in, `float` out. Names use the `Name` type. |
| 4. Logic | Put rules in a module as plain functions that take lists/objects and return schemas. | Keep them free of HTTP so they're easy to test. |
| 5. Router | Thin handler: load rows, call the logic, return. Register the router in `main.py`. | Use `get_or_404` for ids from the path *and* the body. |
| 6. Tests | Test through the API with the `client` fixture. If the change adds a table, add it to the `TRUNCATE` in `conftest.py`. | Use fixed dates (e.g. `"2026-10-01"`), never "today". |
| 7. Types | Mirror the new schema in `types.ts`. | Nothing checks this at runtime; keep it in sync by hand. |
| 8. Hooks | Add a query key to `queryKeys` and a `use…` hook. Decide `staleTime`. Update every mutation that should invalidate it. | Update the [invalidation matrix](../06-frontend/data-layer.md#invalidation-matrix). |
| 9. UI | Pages fetch, components display. Call every hook before any early `return`. | Read the clock only through `todayIsoDate()` / `currentWeekday()`. |
| 10. Styles | A `*.module.css` per component. Use tokens. Make tap targets ≥ 48px and inputs ≥ 16px font. | Dark mode: use variables, not hex values. |
| 11. Docs | Update the pages listed in the [wiki home](../README.md#keeping-this-wiki-up-to-date). | Add a [design decision](../01-overview/design-decisions.md) if you chose between alternatives. |

---

## Recipe: adding an API endpoint

Example: a hypothetical `GET /api/lifts/{id}/summary`.

1. **Schema** in `app/schemas.py`:
   ```python
   class LiftSummary(BaseModel):
       lift_id: int
       total_sets: int
   ```
2. **Logic.** If it's more than a line or two, add a function to the relevant module (e.g. `app/records.py`).
3. **Handler** in `app/routers/lifts.py`:
   ```python
   @router.get("/{lift_id}/summary", response_model=LiftSummary)
   def get_lift_summary(lift_id: int, session: SessionDep):
       get_or_404(session, Lift, lift_id)
       ...
   ```
4. **Test** in `tests/test_<area>.py` using `client`, including the 404 case.
5. **Frontend**: interface in `types.ts`, a key plus a `useLiftSummary` hook in `queries.ts`.
6. **Docs**: add it to the [endpoint index](../05-api/README.md#endpoint-index) and the area's endpoint page.

A **new router file** also needs `api.include_router(<module>.router)` in `app/main.py`.

---

## Recipe: changing the database schema

```bash
cd backend
# 1. Edit app/models.py

# 2. Generate a migration against a throwaway database, so your real one stays untouched
docker compose exec -T db psql -U lifts -d lifts -c "CREATE DATABASE lifts_scratch"
DATABASE_URL=postgresql+psycopg://lifts:lifts@localhost:5432/lifts_scratch uv run alembic upgrade head
DATABASE_URL=postgresql+psycopg://lifts:lifts@localhost:5432/lifts_scratch \
  uv run alembic revision --autogenerate -m "short description"

# 3. Review and edit the generated file, then rename it to NNNN_short_description.py

# 4. Test both directions
DATABASE_URL=postgresql+psycopg://lifts:lifts@localhost:5432/lifts_scratch uv run alembic upgrade head
DATABASE_URL=postgresql+psycopg://lifts:lifts@localhost:5432/lifts_scratch uv run alembic downgrade -1

# 5. Clean up and apply for real
docker compose exec -T db psql -U lifts -d lifts -c "DROP DATABASE lifts_scratch"
uv run alembic upgrade head
uv run pytest                 # runs every migration down and up again
```

Full details are in [Migrations](../03-database/migrations.md).

---

## Recipe: adding a page

1. Create `frontend/src/pages/MyPage.tsx` and `MyPage.module.css`.
2. Add a `<Route path="/my-path" element={<MyPage />} />` in `App.tsx`, **above** the `*` catch-all.
3. Navigation:
   - **A page inside Home** (like a lift page): link to it, and give it a `BackLink`.
   - **A new tab**: replace one of the empty placeholder `<span>`s in `TabBar.tsx` with a `<Tab to="/my-path" label="…" icon={…} />`, then add the path to `TAB_PATHS` in `tabs.ts` at the matching position, so swiping and the slide direction work. Tab pages don't need a back link.
4. Loading/error: return `<QueryStatus …/>` while queries are pending or failed.

---

## Coding conventions

### General
- Clear, conventional code over clever code. Small files, descriptive names.
- Don't add dependencies without a good reason. Every dependency here was a deliberate choice.
- Comments explain *why*, or explain a concept that's new to the reader. Many frontend files carry short explanations of React/TypeScript concepts; keep that style when you introduce a new concept.

### Backend
- **Routers stay thin.** Business rules live in `records.py`, `calendar.py`, `insights.py`, `metadata.py`, `names.py`.
- Domain functions are **pure**: they take lists of model objects and return schema objects, so they can be tested without HTTP.
- **Ids are always validated.** Use `get_or_404` for path ids and for ids inside request bodies (`muscle_group_id`, `machine_id`, …).
- Ordering ties are broken explicitly. Use `recency_key` for "most recent".
- Constraint and index names are prefixed: `uq_` (unique), `ck_` (check), `ix_` (plain index).
- Use `# noqa: E712` on SQLAlchemy `== False` comparisons, which are SQL, not Python truthiness.

### Frontend
- **One component per file** (plus small helpers used only by that component, like `RecordLine` in `MachineCard.tsx`).
- **Hooks first.** Call every hook before any early `return`, because React requires the same hooks in the same order on every render.
- **Server state** goes through `api/queries.ts` hooks only. Pages never call `fetch` directly.
- **Local UI state** (open/closed, drafts, form values) uses `useState` in the component that owns it.
- **Clock reads** go through `todayIsoDate()` (`format.ts`) or `currentWeekday()` (`dates.ts`). The linter flags `new Date()` written directly in a render.
- **Dates** from the API are parsed with `parseIsoDate`, never `new Date("YYYY-MM-DD")`.
- **CSS:** one `*.module.css` per component/page, colours from tokens, tap targets ≥ `--tap-size` (48px), input font-size ≥ 16px (stops iOS zooming in).
- Keep `api/types.ts` in sync with `backend/app/schemas.py` by hand.

---

## Quality checks before committing

```bash
cd backend && uv run pytest              # 61 tests, ~5s; needs the db container
cd frontend && npm run build             # type-checks (tsc -b) then bundles
cd frontend && npm run lint              # oxlint
```

UI changes aren't covered by automated tests. Click through the affected screens. For layout changes, check a narrow phone width (Chrome DevTools → device toolbar, 320px and 390px). [Testing → Manual checks](../08-testing/testing.md#manual-checks) has a smoke-test checklist.

If you changed the Docker setup or want to check the production build:

```bash
docker compose up -d --build
```

---

## Git

- Remote: `origin` → GitHub, branch `main`.
- Commit messages are a short summary line, optionally followed by a bulleted body.
- `backups/` is git-ignored. Backups contain your training data and stay local.
- Generated folders (`node_modules/`, `dist/`, `.venv/`, `__pycache__/`) are ignored.
