# Design decisions

A log of the significant choices made while building Lift Tracker: what was decided, why, and what it costs. When you make a new choice between real alternatives, add an entry at the end using the same format.

**Format:** each entry has a **Decision**, the **Why**, and the **Consequences** (including trade-offs you should know about).

---

## 1. One repository, Docker Compose for everything
**Decision:** Backend, frontend, database config, scripts and docs live in one repo. Docker Compose runs Postgres in development, and runs the whole stack in production.
**Why:** One place to change a feature end to end. The same Compose file runs on a Mac and on a home server.
**Consequences:** You need Docker Desktop even for development. The dev servers and the Docker stack share one database.

## 2. PostgreSQL even in development
**Decision:** Use Postgres 16 everywhere. No SQLite for dev or tests.
**Why:** Features used here behave differently or don't exist in SQLite: expression indexes (`lower(trim(name))`), the enum type, `IS NOT DISTINCT FROM`, `NULLS LAST`, check constraints.
**Consequences:** Tests need the `db` container running.

## 3. SQLModel tables, separate Pydantic API schemas
**Decision:** `app/models.py` defines tables. `app/schemas.py` defines request/response bodies separately, rather than reusing table classes as API models.
**Why:** The API shape differs from storage. Weights are `Decimal` in the database but plain numbers in JSON, responses add computed fields like `last_performed_on` and `is_new_record`, and create/update bodies need different validation.
**Consequences:** Two places to update when a field changes (three, counting the frontend's `types.ts`).

## 4. Case-insensitive unique names, enforced by the database
**Decision:** Metadata names are unique on `lower(trim(name))` within their scope, via unique **expression indexes**. Stored names keep their casing but are trimmed.
**Why:** It prevents near-duplicates like "Chest" / "chest " that would split your history. Enforcing it in the database means no code path can bypass it.
**Consequences:** `app/names.py` must mirror the index expression exactly. `alembic check` can't compare expression indexes and always reports them as changed (a known false positive).

## 5. Idempotent create
**Decision:** POSTing a name that already exists in scope returns the existing item with **200** (and unarchives it if needed). A genuinely new item gets **201**.
**Why:** The UI's "type a name and tap Add" flows (lifts, muscle groups, machines in the combobox) can't create duplicates, and there's no error to handle when a name already exists.
**Consequences:** Clients must accept both 200 and 201. You can't create two items with the same normalised name in one scope, ever.

## 6. Archive metadata, never delete it
**Decision:** Gyms, muscle groups, lifts and machines have an `archived` flag. They're hidden from lists by default but never deleted. Sets can be hard-deleted.
**Why:** Deleting a lift or machine would orphan or destroy history. Archiving keeps old sets meaningful.
**Consequences:** Lists take `?include_archived=true`. Foreign keys have no `ON DELETE CASCADE`, since nothing is deleted. Archived machines still appear on lift pages (labelled), and archived items can still be referenced by the split.

## 7. Exact decimal weights
**Decision:** `weight_value` is `NUMERIC(7,2)` in Postgres and `Decimal` in Python. API input is validated as a decimal with at most 2 decimal places. Output is a JSON number.
**Why:** `72.5` must stay `72.5`. Comparing weights for records and PRs must be exact, which floats can't guarantee.
**Consequences:** Weights max out at 99999.99. The frontend validates the same shape (`^\d{1,5}(\.\d{1,2})?$`).

## 8. Never convert units
**Decision:** Record exactly what the machine shows (`lbs`, `kg`, or `plates` per side). Compare only within lift + machine + unit.
**Why:** Machine stacks are often mislabelled or non-linear, and plates per side isn't a weight at all. Converting would invent precision that isn't there.
**Consequences:** One machine can have several unit sections on a lift page. Est. 1RM is null for plates. Charts are per unit.

## 9. Machines are independent of lifts, and optional on a set
**Decision:** `machines` relate to `gyms`, not lifts. A set's `machine_id` is nullable.
**Why:** In a real gym one cable station serves a dozen exercises. Some sets (bodyweight, or old notes) have no machine.
**Consequences:** "No machine" is its own group everywhere. The machine picker lists every machine, ordered by recent use for the current lift.

## 10. Undated sets are allowed
**Decision:** `performed_on` is nullable.
**Why:** Imported history from a notes app had sets with unknown dates, and losing them would lose real records.
**Consequences:** A single ordering rule (`recency_key`) is used everywhere. Undated sets are treated as oldest, never appear on the calendar or charts, and still count as history for PRs.

## 11. Records are computed on read
**Decision:** There's no stored "records" table. `GET /lifts/{id}/records` computes everything from the sets each time.
**Why:** It's always consistent. Editing or deleting a set can't leave a stale record behind, and single-user data volumes make it cheap.
**Consequences:** The calendar and insights endpoints load **all** sets on every request. That's fine for years of one person's training, but would need SQL aggregation at a much larger scale.

## 12. PR rule: the first set at a weight counts
**Decision:** A set is a PR (and a "new best") if it's the first at its lift + machine + unit + weight, or beats the previous most reps there. Ties don't count. (This was the user's choice over "must beat a previous set" and "only new heavier weights".)
**Why:** It matches the "New best at 185 lbs!" banner, so the calendar and the banner agree.
**Consequences:** Imported history shows nearly every set as a PR. Plateau detection only fires when you repeat weights without beating them.

## 13. Seed idempotency: match metadata by name, skip sets if any exist
**Decision:** The seed script creates metadata only when the name is missing, and imports sets only if the `sets` table is empty.
**Why:** Sets have no natural key, since two identical sets on one day are legitimate. Matching them would either drop real data or duplicate it.
**Consequences:** If you log a set before seeding, the seed imports **no** sets. The seed never unarchives anything.

## 14. Settings is a single row
**Decision:** The `settings` table has exactly one row, `id = 1`, created by the first migration and protected by a check constraint.
**Why:** It's simple, typed and transactional, with no key/value parsing.
**Consequences:** Adding a setting means adding a column (and a migration).

## 15. Weekly split stored as rows, replaced as a whole
**Decision:** `split_days(weekday, muscle_group_id)` has one row per pairing. `PUT /split` replaces the whole week.
**Why:** The UI edits the week as a draft and saves it all at once. Replacing everything is simpler and has no partial-update edge cases.
**Consequences:** A PUT that leaves out a weekday turns it into a rest day.

## 16. "Today" comes from the client
**Decision:** `GET /insights?today=YYYY-MM-DD` takes the date from the phone, and only falls back to the server's date if it's missing.
**Why:** The server runs on UTC, which is already tomorrow on a US evening. Overdue logic depends on the exact weekday.
**Consequences:** The insights cache key includes the date, so it naturally refreshes the next day.

## 17. Same origin, no CORS
**Decision:** The browser only talks to one origin: Vite's dev server in development, nginx in production. Both proxy `/api` to the backend.
**Why:** It avoids CORS configuration entirely, and the backend can stay unpublished in Docker.
**Consequences:** A future native app would call the API directly and would need CORS or a different setup at that point. The API itself is already a clean standalone REST service.

## 18. TanStack Query with long-lived metadata caches
**Decision:** Metadata, split and settings queries use `staleTime: Infinity`. Mutations explicitly invalidate (or overwrite) what they change. Records, calendar and insights use the default stale time.
**Why:** Metadata rarely changes and is only ever changed through this app, so refetching it is wasted work.
**Consequences:** Every mutation must invalidate the right keys. The [invalidation matrix](../06-frontend/data-layer.md#invalidation-matrix) is the source of truth. A change made outside the app (e.g. through `/docs`) needs a page reload to show up.

## 19. React Router in declarative mode
**Decision:** Use `BrowserRouter` / `Routes` / `Route` / `Link`, not the data-router or framework modes.
**Why:** It's the simplest mental model, and data loading is already handled by TanStack Query.
**Consequences:** No route loaders or actions. Pages fetch with hooks and show their own loading states.

## 20. Full-page forms, not bottom sheets
**Decision:** Logging and editing a set happen on their own routes (`/lifts/:id/log`, `/lifts/:id/sets/:setId`).
**Why:** It's simpler, the phone's back button behaves naturally, and it's comfortable one-handed.
**Consequences:** After saving, the form navigates back with `replace: true` and passes a flash message through router state.

## 21. Hand-drawn SVG (charts, icons, body figure)
**Decision:** The progress chart, tab-bar icons, back chevron and body figure are inline SVG written by hand. There's no chart or icon library. (The user chose this over Recharts.)
**Why:** No dependencies, full control over styling and dark mode, and it was a learning goal.
**Consequences:** Features like axis ticks or zoom have to be built by hand if wanted.

## 22. Plain CSS modules with design tokens
**Decision:** Each component has a `*.module.css`. Shared colours and sizes are CSS variables in `index.css`, with dark-mode overrides. There's no Tailwind or UI kit.
**Why:** It's conventional, easy to learn, and dark mode comes for free with `prefers-color-scheme`.
**Consequences:** New colours should become tokens, not hard-coded hex values (the few exceptions are documented in [Styling](../06-frontend/styling.md)).

## 23. Installable PWA without offline support
**Decision:** There's a web app manifest and icons, but no service worker.
**Why:** Installing to the home screen was wanted. Offline support was explicitly out of scope.
**Consequences:** The app needs a network connection to the server. Android's full "Install app" prompt needs HTTPS (e.g. via `tailscale serve`).

## 24. Calendar: sets per day, newest week at the top
**Decision:** It's a GitHub-style heatmap turned vertical: one row per week, Monday to Sunday across, newest at the top. Colour = sets logged that day. PRs are shown only in the tap details.
**Why:** It's readable on a phone and opens on the current week. "Sets logged" mirrors GitHub's contribution count.
**Consequences:** The scale is relative to your busiest day. The range starts at your first logged week, with a minimum of 12 weeks.

## 25. Tests run against real Postgres through real migrations
**Decision:** pytest creates a `lifts_test` database, runs Alembic **down then up** once per run, and truncates tables before each test.
**Why:** It tests the migrations themselves, and the database constraints, which are part of the business rules.
**Consequences:** Tests need the db container. Each run is a few seconds, not milliseconds.

## 26. uv for Python, installed with the official installer
**Decision:** Python dependencies are managed by `uv` (`pyproject.toml` + `uv.lock`). Never use `pip` directly.
**Why:** It's fast and reproducible, and installs the right Python (3.12) itself.
**Consequences:** On the Intel Mac this was built on, `brew install uv` failed, so the official installer (`curl … | sh`) is the documented route.

## 27. Swipe between tabs only, with a slide-in animation
**Decision:** Left/right swipes change tabs on the three tab pages only. The new page slides 48px in from the side and fades in. Tapping a tab slides the same way. (The user chose "tabs only" and "swipe then slide" over following the finger.)
**Why:** It feels native without the complexity, and conflicts with vertical scrolling, of a drag-to-follow carousel.
**Consequences:** Nested pages (muscle group, lift, forms) don't swipe. The page wrapper is keyed by path, so every navigation remounts the page.

## 28. Hidden scrollbars
**Decision:** Scrollbars are hidden globally with CSS. Scrolling still works.
**Why:** It feels more like a native app.
**Consequences:** On desktop there's no visual scroll cue. iOS may still flash its own thin indicator on the main page.

## 29. Home tiles keep their height
**Decision:** The TODAY / OVERDUE labels are small corner labels beside the figure's head. Tiles keep `12px` padding and a `132px` minimum height.
**Why:** All eight muscle group tiles should fit on one phone screen (the user asked for this when extra padding made the tiles taller).
**Consequences:** Don't add vertical padding to tiles for new labels; find room in the corners instead.

---

### Template for new entries

```markdown
## N. Short title
**Decision:** What was chosen.
**Why:** The reasons, including alternatives that were rejected.
**Consequences:** Trade-offs, follow-up work, things future changes must respect.
```
