# Styling

Lift Tracker uses **plain CSS**: one global stylesheet with design tokens (`index.css`), plus a **CSS module** per component or page. There's no Tailwind, UI kit or CSS-in-JS. Colours come from a **theme** chosen in Settings: a background base (System, Light, Dark, Black, Navy) and an accent colour.

---

## How CSS modules work here

```tsx
import styles from './MachineCard.module.css'
<section className={styles.card}>
```

Vite turns each class in a `*.module.css` file into a unique name (e.g. `card` → `_card_x7f2a`), so `.title` in one module never clashes with `.title` in another. Combine classes with template strings: ``className={`${styles.tile} ${styles.today}`}``.

Rules of thumb:
- **Colours, radii and sizes come from tokens** (`var(--accent)`), never hard-coded, so every theme works.
- **Tappable things are at least `var(--tap-size)` (48px) tall.**
- **Inputs use a font size of 16px or more.** iOS Safari zooms the page in on smaller inputs.
- Interactive states use `:active` (a press), because there's no hover on phones.

---

## Design tokens (`index.css`)

**File:** [`frontend/src/index.css`](../../frontend/src/index.css)

### How themes work

`<html>` carries two attributes, and `index.css` has one block of tokens per value:

| Attribute | Values | Set by |
| --- | --- | --- |
| `data-base` | `light`, `dark`, `black`, `navy` | [`theme.ts`](utilities.md#themets) from `settings.theme_base`. **System** is resolved to `light` or `dark` from the phone's setting, and re-resolved when it changes. |
| `data-accent` | `blue`, `green`, `purple`, `orange`, `red`, `pink`, `teal`, `gold` | `theme.ts` from `settings.theme_accent` |

- The blocks are written as `[data-base='navy']` rather than `:root[data-base='navy']`, so **any** element with the attribute gets those tokens. Settings uses that to preview each base inside its own button.
- Plain `:root` (no attributes) gets the light base and blue accent, as a fallback.
- Each accent defines a shade for the light base (`--accent-l`, darker, so white text on it stays readable) and one for dark bases (`--accent-d`). The base block picks one: `--accent: var(--accent-l)` or `var(--accent-d)`. Bright dark-base shades (green, orange, pink, teal, gold) set `--on-accent-d` to near-black text.
- **Derived tokens** use `color-mix()`, so they follow any accent: `--heat-1…3` mix the accent into `--heat-0` at 25/50/75%, `--heat-4` is the accent, and `--accent-tint` is 8% (light) or 11% (dark) accent over `--surface`.
- To avoid a flash of the default colours, a small script in `index.html` sets both attributes from the last theme (cached in `localStorage`) before anything is drawn. See [PWA and assets → index.html](pwa-and-assets.md#indexhtml).

### Colours

| Token | Light | Dark | Black | Navy | Used for |
| --- | --- | --- | --- | --- | --- |
| `--text` | `#1f2328` | `#e6e7ea` | `#e6e7ea` | `#e6e9f0` | Body text |
| `--text-muted` | `#6b6f76` | `#9a9ea6` | `#9a9ea6` | `#94a0b8` | Secondary text, dates, hints |
| `--bg` | `#f6f7f9` | `#111215` | `#000000` | `#0b1324` | Page background |
| `--surface` | `#ffffff` | `#1b1d22` | `#0e0f11` | `#121c31` | Cards, tiles, inputs, tab bar |
| `--surface-pressed` | `#eceef2` | `#262930` | `#1a1b1f` | `#1b2740` | `:active` press feedback, selected options |
| `--border` | `#e3e4e8` | `#2c2e35` | `#1f2125` | `#22304b` | Card and row borders |
| `--border-strong` | `#c9ccd3` | `#3d4049` | `#33363d` | `#34456a` | Input and control borders |
| `--figure` | `#c4c8cf` | `#393c45` | `#2e3138` | `#2d3b5a` | Un-highlighted body-figure parts |
| `--heat-0` | `#ebedf0` | `#262930` | `#1a1b1f` | `#1b2740` | Calendar: no sets |
| `--heat-1…4` | derived | derived | derived | derived | Calendar levels 1–4 (4 = the accent) |
| `--accent` | `--accent-l` | `--accent-d` | `--accent-d` | `--accent-d` | Primary buttons, links, active tab, highlights, chart line |
| `--accent-tint` | derived | derived | derived | derived | Background of today's split tiles |
| `--on-accent` | `--on-accent-l` | `--on-accent-d` | `--on-accent-d` | `--on-accent-d` | Text on accent buttons |
| `--ok` | `#1a7f37` | `#3fb950` | same | same | Success colour (defined but not currently used) |
| `--warn` | `#9a6700` | `#d29922` | same | same | Plateau pill |
| `--error` | `#cf222e` | `#f85149` | same | same | Errors, Delete/Archive buttons |

### Accents

| Accent | `--accent-l` (light base) | `--accent-d` (dark bases) | Text on it (dark bases) |
| --- | --- | --- | --- |
| blue (default) | `#1f6feb` | `#4c8dff` | white |
| green | `#1a7f37` | `#3fb950` | `#0d1117` |
| purple | `#8250df` | `#a371f7` | white |
| orange | `#bc4c00` | `#f0883e` | `#0d1117` |
| red | `#cf222e` | `#f85149` | white |
| pink | `#bf3989` | `#f778ba` | `#0d1117` |
| teal | `#0f7b8a` | `#39c5cf` | `#0d1117` |
| gold | `#9a6700` | `#e3b341` | `#0d1117` |

Text on the light-base shades is always white. `--accent-swatch` is a helper for the Settings swatches: each swatch carries its own `data-accent`, and gets `--accent-l` or `--accent-d` depending on the current base.

**Adding a base or accent:** add the value to the enum in `backend/app/models.py` and a migration (`ALTER TYPE … ADD VALUE`), to the union in `api/types.ts`, to `THEME_BASES`/`THEME_ACCENTS` in `theme.ts`, and a token block in `index.css`.

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
| `index.html` `theme-color` metas | `#f6f7f9` / `#111215` | Initial browser UI colour. `theme.ts` overwrites both with the current `--bg` once the theme is applied. |
| `manifest.webmanifest` | `#f6f7f9`, `#1f6feb` | Must be literal values; it doesn't follow the chosen theme |
| Icon SVG | `#1f6feb`, white | Matches the light accent |

### Global rules in `index.css`

| Selector | Rule | Why |
| --- | --- | --- |
| `:root` | `font: 16px/1.5 system-ui, …` | Native system font on every device |
| each base block | `color-scheme: light` or `dark` | Native controls (date picker, checkboxes) match the chosen base |
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
| `pages/HomePage.module.css` | `title`, `grid`, `tile`, `today`, `todayLabel` | `.today` overrides `--figure` with `color-mix(--text-muted 60%, --accent-tint)` so the figure stays visible on the tint; 2-column grid; tiles `min-height: 132px; padding: 12px` (keep, so all 8 fit on screen); the TODAY corner label is 0.6rem uppercase |
| `pages/LiftPage.module.css` | `titleRow`, `title`, `archived`, `logButton`, `flash`, `flashRecord`, `cards`, `empty` | Log set is a 56px accent link-button |
| `pages/MuscleGroupPage.module.css` | `titleRow`, `title`, `list`, `row`, `liftName`, `badge`, `lastDate`, `empty` | Rows ≥ 60px; `badge` = amber outlined "Plateau" pill |
| `pages/TodayPage.module.css` | `title`, `date`, `summary`, `flash`, `flashRecord`, `group`, `groupTitle`, `groupProgress`, `cards`, `empty`, `showAll`, `rest`, `restTitle`, `restNext`, `restLink` | Uppercase group headings; dashed Show all button; centred rest-day card |
| `components/TodayLiftCard.module.css` | `card`, `done`, `header`, `name`, `plateau`, `doneMark`, `machine`, `rows`, `row`, `label`, `value`, `set`, `target`, `muted`, `pr`, `logButton` | Done cards get an accent border; `set` is `nowrap`; PR badge `#1a7f37` |
| `pages/BodyPage.module.css` | `title`, `sectionLabel`, `hint`, `segmented`, `segment`, `segmentActive`, `form`, `field`, `label`, `inputRow`, `input`, `suffix`, `save`, `message`, `stats`, `stat`, `statLabel`, `statValue`, `statValueStrong`, `strength`, `strengthRow`, `strengthName`, `strengthDetail`, `ratio`, `footnote` | Inputs 48px tall, 16px font; stat rows label-left/value-right in one card; ratio in accent |
| `pages/SettingsPage.module.css` | `title`, `label`, `sectionLabel`, `hint`, `segmented`, `segment`, `segmentActive`, `linkRow`, `bases`, `base`, `baseActive`, `basePreview`, `basePreviewHalf`, `basePreviewDot`, `accents`, `accent`, `accentActive`, `accentSwatch`, `repRange`, `select`, `error`, `added` | Also used by `SplitPage` and `ThemePage`. `linkRow`: a 52px bordered row with a muted chevron that opens another page. Theme pickers (ThemePage): a 5-column grid of base buttons (each preview span has `data-base`, so `var(--bg)` shows that base) and a 4-column grid of accent buttons (`accentSwatch` uses `--accent-swatch`); the selected one gets an accent border. |

### Shared patterns
- **Segmented control** (`segmented` / `segment` / `segmentActive`), in SetForm and SettingsPage: a bordered row of equal buttons, the active one filled with `--accent`. Adjacent segments get a left border (`.segment + .segment` etc.).
- **Title row** (`titleRow`), in MuscleGroupPage and LiftPage: a flex row with the title and the Edit button, `flex-wrap: wrap`. `.titleRow > form { flex-basis: 100% }` makes an open Edit panel drop to its own line.
- **Badges/labels:** small uppercase bold text in `--accent` (TODAY) or `--warn` (Plateau).

---

## Mobile checklist

When adding UI, check:
- [ ] Tap targets ≥ 48px tall (`min-height: var(--tap-size)`)
- [ ] Inputs have a font-size of 16px or more (`1rem`)
- [ ] It fits at **320px** wide (smallest iPhone) with no sideways scrolling
- [ ] It looks right on a light and a dark base, with a couple of accents (only tokens used)
- [ ] Nothing is hidden behind the fixed tab bar (`#root` bottom padding handles normal flow; fixed elements must offset by `--tab-bar-height`)
- [ ] Animations are disabled under `prefers-reduced-motion`
- [ ] On Home, all 8 tiles still fit on a ~390×844 screen

To check phone widths on a Mac: Chrome DevTools → device toolbar (`Cmd+Shift+M`).
