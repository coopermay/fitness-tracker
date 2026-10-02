# Styling

Lift Tracker uses **plain CSS**: one global stylesheet with design tokens (`index.css`), plus a **CSS module** per component or page. There's no Tailwind, UI kit or CSS-in-JS. Dark mode follows the phone's setting automatically.

---

## How CSS modules work here

```tsx
import styles from './MachineCard.module.css'
<section className={styles.card}>
```

Vite turns each class in a `*.module.css` file into a unique name (e.g. `card` → `_card_x7f2a`), so `.title` in one module never clashes with `.title` in another. Combine classes with template strings: ``className={`${styles.tile} ${styles.today}`}``.

Rules of thumb:
- **Colours, radii and sizes come from tokens** (`var(--accent)`), never hard-coded, so dark mode works.
- **Tappable things are at least `var(--tap-size)` (48px) tall.**
- **Inputs use a font size of 16px or more.** iOS Safari zooms the page in on smaller inputs.
- Interactive states use `:active` (a press), because there's no hover on phones.

---

## Design tokens (`index.css`)

**File:** [`frontend/src/index.css`](../../frontend/src/index.css)

Defined on `:root`. Dark values replace them inside `@media (prefers-color-scheme: dark)`.

### Colours

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--text` | `#1f2328` | `#e6e7ea` | Body text |
| `--text-muted` | `#6b6f76` | `#9a9ea6` | Secondary text, dates, hints |
| `--bg` | `#f6f7f9` | `#111215` | Page background |
| `--surface` | `#ffffff` | `#1b1d22` | Cards, tiles, inputs, tab bar |
| `--surface-pressed` | `#eceef2` | `#262930` | `:active` press feedback, selected options |
| `--border` | `#e3e4e8` | `#2c2e35` | Card and row borders |
| `--border-strong` | `#c9ccd3` | `#3d4049` | Input and control borders |
| `--figure` | `#c4c8cf` | `#393c45` | Un-highlighted body-figure parts |
| `--heat-0` | `#ebedf0` | `#262930` | Calendar: no sets |
| `--heat-1` | `#c4d9fc` | `#15305c` | Calendar level 1 |
| `--heat-2` | `#86b1f7` | `#1d4a94` | Calendar level 2 |
| `--heat-3` | `#4a8af0` | `#2f6ad1` | Calendar level 3 |
| `--heat-4` | `#1f6feb` | `#4c8dff` | Calendar level 4 (= accent) |
| `--accent` | `#1f6feb` | `#4c8dff` | Primary buttons, links, active tab, highlights, chart line |
| `--accent-tint` | `#eaf1fe` | `#18243a` | Background of today's split tiles |
| `--on-accent` | `#ffffff` | `#ffffff` | Text on accent buttons |
| `--ok` | `#1a7f37` | `#3fb950` | Success colour (defined but not currently used) |
| `--warn` | `#9a6700` | `#d29922` | OVERDUE label, Plateau pill |
| `--error` | `#cf222e` | `#f85149` | Errors, Delete/Archive buttons |

### Sizes

| Token | Value | Used for |
| --- | --- | --- |
| `--radius` | `12px` | Cards, buttons, inputs |
| `--tap-size` | `48px` | Minimum height of tappable elements |
| `--tab-bar-height` | `60px` | Tab bar height; page bottom padding; the calendar panel's offset |

### Deliberate hard-coded colours
| Where | Value | Why |
| --- | --- | --- |
| `.flashRecord` (LiftPage) and `.prBadge` (DayDetails) | `#1a7f37` + white text | The same green in both modes, so white text stays readable (dark-mode `--ok` is too light for white text) |
| `index.html` `theme-color` metas | `#f6f7f9` / `#111215` | Browser UI colour must be a literal value; it matches `--bg` |
| `manifest.webmanifest` | `#f6f7f9`, `#1f6feb` | Same reason |
| Icon SVG | `#1f6feb`, white | Matches the light accent |

### Global rules in `index.css`

| Selector | Rule | Why |
| --- | --- | --- |
| `:root` | `font: 16px/1.5 system-ui, …` | Native system font on every device |
| `:root` | `color-scheme: light dark` | Native controls (date picker, scrollbars, checkboxes) follow the theme |
| `:root` | `-webkit-tap-highlight-color: transparent` | No grey flash on tap (iOS) |
| `html` | `touch-action: manipulation` | Disables double-tap-to-zoom, so taps register instantly |
| `html` | `-webkit-text-size-adjust: 100%` | Stops iOS enlarging text in landscape |
| `body` | `overflow-x: clip` | Pages sliding in briefly overhang the edge; this stops a sideways scrollbar appearing |
| `*` | `scrollbar-width: none` | Hide scrollbars (standard) |
| `*::-webkit-scrollbar` | `display: none` | Hide scrollbars (Safari, older Chrome) |
| `#root` | `max-width: 640px; margin: 0 auto` | Phone-width column, centred on big screens |
| `#root` | `padding: max(8px, safe-top) max(16px, safe-right) calc(tab-bar + 32px + safe-bottom) max(16px, safe-left)` | Clears the notch and home bar in standalone mode; leaves room above the fixed tab bar |
| `a` | `color: var(--accent)` | |
| `button` | `cursor: pointer` | Desktop nicety |

`env(safe-area-inset-*)` only has values when the page uses `viewport-fit=cover` (set in `index.html`), i.e. when the app is drawn under the notch.

---

## App.module.css

**File:** [`frontend/src/App.module.css`](../../frontend/src/App.module.css)

| Class / rule | Purpose |
| --- | --- |
| `.page` | The page wrapper; `min-height: calc(100svh - var(--tab-bar-height) - 64px)`, so a swipe anywhere above the tab bar counts, even on short pages |
| `.slideFromRight` / `.slideFromLeft` | `animation: slide-from-… 220ms ease-out` |
| `@keyframes slide-from-right` / `slide-from-left` | From `opacity: 0; transform: translateX(±48px)` to the normal position |
| `@media (prefers-reduced-motion: reduce)` | Turns both animations off, respecting the phone's accessibility setting |

---

## Component and page modules

Every module and its classes. Shared patterns (segmented controls, title rows, badges) are described once below the table.

| Module | Classes | Notes |
| --- | --- | --- |
| `components/AddByName.module.css` | `button`, `form`, `input`, `actions`, `save`, `cancel`, `error` | Dashed full-width button; input font 1rem |
| `components/BackLink.module.css` | `back` | Accent pill: 40px tall, `border-radius: 999px`, chevron + label |
| `components/BodyFigure.module.css` | `figure`, `part`, `active` | `figure` is 96px tall, width auto; `part` fill `--figure`, `active` fill `--accent` |
| `components/DayDetails.module.css` | `sheet`, `header`, `date`, `summary`, `close`, `lifts`, `liftName`, `sets`, `set`, `machine`, `prBadge` | Fixed panel above the tab bar, max 50vh, scrollable, top-rounded, shadow |
| `components/EditItem.module.css` | `editButton`, `panel`, `label`, `input`, `actions`, `save`, `cancel`, `archive`, `restore`, `error` | Muted small "Edit"; the panel is a bordered card; Archive is error-outlined |
| `components/HistoryList.module.css` | `list`, `row`, `date`, `main`, `chevron`, `notes` | Row grid `5.5em 1fr auto`; tabular numbers; notes on a second line |
| `components/MachineCard.module.css` | `card`, `header`, `title`, `archived`, `lastDate`, `unitHeading`, `records`, `recordLine`, `recordMain`, `recordDate`, `oneRepMax`, `toggle` | `recordMain` is 1.25rem bold (readable between sets); header wraps an open `EditItem` (`.header > form`) |
| `components/MachineCombobox.module.css` | `container`, `input`, `options`, `option`, `selectedOption`, `createOption`, `noMachineOption`, `error` | Dropdown is absolutely positioned, `max-height: 50vh`, `z-index: 10` |
| `components/ProgressChart.module.css` | `chart`, `caption`, `metric`, `svg`, `guide`, `yLabel`, `xLabelStart`, `xLabelEnd`, `line`, `pointGroup`, `hitArea`, `point`, `pointSelected` | SVG elements styled with `fill`/`stroke`; guides dashed; text 10px |
| `components/SetForm.module.css` | `form`, `field`, `label`, `hint`, `row`, `numberInput`, `textInput`, `segmented`, `segment`, `segmentActive`, `toggle`, `error`, `submit`, `cancel`, `delete` | Number inputs 5em wide, 1.4rem bold; date input gets `appearance: none` (iOS sizing fix); submit is 56px tall |
| `components/SplitEditor.module.css` | `days`, `day`, `dayButton`, `dayName`, `summary`, `chevron`, `chips`, `chip`, `chipSelected`, `save`, `message` | Rows in one bordered card; chips are 40px pills; the summary truncates with an ellipsis |
| `components/TabBar.module.css` | `bar`, `slots`, `tab`, `tabActive`, `label`, `placeholder` | Fixed bottom, `z-index: 20`, 5-column grid, safe-area bottom padding |
| `pages/CalendarPage.module.css` | `title`, `totals`, `grid`, `weekday`, `month`, `square`, `today`, `selected`, `level0`…`level4`, `legend`, `legendSquare`, `sheetSpacer` | Grid `2.5rem repeat(7, minmax(0, 1fr))`, gap 5px, max 420px; squares `aspect-ratio: 1`, radius 6px |
| `pages/FormPage.module.css` | `title`, `liftName` | Shared by log/edit set pages |
| `pages/HomePage.module.css` | `title`, `grid`, `tile`, `today`, `todayLabel`, `overdueLabel` | 2-column grid; tiles `min-height: 132px; padding: 12px` (keep, so all 8 fit on screen); corner labels are 0.6rem uppercase |
| `pages/LiftPage.module.css` | `titleRow`, `title`, `archived`, `logButton`, `flash`, `flashRecord`, `cards`, `empty` | Log set is a 56px accent link-button |
| `pages/MuscleGroupPage.module.css` | `titleRow`, `title`, `list`, `row`, `liftName`, `badge`, `lastDate`, `empty` | Rows ≥ 60px; `badge` = amber outlined "Plateau" pill |
| `pages/SettingsPage.module.css` | `title`, `label`, `sectionLabel`, `hint`, `segmented`, `segment`, `segmentActive`, `error`, `added` | |

### Shared patterns
- **Segmented control** (`segmented` / `segment` / `segmentActive`), in SetForm and SettingsPage: a bordered row of equal buttons, the active one filled with `--accent`. Adjacent segments get a left border (`.segment + .segment` etc.).
- **Title row** (`titleRow`), in MuscleGroupPage and LiftPage: a flex row with the title and the Edit button, `flex-wrap: wrap`. `.titleRow > form { flex-basis: 100% }` makes an open Edit panel drop to its own line.
- **Badges/labels:** small uppercase bold text in `--accent` (TODAY) or `--warn` (OVERDUE, Plateau).

---

## Mobile checklist

When adding UI, check:
- [ ] Tap targets ≥ 48px tall (`min-height: var(--tap-size)`)
- [ ] Inputs have a font-size of 16px or more (`1rem`)
- [ ] It fits at **320px** wide (smallest iPhone) with no sideways scrolling
- [ ] It looks right in both light and dark mode (only tokens used)
- [ ] Nothing is hidden behind the fixed tab bar (`#root` bottom padding handles normal flow; fixed elements must offset by `--tab-bar-height`)
- [ ] Animations are disabled under `prefers-reduced-motion`
- [ ] On Home, all 8 tiles still fit on a ~390×844 screen

To check phone widths on a Mac: Chrome DevTools → device toolbar (`Cmd+Shift+M`).
