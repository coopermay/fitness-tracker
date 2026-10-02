# Components

Every reusable component in [`frontend/src/components/`](../../frontend/src/components/). Each has a `.tsx` file and, except `QueryStatus`, a matching `.module.css` (class names are listed in [Styling](styling.md#component-and-page-modules)).

| Component | Purpose | Used by |
| --- | --- | --- |
| [AddByName](#addbyname) | Button that becomes a one-field "add by name" form | MuscleGroupPage, SettingsPage |
| [BackLink](#backlink) | "‹ Previous page" pill | MuscleGroupPage, LiftPage |
| [BodyFigure](#bodyfigure) | SVG person with one body part highlighted | HomePage |
| [DayDetails](#daydetails) | Calendar day panel above the tab bar | CalendarPage |
| [EditItem](#edititem) | "Edit" → rename / archive / unarchive panel | MuscleGroupPage, LiftPage, MachineCard |
| [HistoryList](#historylist) | Every set on a machine, each linking to edit | MachineCard |
| [MachineCard](#machinecard) | One machine's records, chart and history | LiftPage |
| [MachineCombobox](#machinecombobox) | Type-to-filter machine picker with "Add “name”" | SetForm |
| [ProgressChart](#progresschart) | Hand-drawn SVG line chart of est. 1RM per session | MachineCard |
| [QueryStatus](#querystatus) | "Loading…" / "Couldn't load: …" | Most pages |
| [SetForm](#setform) | The set form (log and edit) | LogSetPage, EditSetPage |
| [SplitEditor](#spliteditor) | Weekly split editor with a draft + Save | SettingsPage |
| [TabBar](#tabbar) | Fixed bottom navigation | App |

---

## AddByName

**File:** [`components/AddByName.tsx`](../../frontend/src/components/AddByName.tsx)

A dashed "+ Add …" button. Tapping it turns into a text input with **Add** and **Cancel**.

| Prop | Type | Meaning |
| --- | --- | --- |
| `buttonLabel` | `string` | e.g. "+ Add lift" |
| `placeholder` | `string` | The input's placeholder |
| `onAdd` | `(name: string) => Promise<unknown>` | Saves the name. The component waits for it, closing on success and showing the error on failure. |

**State:** `isOpen`, `name` (a controlled input), `isSaving`, `error`.

**Behaviour:**
- Submit is disabled while the trimmed name is empty or a save is in progress.
- `event.preventDefault()` stops the browser's full-page form submission.
- On success it closes and clears the input. On failure it shows the error message (e.g. the API's `detail`).
- The input has `autoFocus` and `maxLength={100}` (matching the API's name limit).

---

## BackLink

**File:** [`components/BackLink.tsx`](../../frontend/src/components/BackLink.tsx)

| Prop | Type | Meaning |
| --- | --- | --- |
| `to` | `string` | Destination path |
| `label` | `string` | Where it goes, e.g. "Muscle groups", "Chest" |

Renders a React Router `Link`: an inline SVG chevron (`M15 5l-7 7 7 7`) followed by the label, styled as an accent-coloured pill (40px tall). It always links to the **logical parent**, not browser history, so it works the same whether you arrived by tapping through or by a deep link.

---

## BodyFigure

**File:** [`components/BodyFigure.tsx`](../../frontend/src/components/BodyFigure.tsx)

| Prop | Type | Meaning |
| --- | --- | --- |
| `region` | `BodyRegion \| null` | The part to highlight (from [`regionForMuscleGroup`](utilities.md#bodyregionsts)); `null` highlights nothing |

A simple person built from separate SVG shapes (circles, rounded rects, ellipses, one path), so any part can be coloured independently.

- **viewBox:** `15 2 70 152`, cropped tightly around the figure. CSS sets the height to 96px and the width follows.
- **Front view** (default): chest (two rounded rects), abs (a 2 × 3 grid), shoulders, upper arms (biceps), forearms, hips, thighs, calves.
- **Rear view** when `region` is `back`, `triceps` or `glutes`: the chest and abs are replaced by a V-shaped upper back (traps + lats) and a lower-back block. The rest of the outline is identical.
- `part(...regions)` returns `styles.active` (accent fill) if `region` is one of `regions`, else `styles.part` (`--figure` grey).

| Region | Shapes highlighted |
| --- | --- |
| `chest` | both chest blocks |
| `back` | the V-shaped upper back (rear view) |
| `shoulders` | both shoulder ellipses |
| `biceps` / `triceps` | both upper arms (rear view for triceps) |
| `forearms` | both forearms |
| `abs` | the six ab blocks |
| `glutes` | the hips block (rear view) |
| `legs` | thighs and calves |
| `calves` | calves only |

The head, neck, hands and feet are never highlighted. The SVG is `aria-hidden` because the tile's text names the muscle group.

---

## DayDetails

**File:** [`components/DayDetails.tsx`](../../frontend/src/components/DayDetails.tsx)

The panel that appears when you tap a calendar square.

| Prop | Type | Meaning |
| --- | --- | --- |
| `date` | `string` (`YYYY-MM-DD`) | The selected day |
| `day` | `CalendarDay \| undefined` | Its data; `undefined` = nothing logged |
| `onClose` | `() => void` | Called by the ✕ button |

**Renders:**
- A header with the long date (`formatLongDate`, e.g. "Friday, Sep 25"), a summary ("4 sets · 4 PRs", "1 set", or "Nothing logged"), and a ✕ close button.
- Per lift: a link "**Bench ›**" → `/lifts/:id`, then each set as "185 lbs × 5 · Barbell" with a green **PR** badge when `is_pr`.

**Layout:** `position: fixed`, just above the tab bar (`bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom))`), max 50vh tall and scrollable, with rounded top corners and a shadow. The PR badge uses the fixed green `#1a7f37`, matching the "New best" banner.

---

## EditItem

**File:** [`components/EditItem.tsx`](../../frontend/src/components/EditItem.tsx)

A small muted **Edit** button that opens a panel to rename, archive or unarchive a muscle group, lift or machine.

| Prop | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | The current name (the input starts from it each time the panel opens) |
| `archived` | `boolean` | Shows **Unarchive** instead of **Archive** |
| `archiveNote` | `string` | Appended to the archive confirmation, e.g. "It disappears from the home screen; its sets stay in history." |
| `onRename` | `(name) => Promise<unknown>` | Saves a new name |
| `onSetArchived` | `(archived: boolean) => Promise<unknown>` | Archives (`true`) or unarchives (`false`) |

**State:** `isOpen`, `draft`, `isSaving`, `error`, plus `inputId = useId()`. A page can show several `EditItem`s (one per machine card), and each label needs a unique id.

**Behaviour:**
- **Save:** if the trimmed draft is empty or unchanged it just closes. Otherwise it calls `run(() => onRename(draft))`.
- **Archive:** `window.confirm("Archive “<name>”? <archiveNote>")`, then `run(() => onSetArchived(true))`.
- **Unarchive:** no confirmation.
- `run(action)` shows "Saving…", closes on success, and shows the error (e.g. a 409 "already used by…") on failure.

**Layout:** the parent puts it in a flex row next to a title. CSS (`.titleRow > form`, `.header > form`) makes the open panel wrap onto its own full-width line.

---

## HistoryList

**File:** [`components/HistoryList.tsx`](../../frontend/src/components/HistoryList.tsx)

| Prop | Type | Meaning |
| --- | --- | --- |
| `sets` | `WorkoutSet[]` | A machine group's history, newest first |

Each set is a full-width `Link` to `/lifts/:liftId/sets/:setId` (the edit page). It's a three-column grid: the date (or "No date"), "185 lbs × 5" (with `~` if approximate), and a `›` chevron. Notes, if any, go on a second line.

---

## MachineCard

**File:** [`components/MachineCard.tsx`](../../frontend/src/components/MachineCard.tsx)

One card per machine on the lift page.

| Prop | Type | Meaning |
| --- | --- | --- |
| `group` | `MachineRecords` | One entry of `machine_groups` from the [records API](../05-api/records.md) |

**State:** `showHistory` (each card is independent), plus `useUpdateMachine()`.

**Renders:**
1. **Header:**
   - the machine name (or "No machine"), with "(archived)" if archived,
   - `last_performed_on` (`formatDate`),
   - an `EditItem` for real machines only (renaming a machine affects every lift that uses it).
2. **Per unit:** a unit heading (only if the card has more than one unit), then:
   - `RecordLine` rows: **`185 lbs × 5`** in large text, a muted `· Sep 25`, and `1RM 216` on the right (hidden for plates),
   - a `ProgressChart` if `progress.length >= 2`, keyed by `progress.length` so it resets to the newest point when a session is added.
3. A **"History (n)" / "Hide history"** toggle, and the `HistoryList` when open.

**`RecordLine`** is a tiny component in the same file (only used here).

---

## MachineCombobox

**File:** [`components/MachineCombobox.tsx`](../../frontend/src/components/MachineCombobox.tsx)

A text input with a dropdown: type to filter machines, tap one to pick it, tap **Add “name”** to create one, or pick **No machine**.

| Prop | Type | Meaning |
| --- | --- | --- |
| `machines` | `Machine[]` | Options, already ordered (used-for-this-lift first) |
| `value` | `Machine \| null` | The current choice (`null` = no machine) |
| `onChange` | `(machine \| null) => void` | Reports a choice to the parent (`SetForm` owns the value) |
| `onCreate` | `(name) => Promise<Machine>` | Creates (or, idempotently, finds) a machine |

**State:** `text`, `isOpen`, `isCreating`, `error`, and `containerRef = useRef<HTMLDivElement>()`.

**Filtering logic:**
| Value | Meaning |
| --- | --- |
| `isFiltering` | `text !== (value?.name ?? '')`. While the input still shows the selected machine, **all** options are listed. |
| `query` | Trimmed, lower-cased `text` when filtering, else `''` |
| `options` | Machines whose name contains `query` |
| `exactMatch` | A machine whose lower-cased name equals `query` |
| `canCreate` | `query !== ''` and no exact match → show **Add “text”** |

**Interactions:**
| Action | Result |
| --- | --- |
| Focus | Selects the text (so typing replaces it) and opens the list |
| Type | Updates `text`, opens the list |
| Tap an option | `select(machine)`: calls `onChange`, sets the text, closes |
| Tap **Add “…”** | `onCreate(text)` → `select(result)`; errors show under the input |
| Tap **No machine** (only when not filtering) | `select(null)` |
| **Enter** | Picks the exact match, or creates if nothing matches, or picks the first option. `preventDefault` stops the form submitting. |
| **Escape** | Closes the list |
| Tap **outside** | Closes and **resolves the text**: empty → no machine; an exact name → that machine; anything else → reverts to the previous choice |

The outside-tap handling is a `useEffect` (no dependency list, so it re-subscribes after every render and always sees the latest `text`/`value`). It adds a `pointerdown` listener on `document` and removes it in the cleanup function. `containerRef.current.contains(event.target)` tells taps inside from taps outside.

**Accessibility:** the input has `role="combobox"`, `aria-expanded` and `aria-controls="machine-options"`. The list is `role="listbox"` with `role="option"` items and `aria-selected`.

---

## ProgressChart

**File:** [`components/ProgressChart.tsx`](../../frontend/src/components/ProgressChart.tsx)

A hand-drawn SVG line chart of one unit's sessions on one machine.

| Prop | Type | Meaning |
| --- | --- | --- |
| `points` | `ProgressPoint[]` | At least 2, oldest first |
| `unit` | `WeightUnit` | `plates` switches the label to "Heaviest" and hides the 1RM arrow |

**State:** `selected` (index), starting at the newest point.

**Geometry** (in SVG units; the viewBox `320 × 140` scales to the card's width):
```text
PAD = { top: 12, right: 14, bottom: 22, left: 36 }
x(time)  = PAD.left + (time - firstTime) / timeSpan × (WIDTH - PAD.left - PAD.right)
y(value) = PAD.top + (1 - (value - low) / (high - low)) × (HEIGHT - PAD.top - PAD.bottom)
low/high = data min/max ∓ 15% of the range   (∓ 5 when every value is equal, so a flat line sits mid-chart)
```
- **x is spaced by real time**: dates become `getTime()` values, so gaps between sessions show as gaps.
- The line is an SVG `path`: `M x0,y0 L x1,y1 L …`.
- Dashed guide lines and labels at the data **max** and **min**. A `Set` removes the duplicate when they're equal.
- The first and last dates are labelled along the bottom.
- Each point is a visible circle (radius 3.5, or 5.5 when selected) plus an invisible radius-14 **hit circle**, so small points are easy to tap.

**Caption:** "EST. 1RM" (or "HEAVIEST") on the left. On the right, the selected session: "Sep 25 · 185 lbs × 5 **→ 216**".

---

## QueryStatus

**File:** [`components/QueryStatus.tsx`](../../frontend/src/components/QueryStatus.tsx) (no CSS module; it uses inline `style` with tokens)

| Prop | Type | Meaning |
| --- | --- | --- |
| `isError` | `boolean` | Error or loading? |
| `error` | `Error \| null` | Its `message` is shown on error |

Renders "Couldn't load: <message>" in `--error`, or a muted "Loading…". Pages return it while a query is pending or failed:
```tsx
if (query.isPending || query.isError) return <QueryStatus isError={query.isError} error={query.error} />
```

---

## SetForm

**File:** [`components/SetForm.tsx`](../../frontend/src/components/SetForm.tsx)

The set form, shared by the log and edit pages. The pages decide the initial values and what happens on save; the form handles input, validation and the machine picker.

| Prop | Type | Meaning |
| --- | --- | --- |
| `records` | `LiftRecords` | Used to order machines and to look up the last unit per machine |
| `initialValues` | `SetFormValues` | Starting values (read once, into state) |
| `unitFollowsMachine` | `boolean` | When true (log page), picking a machine switches the unit to the one last used there (or `defaultUnit`) |
| `defaultUnit` | `WeightUnit` | Fallback unit |
| `submitLabel` | `string` | "Save set" / "Save changes" |
| `onSubmit` | `(fields: SetFields) => Promise<void>` | Saves. The form shows errors and stays open on failure. |
| `onDelete?` | `() => Promise<void>` | If given, shows **Delete set** (with a confirmation) |

**`SetFormValues`** (exported) is the form's own state. Numbers stay as **strings** so half-typed input like `"72."` isn't mangled:
```ts
{ machine: Machine | null, weight: string, unit: WeightUnit, reps: string,
  approximate: boolean, performedOn: string /* '' = unknown */, notes: string }
```

**State and helpers:**
- `values`: one object for the whole form. `update(changes: Partial<SetFormValues>)` uses the **updater form** `setValues(prev => ({...prev, ...changes}))`, so updates made after an `await` (creating a machine) never use stale state.
- `isSaving`, `error`.
- Queries: `useMachines()`, `useGyms()`, `useCreateMachine()`.
- `orderByRecentUse(machines, records)`: machines used for this lift come first, in recency order, then the rest in their usual order.
- `handleCreateMachine(name)`: creates the machine in the **first gym** (single-gym UI); throws "No gym exists yet" if there isn't one.

**Validation** (the submit button is disabled until both pass):
| Field | Rule | Function |
| --- | --- | --- |
| Weight | `^\d{1,5}(\.\d{1,2})?$` → number | `parseWeight` |
| Reps | whole number > 0 | `parseReps` |

**Fields rendered:**
1. **Machine:** `MachineCombobox` (input id `machine`).
2. **Weight:** a numeric input (`inputMode="decimal"`) and a segmented **lbs / kg / plates** control.
3. **Reps:** a numeric input (`inputMode="numeric"`) and an **Approximate (~)** checkbox.
4. **Date:** `<input type="date">`; the label says "(clear if unknown)".
5. **Notes:** a two-row textarea.
6. The error message, if any.
7. **Submit** button, a **Cancel** link back to `/lifts/:id`, and, when `onDelete` is given, **Delete set**.

**On submit** it builds `SetFields`:
- `machine_id` = the selected machine's id or `null`,
- parsed weight and reps,
- `performed_on` = the date, or `null` if empty,
- `notes` trimmed, or `null` if blank.

---

## SplitEditor

**File:** [`components/SplitEditor.tsx`](../../frontend/src/components/SplitEditor.tsx)

The weekly split editor on the Settings page.

| Prop | Type | Meaning |
| --- | --- | --- |
| `split` | `Split` | What's saved on the server |
| `muscleGroups` | `MuscleGroup[]` | Choosable groups (non-archived), in Home order |

**State:**
- `draft: number[][]`: muscle group ids per weekday (index 0 = Monday), each list **sorted** so drafts can be compared.
- `openDay: number | null`: which day's chips are showing.
- `message`: "Split saved." or an error.

**Behaviour:**
- `toDraft(split)` converts the server shape into the draft shape.
- `hasChanges = JSON.stringify(draft) !== JSON.stringify(toDraft(split))`. **Save split** is enabled only when there are changes.
- **Day rows:** "Monday · Chest, Triceps ⌄" (or "Rest"). Tapping opens/closes that day's chips.
- **Chips:** one per muscle group, `aria-pressed` when selected (filled accent). Tapping toggles it in the draft.
- **Save:** `useUpdateSplit().mutateAsync({days: draft.map((ids, weekday) => ({weekday, muscle_group_ids: ids}))})` (always all 7 days), then closes the open day and shows "Split saved.".
- The summary only names **visible** groups, so ids of archived groups in the saved split are silently ignored.

---

## TabBar

**File:** [`components/TabBar.tsx`](../../frontend/src/components/TabBar.tsx)

The bottom navigation bar, fixed to the screen's bottom on every page.

**Five equal slots:**
| Slot | Content |
| --- | --- |
| 1 | Empty placeholder (`aria-hidden`) for a future tab |
| 2 | Empty placeholder |
| 3 (middle) | **Home** → `/` (house icon) |
| 4 | **Calendar** → `/calendar` (calendar icon) |
| 5 | **Settings** → `/settings` (gear icon) |

**Active tab:** Calendar on `/calendar…`, Settings on `/settings…`, and **Home everywhere else** (muscle group, lift and form pages belong to Home). The active tab is accent-coloured and has `aria-current="page"`.

**`Tab`** (in-file):
- Props: `to`, `label`, `active`, `icon: ReactNode`.
- Each `Link` passes router state `slideStateFor(tabIndex(currentPath), TAB_PATHS.indexOf(to))`, so tapping a tab slides the page in from the same side a swipe would.

**Icons:** `HomeIcon`, `CalendarIcon` and `SettingsIcon` are inline 24×24 SVGs drawn with `stroke="currentColor"`, so they take the tab's text colour.

**Adding a tab:** replace a placeholder `<span>` with `<Tab to="/x" label="X" icon={<XIcon/>} />`, add `/x` to `TAB_PATHS` in [`tabs.ts`](utilities.md#tabsts) at the matching position, and add the route in `App.tsx`.
