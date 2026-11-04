# 10 · Company · Documents & Requests

Where a company's files live, and where the analyst requests missing documents and answers from the company, sends them to specific people and tracks what is still pending. Used by valuation teams preparing a valuation and by admins tracking request progress.

Every page here keeps the company's three navigation tiers: product menu (1) · company header with Documents selected (2) · **Documents · Questions · Requests** (3). The last item of Tier 3 on all three tabs is **Info Request** (primary, opens the request builder).

## Screens

### Documents — `/companies/:companyId/documents`
The firm Documents layout with this company already selected: measurement-date folders (the company's measurement date first, with its document, subfolder and request counts) holding the file tree (root files, then Company Docs / Exports), and the document preview beside it once a file is opened (the tree goes compact). Reached from the company Secondary Menu (Documents) and the Workspace drawer "Add new document" (04/09).

| State | Figma frame | Node | Open with |
|---|---|---|---|
| default | Documents — Document List | [11:13664](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=11-13664) | `#/companies/abc-co/documents?state=default` |
| upload | Documents — Upload Document modal | [14:4176](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=14-4176) | `#/companies/abc-co/documents?state=upload` |
| page-menu | Documents — Page menu open | [14:4259](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=14-4259) | `#/companies/abc-co/documents?state=page-menu` |

Components used: CompanyLayout (shell), TertiaryMenuItem, Checkbox, Heading, ProgressBar, Text, Button, ButtonIcon, ContextMenu, MenuItem, Input, TreeItem, FileRow, EmptyState, Modal (size l), Dropzone, and from firm Documents (`p05-documents/parts.tsx`): DateBand, Viewer (DocumentViewerHeader, PageStepper, ZoomControl, Spinner), metaChips.

Behaviour & rules:
- Tier 3 end: Select all documents, Filter, Info Request. Uploads go straight into a measurement-date folder (its Upload Document); the heading has no upload button. "Search documents" (body) filters the tree by name and opens matching folders.
- Opening a file shows "Preparing PDF preview…" then the page; close returns to the full-width tree.
- Upload: Dropzone (CSV, DOCX, JPG, PDF, XLSX, ZIP · 250 MB max); Done disabled until a file is chosen; uploaded files go to the top of the measurement date with today's date and the signed-in user.
- The heading's slim progress bar (with its done/total fraction) and "Requests: N sent, N resolved, N pending" read the same list as Requests.
- Page ⋮ → "Edit Company Questions and Documents" (the request builder) · "Track pending responses" (Requests).

### Requests — `/companies/:companyId/documents/requests` (prototype states)
The Unified Request Portal list as the signed-in sender sees it: questions and documents in one numbered list, categories on the left, the responses that came back inside each request, and what is still pending.

| State | Label | Node | Open with |
|---|---|---|---|
| default | Requests — sent request, mixed responses | proto:company-requests:1 | `#/companies/abc-co/documents/requests` |
| pending | Requests — pending responses only | proto:company-requests:2 | `#/companies/abc-co/documents/requests?state=pending` |
| empty | Requests — nothing sent yet | proto:company-requests:3 | `#/companies/abc-co/documents/requests?state=empty` |

Components used: CompanyLayout, RequestsHeading (ProgressBar, Button), FilterDropdown + SelectMenu, Checkbox, Button + ContextMenu (Expand, Bulk actions), SubmenuItem, Overline, Alert, Banner, EmptyState, Toast, and from the portal prototype: RequestRow, usePortalStore, DueDateDialog, DelegateDialog.

Behaviour & rules:
- Every count (progress bar, heading text, category tallies, "N pending" per recipient) derives from one `requests` array; follow-ups are never counted on their own (portal rule P1.3).
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

Components used: CompanyLayout, SubmenuItem, Overline, FormField, Input, Select, Textarea, ComboboxPanel (multiple), Chip (onRemove), Button, ButtonIcon, Alert, DueDateDialog.

Behaviour & rules:
- Starts from the frame's 7 document requests and 10 questions, filed into the portal's categories with a response type each (Upload document · Written answer · Yes / No · Date). Wording is editable inline; each row can be removed.
- "Add request to <category>" adds a blank request at the end of that category and focuses it. Picking a category on the left shows only it (so an empty category can be filled).
- Recipients: a multi-select of the company's contacts, or any typed email address ("Send to …" / Add a new responsible). Chosen people show as removable chips.
- Send validates (no recipient, no requests, blank wording) with a negative Alert and field errors; nothing is sent until it passes. On send the requests are added to Requests as Pending, numbered after what each category already holds (numbers never move), recorded against their recipients, and the page returns to Requests.

### Questions — `/companies/:companyId/documents/questions`
The questions sent in information requests (written answers, Yes / No, dates, multiple choice) in two groups: **Pending answer** and **Answered**, each with its count. A row opens to show the answer (the same rows and data as Requests).

| State | Label / Figma frame | Node | Open with |
|---|---|---|---|
| default | Questions — pending and answered | proto:company-questions:1 | `#/companies/abc-co/documents/questions` |
| empty | Questions — Empty | [14:10616](https://www.figma.com/design/cZktZhD0ssL5lRVOvSqmOV/Scalar-full-product?node-id=14-10616) | `#/companies/abc-co/documents/questions?state=empty` |

Behaviour & rules: the heading counts questions sent / answered / pending from the request list. With none sent, the frame's empty state and Info Request. Rows have no selection checkbox here (RequestRow without `onSelect`).

## Cross-platform links
- In: company Secondary Menu → Documents; Firm Valuations › Process Management pills (→ Requests, Pending / → Questions); firm Documents › Requests and Questions show the same lists; Workspace drawer on Waterfalls (04) and company Waterfall (09); firm Documents (05) empty viewer; Firm Valuations → New Info Request.
- Out: Documents ↔ Questions ↔ Requests (Tier 3); Info Request → Information Request → Requests; Preview recipient page → Unified Request Portal prototype.

## Domain rules
- Requests are the portal's contract (`prototypes/request-portal/model.ts`): wording is independent of response type, numbering comes from the data, N/A and "sent another way" resolve a request without implying a file arrived. See [prototype-request-portal](prototype-request-portal.md).

## Gaps & open questions
- Requests and the builder's new layout have no Figma frames yet (`proto:company-requests:*`); the builder keeps its two frame ids but no longer matches them.
- Recipients are recorded per sent batch, not per request; a request can't yet go to a different person than the rest of its batch (Delegate covers forwarding).
- The builder offers the response types that need no Scalar asset; templates and multiple choice need a template library and an option editor.
- An opened answered question says "Your saved answer" (the portal row's recipient wording).
- Prototype data lives in this browser only; no email is sent.
- Add Subfolder is inert on this page.
