# 05 · Documents (Firm)

The firm-wide document library. Analysts and admins use it to find any file the firm holds, organised by measurement date and company, to add folders and uploads, and to preview a file without leaving the page.

## Screens

### Documents — `/documents`
Browse all measurement-date folders, or pick a company to see its tree and preview a document beside it. Reached from **Documents** in the Primary Menu. The company tab (closable ViewTab) returns to All Documents; "Upload Document" leads to the company's Documents page upload modal (10).

| State | Figma frame | Node | Open with |
|---|---|---|---|
| default | Documents — All Documents | [19:24011](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-24011) | `#/documents?state=default` |
| pdf-loading | Documents — Company selected · PDF loading | [19:38422](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-38422) | `#/documents?state=pdf-loading` |
| pdf-viewer | Documents — PDF viewer | [19:44982](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-44982) | `#/documents?state=pdf-viewer` |
| add-folder | Documents — Add Folder modal | [19:47312](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-47312) | `#/documents?state=add-folder` |
| parent-folder-picker | Documents — Add Folder · Parent Folder picker | [19:48713](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-48713) | `#/documents?state=parent-folder-picker` |

Components used: AppFrame/PageHeader (shell), TertiaryMenu, ViewTabBar, ViewTab, Checkbox, CheckboxItem, ButtonIcon, Button, Heading, Text, FilterDropdown, Input, Chip, Badge, ScrollHintPill, TreeItem, FileRow, FileTypeBadge, DocumentViewerHeader, PageStepper, ZoomControl, Spinner, EmptyState, Link, Modal, FormField, ComboboxPanel, Material `icons` (Person, CalendarToday, Link, Folder, UploadFile, KeyboardArrowUp/Down, Search, FilterList, Fullscreen, Description).

Behaviour & rules:
- Left: All Companies list from `db` — the 16 companies drawn in the frame first, then the rest of the 200 A–Z; fund tag = the record's fund (`db.funds`), document count from the frame (or derived from the record for companies the frame doesn't show). "Find Company" searches with `db.companies.search`; the ScrollHintPill count ("↓ 184 companies") is computed. Every company row opens that company's own tree and links to its own Company · Documents page.
- All Documents: one band per measurement date (counts + request progress, Add Subfolder, Upload Document, collapse). 03/31/2025 opens to Backside Blocks → root files → Company Docs / Exports subfolders. One line per document (`DocRow`: FileRow `layout="inline"` + `typeIndicator="icon"`, so a type icon instead of the badge and the uploader, date and linked-area chips right-aligned); subfolders are plain `FolderRow`s (checkbox for the whole folder, folder glyph, name, count, collapse arrow at the right) — only measurement dates get the filled band.
- Company selected: compact tree (icon-only folder actions) and a viewer. Clicking a file shows "Preparing PDF preview…" (Spinner) for ~1.2s, then the page with PageStepper (1/12) and ZoomControl (100%, Fit). With no file chosen the viewer is an EmptyState.
- Add Folder: opened from a date band's add-folder action. Parent Folder is a read-only field that opens a ComboboxPanel (in flow, because the modal body clips overflow) ("Find a Folder": No Folder, Company Docs, Exports); Folder Name required — Create Folder stays disabled until it is filled; the new folder is appended to the tree. Scrim click does not dismiss once a name is typed.
- "Select all documents" checks every file row; indeterminate when some are checked.
- Viewer body text is placeholder copy, not the real PDF.

### Requests — `/documents/requests` and `/documents/requests/:companyId` (prototype states)
Tier 3 of firm Documents is **Documents · Questions · Requests**, the same three as Company › Documents. On Requests the All Companies column (search, fund chip) shows each company's pending count or "All resolved".
- Every body column (All Companies, the list or tree, the card or viewer) sits in a container: `bg.subtle` fill, `stroke.divider` hairline, `radius.m` corners, `space.m` padding (`columnPanel` in `parts.tsx`). Columns stretch to the body's full height and scroll on their own. Long lists (All Companies, Pending requests / questions) use `ScrollList`: while rows sit below the fold, the Scroll Hint Pill counts them ("↓ 13 companies") and a click scrolls a page down. With no company picked, the third column holds a "Pick a company" empty state so the layout stays three columns.
- **No company picked:** a second column, *Pending requests*, lists only the companies with something pending (most pending first). Picking one opens a third column: a `Card` (Core/Card › With Tag And Action) titled with the company, a "N pending" warning `Chip` as its tag, `CardItem` rows for Fund, Sent, Resolved, Documents pending, Questions pending, Due and Sent to, and an *Open requests* action that selects the company. Clicking the same company again closes the card.
- **Company picked** (the id is in the URL, so it can be shared): the company's request exactly as Company › Documents › Requests shows it (`useRequestsWorkspace`) — categories, Sent to, numbered list, Expand / Status / Select All / Bulk actions / Due date / Info Request in Tier 3.

| State | Label | Node |
|---|---|---|
| default (`/documents/requests`) | Requests — all companies overview | proto:firm-requests:1 |
| default (`/documents/requests/:companyId`) | Requests — company selected | proto:firm-requests:2 |

### Questions — `/documents/questions` and `/documents/questions/:companyId` (prototype states)
Same layout: the column shows each company's open questions; *Pending questions* lists the companies with questions waiting, and picking one shows a card with Fund, Sent, Answered, Pending and Due (action: *Open questions*). Under the card, the company's *Pending answer* list (`RequestRow`, same as Company › Questions) lets the user answer, mark N/A, complete or delegate in place; the card and the list update as soon as an answer is saved, and the company stays listed after its last answer (tag: "All answered"); a picked company shows its questions split Pending answer / Answered (`useQuestionsWorkspace`), with Info Request in Tier 3.

| State | Label | Node |
|---|---|---|
| default (`/documents/questions`) | Questions — all companies overview | proto:firm-questions:1 |
| default (`/documents/questions/:companyId`) | Questions — company selected | proto:firm-questions:2 |

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
- Tier 3 was "All Documents" + the selected company's name in the frames; it is now the Documents · Questions · Requests tabs. "All Documents" moved to a button beside the selected company's name.
- Info Request from a firm tab opens the company's request builder, and Send returns to the company's Requests page (not the firm tab).
