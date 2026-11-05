# Scalar Design System — AI Build Guide

**Read this file before writing any Scalar product UI.** It is the complete
contract: the rules, the decision tables ("railroads"), and the component API.
If a rule here conflicts with a screenshot, a mockup, or an older page in the
repo, **this file wins** — an existing screen is never a reference, only this
contract is.

- **Source of truth:** `Scalar_Design_System-v1.1` (tokens, Figma file
  `anrnTIJKgu27zV224h7vON`) and `Scalar_Design_System-Components` (Figma file
  `Z4MtKOfkNEzhMYJzN1q3kR`).
- **Scale:** 491 design tokens · 168 Figma components plus the code-layer and Workboard families · Light + Dark · 3 type modes.
- **Live components:** [Storybook](https://scalar-ds-storybook.netlify.app), deployed from `main`.
- **Verify your work:** `npm run verify` (typecheck + token-contract lint).

---

**Building a screen? Start from `PageTemplate`** — it owns the navigation, the
body slot and the docked drawer, and you only supply the content. Read
[docs/page-template.md](docs/page-template.md) (§6 is the agent rules) before
writing any page.

**Building a product screen? Read §11 too.** It sets the product-logic rules (P1–P10): which date and version a
value belongs to, why empty is not zero, and why maths never goes in the UI.

---

## 0. Setup — do this once per application

```tsx
import '@scalar/design-system/styles.css';
import { ScalarProvider } from '@scalar/design-system';

export default function App() {
  return (
    <ScalarProvider mode="light" viewport="auto">
      <YourApp />
    </ScalarProvider>
  );
}
```

`mode` is **`light`** — always, for every page, even when the machine is set to
dark (R14). `dark` is a library-only preview; `system` no longer follows the OS. `viewport` is `desktop | desktop-large |
mobile | auto` and selects the **type ramp**, not the layout.

Everything else imports by name from the package root:

```tsx
import { Button, DataGrid, Cell, color, space, type } from '@scalar/design-system';
```

Charts pull in Chart.js. If your bundle is size-sensitive and a route uses no
charts, import them from the narrow entry point instead of the root barrel:

```tsx
import { BarChart } from '@scalar/design-system/charts';
```

---

## 1. The hard rules

These are the system's rules (R1–R13 from the Figma contract, plus R14–R16 for code), restated for code. Breaking one is a
bug, not a style preference.

| # | Rule |
|---|------|
| **R1** | Never use a `--primitive-*` token in product code. The primitive collections are published and visible in Figma and in `tokens.css`, but they are off-limits to developers and AI agents — **only the Semantic collections are for use.** Primitives have no mode and will not respond to the theme. |
| **R2** | Colour from `color.*`. Type from `type.style()` or a `scalar-type-*` class. **Gap and padding** from `space.*`. Radius from `radius.*`. **Width and height** from `size.*`. Never cross `space` and `size`. |
| **R3** | Every filled surface has a matching on-colour. `bg.brand` pairs with `text.onBrand` and `icon.onBrand`. **`text.primary` on a filled surface is a contrast bug.** |
| **R4** | Yellow is the exception. `bg.warning` is identical in both modes and `text.onWarning` is near-black in both. White can never clear AA on yellow. |
| **R5** | `stroke.default`, `stroke.subtle` and `stroke.divider` are non-interactive **container** edges (~1.2–1.7:1, allowed — WCAG 1.4.11 covers components, not containers). Anything clickable, focusable or typable takes `stroke.control`, which clears 3:1. |
| **R6** | The type ramp has three modes: Desktop (1440, default), Desktop Large (1920), Mobile (393). Set it on `ScalarProvider`. **Never hand-resize type.** |
| **R7** | Weight is orthogonal to size. Changing weight never moves size, line-height or tracking. |
| **R8** | **Colour alone never carries meaning.** Status needs an icon or words. Chart series need direct labels. Links need a permanent underline. |
| **R9** | Elevation is a ladder: `raised` < `overlay` < `modal`. Shadow colours are token-bound and deepen automatically in Dark. |
| **R14** | **Pages are always light mode**, even when the machine's system style is dark. `ScalarProvider` defaults to `mode="light"` and the stylesheet does not follow `prefers-color-scheme`. Never ship `mode="dark"`, never set `data-theme="dark"` on a page, never add your own dark styling. Dark exists for the library only. |
| **R15** | **No table shows pagination.** `DataGrid` and `Table` render every row they are given, and nothing pages them: never put a `Pagination` (or `PageItem`) under or beside a table, never `slice` a table's rows into pages, and never add page / rows-per-page state to a screen. A long grid stays one grid — bound it with `DataGrid`'s `maxHeight` so the body scrolls under a sticky header. In `apps/product` a page whose body holds exactly one table gets this automatically (the shell's `usePinnedTableHead` pins its `ColumnHeader` row under the navigation tiers); a page with two or more tables is never pinned — the whole body scrolls. `npm run lint:tables` fails on any `Pagination` in product or example code. |
| **R16** | **Every table uses the one column header, `ColumnHeader`.** `DataGrid` and `Table` heads are built from `ColumnHeader` (navy `brand` band by default; `tone="subtle"` for a table inside a card or modal). Never use `GridColumnHeader` or `AddColumnHeader` in product code — a sortable column is `ColumnHeader sort onSortChange`, a filter is its `actions`, an editable column is `input` + `icon`, and the trailing add-column header is the product's `AddColumn` (`ColumnHeader kind="action-button"`). Grid-pattern *cells* (`RowLabelCell`, `GridValueCell`, `ColumnGroupHeader`) stay. In a financial statement a period's kind ("Projection", "LTM", "NTM", "As Of") is the header's `label` tag, the only break between periods is the actuals→projections rule (`GridColumnDivider type="period"`), and the trailing LTM / NTM / As Of columns follow the last projection directly — no gutter, spacer or blank track (Storybook *Data › GridPatterns › Statement Trailing Periods*). `npm run lint:tables` fails on the grid-pattern headers in product or example code. |
| **R10** | **Text floor is 12px** for everything a user reads. `heading.xs` (10px) is the single sanctioned exception, for data-grid chrome only — column headers and in-cell labels, never prose, form labels or helper text. Display is marketing-only. Uppercase labels use the Overline role, which owns the +0.8px tracking — never set `letterSpacing` yourself. |
| **R11** | PRISM says what an item **represents** — never access, availability or permission. |
| **R12** | 33 of the 78 type tokens are identical across all three modes. That is intentional. Do not "fix" them. |
| **R13** | If you add a `bg.*` or a PRISM concept, re-run the contrast matrix against Page, Surface, Surface Raised and Subtle before shipping. |

---

## 2. Railroad — "I need a colour"

Never pick a colour by eye. Find the row that matches the **job**.

| The job | Use | Never use |
|---------|-----|-----------|
| Body text on a page | `color.text.primary` | a primitive, `#0f172a` |
| Supporting / secondary text | `color.text.secondary` | opacity on primary |
| Labels, captions, metadata | `color.text.tertiary` | a lighter grey you picked |
| Text on a **filled** brand surface | `color.text.onBrand` | `color.text.primary` (R3) |
| A control sitting **on the brand bar** (chip, search, notification) | `color.bg.onBrand` | `bg.brandSubtle` — a light chip on navy |
| The value inside such a control | `color.text.onBrandSubtle` | `text.tertiary` |
| Its placeholder or field-label prefix | `color.text.onBrandMuted` | `text.disabled` |
| An **inactive** top-level nav label on the bar | `color.text.onBrandInactive` | `text.onBrand` for every item alike |
| The active nav item's underline | `color.stroke.onBrand` | a `bg.brandSubtle` chip (R3) |
| Icons inside bar controls | `color.icon.onBrandSubtle` / `.onBrandMuted` / `.onBrandInactive` | `icon.primary` |
| Text on a filled **yellow** surface | `color.text.onWarning` (near-black) | white (R4) |
| A primary action's fill | `color.bg.brand` + `text.onBrand` | `bg.brandSubtle` |
| A destructive action's fill | `color.bg.negative` + `text.onNegative` | brand recoloured by hand |
| An **unread** indicator dot | `color.bg.unread` | `bg.negative` — unread is not an error |
| A **group band** row in a data grid (VIP Fund, Holding Co.) | `color.bg.groupHeader` + `text.onGroupHeader` | `bg.onBrand` — it inverts to pale blue in Dark |
| **Alternate-row** striping in a dense data grid | `color.bg.rowStripe` | `bg.subtle` — it is not the grid's striping token |
| The structural rule in a striped grid (under the header, above totals) | `color.stroke.gridRule` | `stroke.default` |
| The **row-label** column of a grid (line items, subtotals, totals) | `color.text.rowLabel` | `text.primary` |
| A grid **table title**, column-group label or single-row column header | `color.text.gridHeader` | `text.primary` |
| A **file type** badge (PDF, DOCX, XLSX…) | `color.file.<kind>.background` + `.text` | `bg.negative` for a PDF — a format is not a status |
| A **product** tile or mark (Intelligence, Valuations, Waterfalls, Documents) | `color.product.<key>.background` + `.icon` | status tints, or the AI family for Waterfalls |
| The outline of an item **AI is working on** | `AiOutline`, or `color.gradient.ai.*` (violet → blue → teal → pink) | PRISM tokens, even where the values match (R11), or a hand-built gradient |
| A Workboard **step** colour (Blue, Pink, Cyan, Orange) | `WorkflowTone` on `ActionPill` / `ActionTag`, or `color.workflow.<tone>.*` | a `--primitive-*` step (R1), or brand/warning standing in |
| The Workboard **Deal** card's fill and everything on it | `DealCard tone="deal"`, or `color.deal.background` + `.text` (`.subtle` / `.subtleText` for a pill, `.control` for a button) | `bg.positive` (a deal is not a status), white text (2.25:1 on the fill), a `--primitive-teal-*` step (R1) |
| A status **tint** (pill, badge, alert ground) | `color.bg.*Subtle` + matching `color.text.*` | a saturated fill with 12px white text |
| A card or panel surface | `color.bg.surface` | `bg.page` |
| A surface lifted above another surface | `color.bg.surfaceRaised` | a lighter hex |
| The page itself | `color.bg.page` | `bg.surface` |
| A zebra stripe / hover ground | `color.bg.subtle` | opacity |
| A **container** edge (card, divider, table frame) | `color.stroke.default` / `.subtle` / `.divider` | `stroke.control` |
| An **interactive** edge (input, checkbox, anything clickable) | `color.stroke.control` | `stroke.default` (fails 3:1) (R5) |
| A keyboard focus ring | `color.stroke.focus`, 2px, **outside** | a coloured box-shadow |
| An icon beside body text | `color.icon.secondary` | `text.tertiary` |
| An inline link | `color.text.link` + permanent underline | `text.brand` with no underline (R8) |
| A chart series | `chart.series[i]`, assigned in order | cycling, or hand-picked hexes |
| "What kind of thing is this?" in search / nav | a PRISM token — see §6 | `text.brand` |
| A scrim behind a modal | `color.overlay.scrim` | `rgba(0,0,0,.5)` |

**Hover and pressed are tokens, not filters.** `bg.brandHover`,
`bg.brandPressed`. Never `filter: brightness()` or an opacity change.

---

## 3. Railroad — "I need a size or a space"

Two scales that must never be crossed (R2).

**`space.*` — gap and padding only.**

| Token | Value | Typical use |
|-------|-------|-------------|
| `space['2xs']` | 2px | icon-to-text in dense grid furniture |
| `space.xs` | 4px | inside a chip or badge |
| `space.s` | 8px | between a label and its control |
| `space.m` | 12px | card padding, menu row padding |
| `space.l` | 16px | between related blocks |
| `space.xl` | 24px | between sections |
| `space['2xl']` | 32px | around an empty state |
| `space['3xl']` · `space['4xl']` | 48 · 64px | page-level rhythm |

**`size.*` — width and height only.**

| Token | Value | Use |
|-------|-------|-----|
| `size.icon.xs … xl` | 12 · 16 · 20 · 24 · 32 | every icon. Never hand-size one. |
| `size.control.s / m / l` | 32 · 40 · 48 | button and field heights |
| `size.avatar.xs … xl` | 24 · 32 · 40 · 56 · 80 | every avatar |
| `size.iconWell.m / l` | 40 · 56 | a container holding one glyph (Product Tile mark, Dropzone well) — not `size.avatar` |
| `size.progressRing.m` | 48 | Progress Ring diameter |
| `size.row.compact` | 26px | data-grid row min-height |
| `size.row.header` | 40px | data-grid header row height |
| `size.divider.pinned` | 4px | the divider before a pinned Total column (Grid Column Divider, Type = Pinned) |
| `size.target.minimum` | **44px** | the tap target floor |
| `size.target.dense` | 24px | documented exception: dense grid only |

**`radius.*`** — `2xs` 2 (grid cells) · `xs` 4 (buttons, chips, inputs-in-bar) ·
`s` 8 (fields, cards, modals) · `m` 16 (large panels) · `full` (avatars, pills).

**Targets.** Every interactive control reaches `size.target.minimum` (44px) even
when the drawn box is smaller. The exception is dense grid furniture, which
cannot and is documented as such in `docs/known-gaps.md`.

---

## 4. Railroad — "I need type"

Pick a **role** by job, then a **step** by prominence. Never pick a role because
it happened to be the right size.

| Role | What it is for | Steps |
|------|----------------|-------|
| `display` | **Marketing only.** Never in product UI. | s · m · l |
| `heading` | Section and page titles, table column headers | **xs** · s · m · l · xl · 2xl · 3xl · 4xl · 5xl |
| `text` | Body copy, table cell content | s · m · l · xl · 2xl |
| `label` | Form labels, button labels, compact UI furniture | s · m · l |
| `link` | Inline links — tracks body text without a heading's tracking | s · m · l |
| `overline` | Uppercase group labels. **Owns +0.8px tracking.** | s · m |

```tsx
// Preferred — the semantic components:
<Heading level={1} step="3xl">Valuation summary</Heading>
<Text step="m" tone="secondary">Last reviewed 14 months ago.</Text>
<Overline>Companies</Overline>

// When you need the raw CSS (e.g. for a third-party component):
<div style={type.style('heading', '2xl', 'semiBold')} />
```

**The floor is 12px (R10)** for everything a user reads. `heading.xs` is the one
step below it, at 10px — added for the v1.1 data-grid chrome, and scoped to
column headers and in-cell labels. Do not reach for it to make something fit:
if a design shows 10px or 11px *prose*, raise it to 12 and expect the layout to
reflow.

**Never set `letterSpacing`.** The Overline role carries its own tracking, and
setting it by hand detaches the step.

---

## 5. Railroad — "I need a component"

Find the **intent**, not the shape.

| Intent | Component | Not this |
|--------|-----------|----------|
| Run an action | `Button` | `Link` |
| Navigate somewhere | `Link` | `Button` |
| Run an action with an unambiguous glyph only | `ButtonIcon` (`label` required) | `Button` with no text |
| Start a generative action | `AIButton` / `AITool` | a purple `Button` |
| Show that AI is working on an item (card, notification) | `AiOutline` + words or a `Spinner` | a hand-made gradient border, or the outline alone (R8) |
| Ask for one short value | `FormField` + `Input` | a bare `Input` |
| Ask for long free text | `FormField` + `Textarea` | a tall `Input` |
| Pick one of **≤7** options | `Radio` group | `Select` |
| Pick one of **>7** options | `Select` | a long `Radio` group |
| Toggle a setting that applies **at once** | `Switch` | `Checkbox` |
| Toggle a setting that needs **Save** | `Checkbox` | `Switch` |
| Pick a date near today | `DatePicker` | a typed field alone |
| Pick a far-off date | a typed field **plus** `DatePicker` | `DatePicker` alone |
| State a fact about an item | `Chip` | `Button` |
| Show a count or marker | `Badge` | `Chip` |
| Show the state of a valuation's **work** | `ModalStatus` | `Chip` |
| Show the state of a **deal** | `ValuationStatus` | `ModalStatus` |
| Switch between peer views of one thing | `Tabs` | `Stepper` |
| Move through an ordered process | `Stepper` | `Tabs` |
| A long table | one `DataGrid` with every row (`maxHeight` to bound it) — **never paginated** (R15) | `Pagination`, or splitting the rows into pages |
| Show where the page sits in the hierarchy | `Breadcrumb` | a back button |
| Message the user must act on | `Alert` (inline, persistent) | `Toast` |
| Acknowledge something that already happened | `Toast` (transient) | `Alert` |
| Focused task, page stays visible | `Drawer` | `Modal` |
| Task needing full attention, must finish first | `Modal` | `Drawer` |
| Secondary detail on a dense page | `Accordion` | a `Modal` |
| Surface with nothing in it | `EmptyState` | a blank div |
| Content not loaded yet (first load, known shape) | `Skeleton` | a spinner |
| Progress of a task with a known total | `ProgressBar` (determinate) | indeterminate |
| A dense grid of figures, read-only | `DataGrid` + `Row` + `Cell` | an HTML `<table>` |
| A spreadsheet-like table: selection, resize, formula view, editing | `Table` | a product-specific table or a fork of `Table` |
| Explain the control under the pointer | `Tooltip` | placeholder text |
| Search everything, from anywhere | `GlobalSearch` | a page filter |
| Compare magnitude across categories | `BarChart` | a line chart |
| Show change over time | `LineChart` | a bar chart |
| Show composition **and** a meaningful total | `BarChart type="stacked"` | a donut over time |
| Show one composition's split | `DonutChart` (≤8 slices) | a pie |
| Show how a figure becomes another figure | `WaterfallChart` | a bar chart |
| Page / row / column actions behind a ⋮ | `ContextMenu` + `MenuItem` | a row of icon buttons |
| A main action with alternatives | `SplitButton` | two adjacent Buttons |
| The page's one floating "add" action | `Fab` (+ `SpeedDial` for a choice) | a fixed primary Button |
| Switch between 2–4 views of the same content | `SegmentedControl` | `Tabs`, or `ToolSwitch` (product switch only) |
| Saved views / scenarios / notes as tabs | `ViewTabBar` + `ViewTab` | `Tabs` with a hand-rolled kebab |
| A page-level or modal form field | `FloatingLabelInput` / `FloatingLabelSelect` | `FormField` (keep that for dense forms) |
| Pick from a list that can exceed ~8 items | `ComboboxPanel` | `Select` |
| A number with a unit, or an integer count | `NumberField` | `Input type="number"` |
| Several short values (domains, names) | `TagInput` | a comma-separated `Input` |
| A value the user must copy elsewhere | `CopyField` | a read-only `Input` |
| A list of like rows the user adds/removes | `RepeatableRow` + tertiary "+ Add" | a grid |
| Upload a file | `Dropzone` | a bare file input |
| Confirm a consequential action | `ConfirmationDialog` | `window.confirm` or an `Alert` |
| A page-level message spanning the page | `Banner` | `Alert` (boxed, in-section) |
| Work with no known duration | `Spinner` | `ProgressBar` indeterminate |
| A count-based goal (3/5 answered) | `ProgressRing` | a `Badge` |
| A preference that applies at once | `SettingRow` | `CheckboxItem` |
| Row hierarchy in a financial statement | `RowLabelCell` + `GridValueCell` | bold text in a `Cell` |
| A file in a list | `FileRow` + `FileTypeBadge` (dense tree: `layout="inline"` + `typeIndicator="icon"` → `FileTypeIcon`) | a `Link` with an icon |
| A label/value pair in a description list | `KeyValueRow` | a two-column `DataGrid` |
| The open menu of a select / picker trigger (≤ ~8 options) | `SelectMenu` + `SelectMenuOption` | a hand-rolled list of `MenuItem`s |
| Pending tasks on a grid row | `TaskPill` (`label` required) | a coloured dot or a bare `Badge` |
| The step an item is on next, to tick off in place | `ActionPill` (+ `StepMenu` behind its caret) | a `SplitButton` or a coloured `Chip` |
| Show a workflow step that cannot be acted on | `ActionTag` | an `ActionPill` with no handlers |
| A due date nudged a day at a time | `DueDatePill` | an `Input type="date"` alone |
| One valuation in full, opened from a Workboard row | `ValuationModal` (`ValuationSummary` + three `ValuationPanel`s) | a hand-built `Modal` body, or a `Drawer` |
| Who works each step of a workflow, and assigning them | `StepAssignMenu`, opened from a `StatusTrigger` | `StepMenu` (that is the ActionPill caret menu, with no people) or a `SelectMenu` per step |
| A person in a role on a valuation (Engagement Manager, Preparer…) | `AssigneeCard` | a `Card` with loose text |
| Who is on something, as initials | `AssigneeAvatars` (folds past two into "+N") | a row of `Avatar`s with no names |
| A valuation's key figures as tiles | `FigureList` | `KeyValueRow`s, or a `DataGrid` with one row |
| A note thread with a composer | `NoteCard` + `NoteComposer` | a `Textarea` and a hand-built list |
| The deal behind a Workboard item (stage, company, contract, NET / DUE, owner) | `DealCard` | a hand-built `Card` with loose text |
| Let a user pick their **own** colour (a status colour a firm sets) | `ColorPicker` | a native `<input type="color">`, or a picker for design tokens |
| Dated work laid out by day, month or week | `WorkCalendar` (+ `PeriodToolbar`) | `DatePicker` — that chooses one date |
| A rich task on a calendar day (status, tags, due, people, rush) | `CalendarTaskCard` as `renderEvent` | a `Card` inside a day cell |
| Each item's current step across a date range | `WorkTimeline` (+ `PeriodToolbar`) | a `DataGrid` with coloured cells |
| Today / previous / next and the range switch above a calendar or timeline | `PeriodToolbar` | loose `Button`s and a heading |
| Frame and zoom an uploaded logo or avatar | `ImageCropField` (+ `Dropzone` for the upload) | an `<img>` with a native range input |

---

## 6. PRISM — semantic colour for *what a thing is*

PRISM colour-codes **what an item represents**. It is used by Global Search and
by navigation.

> **PRISM never states whether the user may open a thing.** Access,
> availability and permission are not its job (R11).

Nine types, in five families:

| Family | Type | `data-prism` | Meaning |
|--------|------|--------------|---------|
| Entity | Firm | `firm` | an organisation you work for |
| Entity | Company | `company` | a portfolio company |
| Data | Document | `document` | a file |
| Data | Version | `version` | a valuation version |
| Data | Measurement Date | `measurement-date` | an as-of date |
| Destination | Page | `page` | somewhere you land |
| Command | Firm Action | `firm-action` | a command at firm level |
| Command | Company Action | `company-action` | a command at company level |
| Utility | Neutral | `neutral` | the fallback |

Each type has exactly three tokens, and they are **not interchangeable**:

| Token | Use for | Never use for |
|-------|---------|---------------|
| `…-primary` | **graphic only** — a swatch, dot or glyph | text |
| `…-background` | the tint behind a tile or badge | text |
| `…-text` | **the only one safe for small text** | large filled areas |

In CSS, set `data-prism="<type>"` on an element and the three custom properties
`--prism-primary`, `--prism-bg` and `--prism-text` resolve for you.

**Scope vs destination.** Only five types are *scopable* — Firm, Company,
Document, Version, Measurement Date (`prismScopeTypes`). A Page or an Action is
somewhere you land, not something you search inside, so neither can be pushed
onto the search scope stack.

```tsx
<SearchResultRow type="company" title="Acme Inc." subtitle="Portfolio company" />
<SearchSectionHeader type="document" />   {/* renders "DOCUMENTS" */}
<SearchScopeChip type="firm">Sequoia Capital</SearchScopeChip>
```

**The inversion trap.** Older Global Search mockups colour Firm blue and Company
green. That is inverted and wrong. Firm is **yellow** (`Entity/Firm`), Company
is **brand blue** (`Entity/Company`). Build to the tokens, never to those
mockups.

---

## 7. Component API

Every component below is exported from the package root. Props marked
**required** have no default.

### Primitives

**`Icon`** — `{ size?: 'xs'|'s'|'m'|'l'|'xl', tone?, label?, children }`
Sizing and tint wrapper for a glyph. Pass `label` only when the icon carries
meaning on its own.

**The product icon set is Google Material Symbols (Outlined, weight 400)**,
exported as `icons`. Every glyph fills with `currentColor`, so `Icon`'s `tone`
tints it:

```tsx
import { Icon, icons } from '@scalar/design-system';
<Icon size="s" tone="secondary"><icons.FitScreen /></Icon>
```

- Names are Material's snake_case in PascalCase (`fit_screen` → `icons.FitScreen`).
- **Adding one:** put the Material name in
  `src/components/icon/material-icons.json`, run `npm run gen:icons`, and
  commit the regenerated `material.tsx`. Never hand-edit `material.tsx` and
  never paste a loose SVG into a component.
- `glyphs` (`ChevronDown`, `Close`, `Trash`, `MoreHorizontal`…) are the
  structural aliases this package's own components use; they now point at
  Material glyphs. Prefer `icons.*` in product UI.
- **Figma still uses `SDS_Main icons`**, so a glyph in code and the same glyph in
  Figma can differ in shape. Match by meaning, never by shape (known gap 4).

**`Typography`** — `{ variant?: TypeRole, step?, weight?, tone?, as?, truncate? }`
Plus the shorthands `Heading`, `Text`, `Label`, `Overline`.
Size is `variant` + `step`, colour is `tone`, the HTML element is `as`. Keeping
those independent is what stops an `<h2>` being chosen for its size.

### Core

| Component | Key props | Notes |
|---|---|---|
| `Divider` | `orientation` | Only where whitespace fails to group. Two stacked dividers is a spacing bug. |
| `Link` | `size`, `href` | Underline is **permanent**, not a hover reveal (R8). |
| `Tooltip` | `content` **req**, `position`, `open`, `onOpenChange` | Explains; never holds the only copy of something. Keyboard-reachable, Escape dismisses. `open` makes it controlled (`true` forces it open, e.g. a guided tour); omit it for hover / focus. |
| `Scrim` | `onDismiss` | Sibling of the dialog, never a child. |
| `EmptyState` | `title` **req**, `type`, `body`, `icon`, `actions` | `no-data` offers the filling action; `no-results` offers the way out; `error` explains and retries. Write guidance, not apology. |

### Actions

**`Button`** — `{ variant?: 'primary'|'secondary'|'tertiary', tone?: 'main'|'positive'|'warning'|'negative', size?: 's'|'m'|'l', loading?, selected?, leadingIcon?, trailingIcon?, disabled? }`

- **`variant` carries weight** (how much attention). **`tone` carries meaning**
  (what kind of action).
- A destructive action is `tone="negative"` at whatever variant its prominence
  deserves — **never** a primary button recoloured by hand.
- Hover / pressed / focus are CSS states, **not props**. There is no `state`.
- `size="s"` is dense table furniture only — never a primary action.

**`ButtonIcon`** — as `Button`, plus `icon` **req** and `label` **req**.
The glyph is not the name. Use only where the icon is unambiguous alone.

**`AIButton`** — `{ showIcon? }`. Genuinely generative actions only.

### Forms

| Component | Key props | Notes |
|---|---|---|
| `FormField` | `children` **req**, `label`, `helperText`, `state`, `required` | The default way to ask for input. Wires `id` + `aria-describedby`. In `state="error"` the helper becomes the error and turns negative — say what is wrong **and how to fix it**. |
| `Input` | `state`, `leadingIcon`, `trailingIcon` | A bare input with no label is an accessibility failure. Wrap it. |
| `Textarea` | `state`, `resizable` | Size the default height to the expected answer. If it is not resizable, set `resizable={false}` rather than leaving a decorative grip. |
| `Select` | `state` | Above ~7 options. Below that use `Radio`. |
| `Checkbox` / `CheckboxItem` | `size`, `indeterminate`, `invalid` | `indeterminate` is a **display** state for a partly-selected parent — never user-selectable. The label is part of the target. |
| `Radio` | `size`, `invalid` | Never alone: a single radio that cannot be unselected is a checkbox. |
| `Switch` | `size` | Only when the change applies **at once**. Label what it controls, never its on/off state. |
| `CalendarDay` | `day` **req**, `selected`, `today`, `outside` | Today and Selected are **never drawn the same way**. |
| `DatePicker` | `value`, `onChange`, `month`, `isDisabled` | Six week rows always, so the popover never changes height. |

### Navigation & chrome

**`PageTemplate`** — `{ navigation?, companyInfo?, subNavigation?, children?, drawer?, fullHeight? }`.
The base of every screen (Figma `1671:13280`). `children` is the **body slot**; omit
it and `BodySlot` (a labelled placeholder) shows. In `apps/product` import the
wrapper from `shell/PageTemplate.js` (`area`, `company`, `section`, `subNav`,
`dock`, …). Never hand-assemble the chrome, never add outer padding or a scroll
wrapper inside the slot. Full guide: `docs/page-template.md`.

`Tabs` + `TabItem` · `Breadcrumb` · `Pagination` + `PageItem` · `Stepper` + `Step`
`PrimaryMenu` + `MainMenuItem` · `SecondaryMenu` + `SecondaryMenuItem` ·
`TertiaryMenu` + `TertiaryMenuItem` · `CompanyInfo` ·
`MenuPanel` + `SubmenuItem` + `MenuGroupLabel` · `CompanyDropdownPanel` · `SectionSubMenu` ·
`CompanyDropdown` · `FilterDropdown` · `SearchBar` · `Notification` · `Badge` ·
`ComboTag` · `CurrencySelector` · `Selector` · `InformationLabel` · `ValuationInfo` · `ToolSwitch` · `AITool`

- **`AITool` opens and closes itself.** A click on the trigger opens the prompt field (Figma `AI-Input-Field`)
  and focuses it; the AI mark inside the field, or Escape, closes it. Props: `state` / `defaultState` /
  `onStateChange`, `value` / `onValueChange`, `onSubmit` (Enter or the "Press ↵" chip), `placeholder`
  ("How can I help you?"). Don't wire your own toggle around it.

- **Three navigation tiers is the limit.** A fourth level belongs in the page
  body, not the chrome.
- Exactly one `TabItem` is `active` at all times. A tab bar with nothing
  selected is a navigation bug, not a state.
- The last `Breadcrumb` item is the current page: not a link, and it must not
  look like one.
- **No table is paginated (R15).** `Pagination` + `PageItem` stay in the library,
  but never go under or beside a `DataGrid` / `Table`; `npm run lint:tables` fails on them in product code.
- `Pagination` never *hides* Previous/Next — it disables them. Pass
  `rowsPerPage` + `onRowsPerPageChange` (and optionally `rowsPerPageOptions`,
  default 10 · 25 · 50 · 100) to render the labelled "Rows per page" Select at
  the start of the bar; reset `page` to 1 when it changes.
- **`Selector`** — `{ label?, value` **req**`, surface?: 'brand' | 'surface', expanded?, disabled?, icon?, dropdown?, onClick? }`.
  A trigger only; the screen owns its menu (render a `SelectMenu`).
  `surface="brand"` (default) is for the navy Primary Menu bar and uses the On
  Brand tokens; `surface="surface"` is for a light page or company header
  (Financials Date / Version). `expanded` sets `aria-expanded` and flips the
  chevron. Never put a `brand` Selector on a light surface or vice versa.
- `Stepper`: show every step from the start. Never mark one complete until it
  is.
- `FilterDropdown` shows **the value in force**, not the filter's name.
- `Notification`'s dot means *unread*, not urgent, and carries no count. `working` puts the orbiting
  AI outline on the bell while AI runs a job the user will be notified about, and appends `workingLabel`
  ("AI working") to its name.

### Table

**There is one table.** `Table` serves every product; differences come from `columns`, `rows` and `cells`, never from a variant or
fork. `cell.kind` (`readable` / `editable` / `sourced` / `total` / `draft`) sets text colour only; fill is derived from selection and
hover (error > selected > pressed > hover > zebra > default) and is never stored per cell. Rows are 26px, headers 40px, never
auto-sized. Selection is one rectangle drawn as one overlay — do not hand-place per-cell borders. A column's minimum width is
computed from the data over all rows (`columnMinWidth`), never from the DOM; values and row titles never truncate, header labels
truncate with a tooltip. Pass `columnWidths` / `onColumnResize` only to control widths; otherwise they persist per `tableId`.
Do not wrap header labels, and do not put `role="grid"` on `DataGrid`.
**`Table` is never paginated (R15)** — it shows every row; collapse groups instead of paging them.

### Data grid

`DataGrid` · `Row` · `RowHeader` · `Cell` · `ColumnHeader` · `ContentCell` · `Footnote` ·
`Ledger` · `ModalStatus` · `ValuationStatus`

**Column sizing is header-driven.** `DataGrid` is a CSS grid: each header cell
in `head` (`ColumnHeader` — the one column header, R16) defines one
column track, and every `Row` is a subgrid of those tracks, so a body cell
always fills exactly its header's column.

| Header prop | Track | Use |
|---|---|---|
| (none) | `minmax(max-content, 1fr)` | the default: never narrower than the header label on one line, shares leftover width |
| `grow={n}` | `minmax(max-content, <n>fr)` | a column that should take more of the spare width (a name column) |
| `width="…"` | that fixed track | an icon or checkbox column — pass a `size.*` token |
| `span={n}` | n tracks | a header over several columns; body cells take `span` too |

- **No pagination (R15).** A `DataGrid` shows every row it is given. Never slice
  rows into pages or place a `Pagination` under it; for a long grid pass
  `maxHeight` so the body scrolls inside it with the header sticky.
- `columns` on `DataGrid` overrides the derived tracks entirely; `groupHead`
  takes a row of `ColumnGroupHeader`s (use their `span`) above `head`.
- `maxHeight` bounds the grid: the body scrolls inside it and the header sticks
  to the grid's top. Without it the grid grows with its rows. Wider than its
  container, the grid scrolls sideways inside itself.
- **Every row starts with a `RowHeader`** (Figma Row-reading / Row-input): its first
  cell, the row's name. `type` readable · data · input · total · divider; `mark`,
  `bulk` (+ `checked` / `onCheckedChange` / `selectLabel`), `icon` (+ `onIconClick`),
  `footnote`; grouping is `group` (left bar) or `groupStart` / `groupEnd` (rules).
  **Never put a text `Link` in a row's first cell** — pass `href` to the `RowHeader`:
  it navigates and keeps the row-header look.
  The same goes for a company or reference link anywhere in a table: use a
  `RowHeader` with `role="gridcell"` outside the first column, and
  `type="divider"` (with `role="heading"` and `aria-level`) for the shaded band that
  titles a table.
- **Both cell models work inside `Row`:** `Cell`, and the grid-pattern cells
  (`RowLabelCell`, `GridValueCell`, `InCellControl`). The row owns the
  background, so `zebra`, hover and `type="total"` work for either. Still pick
  one model per grid (known gap 8).
- `Cell` and every grid-pattern cell take `span`, `style` and HTML attributes.
- `Cell` also takes `label`, `tooltip` and `trailingIcon` (`'dropdown' | 'calendar' | glyph`).
- `InformationLabel` takes `longValue` and `dropdown`; `ValuationInfo` takes `open` / `defaultOpen` / `onOpenChange` plus `equityValue`, `unrealizedFirmTotal`, `marketDate`, `version`.

**`ColumnHeader`** — `{ numeric?, sort?, onSortChange?, actions?, grow?, width?, span?, tone?: 'brand' | 'subtle', kind?: 'default' | 'action-button', mark?, label?, tooltip?, icon?, input?, action? }`.
`brand` (default) is the navy grid chrome. `subtle` is the light header band —
`bg.subtle`, `text.secondary`, a `stroke.strong` bottom rule — for a table inside
a card or modal. Use it instead of restyling a header by hand; one tone per grid.

**`GridColumnHeader`** (library only — product tables use `ColumnHeader`, R16) also takes `trailing` and `editable` — an editable-date
column: editable-blue label with a trailing calendar glyph.

**`ModalStatus`** states: `draft` · `review` · `in-process-usa` · `in-process-arg` ·
`final` · `complete` · **`published`** (positive tint with a leading check, so it
reads apart from Complete without relying on colour).

**`TaskPill`** — `{ label` **req**`, count?, tone?: 'negative' | 'warning' | 'brand', icon?, onClick? }`.
Pending tasks in a grid row: tinted pill, glyph and optional count; `label` is
the accessible name and tooltip ("3 overdue tasks"). Dense grid furniture (24px).

**Workboard** — the Workboard prototype's workflow controls (`workboard/Workboard.tsx`).
Tones are `WorkflowTone`: `'brand' | 'ai' | 'warning' | 'positive' | 'blue' | 'pink' | 'cyan' | 'orange'`.
The last four are the Workflow tone family (`color.workflow.<tone>.background · text · stroke · solid · onSolid`,
code-first, known gap 13) — never build a step colour from a `--primitive-*` step (R1). A tone identifies the
step; it is never status.
Urgency is `DueUrgency`: `'none' | 'upcoming' | 'today' | 'overdue'` — upcoming is a
tinted outline, today the solid tone, overdue solid Negative; Today and Overdue add
hidden words (R8). `dueUrgency(iso, today?)`, `shiftIsoDate`, `formatIsoDate` derive it.

- **`ActionPill`** — `{ label` **req**`, tone?, urgency?, size?: 's' | 'm', fullWidth?, onComplete?, completeOpensMenu?, onMenuToggle?, menuOpen?, paused?, done?, followUp?, pendingMs? }`.
  The tick (circle + label) completes the step after a short strike-through; the caret opens the
  `StepMenu`. `s` in a grid cell, `m` in a modal header. Clicks never bubble to the row.
- **`ActionTag`** — `{ children, tone?, urgency?, size? }`. Read-only step (calendar cards, timelines).
- **`DueDatePill`** — `{ value` **req** (ISO)`, onChange` **req**`, size?, withPicker?, today?, format?, placeholder? }`.
  − / + move a day; `withPicker` adds a native date picker and a trailing calendar button.
- **`StepMenu`** — `{ label` **req**`, steps` **req**`: { id, label, tone?, state: 'done' | 'next' | 'pending' | 'skipped', disabled? }[], onSelectStep?, locked?, progress?, onClose?, autoFocus? }`.
  Menu surface only (APG menu keys). Add `StepMenuSection` › `StepMenuLink` (`ai?`, `href?`),
  `StepMenuToggle` (`checked`, `onCheckedChange`), `StepMenuAction` (`action`, `tone?: 'destructive'`).
- **`DealCard`** — `{ title` **req**`, tone?: 'default' | 'deal', headingLevel?, stage?, onStageClick?, stageExpanded?, company?, companyHref?, notice?, contract?, contractHref?, contractAction?, totals?: { label, value }[], owner?: { name, initials?, avatarSrc?, role? }, onEditOwner?, editOwnerLabel?, actions? }`.
  A `Card` region. With `onStageClick` the stage is a `Selector` (the screen owns its menu); without it, a `Chip`.
  Every part is optional except the title; it holds no data of its own. `tone="deal"` is the Valuation modal's filled
  card (Deal tokens, known gap 14); `contractAction` puts a button on the contract's row (Send Final Invoice).
- **`ValuationModal`** — `Modal size="2xl"` with no header: `{ open, onClose, summary` **req**`, children, aria-label | aria-labelledby` **req** `}`.
  `summary` is a **`ValuationSummary`** (`title?, tags?, status?, subject?, meta?, people?, figures?, aside?` — layout slots);
  `children` are three **`ValuationPanel`**s (`title?, action?, footer?` — the footer is pinned so the panels' footers line up).
- **`StepAssignMenu`** — `{ label` **req**`, steps` **req**`: { id, label, done?, assignees? }[], people` **req**`, onSelectStep?, onAssign?(stepId, ids), assigningStepId?, surface?: 'overlay' | 'inline', pickerDefaults? }`.
  Each step ends in its assignees (**`AssigneeAvatars`**, folds past two into "+N") or an assign button; that button opens a
  picker (removable chips, filter, Save, checklist). Escape closes the picker first. Open it from a **`StatusTrigger`**
  (`{ value` **req**`, size?: 's' | 'l', assignees?, expanded?, fullWidth? }` — filled brand, `aria-haspopup`).
- **`AssigneeCard`** — `{ roleLabel` **req**`, name` **req**`, emphasis?: 'lead' | 'outline' | 'default' | 'muted' | 'inverse', onEdit?, editLabel?, editPlacement?, children? }`.
  One person on a valuation; a named group. **`FigureList`** (`items: { label, value }[]`, a `<dl>` of tiles),
  **`NoteCard`** (`author, timestamp, dateTime?, onDelete?`) and **`NoteComposer`** (`RichTextToolbar` over a textarea, `onSave?`)
  complete the modal.
- **`ColorPicker`** — `{ label` **req**`, value` **req** (`#RRGGBB`)`, onApply` **req**`, onCancel` **req**`, onChange?, applyLabel?, cancelLabel? }`.
  Hex `Input`, saturation × brightness square and hue track (both `role="slider"`, arrows / Shift / Page / Home / End),
  Cancel / Apply; Escape cancels. The picked colour and `HUE_SPECTRUM` are **data**, set inline — never a token, and
  never for choosing a design token. `hexToHsv` / `hsvToHex` are exported.
- **`WorkCalendar`** — `{ label` **req**`, date` **req** (ISO in the period)`, events` **req**`: { id, date, label, tone?, urgency? }[], view?: 'month' | 'week', onEventClick?, renderEvent?, maxPerDay?, onShowMore?, today?, weekStartsOn?, locale? }`.
  `role="grid"`, six week rows always. One tab stop; arrows / Home / End / Ctrl+Home/End between days, Enter or F2 into a
  day's items (Up/Down between them), Escape or F2 back. `renderEvent(event, itemProps)` must spread `itemProps` onto its
  focusable root. Without `onShowMore`, "+N more" is text, so pass it whenever a day can overflow.
- **`CalendarTaskCard`** — `{ title` **req**`, status?, tags?, due?, today?, comments?, people?: { name, initials?, role? }[], rush?, rushLabel? }` + button attributes.
  One button. An unparsable `due` shows "Invalid date" (Negative) rather than hiding it; `rush` adds the stamp and a Negative outline.
- **`WorkTimeline`** — `{ label` **req**`, start` **req**`, days` **req**`, items` **req**`: { id, name, start, end, label, tone?, urgency? }[], nameHeader?, onItemClick?, today?, tickEvery?, format? }`.
  `role="table"` (read-only bars). Every bar says its dates and whether it runs past the range; the optional row-name button opens the item.
- **`PeriodToolbar`** — `{ title` **req**`, onPrevious` **req**`, onNext` **req**`, onToday?, views?, view?, onViewChange?, viewLabel?, actions?, previousLabel?, nextLabel? }`.
  The title is a polite live region. Name previous / next by the unit ("Previous month").

**`Cell`** — `{ type?: 'readable'|'input'|'data'|'group'|'divider', state?: 'default'|'selected'|'error'|'draft'|'total', selected?, numeric?, footnote?, icon?, groupStart?, groupEnd? }`

`type` says **what the cell holds** and drives the text colour:
`readable` → primary · `input` → editable (blue) · `data` → sourced (green).
`state` says **what has happened to it**. Use `numeric` on every money column —
it right-aligns and applies tabular figures.

```tsx
<DataGrid label="Cap table" head={<><ColumnHeader>Security</ColumnHeader><ColumnHeader numeric>Shares</ColumnHeader></>}>
  <Row>
    <Cell>Series A Preferred</Cell>
    <Cell numeric type="data">1,000,000</Cell>
  </Row>
  <Row type="total">
    <Cell state="total">Total</Cell>
    <Cell state="total" numeric>1,000,000</Cell>
  </Row>
</DataGrid>
```

The header is sticky in use — keep it in `head`, outside the scroll container.

### Charts

Built on **Chart.js 4**. `BarChart` · `LineChart` · `WaterfallChart` ·
`DonutChart` · `ChartCanvas` · `ChartLegend` + `ChartLegendItem` ·
`chartScaffold` · `resolveChartTokens` · `useChartTokens` · the plugins.

```tsx
<BarChart
  title="Revenue by quarter"        // required — the canvas's accessible name
  categoryLabel="Quarter"           // column heading in the hidden data table
  categories={['Q1', 'Q2', 'Q3', 'Q4']}
  series={[{ label: 'Product', values: [12, 18, 15, 22] }]}
  format={(v) => `$${v}M`}
/>
```

**Chart.js draws to a canvas, and canvas cannot read CSS custom properties.**
Every token is therefore resolved to a concrete value before it is handed over,
and re-resolved when the theme changes. That bridge is `useChartTokens`, and it
watches three things: `data-theme`, `data-viewport`, and the OS colour scheme
(which fires no attribute mutation at all). **Never pass a raw hex or a
`var(--…)` string into a Chart.js config** — `var()` does not resolve on canvas
and will render as transparent. Take the value off the `ChartTokens` object.

Building a chart this package does not ship? Use `ChartCanvas` with
`chartScaffold()` and `baseChartOptions()` rather than configuring Chart.js from
scratch — that is what keeps a new chart on the system's axis, grid and type
tokens.

Rules:

- Assign series **in order** and never cycle. A ninth series folds into "Other"
  or becomes small multiples.
- A legend is **mandatory** at two or more series. The built-in Chart.js legend
  is always off: the Scalar legend is a real DOM component, because a
  canvas-drawn legend is unreachable by a screen reader.
- **Every chart ships a `title` and a hidden data table.** A canvas is opaque to
  assistive technology, so the table is the only way the numbers are reachable
  without sight. The shipped charts build it for you.
- `BarChart type="stacked"` only when the **total** is meaningful.
- `LineChart type="area"` only for one cumulative quantity, or ≤3 series.
- **Never two y-scales on one chart.** Two magnitudes become two charts, or one
  indexed to a common base.
- Waterfall bars are **all** directly labelled — it is read as arithmetic, not
  as a shape.
- Donut ceiling is 8 slices. It answers "what is the split", never "how did the
  split change" (that is a stacked bar over time).

> **Colour-blind safety.** Every pair in `Chart/Series` separates by at least ΔE2000 6
> under normal vision, deuteranopia, protanopia and tritanopia, in Light and Dark, and no
> series equals `Chart/Negative`; `npm run lint:contrast` enforces it. Up to eight series
> are safe; a ninth folds into "Other". `seriesAccessibilityWarning()` is the guard.
> `BarChart` still turns direct labels on at three or more series so identity never rests
> on colour alone.
>
> Stacked bars are the one exception, and deliberately so: a per-segment label
> sits on top of the segment above it, putting dark text on a dark fill, and
> there is no per-series on-colour token to switch to. Stacked bars label the
> **column total** instead and carry identity by stack order, which is a
> non-colour channel and is stable across categories.

### Gap-analysis patterns (Figma pages 20–26)

`MenuItem` · `MenuDivider` · `ContextMenu` · `UserMenu` · `MenuSubItems` ·
`SplitButton` · `Fab` · `SpeedDial` + `SpeedDialItem` · `SegmentedControl` ·
`ViewTabBar` + `ViewTab` ·
`FloatingLabelInput` · `FloatingLabelSelect` · `NumberField` · `TimeField` ·
`TagInput` · `CopyField` · `ComboboxPanel` + `ComboboxOption` · `ShowMoreRow` ·
`SelectMenu` + `SelectMenuOption` ·
`RepeatableRow` · `Dropzone` · `Slider` · `ImageCropField` · `InlineEdit` · `InlinePicker` ·
`RowLabelCell` · `GridValueCell` · `InCellControl` · `ColumnGroupHeader` ·
`GridColumnHeader` · `AddColumnHeader` · `CollapsedColumnRail` · `GridColumnDivider` · `TaskPill` ·
`ChartHoverCard` · `CellHistoryPopover` ·
`ActionPill` · `ActionTag` · `DueDatePill` · `StepMenu` (+ `StepMenuSection` · `StepMenuLink` · `StepMenuToggle` · `StepMenuAction`) ·
`DealCard` · `ColorPicker` · `WorkCalendar` · `CalendarTaskCard` · `WorkTimeline` · `PeriodToolbar` ·
`ValuationModal` · `ValuationSummary` · `ValuationPanel` · `FigureList` · `StepAssignMenu` · `StatusTrigger` ·
`AssigneeCard` · `AssigneeAvatars` · `NoteCard` · `NoteComposer` ·
`FileTypeBadge` (+ `fileKindOf`) · `FileTypeIcon` · `FileRow` · `TreeItem` · `PageStepper` · `ZoomControl` ·
`DocumentViewerHeader` · `ScrollHintPill` ·
`Banner` · `Spinner` · `ProgressRing` · `DataFreshness` · `SaveState` ·
`ConfirmationDialog` · `SettingRow` · `NotificationCenter` · `RowActionToolbar` ·
`KeyValueRow` · `VersionHistoryItem` · `PermissionMatrixRow` · `RoleSelector` ·
`ProfileHeader` · `FilterBar` · `DirectoryGroup` · `ProductTile` · `FirmSwitcherTile` ·
`PageTaskHeader` · `CodeGrid` · `RichTextToolbar` · `AppFooter`

- Every icon-only control takes a **required text label** (`menuLabel`,
  `label`, `removeLabel`…) — the glyph is not the name.
- `ContextMenu`, `ComboboxPanel`, `SelectMenu`, `NotificationCenter` and
  `CellHistoryPopover` are **surfaces only**: the trigger owns open state,
  positioning and outside-click dismissal.
- `SelectMenu` — `{ label` **req**`, search?, footer?, multiselectable? }` + HTML
  attrs onto the `role="listbox"`; `SelectMenuOption` — `{ selected?, disabled?,
  description?, icon?, active?, onSelect? }`. Selected options carry a trailing
  check as well as the tint. Long searchable lists use `ComboboxPanel`.
- `SplitButton menuPlacement="top"` opens its menu upward — for a button at the
  foot of a page or above the Workspace Drawer.
- `SplitButton` takes the same `variant` (primary · secondary · tertiary), `tone`
  (main · positive · warning · negative) and `size` (xs · s · m · l) as `Button`,
  so a split action can always match the button beside it. `size="xs"` (24px)
  sits in the Tertiary Menu toolbar beside Save (Financials' "+ Add Projection
  Year ▾"). Choose style and tone by the same rules as `Button`.
- `CurrencySelector unit / defaultUnit / onUnitChange` turns the chip into a
  display-unit cycle: each click steps Hundreds → Thousands → Millions →
  Hundreds. It opens no menu (no `aria-haspopup`). The tables under it rescale
  their money figures with `formatCurrencyDisplayUnit(value, recordedUnit,
  shownUnit)` (whole numbers in Hundreds/Thousands, one decimal in Millions);
  percentages, counts and absence labels never change. It is a display rescale,
  never a recorded conversion. Without those props it stays the picker trigger.
- `CurrencySelector currencies={WORLD_CURRENCIES} currency onCurrencyChange`
  makes the currency code its own button that opens a searchable list of world
  currencies (`ComboboxPanel`, `aria-haspopup="listbox"`); the unit label takes
  the picked currency's symbol (`currencySymbol`). The component holds no rates:
  the screen re-expresses its figures. FX is an open question (domain-logic §12,
  P1), so product rates are illustrative, live in `domain/illustrative-calcs.ts`
  (`ILLUSTRATIVE_FX_PER_USD`) and are labelled in the list footer (`currencyNote`,
  P10). Don't show the rate beside the chip.
- **In the product the Currency Selector is platform-wide.** Every toolbar chip is
  `ToolbarCurrency` (or `CurrencyUnit`, which renders it); pass `recorded` when the
  screen's amounts aren't stored in Thousands (`recorded="Millions"` on Waterfalls).
  Unit and currency live in `shell/displayUnit.ts`: until the user picks a unit,
  each screen shows its recorded unit, and a pick holds on every screen. Format
  every money figure under the chip through `useMoney(recorded)`: `amount` for
  amounts, `price` for per-share prices (currency only, never the unit), `value` /
  `formatShown` for charts (give the chart a `key` on unit and currency so it
  redraws). Rates and percentages pass through. While figures are rescaled
  (`!isRecorded`), money edit cells are read-only, because edits commit recorded figures.
- `NumberField label` renders a floating label on the top border, matching a
  filled `FloatingLabelInput` (44px box), for mixing number fields into page and
  modal forms.
- `Dropzone prompt` replaces the default "Drag & drop a file or select a file";
  pass a function `(browse) => …` to keep the browse link.
- `VersionHistoryItem currentLabel` sets the current-entry chip text (default
  "Current").
- `ImageCropField` — `{ label` **req**`, src?, zoom, onZoomChange, zoomMin?, zoomMax?, zoomStep?, onRemove?, shape?: 'square' | 'wide' }`.
  Framed preview well (placeholder glyph when empty), zoom `Slider` between
  zoom-out / zoom-in glyphs (disabled until there is an image), delete
  `ButtonIcon`. Pair with a `Dropzone` for the upload.
- `ComboboxPanel` does not filter — pass the already-filtered `items`.
- `GridValueCell state="error"` **requires** `errorMessage` (R8).
- `SegmentedControl` always has exactly one selected option. `variant="outline"` draws joined bordered
  segments (the Valuation modal's ARG | SLC | Is Waiting and its notes tabs); the selected one is filled,
  semibold and checked (`checkSelected`, default on, so selection never rests on fill alone). Options take a
  `count` ("Valuation Notes (2)"); `fullWidth` stretches the segments.
- `RichTextToolbar formats` chooses the buttons and their order (default bold · italic · underline ·
  bulleted list · link); `numbered` adds a numbered list. `NoteComposer` uses bold · italic · underline ·
  bulleted · numbered.
- `MenuItem tone="destructive"` goes last, after a `MenuDivider`. A
  `ConfirmationDialog`'s confirm label repeats the verb — never "OK".
- `FileTypeBadge` colour is format identity (`color.file.*`), `ProductTile`
  colour is product identity (`color.product.*`) — neither is status.
- `RowLabelCell` / `GridValueCell` are a separate grouping model from
  `Row type="group"`; do not mix them in one grid (known gap 8).
- Built-in glyphs are Material aliases. Pass any `icons.*` glyph through the
  icon props to change one.

### Feedback, containers, search

`Alert` · `Toast` + `ToastViewport` · `ProgressBar` · `Skeleton` ·
`Card` + `CardItem` · `Accordion` + `AccordionItem` · `Drawer` ·
`WorkspaceDrawer` + `WorkspaceDrawerTab` · `DataReviewCard` ·
`Modal` · `ColumnTitle` · `ColumnItem` · `ModalSearch` ·
`GlobalSearch` · `SearchResultRow` · `SearchSectionHeader` · `SearchScopeChip` · `KeyHint`

- `Skeleton` must match the layout it replaces. Under 300ms, show nothing.
- **`AiOutline`** — `{ active?: boolean (default true), asChild? }` + div attributes. A 3px ring in
  `color.gradient.ai.*` drawn over the host's edge on its own layer, so the host keeps its own background and
  border. While `active` a comet of the gradient orbits it every 3s with a matching glow just outside the edge; `active={false}` and reduced motion show
  the whole ring still. Decorative: pair it with words or a `Spinner` (R8). Full guide: [docs/ai-outline.md](docs/ai-outline.md).
- `ProgressBar` with no `value` is indeterminate — use it only when the total
  genuinely is unknown.
- `Modal` traps focus, closes on Escape, returns focus to its trigger.
  `size`: `s` 400 (short confirm-style form) · `m` 560 (default) · `l` 800
  (two-column form, small table) · `xl` 1120 (a grid or document preview) ·
  `2xl` 1308 (a record shown in full — the Workboard `ValuationModal`);
  never wider than the viewport.
- `WorkspaceDrawer` is **sticky to the bottom of the viewport** (or its nearest
  scroll container) at 40vh, 60vh when `expanded`. Render it as the last child
  of the page's scrolling column; the content above scrolls behind it.
- Field-like boxes (`Input`, `Select`, `Textarea`, `FloatingLabel*`,
  `NumberField`, `TagInput`, `CopyField`…) are `box-sizing: border-box`, so
  `width: 100%` never overflows the container.
- `GlobalSearch`: scope is a **stack**, not a filter. Tab pushes, Backspace pops.
  Never show more than three chips.

---

## 8. Anti-patterns — do not do these

| ✗ Don't | ✓ Do |
|---------|------|
| `style={{ color: '#0268c1' }}` | `style={{ color: color.text.brand }}` |
| `style={{ padding: 12 }}` | `style={{ padding: space.m }}` |
| `<Cell><Link href=…>{name}</Link></Cell>` as a row's first cell | `<RowHeader href=…>{name}</RowHeader>` |
| A screen that assembles `PrimaryMenu` + `CompanyInfo` + `WorkspaceDrawer` itself | `<PageTemplate …>{content}</PageTemplate>` |
| Shipping the `BodySlot` placeholder, or wrapping the body in extra padding / `max-width` / a scroll box | Real `children`; the slot already scrolls and is inset |
| `style={{ fontSize: 13 }}` | a `type.style()` role/step, min 12px (`heading.xs` 10px only for data-grid chrome) |
| `width: space.l` | `width: size.icon.s` (R2) |
| `background: bg.brand; color: text.primary` | `color: text.onBrand` (R3) |
| white text on `bg.warning` | `text.onWarning` (R4) |
| `border: 1px solid stroke.default` on an input | `stroke.control` (R5) |
| a red dot as the only error signal | a dot **plus** words or an icon (R8) |
| `filter: brightness(0.9)` for hover | `bg.brandHover` |
| `letterSpacing: '0.8px'` for uppercase | the `overline` role (R10) |
| a `<table>` for a dense figure grid | `DataGrid` + `Row` + `Cell` |
| a `Pagination` under a table, or `rows.slice(…)` into pages | every row in one grid; `maxHeight` for a long one (R15) |
| `GridColumnHeader` / `AddColumnHeader` in a table head | `ColumnHeader` (sort, `actions`, `input`); `AddColumn` for the trailing header (R16) |
| a `Button` that navigates | `Link` |
| a `Link` that submits or deletes | `Button` |
| `role="heading"` on `Typography` | `variant="heading"` — `role` is the DOM attribute |
| PRISM colour to show "you can't open this" | PRISM says *what it is*, never permission (R11) |

---

## 9. Before you call it done

- [ ] The screen is built in `PageTemplate` and no `BodySlot` placeholder is left.

```bash
npm run verify     # typecheck + token-contract lint
```

The linter reads both CSS **and** JSX `style={{ … }}` objects, so it catches a
raw hex, a hard-coded gap, type set from a sizing token, and the `space` /
`size` scales being crossed — wherever you wrote them.

Then check by hand:

- [ ] No raw hex, `rgb()`, or hard-coded px in anything you wrote.
- [ ] Every filled surface uses its `on*` text token (R3).
- [ ] Every interactive edge uses `stroke.control`, not `stroke.default` (R5).
- [ ] Every interactive control reaches 44px, or is documented dense grid.
- [ ] Every status carries words or an icon, not just colour (R8).
- [ ] Focus is visible on every control, 2px `stroke.focus`, outside the box.
- [ ] It reads correctly in **both** Light and Dark.
- [ ] No text below 12px (R10) — the only exception is `heading.xs` (10px) in data-grid column headers and in-cell labels.
- [ ] Charts with ≥3 series carry direct labels.
- [ ] No table shows pagination — every row in one grid (R15, `npm run lint:tables`).
- [ ] Every table head is `ColumnHeader` — no `GridColumnHeader` / `AddColumnHeader` (R16, `npm run lint:tables`).
- [ ] Product screens: every value is bound to its context and none is a placeholder `$0` (§11, P1–P10, `npm run lint:product-logic`).

---

## 10. Known gaps — inherited, not bugs to "fix" silently

See `docs/known-gaps.md` for the full list with context. The ones most likely to
bite you:

1. **Chart CVD clash** (Series 2/3) — see §7. Direct labels are mandatory.
2. **Field height 36px** has no Semantic: Sizing step (the ramp is 32 · 40 · 48).
   Held as one named constant, `--field-height`, in the component layer.
3. **Dense grid affordances cannot reach the 44px target.** This is a documented,
   deliberate exception scoped to grid furniture only — never generalise it.
4. **Icons differ between Figma and code.** Code uses Material Symbols
   (`icons`, resolved); Figma still uses the `SDS_Main icons` library. Match by
   meaning, never by shape.
5. **`Gradient/AI`** has no Dark-mode counterpart. Verify on `bg.page` in Dark.
6. **`Header`'s `Input` and `Action` properties** have no spec in Figma, so their
   rendering is a reading of the variant screenshots. See `docs/known-gaps.md` §11.

---

## 11. Product logic rules

Sections 1–10 say how a Scalar screen looks. These rules say what it **means**. They apply to every product
screen (`apps/product`, and any product repo built on this package). The full contract, with sources and the
open questions, is [`docs/product/domain-logic.md`](docs/product/domain-logic.md). Breaking one is a bug.

| # | Rule |
|---|------|
| **P1** | **Bind every value to its context:** company, measurement date, market date and the financial, cap table and valuation version. Read it from `useValuationContext(companyId)`, never from local state or a hard-coded string. |
| **P2** | **Measurement date ≠ market date.** Never display one as the other. Editing the market date never moves the measurement date. |
| **P3** | **Rollover, bulk market-date update and market-date edit are three different actions.** Each says which one it is in its title and its confirm button. None overwrites the source measurement. |
| **P4** | **Versions are scenarios, not overwrites.** Save as New Version clones. A Cap Table version selects its paired Fund Ownership version. A valuation version owns its approach set. Changing version or date resets derived state. |
| **P5** | **Empty is not zero.** A missing, uncalculated or draft value renders `—`, `Not calculated` or `Draft` (`displayValue()`), never a placeholder `$0`. |
| **P6** | **No valuation maths in UI.** No formula goes into a DS component. Prototype numbers come from `domain/illustrative-calcs.ts`, which is labelled non-authoritative. Never derive Waterfall, OPM, DCF, note conversion or IRR yourself. |
| **P7** | **Validate, never correct.** A weight group sums to exactly 100%. Custom breakpoints ascend. A transaction date is ≤ the measurement date. Show the error with `Banner issues` and the field's error state, and never rescale or reorder the user's input. |
| **P8** | **Draft is not published.** Fund, firm and Intelligence summaries show published values only. A calibrated approach is read-only and left out of the summary. Ready for Audit is read-only for the reviewer. |
| **P9** | **Every editor shows its save state** with `SaveState` and guards unsaved work with `useDirtyGuard`, both when leaving the page and when switching version. |
| **P10** | **Never encode a 2025 defect or an open question.** `VERIFY` items (formulas, status graph, 409A override semantics, portal auth, rollover scope) stay presentational and labelled. A display override never changes a source value. |
