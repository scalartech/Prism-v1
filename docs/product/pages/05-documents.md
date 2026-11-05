# 05 · Documents (Firm)

The firm-wide document library. Analysts and admins use it to find any file the firm holds, organised by measurement date and company, to add folders and uploads, and to preview a file without leaving the page.

## Screens

### Documents — `/documents`
Browse all measurement-date folders, or pick a company to see its tree and preview a document beside it. Reached from **Documents** in the Primary Menu. Row 2 holds the tabs **All documents · Requests** in place of a page title (the top nav already says Documents; "Documents › Documents" would read as a bug), with the pin and ⋮ right-aligned, so no global Documents view has a third nav row. The document tools (Select all, Search, Filter, Full screen) sit at the top of the document column. The company tab (closable ViewTab) returns to All Documents; "Upload Document" leads to the company's Documents page upload modal (10).

| State | Figma frame | Node | Open with |
|---|---|---|---|
| default | Documents — All Documents | [19:24011](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-24011) | `#/documents?state=default` |
| pdf-loading | Documents — Company selected · PDF loading | [19:38422](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-38422) | `#/documents?state=pdf-loading` |
| pdf-viewer | Documents — PDF viewer | [19:44982](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-44982) | `#/documents?state=pdf-viewer` |
| add-folder | Documents — Add Folder modal | [19:47312](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-47312) | `#/documents?state=add-folder` |
| parent-folder-picker | Documents — Add Folder · Parent Folder picker | [19:48713](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-48713) | `#/documents?state=parent-folder-picker` |

Components used: AppFrame/PageHeader (shell, `tabs` = `firmDocsTabs`), ViewTabBar, ViewTab, Checkbox, CheckboxItem, ButtonIcon, Button, Heading, Text, FilterDropdown, Input, Chip, Badge, ScrollHintPill, TreeItem, FileRow, FileTypeBadge, DocumentViewerHeader, PageStepper, ZoomControl, Spinner, EmptyState, Link, Modal, FormField, ComboboxPanel, Material `icons` (Person, CalendarToday, Link, Folder, UploadFile, KeyboardArrowUp/Down, Search, FilterList, Fullscreen, Description).

Behaviour & rules:
- Left: All Companies list from `db` — the 16 companies drawn in the frame first, then the rest of the 200 A–Z; fund tag = the record's fund (`db.funds`), document count from the frame (or derived from the record for companies the frame doesn't show). "Find Company" searches with `db.companies.search`; the ScrollHintPill count ("↓ 184 companies") is computed. Every company row opens that company's own tree and links to its own Company · Documents page.
- All Documents: one band per measurement date (counts + request progress, Add Subfolder, Upload Document, collapse). 03/31/2025 opens to Backside Blocks → root files → Company Docs. System-generated exports are not in the tree: they live on Company › Documents › Exports (10). One line per document (`DocRow`: FileRow `layout="inline"` + `typeIndicator="icon"`, so a type icon instead of the badge and the uploader, date and linked-area chips right-aligned); subfolders are plain `FolderRow`s (checkbox for the whole folder, folder glyph, name, count, collapse arrow at the right) — only measurement dates get the filled band.
- Company selected: compact tree (icon-only folder actions) and a viewer. Clicking a file shows "Preparing PDF preview…" (Spinner) for ~1.2s, then the page with PageStepper (1/12) and ZoomControl (100%, Fit). With no file chosen the viewer is an EmptyState.
- Add Folder: opened from a date band's add-folder action. Parent Folder is a read-only field that opens a ComboboxPanel (in flow, because the modal body clips overflow) ("Find a Folder": No Folder, Company Docs); Folder Name required — Create Folder stays disabled until it is filled; the new folder is appended to the tree. Scrim click does not dismiss once a name is typed.
- "Select all" checks every file row; indeterminate when some are checked.
- Viewer body text is placeholder copy, not the real PDF.

### Requests — `/documents/requests` (prototype state)
Every company's information request in **one full-width table** (DataGrid, `ColumnHeader`): Company · Fund · Pending · Resolved / total · Due date · Last activity. Default sort: pending first, then the earliest due date; Company, Pending, Due date and Last activity sort from their headers. Above it: Find company, Fund and Status (All · Pending · All resolved · None sent) filters and the "N of 200 companies · N with requests pending" count.

- Picking a company opens it **in company context** — `#/companies/:id/documents/requests` — so the header company selector updates and its tabs (Documents · Requests · Exports · Final Report) appear in Tier 3. There is no third "Pick a company" column.
- Back returns to the table with its search, filters, sort and scroll position as they were (kept in sessionStorage for the session).
- **Questions folded into Requests** at both levels: requests already carry questions (Yes / No, written answer, multiple choice, date). `#/documents/questions`, `#/documents/questions/:id`, `#/documents/requests/:id` and `#/companies/:id/documents/questions` redirect (`routes.ts › redirectOf`) instead of 404ing.

| State | Label | Node |
|---|---|---|
| default (`/documents/requests`) | Requests — one company table, pending first | proto:firm-requests:1 |

Every count here, on the company pages and in Firm Valuations › Process Management reads the same per-company request list.

## Cross-platform links
- In: Primary Menu → Documents; Waterfalls Workspace drawer file rows (04); company Documents row menu "Open in viewer" (10).
- Out: Upload Document → Company · Documents upload modal (10); empty viewer → Company · Documents (10).

## Gaps & open questions
- Company list row, measurement-date band and viewer page surface are composed in the area folder (no DS directory-list row or folder band).
- TreeItem has no icon slot: the frame's company node uses a building icon (`domain` / `corporate_fare`); code shows the folder glyph.
- Wanted `create_new_folder` for Add Subfolder (not in the icon set; `folder` used).
- The tree's files are the frame's Backside Blocks set for every company (export names carry the company's name); per-company file data is not in the db.
- "Filter by Fund" shows the value in force ("All funds"); the fund filter menu is not built.
- Search / Filter / Full-screen toolbar icons and the viewer's download/copy/rename/delete are inert. Viewer body is placeholder copy.
- Tier 3 was "All Documents" + the selected company's name in the frames; the firm level now has no Tier 3 — its tabs (All documents · Requests) are in row 2. "All Documents" is a button beside the selected company's name.
- Release note for the Questions → Requests fold: a production migration turns each question into a request (text, answer, author, dates kept; Written answer unless it has a structured type; its category, or "9. Other"). Unanswered questions become pending requests, so some companies' pending counts rise. In the prototype questions were already requests in the same list, so nothing moves.
