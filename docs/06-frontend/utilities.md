# Utilities

Small, mostly pure helper modules at the top of [`frontend/src/`](../../frontend/src/). None of them render anything; `useSwipe` is the only one that uses React (it's a custom hook).

| File | Exports |
| --- | --- |
| [`format.ts`](#formatts) | `formatDate`, `formatLongDate`, `formatWeight`, `formatReps`, `todayIsoDate` |
| [`dates.ts`](#datests) | `parseIsoDate`, `toIsoDate`, `addDays`, `startOfWeek`, `currentWeekday` |
| [`calendar.ts`](#calendarts) | `CalendarWeek`, `buildWeeks`, `heatLevel` |
| [`records.ts`](#recordsts) | `lastUnitFor` |
| [`flash.ts`](#flashts) | `FlashMessage`, `LiftPageState` (types only) |
| [`tabs.ts`](#tabsts) | `TAB_PATHS`, `tabIndex`, `SlideState`, `slideStateFor` |
| [`useSwipe.ts`](#useswipets) | `useSwipe` |
| [`bodyRegions.ts`](#bodyregionsts) | `BodyRegion`, `regionForMuscleGroup` |

> **Why build dates from parts?** `new Date("2026-09-25")` treats the string as **UTC** midnight, which in US timezones is the evening of Sep 24. Every helper here splits `"YYYY-MM-DD"` into numbers and calls `new Date(year, month - 1, day)`, which is local midnight.

---

## format.ts

**File:** [`frontend/src/format.ts`](../../frontend/src/format.ts) — display helpers.

| Function | Example | Notes |
| --- | --- | --- |
| `formatDate(iso)` | `"2026-09-25"` → `"Sep 25"`; `"2025-12-01"` → `"Dec 1, 2025"` | Adds the year only if it isn't the current year. `en-US` locale. |
| `formatLongDate(iso)` | `"2026-09-25"` → `"Friday, Sep 25"` | Used by the calendar's day panel. Adds the year if not the current year. |
| `formatWeight(value, unit)` | `185, 'lbs'` → `"185 lbs"`; `72.5` → `"72.5 lbs"`; `8, 'plates'` → `"8 plates"`; `1, 'plates'` → `"1 plate"` | JSON numbers print without a trailing `.0` |
| `formatReps(reps, approximate)` | `7, true` → `"7~"`; `7, false` → `"7"` | |
| `todayIsoDate()` | → `"2026-10-02"` | Today in the **browser's** timezone. Used as the date input's default, for insights' `today`, and as the calendar's "today". |

`todayIsoDate()` reads the clock. Calling it during render is fine in practice; a page left open past midnight picks up the new day on its next re-render.

---

## dates.ts

**File:** [`frontend/src/dates.ts`](../../frontend/src/dates.ts) — date arithmetic in local time.

| Function | Does | Example |
| --- | --- | --- |
| `parseIsoDate(iso)` | `"YYYY-MM-DD"` → local-midnight `Date` | `"2026-09-25"` → Sep 25 00:00 local |
| `toIsoDate(date)` | `Date` → `"YYYY-MM-DD"` (local) | |
| `addDays(date, n)` | New `Date` n days later (negative = earlier). Uses `setDate`, so daylight-saving changes are handled. | `addDays(sep25, 7)` → Oct 2 |
| `startOfWeek(date)` | The Monday on or before `date` | Thu Oct 1 → Mon Sep 28 |
| `currentWeekday()` | Today as **Monday = 0 … Sunday = 6**, matching the split | Thursday → `3` |

JavaScript's `getDay()` counts from **Sunday = 0**. The conversion `(getDay() + 6) % 7` shifts it so Monday is 0. `currentWeekday()` lives here (rather than being written as `new Date()` inside `HomePage`) because the linter's `react(purity)` rule flags clock reads written directly in render.

---

## calendar.ts

**File:** [`frontend/src/calendar.ts`](../../frontend/src/calendar.ts) — turns calendar data into grid rows.

### `interface CalendarWeek`
| Field | Type | Meaning |
| --- | --- | --- |
| `days` | `(string \| null)[]` | 7 ISO dates, Monday to Sunday; `null` for days after today |
| `monthLabel` | `string \| null` | e.g. `"Sep"` on the first row (reading down) where that month appears, else `null` |

### `buildWeeks(todayIso, earliestIso) → CalendarWeek[]`
1. `thisWeek = startOfWeek(today)`, `earliestWeek = startOfWeek(earliest)` (or this week if there's no data).
2. `weekCount = max(weeks between them + 1, MIN_WEEKS)` with `MIN_WEEKS = 12`. The week count is computed with `Math.round(ms / (7 days))`, so DST shifts don't produce off-by-one counts.
3. For `i = 0 … weekCount - 1`, the week starting `thisWeek - 7i` days (**newest first**). Each day is its ISO string, or `null` if after today.
4. **Month label:** the month of the row's **latest visible day**, shown only when it differs from the row above. The top row is labelled with the current month, and each month's label sits at its newest week.

### `heatLevel(setCount, maxSetCount) → 0..4`
```ts
if (setCount === 0 || maxSetCount === 0) return 0
return Math.ceil((setCount / maxSetCount) * 4)
```
Level 4 is reached by days with more than 75% of your busiest day's sets. Colours are the `--heat-0…4` tokens.

---

## records.ts

**File:** [`frontend/src/records.ts`](../../frontend/src/records.ts) — helpers over the records response.

### `lastUnitFor(records, machineId) → WeightUnit | undefined`
Finds the machine group for `machineId` (`null` = "No machine") and returns its **first** unit. The API orders units most-recently-used first, so that's the unit you last used on that machine for this lift. It returns `undefined` if you've never used that machine for this lift, and callers then fall back to `settings.default_unit`.

Used by `LogSetPage` (initial unit) and `SetForm` (when the machine changes and `unitFollowsMachine` is true).

---

## flash.ts

**File:** [`frontend/src/flash.ts`](../../frontend/src/flash.ts) — types for the one-off lift-page banner.

```ts
interface FlashMessage { text: string; isRecord: boolean }   // isRecord → green "New best" style
interface LiftPageState { flash?: FlashMessage }              // shape of location.state on /lifts/:id
```

The form pages pass it as router state, `navigate('/lifts/3', { replace: true, state: { flash } })`, and `LiftPage` reads it once, then clears it from history (see [LiftPage](routing-and-pages.md#liftpage)).

---

## tabs.ts

**File:** [`frontend/src/tabs.ts`](../../frontend/src/tabs.ts) — tab order and slide direction.

| Export | Value / behaviour |
| --- | --- |
| `TAB_PATHS` | `['/', '/calendar', '/settings']`, the swipeable pages in tab-bar order (placeholders skipped) |
| `tabIndex(pathname)` | Index in `TAB_PATHS` for an **exact** match, else `null` (e.g. `/lifts/3` → `null`, so no swiping) |
| `interface SlideState` | `{ slideFrom: 'left' \| 'right' }`, carried in router state |
| `slideStateFor(from, to)` | `undefined` if `from` is null or the same tab; else `{slideFrom: to > from ? 'right' : 'left'}` |

Used by `App.tsx` (swipes) and `TabBar` (tab taps), so both animate the same way. **When you add a tab**, insert its path here at the position matching the tab bar.

---

## useSwipe.ts

**File:** [`frontend/src/useSwipe.ts`](../../frontend/src/useSwipe.ts) — a **custom hook**: a function whose name starts with `use` and that calls other hooks.

```ts
const handlers = useSwipe({ onSwipeLeft, onSwipeRight })
<div {...handlers}>…</div>        // spreads onTouchStart and onTouchEnd
```

| Option | Called when |
| --- | --- |
| `onSwipeLeft` | The finger moved right-to-left (go to the **next** tab) |
| `onSwipeRight` | The finger moved left-to-right (go to the **previous** tab) |

**How it decides:**
- `onTouchStart` records the start position in a **ref** (`useRef`): it needs remembering, but changing it shouldn't re-render anything. It **ignores** multi-finger touches and touches that start inside an `input` or `textarea`, so dragging to move the text cursor doesn't change pages.
- `onTouchEnd` computes `dx` and `dy`. It's a swipe only if `|dx| ≥ 60px` (`MIN_DISTANCE`) **and** `|dx| ≥ 2 × |dy|` (mostly sideways), so vertical scrolling never triggers it.

Touch events only fire on touch screens. To try it on a Mac, use Chrome DevTools' device mode, which emulates touch.

---

## bodyRegions.ts

**File:** [`frontend/src/bodyRegions.ts`](../../frontend/src/bodyRegions.ts) — maps a muscle group's name to a body part for the [`BodyFigure`](components.md#bodyfigure).

### `type BodyRegion`
`'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'glutes' | 'calves' | 'legs'`

### `regionForMuscleGroup(name) → BodyRegion | null`
Lower-cases the name, then returns the **first** region (in this order) whose keyword list has a word **contained** in it:

| Order | Region | Keywords |
| --- | --- | --- |
| 1 | chest | `chest`, `pec` |
| 2 | back | `back`, `lat`, `trap` |
| 3 | shoulders | `shoulder`, `delt` |
| 4 | biceps | `bicep` |
| 5 | triceps | `tricep` |
| 6 | forearms | `forearm`, `grip`, `wrist` |
| 7 | abs | `abs`, `abdom`, `core`, `oblique` |
| 8 | glutes | `glute`, `butt`, `hip` |
| 9 | calves | `calf`, `calves` |
| 10 | legs | `leg`, `quad`, `hamstring`, `thigh` |

Examples: "Chest" → chest, "Lats" → back, "Rear delts" → shoulders, "Calves" → calves, "Cardio" → `null` (figure with nothing highlighted).

Because matching is substring-based and ordered, some names match earlier than you might expect (e.g. "Lower back & hips" → back). To change a mapping, edit the keyword lists or their order.
