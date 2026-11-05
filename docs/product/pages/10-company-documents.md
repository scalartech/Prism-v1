# 10 · Company · Documents & Requests

Where a company's files live, and where the analyst requests missing documents and answers from the company, sends them to specific people and tracks what is still pending. Used by valuation teams preparing a valuation and by admins tracking request progress.

Every page here keeps the company's three navigation tiers: product menu (1) · company header with Documents selected (2) · **Documents · Requests · Exports · Final Report** (3). Questions folded into Requests (requests already carry Yes / No, written-answer, multiple-choice and date questions); `#/companies/:id/documents/questions` redirects to Requests. The tabs already name the page, so the pages have **no visible title** (a visually hidden heading and the browser tab title name it). The company row's right end carries only the ⋮ menu (`CompanyDocsHeaderEnd`). **Every tab's Tier 3 shows only actions on that tab's content**: Select all / Search / Filter on Documents; the request meter, tools and Info Request on Requests; Select all / Download on Exports; View (zoom) · File (Download · Print) · Manage (Upload report · Create PDF export) on Final Report. Final Report carries a warning mark (accessible name "Final report out of date") while its final version is out of date.

## Screens

### Documents — `/companies/:companyId/documents`
The firm Documents layout with this company already selected: measurement-date folders (the company's measurement date first, with its document, subfolder and request counts) holding the file tree (root files, then Company Docs / Exports), and the document preview beside it once a file is opened (the tree goes compact). Reached from the company Secondary Menu (Documents) and the Workspace drawer "Add new document" (04/09).

| State | Figma frame | Node | Open with |
|---|---|---|---|
| default | Documents — Document List | [11:13664](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=11-13664) | `#/companies/abc-co/documents?state=default` |
| upload | Documents — Upload Document modal | [14:4176](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=14-4176) | `#/companies/abc-co/documents?state=upload` |
| page-menu | Documents — Page menu open | [14:4259](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=14-4259) | `#/companies/abc-co/documents?state=page-menu` |

Components used: CompanyLayout (shell), TertiaryMenuItem, Checkbox, CheckboxItem, ProgressBar, Text, Button, ButtonIcon, ContextMenu, MenuItem, Input, FileRow (`layout="inline"`, `typeIndicator="icon"` → FileTypeIcon), EmptyState, Modal (size l), Dropzone, and from firm Documents (`p05-documents/parts.tsx`): DateBand, DocRow, FolderRow, Viewer (DocumentViewerHeader, PageStepper, ZoomControl, Spinner), metaChips.

Behaviour & rules:
- Tier 3 end: Select all documents, Search (icon; opens a field in the row, Escape clears and closes it — `TierSearch`), Filter. Search filters the tree by name and opens matching folders. Uploads go straight into a measurement-date folder (its Upload Document).
- The tree holds only what the client and the team uploaded: system-generated exports moved to Exports (by origin — a user-made folder named "Exports" holding uploads would stay). Request progress is not repeated here; it lives on Requests.
- One line per document: type icon (`color.file.*`), name; uploader, date and linked area right-aligned. Subfolders are plain rows (checkbox selects every document in the folder, folder glyph, name, count, collapse arrow at the right) — only measurement dates get the filled band.
- Opening a file shows "Preparing PDF preview…" then the page; close returns to the full-width tree.
- Upload: Dropzone (CSV, DOCX, JPG, PDF, XLSX, ZIP · 250 MB max); Done disabled until a file is chosen; uploaded files go to the top of the measurement date with today's date and the signed-in user.
- Company row ⋮ → "Edit Company Questions and Documents" (the request builder) · "Track pending responses" (Requests).

### Requests — `/companies/:companyId/documents/requests` (prototype states)
The Unified Request Portal list as the signed-in sender sees it: questions and documents in one numbered list, categories on the left, the responses that came back inside each request, and what is still pending.

| State | Label | Node | Open with |
|---|---|---|---|
| default | Requests — sent request, mixed responses | proto:company-requests:1 | `#/companies/abc-co/documents/requests` |
| pending | Requests — pending responses only | proto:company-requests:2 | `#/companies/abc-co/documents/requests?state=pending` |
| empty | Requests — nothing sent yet (Figma: Questions — Empty) | [14:10616](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=14-10616) | `#/companies/abc-co/documents/requests?state=empty` |

Components used: CompanyLayout, CompanyDocsHeaderEnd (ContextMenu), RequestsMeter (ProgressBar, Tooltip), FilterDropdown + SelectMenu, Checkbox, Button + ContextMenu (Expand, Bulk actions), SubmenuItem, Overline, Alert, Banner, EmptyState, Toast, and from the portal prototype: RequestRow (`viewer="sender"`), usePortalStore, DueDateDialog, DelegateDialog.

Behaviour & rules:
- Every count (meter, category tallies, "N pending" per recipient) derives from one `requests` array; follow-ups are never counted on their own (portal rule P1.3).
- **Request meter** at the left of the toolbar: a short bar + "27 of 29 resolved" (below 1280 px wide: "27/29"). Its tooltip has the breakdown ("29 sent · 27 resolved · 2 pending · due Nov 11, 2026"); pressing it sets Status to Pending. Complete: the bar turns Positive (ProgressBar at 100%), a check and "All 29 resolved". There is no "Every request is resolved" banner — the meter's complete state says it.
- **Answers inline** (sender view): a collapsed row shows the answer in the description's slot, in primary text, with "Answer:" for screen readers — Yes / No as a chip, the options picked ("A, B +1" past two), a formatted date, the first line of a written answer, the file name (+N files), "Sent another way" or "N/A". A request completed outside the portal shows **Complete** in the blue style with the send icon (tooltip "Completed outside the portal"); the answer slot keeps "Sent another way", so the meaning is never colour-only, and it counts as resolved everywhere. Expanded, the analyst reads "Marked complete by <recipient> · sent outside the portal." Once a request is resolved (any way), the template steps (Step 1 template, Download, Step 2 upload) are hidden and only the uploaded file shows; Reopen brings them back. Delegate is hidden on resolved requests. Yes / No uses the S radio with a 14 px label. The description returns when the row is expanded (and stays fully visible on the recipient's side, where it is the instruction). Expanded, the answer reads "Answered by <recipient> · <date>" instead of the recipient's "Your saved answer".
- Upload limits sit in the dropzone line itself: "Drag & drop or select a file · PDF, Office, CSV · max 250 MB" (no separate helper line or info icon).
- **Sent to** lists each recipient with their pending count; picking one filters the list to the requests sent to them. Combined with Status = Pending this is the "who still owes us what" view.
- Tier 3 end: Expand, Status, Select All, Bulk actions, **Due date** (a Button: the sender changes it; the recipient sees it straight away), Info Request. Bulk actions act on selected ∩ visible ∩ eligible requests.
- After New Info Request sends, a positive Banner confirms how many requests went to whom.
- Reset prototype data restores the fixture (requests live in this browser's localStorage).

### Information Request — `/companies/:companyId/documents/information-request`
The request builder, in the same layout as Requests: categories on the left; on the right **Send to** (recipients, due date, introduction) above the numbered list of requests. The three tiers stay; Tier 3 shows Requests selected with Preview recipient page · Cancel · Send N requests at its end.

| State | Figma frame | Node | Open with |
|---|---|---|---|
| default | Information Request — New request | [16:13871](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=16-13871) | `#/companies/abc-co/documents/information-request?state=default` |
| responsible-picker | Information Request — Responsible picker open | [19:19795](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=19-19795) | `#/companies/abc-co/documents/information-request?state=responsible-picker` |

Components used: CompanyLayout, SubmenuItem, Overline, FormField, Input, Select, Textarea, ComboboxPanel (multiple), Chip (onRemove), Button, ButtonIcon, Alert, Modal, DueDateDialog.

Behaviour & rules:
- **Template** is the first field, above Send to: *Last request sent to this company* (when there is one) · *Blank* · the firm's saved templates (*Standard valuation request* — 17, *Annual audit* — 22, *Quarterly update* — 8), each with its request count and last-edited date. It sets the requests and the introduction; the subtitle's counts update live. Recipients and the due date never change with it. With no edits the switch is instant; after edits a dialog asks "Replace your 17 requests with ‘Annual audit’ (22 requests)?" — **Replace**, **Add to current** (merged by category, skipping wording that already exists), Cancel. The action bar keeps only Preview recipient page · Cancel · Send N requests.
- Standard starts from the frame's 7 document requests and 10 questions, filed into the portal's categories with a response type each. Response types list the question types first (Yes / No · Written answer · Date · Upload document) — "Add request" is also how a question is asked. Wording is editable inline; each row can be removed.
- "Add request to <category>" adds a blank request at the end of that category and focuses it. Picking a category on the left shows only it (so an empty category can be filled).
- Recipients: a multi-select of the company's contacts, or any typed email address ("Send to …" / Add a new responsible). Chosen people show as removable chips.
- Send validates (no recipient, no requests, blank wording) with a negative Alert and field errors; nothing is sent until it passes. On send the requests are added to Requests as Pending, numbered after what each category already holds (numbers never move), recorded against their recipients, and the page returns to Requests.

### Exports — `/companies/:companyId/documents/exports`
The data files the platform generated — Excel exports from Financials, Cap Table or Waterfall — out of the Documents tree. Same structure as Documents: measurement-date folders, the company's date open, the others collapsed.

| State | Label | Node | Open with |
|---|---|---|---|
| default | Exports — by measurement date | proto:company-exports:1 | `#/companies/abc-co/documents/exports` |
| empty | Exports — none yet | proto:company-exports:2 | `#/companies/abc-co/documents/exports?state=empty` |

Components used: CompanyLayout, DateBand (no folder actions), DocRow (FileRow inline + FileTypeIcon), Checkbox, Button, ButtonIcon, ConfirmationDialog, EmptyState, Toast.

Behaviour & rules:
- Each row: type icon, file name, source screen, exported by, exported at (date + time), newest first within a date — the time tells "…_2025-03-31 (1).xlsx" apart. Row actions: Download, Delete (confirmed). Tier 3: Select all + Download.
- A date with none: "No exports for 03/31/2025 yet. Exports you create from Financials, Cap Table or Waterfall appear here."
- Every Excel Export (`prototypes/export/ExportDialog.tsx`) saves here and confirms "Export saved · View in Exports". PDF report exports are the exception: they are Final Report versions.
- Data: `exportsData.ts` (`origin: 'system'`, `sourceScreen`, `measurementDate`), in this browser's localStorage.

### Final Report — `/companies/:companyId/documents/final-report`
One final report per company and measurement date. The analyst picks it from the PDF versions or uploads one; the client sees only that file, and it never changes until the analyst picks again.

| State | Label | Node | Open with |
|---|---|---|---|
| default | Final Report — versions and preview, final out of date | proto:company-final-report:1 | `#/companies/abc-co/documents/final-report` |
| empty | Final Report — none yet (analyst) | proto:company-final-report:2 | `…/final-report?state=empty` |
| create | Final Report — create PDF export | proto:company-final-report:3 | `…/final-report?state=create` |
| render-failed | Final Report — PDF can't render, download instead | proto:company-final-report:4 | `…/final-report?state=render-failed` |
| client | Final Report — client view | proto:company-final-report:5 | `…/final-report?state=client` |
| client-empty | Final Report — client view, not published yet | proto:company-final-report:6 | `…/final-report?state=client-empty` |

Components used: CompanyLayout, Banner, Chip, Button, ButtonIcon, Heading, Text, PageStepper, ZoomControl, ConfirmationDialog, Modal + Dropzone + FileRow (upload), EmptyState, Alert, Toast.

Behaviour & rules:
- **Analyst**: two panes. Left, *Report versions*, newest first — name ("ABC Co – Valuation 12-31-2024 – v3.pdf", never identical names), source ("Scalar export" / "Uploaded by …"), created date and time, status chips (**Final** · **Current** · **Out of date** with "Valuation changed Nov 3" · **Uploaded**, "Valuation changed after this upload"), and *Set as final* on every non-final row. Right, the viewer for the version picked (the final by default), so a version is previewed before it is published.
- Tier 3 is the one place for actions and status (Round 2 §4.2): View (Zoom − · 100% · + · Fit) | File (Download · Print) | Manage (Upload report · Create PDF export, analysts only, primary right-most), separated by dividers. They act on the version shown. Below 1440 px View folds to a "100% ▾" menu; below 1280 px Download and Print move into ⋮. The page stepper stays above the PDF.
- **Delete** (analysts): on non-final versions, a row action next to Set as final. The final version's delete is disabled ("Set another version as final to delete this one."), and the store refuses it too. Confirm: "Delete v2? This can't be undone. Clients never saw this version." (once final: "Clients saw this version from Oct 2 to Nov 5."). Soft delete (`deletedAt`, `deletedBy`) plus an audit entry; numbers are never reused.
- Uploads take the naming convention ("ABC Co – Valuation 12-31-2024 – v2.pdf"); the original file name shows as secondary text.
- Set as final when another version is final asks first: "Clients will see v3 instead of v2." One final per company + date; every change is recorded (who, when, which version it replaced).
- **Out of date**: an export stores the valuation revision it was made from; any later saved revision makes it Out of date (an upload: any revision saved after it). When the *final* goes out of date, analysts see, after the tabs in Tier 3, a warning chip "Final report out of date" + "Valuation changed Nov 3, 2026" (tooltip: "ABC Co still sees v3 until you set a new final"), and the tab's warning mark. No banner and no second create button (Round 2 §4.3). Narrow: the date text drops first, then the chip reads "Out of date". The published final is never replaced by itself.
- **Viewer header** (`ReportViewer.tsx`, shared with firm Reports): report name · provenance (16 px Scalar icon + "Prepared by Scalar", or a person icon + "Uploaded by …") · date and time. Provenance is never in the tab label. If the PDF can't render, a Download button replaces the frame (never a blank frame).
- **Empty**: analyst — "No final report for 03/31/2025. Create a PDF from the current valuation or upload a report made elsewhere." with both buttons. Client — "Your final report for 03/31/2025 isn't ready yet. It will appear here when it's published." with none.
- **Client** (View as: Client user in the prototype panel, or `?state=client`): the viewer of the final version only, with View and File — no versions, statuses, warnings, tab mark, create, upload or delete. A "Viewing as client" chip sits in the top nav while it is on.
- Prototype (panel bottom-left, `shell/PrototypePanel.tsx`): *View as*, *Save a valuation change* stands in for an analyst saving the valuation (it never changes what the client sees); *Reset prototype data* restores the seed. Data: `finalReportData.ts`, in this browser's localStorage, seeded per company so Reports shows every status.

## Cross-platform links
- Firm **Reports** (`#/reports`, `#/reports/:companyId`) is list + preview (Round 2 §3): a company list with each final report's status (analysts: Not created and Out of date first; clients: Published first, never "Out of date"), and the selected company's final version in the same `ReportViewer`, read-only, with the measurement date it resolved to and *Open in company*. Zoom, Download and Print sit in row 2 beside Request Report and Create Report (analysts only; Create Report opens the selected company's create flow).
- In: company Secondary Menu → Documents; Firm Valuations › Process Management pills (both → Requests, Pending); firm Documents › Requests opens a company here; Reports opens a company's Final Report; the Excel Export dialog links to Exports; Workspace drawer on Waterfalls (04) and company Waterfall (09); firm Documents (05) empty viewer; Firm Valuations → New Info Request.
- Out: Documents ↔ Requests ↔ Exports ↔ Final Report (Tier 3); Info Request → Information Request → Requests; Preview recipient page → Unified Request Portal prototype.
- Company switcher (Primary Menu › Companies): on Documents, Requests, Exports, Final Report or the Info Request builder, picking another company opens the same page for that company instead of its Summary (`shell/overlays/CompaniesMenu.tsx`). Everywhere else it still opens Summary.

## Domain rules
- Requests are the portal's contract (`prototypes/request-portal/model.ts`): wording is independent of response type, numbering comes from the data, N/A and "sent another way" resolve a request without implying a file arrived. See [prototype-request-portal](prototype-request-portal.md).

## Gaps & open questions
- Requests and the builder's new layout have no Figma frames yet (`proto:company-requests:*`); the builder keeps its two frame ids but no longer matches them.
- Recipients are recorded per sent batch, not per request; a request can't yet go to a different person than the rest of its batch (Delegate covers forwarding).
- The builder offers the response types that need no Scalar asset; templates and multiple choice need a template library and an option editor. Template files and multiple choice in "Last request sent" fall back to Upload document / Yes / No.
- Answers carry no answered-at time in the seed data, so "Answered by …" shows no date until a recipient saves one.
- The meter's tooltip can't hold a link, so the meter itself is the "show pending" control.
- Final Report open questions: which valuation saves mark a report out of date (2), whether a Draft valuation can have a final report (3) — every company shows Draft —, what "Scalar-made" means for the badge wording (6), client email on publish (7). Clients can't reach other versions or Exports in the API (403) — not modelled in the prototype.
- Prototype data lives in this browser only; no email is sent.
- Add Subfolder is inert on this page.
