# Routing and pages

How URLs map to screens (`App.tsx`), and a detailed reference for every page component in [`frontend/src/pages/`](../../frontend/src/pages/). Pages fetch data with hooks from the [data layer](data-layer.md) and assemble [components](components.md).

- [`main.tsx`](#maintsx) · [`App.tsx`](#apptsx)
- Pages: [Home](#homepage) · [Muscle group](#musclegrouppage) · [Lift](#liftpage) · [Log set](#logsetpage) · [Edit set](#editsetpage) · [Calendar](#calendarpage) · [Settings](#settingspage) · [Weekly split](#splitpage) · [Theme](#themepage) · [Not found](#notfoundpage)
- [`FormPage.module.css`](#formpagemodulecss)

---

## main.tsx

**File:** [`frontend/src/main.tsx`](../../frontend/src/main.tsx)
The entry point loaded by `index.html`.

- Creates the single **`QueryClient`** with one default:
  ```ts
  retry: (failureCount, error) => {
    const isClientError = error instanceof ApiError && error.status < 500
    return !isClientError && failureCount < 3
  }
  ```
  Network errors and 5xx responses are retried up to 3 times. 4xx responses (404, 422…) fail immediately, because asking again won't change the answer. That's why an unknown lift shows "Not found" instantly.
- Renders `<StrictMode><QueryClientProvider><BrowserRouter><App/></…>` into `#root`. `StrictMode` runs extra development-only checks (it renders twice in dev to surface impure code).
- Imports `index.css` (global styles and tokens).

---

## App.tsx

**File:** [`frontend/src/App.tsx`](../../frontend/src/App.tsx) · **Styles:** [`App.module.css`](styling.md#appmodulecss)

The route table, the theme, swiping (between tabs, and back out of nested pages) and the bottom tab bar.

### Routes

```tsx
<Route path="/" element={<HomePage />} />
<Route path="/muscle-groups/:muscleGroupId" element={<MuscleGroupPage />} />
<Route path="/lifts/:liftId" element={<LiftPage />} />
<Route path="/lifts/:liftId/log" element={<LogSetPage />} />
<Route path="/lifts/:liftId/sets/:setId" element={<EditSetPage />} />
<Route path="/calendar" element={<CalendarPage />} />
<Route path="/settings" element={<SettingsPage />} />
<Route path="/settings/split" element={<SplitPage />} />
<Route path="/settings/theme" element={<ThemePage />} />
<Route path="*" element={<NotFoundPage />} />
```

`<Routes>` renders the first matching route. `:name` segments are URL parameters read with `useParams()` (always strings, so pages convert them with `Number(...)`). `*` catches everything else.

### Swiping
```ts
const currentTab = tabIndex(location.pathname)       // 0, 1, 2 or null (not a tab page)
const swipeHandlers = useSwipe({
  onSwipeLeft:  () => currentTab !== null && goToTab(currentTab + 1),
  onSwipeRight: () => (currentTab !== null ? goToTab(currentTab - 1) : goBack()),
})
```
- **On a tab page**, `goToTab(index)` navigates to `TAB_PATHS[index]` (if it exists) with router state `slideStateFor(currentTab, index)`, i.e. `{slideFrom: 'right' | 'left'}`.
- **On any other page**, swiping right calls `goBack()`, which navigates to the page's **back-link target** with `{slideFrom: 'left'}`. Swiping left does nothing. So lift → muscle group → Home is right-swipe, right-swipe.
- How App knows the target: App keeps it in a ref, `swipeBackTarget`, and provides a stable setter (`useCallback`) through `SwipeBackContext` ([`swipeBack.ts`](utilities.md#swipebackts)). Each [`BackLink`](components.md#backlink) registers its `to` in an effect and clears it on unmount. Pages without a `BackLink` (the set forms, Not found) therefore don't swipe back, and a form can't be thrown away by an accidental swipe.

The handlers are spread onto the page wrapper on every page.

### Theme
`useTheme(settings.data?.theme_base, settings.data?.theme_accent)` keeps `<html>`'s `data-base`/`data-accent` in line with Settings on every page. See [`theme.ts`](utilities.md#themets).

### Slide-in animation
```tsx
<div key={location.pathname} className={`${styles.page} ${slideClass}`} …>
```
- `slideClass` is `styles.slideFromRight` / `styles.slideFromLeft` when `location.state.slideFrom` is set (by a swipe, a tab tap, or a back-link tap), otherwise empty.
- `key={location.pathname}` makes React **replace** the wrapper on every navigation, so the CSS animation replays. A side effect is that every page remounts on navigation, which is fine because data comes from the query cache.

### Layout
`<main>` contains the page wrapper and then `<TabBar />`, which is fixed to the bottom and shown on every page.

---

## HomePage

**File:** [`pages/HomePage.tsx`](../../frontend/src/pages/HomePage.tsx) · **Route:** `/` · **Styles:** `HomePage.module.css`

The grid of muscle groups. It's the app's landing page.

**Data:**
| Hook | Use | Blocks rendering? |
| --- | --- | --- |
| `useMuscleGroups()` | the tiles | yes |
| `useSplit()` | which groups are today's | yes (so tiles don't jump when today's groups move up) |

**Behaviour:**
1. Works out today's group ids: `split.data.days.find(d => d.weekday === currentWeekday())?.muscle_group_ids`.
2. Orders tiles as **today's groups first**, then everything else, each in creation order.
3. Renders a `<ul>` 2-column grid. Each tile is a `<Link to="/muscle-groups/:id">` containing:
   - a **TODAY** label (top-left) if it's in today's split, and the tile gets `.today` (blue tint + border),
   - a `<BodyFigure region={regionForMuscleGroup(name)} />`,
   - the name.
4. The heading reads **Lift Tracker** in the accent colour.

**Layout rule:** tiles keep `12px` padding and a `132px` minimum height so all 8 fit on one phone screen. The TODAY label sits in a corner beside the figure's head (see [Design decisions → 29](../01-overview/design-decisions.md#29-home-tiles-keep-their-height)).

---

## MuscleGroupPage

**File:** [`pages/MuscleGroupPage.tsx`](../../frontend/src/pages/MuscleGroupPage.tsx) · **Route:** `/muscle-groups/:muscleGroupId` · **Styles:** `MuscleGroupPage.module.css`

A muscle group's lifts, with last-performed dates, plateau badges, rename/archive, and "add lift".

**Data:**
| Hook | Use |
| --- | --- |
| `useMuscleGroups()` | Finds this group's name. It's usually already cached from Home; there's no single-group endpoint. |
| `useLifts(muscleGroupId)` | The lift list (with `last_performed_on`) |
| `useCreateLift(muscleGroupId)` | "+ Add lift" |
| `useUpdateMuscleGroup()` | Rename/archive |
| `useInsights(todayIsoDate())` | Plateau badges (non-blocking) |

**Behaviour:**
- If the group isn't in the (non-archived) list, it renders `NotFoundPage`, e.g. for an archived group or a bad id.
- **Header:** `BackLink` "‹ Muscle groups" → `/`, then a title row with the name and an `EditItem`.
  - Rename calls `PATCH /muscle-groups/:id`.
  - Archive confirms, PATCHes `{archived: true}`, then navigates home.
- **Lift list:** each row links to `/lifts/:id` and shows the name, an amber **Plateau** pill if flagged, and the last date (`formatDate`) or "—". If there are none: "No lifts yet."
- **Add lift:** `AddByName` ("+ Add lift", placeholder "Lift name, e.g. Hammer curl"). The API is idempotent, so typing an existing lift's name (any case) just returns it.

---

## LiftPage

**File:** [`pages/LiftPage.tsx`](../../frontend/src/pages/LiftPage.tsx) · **Route:** `/lifts/:liftId` · **Styles:** `LiftPage.module.css`

The main view: records per machine, progress charts, history, and the **Log set** button.

**Data:**
| Hook | Use |
| --- | --- |
| `useLiftRecords(liftId)` | Everything on the page (see [records API](../05-api/records.md)) |
| `useMuscleGroups()` | The back link's label (the muscle group's name, or "Back" while loading) |
| `useUpdateLift()` | Rename/archive |

**Flash message handling:** the log and edit pages navigate here with `location.state = {flash: {text, isRecord}}`.
```ts
const [flash] = useState(() => (location.state as LiftPageState | null)?.flash)  // read once
useEffect(() => {
  if (location.state) navigate(location.pathname, { replace: true, state: null })  // then clear it
}, [location.state, location.pathname, navigate])
```
The lazy `useState` initialiser captures the message on the first render only. The effect then removes it from the browser history, so **refreshing doesn't show "New best!" again**. A green `.flashRecord` banner is used for new bests, a neutral `.flash` banner otherwise.

**Rendering:**
1. An `ApiError` with status 404 → `NotFoundPage`. Pending or other errors → `QueryStatus`.
2. `BackLink` to `/muscle-groups/:muscle_group_id`.
3. Title row: the lift name, "(archived)" if archived, and an `EditItem`. Archiving navigates back to the muscle group. Unarchive is offered for archived lifts.
4. The flash banner, if any.
5. A big **Log set** link → `/lifts/:id/log`.
6. "No sets logged yet." or one `MachineCard` per `machine_groups` entry (key = machine id or `'no-machine'`).

---

## LogSetPage

**File:** [`pages/LogSetPage.tsx`](../../frontend/src/pages/LogSetPage.tsx) · **Route:** `/lifts/:liftId/log` · **Styles:** [`FormPage.module.css`](#formpagemodulecss)

The form for logging a new set. It's a thin wrapper around [`SetForm`](components.md#setform).

**Data:** `useLiftRecords(liftId)`, `useSettings()`, `useCreateSet(liftId)`. Waits for records and settings.

**Initial values:**
| Field | Default |
| --- | --- |
| Machine | The machine of the **most recently used** group for this lift (`machine_groups[0].machine`), or none |
| Unit | `lastUnitFor(records, machineId)` (the last unit used on that machine for this lift), else `settings.default_unit` |
| Weight, reps | empty |
| Approximate | off |
| Date | today (`todayIsoDate()`) |
| Notes | empty |

`unitFollowsMachine` is **true**: picking another machine re-derives the unit.

**On submit:** `createSet.mutateAsync({lift_id, ...fields})`. This waits for the cache refresh, so the lift page is current when it appears. Then:
```ts
navigate(`/lifts/${liftId}`, { replace: true, state: { flash } })
```
where `flash` is `{text: "New best at 185 lbs!", isRecord: true}` if `is_new_record`, else `{text: "Logged 185 lbs × 4", isRecord: false}`. `replace: true` swaps the form out of the browser history.

**Heading:** "Log set · *Lift name*".

---

## EditSetPage

**File:** [`pages/EditSetPage.tsx`](../../frontend/src/pages/EditSetPage.tsx) · **Route:** `/lifts/:liftId/sets/:setId` · **Styles:** `FormPage.module.css`

Edit or delete an existing set. It's reached by tapping a row in a machine card's history.

**Data:** `useLiftRecords(liftId)`, `useSettings()`, `useUpdateSet(liftId)`, `useDeleteSet(liftId)`.

**Finding the set:** there's no `GET /sets/{id}`, so it searches the cached records: `machine_groups.find(g => g.history.some(s => s.id === setId))`. If it isn't found it renders `NotFoundPage`, **except** right after a delete (`deleteSet.isPending || deleteSet.isSuccess`), where it renders nothing. Otherwise the refreshed records would briefly flash "Not found" before navigation.

**Initial values** come from the set:
- the machine is the group's machine,
- weight and reps are converted to strings for the inputs,
- `performedOn` is `''` when the date is null,
- notes are `''` when null.

`unitFollowsMachine` is **false**: changing the machine doesn't touch the unit.

**On save:** `updateSet.mutateAsync({setId, fields})`, then navigates back (`replace`) with the flash "Set updated".
**On delete:** `SetForm` shows `window.confirm("Delete this set? This can't be undone.")`, then `deleteSet.mutateAsync(setId)` and navigates back with "Set deleted".

---

## CalendarPage

**File:** [`pages/CalendarPage.tsx`](../../frontend/src/pages/CalendarPage.tsx) · **Route:** `/calendar` (tab 1) · **Styles:** `CalendarPage.module.css`

A GitHub-style activity heatmap turned vertical: one row per week (Sunday to Saturday), newest week at the top.

**Data:** `useCalendar()`. **Local state:** `selectedDate: string | null`.

**Derived values:**
| Name | Computation |
| --- | --- |
| `daysByDate` | `new Map(date → CalendarDay)` |
| `maxSetCount` | the busiest day's `set_count` (0 if none) |
| `earliest` | the last (oldest) day's date, since data is newest first |
| `weeks` | `buildWeeks(todayIsoDate(), earliest)` (see [utilities](utilities.md#calendarts)) |
| `totalSets`, `totalPrs` | sums over all days |

**Rendering:**
1. Heading "Calendar" and a summary: "*N* sets · *M* PRs on *D* days".
2. A CSS grid with 8 columns: month label + Sun…Sat.
   - A header row: an empty corner, then the letters `S M T W T F S`.
   - Per week, a `<Fragment key={week.days[0]}>` with the month label cell and 7 cells. Days after today are empty `<span>`s. Other days are a `DaySquare` button.
3. A "Less ▢▢▢▢▢ More" legend.
4. When a day is selected: a 50vh spacer (so every week can still scroll above the panel) and `<DayDetails>` for that date.

**`DaySquare`** (defined in the same file):
- Props: `date`, `day`, `level`, `isToday`, `isSelected`, `onClick`.
- It's a `<button>` with classes `square`, `level0…4` (via `heatLevel(day.set_count, maxSetCount)`), `today` (grey outline) and `selected` (outline in the text colour).
- `aria-label` reads e.g. "Sep 25: 4 sets, 4 PRs", and `aria-pressed` reflects the selection.
- Tapping toggles the selection: tap again to close.

---

## SettingsPage

**File:** [`pages/SettingsPage.tsx`](../../frontend/src/pages/SettingsPage.tsx) · **Route:** `/settings` (tab 2) · **Styles:** `SettingsPage.module.css`

**Data:** `useSettings()` (blocks), `useUpdateSettings()`, `useCreateMuscleGroup()`.

**Sections**, in this order:
1. **Muscle groups.** A hint ("New muscle groups appear on the Home screen."), then `AddByName` ("+ Add muscle group"). After adding, it shows "“Name” is on the Home screen." because the new tile isn't visible from here.
2. **Weekly split.** A hint, then an "Edit weekly split ›" row that opens [SplitPage](#splitpage).
3. **Theme.** A hint, then a "Change theme ›" row that opens [ThemePage](#themepage).
4. **Default unit.** A segmented control (lbs / kg / plates). Tapping calls `updateSettings.mutate({default_unit})`. The update is optimistic (the cache changes before the server answers), so the selection moves instantly. Errors show "Couldn't save: …".

The two rows use `SettingsLink` (in the same file): a `Link` styled `.linkRow` with a chevron.

There's no back link: Settings is a tab, reached from the tab bar.

---

## SplitPage

**File:** [`pages/SplitPage.tsx`](../../frontend/src/pages/SplitPage.tsx) · **Route:** `/settings/split` · **Styles:** reuses `SettingsPage.module.css` (`title`, `hint`)

**Data:** `useSplit()`, `useMuscleGroups()`.

A `BackLink` "‹ Settings" → `/settings` (so swiping right also goes back), the heading "Weekly split", a hint, then `<SplitEditor split={…} muscleGroups={…} />` once both queries have loaded (`QueryStatus` until then). The Settings tab stays highlighted, because the path starts with `/settings`.

Leaving the page throws away unsaved changes in the editor's draft, just like any other page's local state.

---

## ThemePage

**File:** [`pages/ThemePage.tsx`](../../frontend/src/pages/ThemePage.tsx) · **Route:** `/settings/theme` · **Styles:** reuses `SettingsPage.module.css`

**Data:** `useSettings()` (blocks), `useUpdateSettings()`.

A `BackLink` "‹ Settings" → `/settings` (swipe right works too) and the heading "Theme", then:
1. **Background.** 5 buttons from `THEME_BASES`, each with a preview whose spans carry `data-base` (System shows a light and a dark half) and a dot in the current accent.
2. **Accent.** 8 buttons from `THEME_ACCENTS`, each with a swatch carrying `data-accent`.

Tapping saves `{theme_base}` or `{theme_accent}` immediately (optimistic), and `App.tsx`'s `useTheme` re-colours the whole app straight away. Errors show "Couldn't save: …". The Settings tab stays highlighted.

---

## NotFoundPage

**File:** [`pages/NotFoundPage.tsx`](../../frontend/src/pages/NotFoundPage.tsx)

A heading "Not found" and a link "Back to muscle groups" → `/`. It's rendered by the `*` route, and directly by pages when their item doesn't exist (bad id, archived muscle group, a set that isn't in the lift's history).

---

## FormPage.module.css

**File:** [`pages/FormPage.module.css`](../../frontend/src/pages/FormPage.module.css)

Shared by `LogSetPage` and `EditSetPage`, which have identical headings:

| Class | Style |
| --- | --- |
| `.title` | `1.5rem` heading with spacing above the form |
| `.liftName` | Muted, normal-weight "· Lift name" after the title |
