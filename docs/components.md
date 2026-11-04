# Figma → React traceability

Every component in the Figma components file (`Z4MtKOfkNEzhMYJzN1q3kR`, 154
component sets and 1,260 variants across 23 pages; last checked against the live file on 2026-10-05) mapped to its React export.

**How the Figma variant matrix becomes props.** Figma models every combination
as a discrete variant — `Button` alone is 225. React collapses that: each Figma
variant *property* becomes a prop, and the interaction states (Hover, Pressed,
Focus) become CSS pseudo-classes rather than props, because the browser already
owns them. So `Button`'s Style × Size × State × Type matrix becomes
`variant` × `size` × `tone` plus `:hover` / `:active` / `:focus-visible`.

Legend: **=** direct mapping · **⊕** several Figma sets merged into one export ·
**＋** added by the code layer, with no Figma counterpart.

---

## 02 · Core (5)

| Figma | Variants | React | File |
|---|---|---|---|
| Divider | Orientation | = `Divider` | `core/Divider.tsx` |
| Link | Size × State | = `Link` | `core/Link.tsx` |
| Tooltip | Position | = `Tooltip` (＋ `open` / `onOpenChange` for a controlled or forced-open tooltip) | `core/Tooltip.tsx` |
| Scrim | — | = `Scrim` | `core/Scrim.tsx` |
| Empty State | Type | = `EmptyState` | `core/EmptyState.tsx` |

## 03 · Avatar (1)

| Figma | Variants | React | File |
|---|---|---|---|
| Avatar | Size × With Image | = `Avatar` | `avatar/Avatar.tsx` |

## 04 · Button (3)

| Figma | Variants | React | File |
|---|---|---|---|
| Button | Style × Size × State × Type (225) | = `Button` | `button/Button.tsx` |
| Button_Icon | same matrix (225) | = `ButtonIcon` | `button/ButtonIcon.tsx` |
| AI-Button | — | = `AIButton` | `button/AIButton.tsx` |

## 05 · Chip (1)

| Figma | Variants | React | File |
|---|---|---|---|
| Chip | Style × Size | = `Chip` | `chip/Chip.tsx` |

## 06 · Input (2)

| Figma | Variants | React | File |
|---|---|---|---|
| input | State | = `Input` | `input/Input.tsx` |
| Form Field | State | = `FormField` | `input/FormField.tsx` |

## 07 · Checkbox (2)

| Figma | Variants | React | File |
|---|---|---|---|
| Checkbox Item | Status × Size | = `CheckboxItem` (S takes Radius/XS, as in Figma 73:5692) | `checkbox/CheckboxItem.tsx` |
| CheckBox | — | = `Checkbox` | `checkbox/Checkbox.tsx` |

## 08 · Form Controls (6)

| Figma | Variants | React | File |
|---|---|---|---|
| Radio | Status × Size | = `Radio` | `form-controls/Radio.tsx` |
| Switch | State × Size | = `Switch` | `form-controls/Switch.tsx` |
| Select | State | = `Select` | `input/Select.tsx` |
| Textarea | State | = `Textarea` | `input/Textarea.tsx` |
| Calendar Day | State | = `CalendarDay` | `form-controls/CalendarDay.tsx` |
| Date Picker | — | = `DatePicker` | `form-controls/DatePicker.tsx` |

## 09 · Header & Menus (25)

| Figma | Variants | React | File |
|---|---|---|---|
| Primary Menu | — | = `PrimaryMenu` | `header/Chrome.tsx` |
| Main-Menu-horizontal-item | State | = `MainMenuItem` | `header/Chrome.tsx` |
| Secondary Menu | State | = `SecondaryMenu` + `SecondaryMenuItem` | `header/Chrome.tsx` |
| Tertiary Menu | — | = `TertiaryMenu` | `header/Chrome.tsx` |
| Tertiary Menu Item | State | = `TertiaryMenuItem` | `header/Chrome.tsx` |
| Company info | — | = `CompanyInfo` | `header/Chrome.tsx` |
| Submenu Item | State | = `SubmenuItem` | `header/Menus.tsx` |
| Company Dropdown | — | = `CompanyDropdown` | `header/Controls.tsx` |
| Company Dropdown/Default | — | ⊕ `CompanyDropdownPanel` | `header/Menus.tsx` |
| Company Dropdown/Pinned Company | — | ⊕ `CompanyDropdownPanel` (`pinned` entries) | `header/Menus.tsx` |
| Captable sub-menu | State | ⊕ `SectionSubMenu` | `header/Menus.tsx` |
| Valuations sub-menu | State | ⊕ `SectionSubMenu` | `header/Menus.tsx` |
| Filter dropdown | — | = `FilterDropdown` | `header/Controls.tsx` |
| Search bar | — | = `SearchBar` | `header/Controls.tsx` |
| Notification | — | = `Notification` (＋ `working`: the AI outline orbits the bell) | `header/Controls.tsx` |
| Badge | — | = `Badge` | `header/Controls.tsx` |
| Combo tag | — | = `ComboTag` | `header/Controls.tsx` |
| Currency Selector | — | = `CurrencySelector` (picker trigger, or a Hundreds → Thousands → Millions unit cycle with `unit` / `onUnitChange`; with `currencies` the code opens a searchable world-currency list, `onCurrencyChange`; `formatCurrencyDisplayUnit` / `currencySymbol` re-express figures) | `header/Controls.tsx` |
| Selector | `Drop-Down`, `Picker label` | = `Selector` (`dropdown`; omit `label` to hide it) | `header/Controls.tsx` |
| Information Label | `Has drop down`, `Long Value`, `L1`–`L3` | = `InformationLabel` (`dropdown`, `longValue`; omit `label` / `value` to hide) | `header/Controls.tsx` |
| Valuation Info | Open (None · Values · Dates · Both) | = `ValuationInfo` (`open` / `defaultOpen` / `onOpenChange`) | `header/ValuationInfo.tsx` |
| Valuation | State | ⊕ `ToolSwitch` | `header/Controls.tsx` |
| Workboard | State | ⊕ `ToolSwitch` | `header/Controls.tsx` |
| Tool-switch | State | ⊕ `ToolSwitch` | `header/Controls.tsx` |
| AI tool | State | = `AITool` (click opens `AI-Input-Field`, the AI mark or Escape closes it; Figma `466:3117`) | `header/Controls.tsx` |

**Merges.** `Company Dropdown/Default` and `/Pinned Company` differ only by
whether a pinned group is present, so one component takes `companies` with a
`pinned` flag. `Captable sub-menu` and `Valuations sub-menu` share one token
contract by design "so the two sections navigate identically" — one component
takes the section's items. `Valuation`, `Workboard` and `Tool-switch` are one
control in three pieces; exactly one side is always selected, so a single
`value`/`onChange` pair models it correctly.

## 10 · Navigation (8)

| Figma | Variants | React | File |
|---|---|---|---|
| Tab Item | State | = `TabItem` | `navigation/Tabs.tsx` |
| Tabs | — | = `Tabs` | `navigation/Tabs.tsx` |
| Breadcrumb Item | State | ⊕ `Breadcrumb` (`items[]`) | `navigation/Breadcrumb.tsx` |
| Breadcrumb | — | = `Breadcrumb` | `navigation/Breadcrumb.tsx` |
| Page Item | State | = `PageItem` | `navigation/Pagination.tsx` |
| Pagination | — | = `Pagination` (＋ `rowsPerPage` / `rowsPerPageOptions` / `onRowsPerPageChange` — a labelled rows-per-page Select). **Never on a table (R15)** — tables show every row | `navigation/Pagination.tsx` |
| Step | State | = `Step` | `navigation/Stepper.tsx` |
| Stepper | — | = `Stepper` | `navigation/Stepper.tsx` |

## 11 · Table & Cells (11)

| Figma | Variants | React | File |
|---|---|---|---|
| cell | State × Type + 5 booleans (145) | = `Cell` (＋ `label`, `tooltip`, `trailingIcon` for the Label / Tooltip / Icon Type properties) | `table/Cell.tsx` |
| Header | Style + 6 booleans (11) | = `ColumnHeader` (`kind`, `mark`, `label`, `tooltip`, `icon`, `input`, `action`; ＋ `grow` / `width` / `span` column sizing; ＋ `tone="subtle"` light header band) | `table/ColumnHeader.tsx` |
| Row-reading | 27 | ⊕ `RowHeader` (the row's first cell) + `Row` | `table/RowHeader.tsx`, `table/Row.tsx` |
| Row-input | 37 | ⊕ `RowHeader` (the row's first cell) + `Row` | `table/RowHeader.tsx`, `table/Row.tsx` |
| Content_Cell | Content | = `ContentCell` | `table/ContentCell.tsx` |
| Ledger | — | = `Ledger` | `table/ContentCell.tsx` |
| Modal_Status | State | = `ModalStatus` (＋ `published` state) | `table/Status.tsx` |
| Valuation Status | State | = `ValuationStatus` | `table/Status.tsx` |
| Footnote | Content | = `Footnote` | `table/Footnote.tsx` |
| cell-icon/Dropdown, cell-icon/Calendar | — | glyphs only — drawn by `Cell`'s `icon` slot | — |
| — | — | ＋ `DataGrid` | `table/DataGrid.tsx` |
| Data Cell, Title Item Row, Column Header Workboard (Navigation V4 – Prism) | Type × Style | ＋ `Table` — composes `Cell`, `RowHeader`, `ColumnHeader` | `table/Table.tsx` |

**Merge.** `Row-reading` and `Row-input` have the same anatomy — a mark bar, an
optional bulk checkbox, the label, a trailing glyph. They are the **row header**:
the first cell of a row. In code that is `RowHeader` (`type` readable · data ·
input · total · divider; `mark`, `bulk`, `icon`), with Reading's `group` (a left
bar) and Input's `groupStart` / `groupEnd` (rules on top and underneath) as three
props of one component. The row itself is `Row`; the read/edit distinction on the
rest of the row lives on `Cell type`. Use `RowHeader` for the first cell of every
row instead of a text `Link` or a bare `Cell`.

**Addition.** Figma has no single grid component — each screen assembles Header,
Rows and Cells itself. `DataGrid` is that assembly, kept in one place so sticky
header behaviour is not re-implemented per page.

## 12 · Charts (6)

Charts are the one group not drawn by this package: they are **Chart.js 4**
configured against the Scalar tokens.

| Figma | Variants | React | File |
|---|---|---|---|
| Chart Frame | Grid | ⊕ `chartScaffold()` | `charts/chartSetup.ts` |
| Chart Legend Item | Series 1–8 | = `ChartLegendItem` (+ `ChartLegend`) | `charts/ChartLegend.tsx` |
| Bar Chart | Type | = `BarChart` | `charts/BarChart.tsx` |
| Line Chart | Type | = `LineChart` | `charts/LineChart.tsx` |
| Waterfall Chart | — | = `WaterfallChart` | `charts/WaterfallChart.tsx` |
| Donut Chart | State | = `DonutChart` | `charts/DonutChart.tsx` |
| — | — | ＋ `ChartCanvas` | `charts/ChartCanvas.tsx` |
| — | — | ＋ `useChartTokens` / `resolveChartTokens` | `charts/useChartTokens.ts` |
| — | — | ＋ direct-label, connector and donut-centre plugins | `charts/plugins.ts` |

**`Chart Frame` is not a component here.** In Figma it is drawn geometry — a
416 × 192 plot area at an origin of 48, 8. With Chart.js the scaffold is scale
configuration, so it is expressed as `chartScaffold(tokens, grid, format)`
returning Chart.js scale options, and Chart.js owns the geometry responsively.
Its `Grid` variant survives as the `grid` prop (`horizontal` · `both` · `none`).

**Additions exist because canvas cannot read CSS.** `ChartCanvas` owns the
Chart.js lifecycle, re-resolving tokens on theme change, and the screen-reader
data table. The plugins cover marks Chart.js has no native equivalent for:
direct labels, waterfall connectors, and the donut's centre total.

## 13 · Summary Card (2)

| Figma | Variants | React | File |
|---|---|---|---|
| Card | — | = `Card` | `card/Card.tsx` |
| Card_item | — | = `CardItem` | `card/Card.tsx` |

## 14 · Feedback (4)

| Figma | Variants | React | File |
|---|---|---|---|
| Alert | Style | = `Alert` | `feedback/Alert.tsx` |
| Toast | Style × State | = `Toast` (+ ＋`ToastViewport`) | `feedback/Toast.tsx` |
| Progress Bar | Type | = `ProgressBar` | `feedback/ProgressBar.tsx` |
| Skeleton | Type | = `Skeleton` | `feedback/Skeleton.tsx` |

## 15 · Accordion & Drawer (6)

| Figma | Variants | React | File |
|---|---|---|---|
| Accordion Item | State | = `AccordionItem` | `disclosure/Accordion.tsx` |
| Accordion | — | = `Accordion` | `disclosure/Accordion.tsx` |
| Drawer | Side | = `Drawer` | `disclosure/Drawer.tsx` |
| Workspace Drawer | State | = `WorkspaceDrawer` (sticky to the viewport bottom) | `disclosure/WorkspaceDrawer.tsx` |
| Workspace Drawer Tab | State | = `WorkspaceDrawerTab` | `disclosure/WorkspaceDrawer.tsx` |
| Data Review Card | State | = `DataReviewCard` | `disclosure/DataReviewCard.tsx` |

## 16 · Modals (4)

| Figma | Variants | React | File |
|---|---|---|---|
| Column Item | State | = `ColumnItem` | `modals/ColumnPicker.tsx` |
| Column Title | State | = `ColumnTitle` | `modals/ColumnPicker.tsx` |
| Search | State | = `ModalSearch` | `modals/ColumnPicker.tsx` |
| Add_Column_Modal | State | ⊕ `Modal` + the three above | `modals/Modal.tsx` |
| — | — | ＋ `Modal` (the reusable shell; `size` s · m · l · xl · 2xl) | `modals/Modal.tsx` |

**Note.** `Add_Column_Modal` is an assembled screen in Figma, composed from
Column Title, Column Item, Search and Button. In code it is that same
composition — build it from `Modal` plus those three, rather than importing a
one-off. The `Modal` shell is the reusable part and is new in the code layer.

## 17 · Global Search (5)

| Figma | Variants | React | File |
|---|---|---|---|
| Global Search | State | = `GlobalSearch` | `search/GlobalSearch.tsx` |
| Search Result Row | Type × State (27) | = `SearchResultRow` | `search/SearchResultRow.tsx` |
| Search Section Header | Type (9) | = `SearchSectionHeader` | `search/SearchSectionHeader.tsx` |
| Search Scope Chip | Type (5) | = `SearchScopeChip` | `search/SearchScopeChip.tsx` |
| Key Hint | — | = `KeyHint` | `search/KeyHint.tsx` |

## 18 · Template (0 components)

`Page Template · Data Sheet` is an assembled page, not a component. Build it
from `PrimaryMenu`, `CompanyInfo`, `SecondaryMenu`, `TertiaryMenu` and
`DataGrid`.

## Page template (components file node 1671:13280)

| Figma | React | File |
|---|---|---|
| Page Template · body space used for any component | ＋ `PageTemplate` — the five slots; `children` is the body slot | `template/PageTemplate.tsx` |
| BODY-SLOT | ＋ `BodySlot` — the placeholder shown when `children` is omitted | `template/PageTemplate.tsx` |
| Workspace Drawer · docked | `WorkspaceDrawer docked` (tab strip only) | `disclosure/WorkspaceDrawer.tsx` |

The product app wraps it as `shell/PageTemplate.tsx`. Guide: [page-template.md](page-template.md).

## 20 · Menus & Actions (11)

| Figma | Variants | React | File |
|---|---|---|---|
| Menu Item | State × Tone (7) | = `MenuItem` (+ ＋`MenuDivider`, ＋`MenuSubItems`) | `actions-menus/Menu.tsx` |
| Context Menu | Header (2) | = `ContextMenu` (`heading` prop) | `actions-menus/Menu.tsx` |
| User Menu | Firm Settings Expanded (2) | = `UserMenu` (expansion lives on `MenuItem expanded`) | `actions-menus/Menu.tsx` |
| Split Button | Style (3) × Size (4) × Tone (4) × State (4) = 192 | = `SplitButton` (`variant` primary · secondary · tertiary, `tone` main · positive · warning · negative, `size` xs · s · m · l; ＋ `menuPlacement` bottom · top). Figma `1591:366`, page 20 | `actions-menus/Actions.tsx` |
| FAB | State (4) | = `Fab` | `actions-menus/Actions.tsx` |
| Speed Dial Item | State (3) | = `SpeedDialItem` | `actions-menus/Actions.tsx` |
| Speed Dial | — | = `SpeedDial` | `actions-menus/Actions.tsx` |
| Segment | Content × State (8) | ⊕ `SegmentedControl` (`options[]`) | `actions-menus/Actions.tsx` |
| Segmented Control | Content × Items (4) | = `SegmentedControl` (＋ `variant="outline"`, `count`, `fullWidth`, from the workboard Valuation modal) | `actions-menus/Actions.tsx` |
| View Tab | State (3) | = `ViewTab` | `actions-menus/Actions.tsx` |
| View Tab Bar | — | = `ViewTabBar` | `actions-menus/Actions.tsx` |

## 21 · Form Patterns (13)

| Figma | Variants | React | File |
|---|---|---|---|
| Floating Label Field | Type × State (12) | ⊕ `FloatingLabelInput` + `FloatingLabelSelect` | `form-patterns/Fields.tsx` |
| Number Field | Adornment × State (8) | = `NumberField` (`suffix` switches the adornment; ＋ `label` floating label) | `form-patterns/Fields.tsx` |
| Time Field | State (3) | = `TimeField` | `form-patterns/Fields.tsx` |
| Tag Input | State (3) | = `TagInput` | `form-patterns/Fields.tsx` |
| Copy Field | Type × State (4) | = `CopyField` (`secret`) | `form-patterns/Fields.tsx` |
| Combobox Option | Selection × State (8) | = `ComboboxOption` | `form-patterns/Pickers.tsx` |
| Show More Row | — | = `ShowMoreRow` | `form-patterns/Pickers.tsx` |
| Combobox Panel | Footer (2) | = `ComboboxPanel` | `form-patterns/Pickers.tsx` |
| Repeatable Row | Layout (2) | = `RepeatableRow` (the fields are children) | `form-patterns/Pickers.tsx` |
| Dropzone | State (4) | = `Dropzone` (Hover = drag-over, CSS; ＋ `prompt` override) | `form-patterns/Pickers.tsx` |
| Slider | State (3) | = `Slider` | `form-patterns/Pickers.tsx` |
| Inline Edit | State (4) | = `InlineEdit` | `form-patterns/Pickers.tsx` |
| Inline Picker | State (3) | = `InlinePicker` | `form-patterns/Pickers.tsx` |
| — | — | ＋ `SelectMenu` + `SelectMenuOption` — the open listbox surface of a select | `form-patterns/Pickers.tsx` |
| — | — | ＋ `ImageCropField` — logo / avatar preview, zoom Slider, delete | `form-patterns/Pickers.tsx` |

**Merge.** The two Floating Label types are separate exports because an
`<input>` and a `<select>` take different props; the label float is CSS
(`:placeholder-shown`), so both work controlled or uncontrolled.

## 22 · Grid Patterns (10)

| Figma | Variants | React | File |
|---|---|---|---|
| Row Label Cell | Type × Expand (8) | = `RowLabelCell` | `grid-patterns/Grid.tsx` |
| Grid Value Cell | Kind × State (12) | = `GridValueCell` | `grid-patterns/Grid.tsx` |
| In-cell Control | Type × State (9) | = `InCellControl` | `grid-patterns/Grid.tsx` |
| Column Group Header | Style × Divider (4) | = `ColumnGroupHeader` | `grid-patterns/Grid.tsx` |
| Grid Column Header | Sort × State (9) | = `GridColumnHeader` (＋ `grow` / `width` / `span`, `trailing`, `editable` date column) | `grid-patterns/Grid.tsx` |
| Collapsed Column Rail | State (2) | = `CollapsedColumnRail` | `grid-patterns/Grid.tsx` |
| Add Column Header | State (2) | = `AddColumnHeader` | `grid-patterns/Grid.tsx` |
| Grid Column Divider | Type (2) | = `GridColumnDivider` | `grid-patterns/Grid.tsx` |
| Chart Hover Card | — | = `ChartHoverCard` | `grid-patterns/Grid.tsx` |
| Cell History Popover | — | = `CellHistoryPopover` (chart is a child) | `grid-patterns/Grid.tsx` |
| — | — | ＋ `TaskPill` — pending-task pill in a grid row | `grid-patterns/Grid.tsx` |

These sit **alongside** `Cell`, `Row` and `ColumnHeader`, not in place of them.
**Headers are the exception (R16):** product tables always use `ColumnHeader`; `GridColumnHeader` and
`AddColumnHeader` stay in the library for Figma parity only, and the trailing add-column header is the
product's `AddColumn` (`apps/product/src/shell/AddColumn.tsx`, a `ColumnHeader kind="action-button"`).
use them for the financial-statement grids that need row hierarchy, value
provenance and in-cell editing. See known gap 8.

## 23 · Files & Documents (7)

| Figma | Variants | React | File |
|---|---|---|---|
| File Type Badge | Type (7) | = `FileTypeBadge` (+ ＋`fileKindOf`) | `files/Files.tsx` |
| File Row | State (3) | = `FileRow` (+ ＋`layout="inline"`, ＋`typeIndicator="icon"` with ＋`FileTypeIcon`) | `files/Files.tsx` |
| Tree Item | Type × Level × State (12) | = `TreeItem` | `files/Files.tsx` |
| Page Stepper | — | = `PageStepper` | `files/Files.tsx` |
| Zoom Control | — | = `ZoomControl` (Material `zoom_in` / `fit_screen`) | `files/Files.tsx` |
| Document Viewer Header | — | = `DocumentViewerHeader` | `files/Files.tsx` |
| Scroll Hint Pill | Direction (2) | = `ScrollHintPill` | `files/Files.tsx` |

## 24 · Feedback Patterns (5)

| Figma | Variants | React | File |
|---|---|---|---|
| Banner | Style (5) | = `Banner` | `feedback-patterns/Status.tsx` |
| Spinner | Size (3) | = `Spinner` | `feedback-patterns/Status.tsx` |
| AI Outline | State (2) | ＋ `AiOutline` (`active`, `asChild`) — a comet of the AI gradient orbiting a 3px ring over the host's edge while AI works (Figma `1753:95`, page 24; guide `docs/ai-outline.md`) | `feedback-patterns/AiOutline.tsx` |
| Progress Ring | Value (5) | = `ProgressRing` (continuous `value` / `max`) | `feedback-patterns/Status.tsx` |
| Data Freshness | State (3) | = `DataFreshness` | `feedback-patterns/Status.tsx` |
| Save State | State (5) | = `SaveState` | `feedback-patterns/Status.tsx` |

## 25 · Overlays & Panels (4)

| Figma | Variants | React | File |
|---|---|---|---|
| Confirmation Dialog | Tone (2) | = `ConfirmationDialog` (built on `Modal`) | `overlays/Overlays.tsx` |
| Setting Row | State (2) | = `SettingRow` | `overlays/Overlays.tsx` |
| Notification Center | View (2) | = `NotificationCenter` | `overlays/Overlays.tsx` |
| Row Action Toolbar | — | = `RowActionToolbar` | `overlays/Overlays.tsx` |

## 26 · Settings & Admin (13)

| Figma | Variants | React | File |
|---|---|---|---|
| Key-Value Row | Layout (2) | = `KeyValueRow` | `admin/Admin.tsx` |
| Version History Item | State (2) | = `VersionHistoryItem` (＋ `currentLabel`) | `admin/Admin.tsx` |
| Permission Matrix Row | Type (2) | = `PermissionMatrixRow` | `admin/Admin.tsx` |
| Role Selector | State (2) | = `RoleSelector` | `admin/Admin.tsx` |
| Profile Header | — | = `ProfileHeader` | `admin/Admin.tsx` |
| Filter Bar | — | = `FilterBar` | `admin/Admin.tsx` |
| Directory Group | — | = `DirectoryGroup` | `admin/Admin.tsx` |
| Product Tile | Product (4) | = `ProductTile` | `admin/Admin.tsx` |
| Firm Switcher Tile | State (3) | = `FirmSwitcherTile` | `admin/Admin.tsx` |
| Page Task Header | — | = `PageTaskHeader` | `admin/Admin.tsx` |
| Code Grid | — | = `CodeGrid` | `admin/Admin.tsx` |
| Rich Text Toolbar | — | = `RichTextToolbar` (＋ `formats`, `numbered`) | `admin/Admin.tsx` |
| App Footer | — | = `AppFooter` | `admin/Admin.tsx` |

**Glyphs.** These components render glyphs from `icon/glyphs.tsx` (Plus,
MoreVertical, Trash, Copy, Folder…), which are now aliases onto the Material
Symbols set (`icons`). Every one that shows an icon also takes an icon prop —
pass any `icons.*` glyph to change it. Figma still draws these from SDS_Main,
so a glyph can differ between the two (known gap 4).

---

## Workboard (20)

Ported from the Workboard prototype (`WORKBOARD_PROTOTYPE`, workboard-v2 Figma `mZ0cFiczRr3UCglYIO6Ot0`) and,
for the Valuation modal, from the workboard file `tuFpgEHX8w3BDI40U0FUwV` ("Assign users form Modal", 532:16434).
Tones are the four status families (Brand, AI, Warning, Positive) plus the Workflow tone family
(Blue, Pink, Cyan, Orange — `color.workflow.*`, code-first, known gap 13). The Deal card's fill and ink are the
Deal tokens (`color.deal.*`, *Semantic: Color › Deal/\**, known gap 14). Every component is prop-driven:
none carries prototype data. Storybook: **Workboard** › Action Pill · Deal Card · Color Picker · Calendar ·
Timeline · Step Assign Menu · Valuation Modal · *Valuation Modal spec* (MDX).

| Figma | Variants | React | File |
|---|---|---|---|
| Action Tag | Tone × Urgency (8 × 3) | = `ActionTag` | `workboard/Workboard.tsx` |
| — (prototype `ActionsSelect`) | Tone × Urgency × Size | ＋ `ActionPill` | `workboard/Workboard.tsx` |
| Due Pill | Urgency × Size | = `DueDatePill` | `workboard/Workboard.tsx` |
| — (prototype `StatusDropdown`) | — | ＋ `StepMenu` + `StepMenuSection` / `StepMenuLink` / `StepMenuToggle` / `StepMenuAction` | `workboard/Workboard.tsx` |
| — (prototype `DealCard`) | — | ＋ `DealCard` — composes `Card`, `Selector`, `Link`, `Chip`, `Avatar`, `ButtonIcon` | `workboard/DealCard.tsx` |
| — (prototype `v2/ui` `ColorPicker`) | — | ＋ `ColorPicker` — hex `Input`, saturation square + hue track (`role="slider"`), `Button` × 2 | `workboard/ColorPicker.tsx` |
| — (prototype `v2/views` `CalendarView`) | Month · Week | ＋ `WorkCalendar` (`role="grid"`) + `CalendarTaskCard` (Models task card, TODO §1) | `workboard/WorkCalendar.tsx` |
| — (prototype `v2/views` `TimelineView`) | Week · Month · Quarter | ＋ `WorkTimeline` (`role="table"`) | `workboard/WorkTimeline.tsx` |
| — (prototype calendar / timeline view bar) | — | ＋ `PeriodToolbar` — composes `Button`, `ButtonIcon`, `SegmentedControl` | `workboard/WorkCalendar.tsx` |
| Main Container (536:23865 + 6 states) | 7 states | ＋ `ValuationModal` — `Modal size="2xl"`, no header | `workboard/ValuationModal.tsx` |
| Valuation Container (536:23867) | — | ＋ `ValuationSummary` — layout slots: title · tags · status · subject · meta · people · figures · aside | `workboard/ValuationModal.tsx` |
| Container ×3 (536:23966 · 24007 · 24051) | — | ＋ `ValuationPanel` — heading + action, content, pinned footer | `workboard/ValuationModal.tsx` |
| Valuation Numbers (405:13342) | — | ＋ `FigureList` (`<dl>` of tiles) | `workboard/ValuationModal.tsx` |
| Modal Status Dropdown (538:29138 … 538:29764) | 8 states | ＋ `StepAssignMenu` — steps, assignees or assign button, picker (chips · filter · Save · checklist) | `workboard/StepAssignMenu.tsx` |
| Status "input" (536:23875 · 536:23415) | Size × assignees | ＋ `StatusTrigger` | `workboard/StepAssignMenu.tsx` |
| "Valuation Lead" tiles (536:23901 · 23991 · 24037) | Emphasis (5) | ＋ `AssigneeCard` — lead · outline · default · muted · inverse | `workboard/Assignees.tsx` |
| Avatar rows in the status menu (538:29694) | — | ＋ `AssigneeAvatars` (folds past two into "+N") | `workboard/Assignees.tsx` |
| Notes Content Container (536:24061) | — | ＋ `NoteCard` | `workboard/ValuationNotes.tsx` |
| Note Input Tools Container (536:24080) | — | ＋ `NoteComposer` — `RichTextToolbar` + textarea + Save | `workboard/ValuationNotes.tsx` |
| Deal card (536:23937) | — | = `DealCard tone="deal"` (＋ `contractAction`) | `workboard/DealCard.tsx` |

## Added by the code layer

These have no Figma counterpart. They exist because code needs them and
repeating them per page would guarantee drift.

| Export | Why |
|---|---|
| `ScalarProvider` | Carries the colour mode and the type-ramp mode. In Figma these are variable modes set on a frame. |
| `Icon` | Sizing and tint wrapper. Enforces the re-tint that SDS_Main glyphs require. |
| `icons` | The product icon set — Google Material Symbols (Outlined), generated from `icon/material-icons.json` by `npm run gen:icons`. Figma uses SDS_Main instead. |
| `Typography` / `Heading` / `Text` / `Label` / `Overline` | The type ramp as components. Figma expresses this as 72 text styles. |
| `Table` | The platform table: selection, resize, formula mode, keyboard and editing around `Cell` / `RowHeader` / `ColumnHeader`. |
| `DataGrid` | The grid shell — a CSS grid whose column tracks come from the header cells, with a sticky header under `maxHeight`. |
| `ChartCanvas` | Chart.js lifecycle, token re-resolution on theme change, and the screen-reader data table. |
| `chartScaffold` / `baseChartOptions` | The Figma Chart Frame spec as Chart.js options. |
| `useChartTokens` / `resolveChartTokens` | The CSS-variable → canvas bridge. |
| `Modal` | The reusable dialog shell behind `Add_Column_Modal`. |
| `ToastViewport` | The fixed stack toasts render into. |
| `MenuPanel` / `MenuGroupLabel` | The floating surface shared by every dropdown. |
| `SelectMenu` / `SelectMenuOption` | The open listbox of a select (check, disabled, description, search slot) — composed by hand on several screens. |
| `TaskPill` | Pending-task marker in a grid row. |
| `ImageCropField` | Logo / avatar upload preview with zoom. |
| `cx`, `useControllableState` | Utilities every component needs. |
