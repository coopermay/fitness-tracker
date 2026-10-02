# Testing

How Lift Tracker is tested: the backend's automated pytest suite (61 tests), what each test covers, how to write new ones, and the manual checks used for the frontend.

---

## Strategy

| Layer | How it's tested | Why |
| --- | --- | --- |
| Business rules (records, PRs, split, insights, idempotent create, archiving) | **pytest through the real API** against a real Postgres database | The rules span Python and database constraints, so testing end to end catches both |
| Migrations | Run **down and up** at the start of every test session | A broken migration fails the suite |
| Pure helpers (Epley) | Direct unit tests | Simple maths, many cases |
| Frontend types | `npm run build` (`tsc -b`) | Type errors fail the build |
| Frontend code quality | `npm run lint` (oxlint) | Rules of hooks, purity, export hygiene |
| Frontend behaviour and layout | **Manual** smoke tests + headless Chrome screenshots | No frontend test framework was added (no extra dependencies) |

---

## Running the tests

```bash
docker compose up -d db          # tests need Postgres
cd backend
uv run pytest                    # all tests (~5 seconds)
uv run pytest -q                 # quieter
uv run pytest tests/test_records.py              # one file
uv run pytest -k "plateau"                       # tests whose name matches
uv run pytest -x                                 # stop at the first failure
```

Expected output ends with `61 passed, 1 warning`. The warning is a harmless Starlette deprecation notice about `httpx`.

---

## Test infrastructure: `tests/conftest.py`

**File:** [`backend/tests/conftest.py`](../../backend/tests/conftest.py)

```mermaid
flowchart TD
    A["pytest starts"] --> B["engine fixture (once per session)"]
    B --> C["create lifts_test DB if missing<br/>(connects to 'postgres' with AUTOCOMMIT)"]
    C --> D["alembic downgrade base<br/>alembic upgrade head<br/>(against lifts_test)"]
    D --> E["for each test"]
    E --> F["session fixture:<br/>TRUNCATE split_days, sets, lifts, machines,<br/>muscle_groups, gyms RESTART IDENTITY CASCADE<br/>+ reset settings.default_unit = 'lbs'"]
    F --> G["client fixture:<br/>override get_session → test session<br/>TestClient(app)"]
    G --> H["test runs real HTTP requests"]
    H --> E
```

| Name | Scope | What it provides |
| --- | --- | --- |
| `TEST_DATABASE_URL` | module constant | `$TEST_DATABASE_URL`, or `postgresql+psycopg://lifts:lifts@localhost:5432/lifts_test` |
| `create_test_database_if_missing()` | helper | Connects to the `postgres` database in `AUTOCOMMIT` mode (`CREATE DATABASE` can't run in a transaction) and creates `lifts_test` if needed |
| `engine` | session | Creates the DB, runs Alembic **down then up** with `sqlalchemy.url` set on the Config (which `migrations/env.py` respects), yields an engine |
| `session` | function | Empties every table (ids restart at 1) and resets settings, then yields a `Session` |
| `client` | function | `app.dependency_overrides[get_session] = lambda: session`, so API requests use the test DB; yields `TestClient(app)`; clears the overrides afterwards |
| `gym_id` | function | Creates "Main gym", returns its id |
| `muscle_group_id` | function | Creates "Chest", returns its id |
| `lift_id` | function | Creates "Bench" in Chest, returns its id |

Because tables are truncated **before** each test (not after), the last test's data stays in `lifts_test` for inspection if something fails.

---

## Every test

### `test_health.py` (1)
| Test | Checks |
| --- | --- |
| `test_health_returns_ok` | `GET /api/health` → 200 `{"status": "ok"}`. Uses its own `TestClient` with no database. |

### `test_metadata.py` (15): idempotent create, archive, rename
| Test | Checks |
| --- | --- |
| `test_create_returns_201_for_new_item` | A new muscle group → 201 |
| `test_create_matching_name_returns_existing_with_200` | `"  cHEST "` after `"Chest"` → 200, same id, original name, still one group |
| `test_create_trims_whitespace_from_stored_name` | `"  Back  "` is stored as `"Back"` |
| `test_create_rejects_blank_name` | `"   "` → 422 |
| `test_lift_names_are_unique_per_muscle_group` | "Curl"/"curl" in Biceps is one lift; "Curl" in Forearms is a new one |
| `test_machine_names_are_unique_per_gym` | The same rule, per gym |
| `test_create_lift_with_unknown_muscle_group_is_404` | Bad `muscle_group_id` → 404 |
| `test_archived_items_are_hidden_from_lists_by_default` | Archived groups are hidden; `include_archived=true` shows them |
| `test_creating_an_archived_name_unarchives_it` | POSTing an archived name → 200, unarchived |
| `test_unarchive_via_patch` | `PATCH {"archived": false}` unarchives |
| `test_archived_lifts_are_hidden_from_lift_list` | The lift list filters archived; `include_archived` includes them |
| `test_sets_on_archived_machine_still_appear_in_records` | Archived machine: gone from `/machines`, still in records with `archived: true` |
| `test_rename_changes_display_name` | `chest` → `Chest` (a case-only rename of the same item) is allowed |
| `test_rename_onto_another_items_name_is_409` | Renaming "Back" to "CHEST" → 409 |
| `test_patch_unknown_id_is_404` | PATCH on a missing id → 404 |

### `test_records.py` (19): Epley, records, new-best flag, progress
| Test | Checks |
| --- | --- |
| `test_estimated_one_rep_max_rounds_to_half` (×4, parametrised) | 185×5→216, 100×1→103.5, 100×8→126.5, 72.5×9→94.5 (half rounds up) |
| `test_estimated_one_rep_max_is_none_for_plates` | Plates → `None` |
| `test_keeps_most_reps_per_weight_sorted_heaviest_first` | One row per weight, the most reps kept, heaviest first, est. 1RM present |
| `test_tie_on_reps_prefers_most_recent_date` | Equal reps → the newer date holds the record |
| `test_tie_on_reps_prefers_dated_over_undated` | Equal reps → a dated set beats an undated one |
| `test_undated_set_can_hold_the_record` | An undated 16 reps beats a dated 12 |
| `test_history_is_newest_first_with_undated_last` | History order, and `last_performed_on` |
| `test_mixed_units_on_one_machine_are_kept_separate` | `8` plates / lbs / kg → three separate unit sections, most recent unit first, no 1RM for plates |
| `test_sets_without_machine_form_their_own_group` | A null machine is its own group |
| `test_machine_groups_ordered_by_most_recent_use` | Group order by the newest set; undated last |
| `test_records_for_lift_with_no_sets` | `machine_groups: []` |
| `test_records_for_unknown_lift_is_404` | 404 |
| `test_records_only_include_this_lift` | Another lift's sets aren't included |
| `test_new_record_flag` | `is_new_record`: first at a weight ✅, beat ✅, tie ❌, worse ❌, other unit ✅, no machine compared separately |
| `test_progress_has_one_point_per_day_oldest_first` | The day's best est. 1RM per date; undated skipped |
| `test_progress_for_plates_uses_heaviest_weight` | Plates chart the heaviest weight |

### `test_sets.py` (8): set validation and settings
| Test | Checks |
| --- | --- |
| `test_reps_must_be_positive` | `reps: 0` → 422 |
| `test_weight_supports_half_increments` | `72.5` round-trips exactly |
| `test_unknown_unit_is_rejected` | `"stone"` → 422 |
| `test_patch_changes_only_sent_fields` | PATCH only touches the fields sent |
| `test_patch_can_clear_nullable_fields` | `machine_id: null`, `performed_on: null` clear them |
| `test_patch_rejects_null_for_required_fields` | `reps: null` → 422 |
| `test_delete_set` | 204, then gone, then a second delete → 404 |
| `test_settings_default_and_update` | Defaults to `lbs`; PATCH to `kg` persists |

### `test_calendar.py` (6)
| Test | Checks |
| --- | --- |
| `test_empty_calendar` | `[]` with no sets |
| `test_days_are_newest_first_with_counts` | Date order, `set_count`, lift grouping, machine names |
| `test_pr_rules` | First ✅, beat ✅, tie ❌, worse ❌, other unit ✅; `pr_count` per day |
| `test_prs_follow_date_order_not_entry_order` | Backdated entries replayed by date |
| `test_undated_sets_are_hidden_but_count_as_earlier_history` | An undated 16 makes a later dated 12 not a PR, and the undated day isn't shown |
| `test_lifts_grouped_in_order_first_trained` | Lift order within a day; no-machine sets have `machine_name: null` |

### `test_split.py` (5)
| Test | Checks |
| --- | --- |
| `test_default_split_is_seven_rest_days` | 7 empty days |
| `test_put_replaces_the_whole_split` | Days left out of a PUT become rest days; GET matches |
| `test_duplicate_ids_in_a_day_are_ignored` | `[chest, chest]` → `[chest]` |
| `test_unknown_muscle_group_is_404_and_changes_nothing` | 404 and the previous split is intact |
| `test_invalid_weekdays_are_rejected` | Weekday 7 → 422; a repeated weekday → 422 |

### `test_insights.py` (7)
Uses `TODAY = "2026-10-01"` (a Thursday) and fixtures for Chest/Back/Legs with Bench/Row/Squat.

| Test | Checks |
| --- | --- |
| `test_lift_with_no_pr_in_last_4_weeks_is_plateaued` | Only non-PR sets in the window → plateaued |
| `test_a_pr_in_the_window_clears_the_plateau` | A PR in the window → not plateaued |
| `test_lifts_not_trained_recently_are_not_plateaued` | A set 28 days ago (just outside) → not flagged |
| `test_scheduled_day_passed_without_training_is_overdue` | Missed Wednesday → overdue; today's group isn't |
| `test_training_on_a_different_day_this_week_counts` | Wednesday's group trained Thursday → fine |
| `test_last_weeks_training_does_not_count` | Last Sunday doesn't count for this week |
| `test_group_scheduled_twice_needs_two_days` | Two sets on one day ≠ two days |

---

## Writing a new test

- Put it in the file for its area (or a new `test_<area>.py`).
- Use the **`client`** fixture and make real requests. Build data through the API (`client.post(...)`) or the `gym_id`, `muscle_group_id` and `lift_id` fixtures.
- Small helpers at the top of a test file keep tests readable (e.g. `log_set`, `get_records`, `rows` in `test_records.py`).
- **Never depend on today's date.** Pass explicit dates, and for insights pass `?today=`.
- Name tests as sentences describing the behaviour: `test_tie_on_reps_prefers_most_recent_date`.
- Test the error paths: 404 for every id the endpoint accepts, 422 for invalid input.
- If you add a table, add it to the `TRUNCATE` statement in `conftest.py`.

---

## Manual checks

There are no automated UI tests. After UI changes, run `npm run build && npm run lint`, then click through the affected screens. A full smoke test:

1. **Home:** 8 tiles with body figures, all visible on a phone screen. Today's split groups are first with TODAY. OVERDUE where expected.
2. **Muscle group:** lifts with last dates. "+ Add lift" with an existing name in another case doesn't duplicate. Edit → rename → archive (confirm) → back home.
3. **Lift:** machine cards, records `185 lbs × 5 · Sep 25`, 1RM on the right (none for plates), approximate `7~`, chart with tappable points, History opens.
4. **Log set:**
   - the last machine and unit are preselected, and the date is today,
   - "Add “name”" creates a machine, and the exact name of an existing one in another case selects it,
   - saving a better set shows the green "New best at … !",
   - refreshing doesn't show the banner again.
5. **Edit set:** change reps → "Set updated". Delete → confirm → "Set deleted", with no "Not found" flash.
6. **Calendar:** grid, today outlined, tap a day → details with PR badges and lift links; tap again or ✕ to close.
7. **Settings:** the default unit switches instantly; edit the split → Save split → Home reflects it; add a muscle group.
8. **Tabs:** tap each tab (it slides in); swipe left/right on Home/Calendar/Settings; nested pages don't swipe.
9. **Both themes:** toggle macOS/iOS dark mode.
10. **Narrow screen:** 320px and 390px in DevTools' device mode.

---

## Headless Chrome screenshots

A way to "see" pages from the command line, used during development without adding dependencies (e.g. Playwright). It needs Google Chrome installed.

```bash
cd frontend
npm run build
# A test page with phone-width iframes, served from the same origin
cat > dist/_phone.html <<'EOF'
<!doctype html><html><body style="margin:0;background:#888;display:flex;gap:12px;padding:12px">
<iframe src="/" width="360" height="760" style="border:0"></iframe>
<iframe src="/lifts/1" width="360" height="760" style="border:0"></iframe>
</body></html>
EOF
npx vite preview --port 5179 --strictPort &      # needs the API on :8000 for data
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --virtual-time-budget=8000 --force-device-scale-factor=2 \
  --window-size=770,790 --screenshot=/tmp/phones.png "http://localhost:5179/_phone.html"
rm dist/_phone.html; kill %1
```

Lessons learned:
- **Use `vite preview`, not the dev server.** The dev server's live-reload websocket keeps `--virtual-time-budget` waiting forever.
- **Use iframes for narrow widths.** Headless Chrome won't make a window narrower than about 500px.
- **Serve the test page from the same origin.** A `file://` page's iframes can't load data in time.
- **macOS has no `timeout` command.** If Chrome might hang, run it in the background and kill it after a delay.
- `--dump-dom` instead of `--screenshot` prints the rendered HTML, which is handy for checking text and input values.
- To screenshot a state that needs a tap (an open panel, a selected day), temporarily initialise that state from the URL in the component, build, screenshot, then revert the change.
