# Prototype · Unified Request Portal

**Route:** `#/prototypes/request-portal/:requestId` (e.g. `abc-co-request`)
**Source:** `SCALAR_UNIFIED_REQUEST_PORTAL_IMPLEMENTATION_TODO.md` (review of the Figma Make prototype `HiOm04NapSHEgQ1wpzwTgn`, 2026-10-30). No Figma frames yet: states are `proto:request-portal:<n>`.
**Code:** `apps/product/src/screens/prototypes/request-portal/` · templates in `apps/product/assets/templates/`

## Purpose

An external contact works through a PPA information request: one numbered list where questions and documents are the same kind of thing, each asking for exactly one kind of response. They download Scalar's templates, complete them offline, and upload them back to the same request.

## How users get here

From the request email (no Scalar login). In the product: **Company › Documents › Information Request › Preview unified portal** (next to *Preview respondent page*).

## Prototype view (sidebar panel, kept in the URL)

`?scenario=` · `?viewer=` · `?link=` select who sent the request, who is looking and whether the link works, so any combination can be shared.

| Scenario | Top row | Second row | Notes |
|---|---|---|---|
| `scalar-company` | Scalar logo | **Company name** · *Information Request* (selected) · help links | Engagement "PPA". |
| `scalar-company-409a` | Scalar logo | same | Engagement "409A"; a short list of 12 requests in 4 categories (Financials, Cap Table, Other, Questions). |
| `scalar-fund-admin` | Scalar logo + `CompanyDropdown` | **Selected company** · … | Engagement "ASC 820 Fair Value". Each company has its own list, progress and storage; the menu shows each one's status and "N of 3 companies complete". |
| `firm-company` | Firm logo | **Company name** · … | Engagement "PPA". No Scalar logo; "Powered by Scalar" in the Privacy Policy and How do I use this? dialogs. |

`?controls=off` hides the Prototype view panel; the named Netlify links (one per view) use it.

- **Signed-in header:** `sender` is signed in to the platform, so the top row ends like the product's (`AppFrame`): `Notification`, the Valuations / Workboard `ToolSwitch` (Scalar users only), the user's `Avatar` and the More menu — never Login. An expired link never stops them.
- **Viewer:** `responder` sees "7 days remaining" (seeded a week out on first load; "Due today" / "Overdue by N days" in warning / negative words). `sender` (Scalar user, or Firm user when a firm sent it) sees "Due MM/DD/YYYY" and sets any date in a `DatePicker` dialog that saves at once — no reason, no approval.
- **Link:** `expired` shows `ExpiredLink` only — no requests, filters or progress. "Email me a new link" goes to the address on the request (masked, m•••@abcco.com); "Log in instead" opens the requests without a new email. Due date and link expiry are separate.

## States (fixture sets, same list component)

`default` (27 mixed) · `questions-only` · `documents-only` · `templates-only` · `all-complete` · `empty`. Each state persists separately in localStorage; **Reset prototype data** restores the fixture.

## Logic

1. **Contract** (`model.ts`): wording (`title`, `description`) is independent of `responseType` (`text` · `choice` · `date` · `file` · `template_file`). Number = `categoryOrder.requestOrder` from the data, so filtering, selecting, completing and reopening never renumber.
2. **One derived model.** The ring, "N remaining", category tallies and filters all read the same `requests` array.
3. **Lifecycle** (`store.ts`): validating → uploading (progress) → saving → Complete, or failed. A request turns Complete **only** after the save resolves; a failure keeps it Pending, shows a negative `Alert` and allows a retry. What was typed survives a failed save.
4. **Validation:** extension and 250 MB size are checked in code, with a file-specific message. `Dropzone` is given no `accept`, because it silently discards a non-matching dropped file.
5. **Multiple choice** (`multiple_choice`): `RadioGroup` for pick-one, a group of `Checkbox`es for select-all. An option marked `other` asks for required text. A follow-up (`parentId`, `showWhen`) can be any type, appears inside its parent once the saved answer calls for it, and is numbered after it (1.4a). The parent shows *Follow-up needed* until the follow-up is saved, then *Complete*. Changing the answer so a filled follow-up no longer applies asks first (`ConfirmationDialog`), then clears it. Follow-ups are never rows and never counted on their own.
6. **Templates:** one request holds *Step 1 · Template provided by Scalar* (name, CSV, version, issue date, Download) and *Step 2 · Upload the completed template*. Download fetches the real asset and saves it as `text/csv` with its own filename; a missing asset (request 1.3) shows *Template unavailable*. The download stays available after completion.
7. **Statuses:** `pending` · `complete` · `na` · `sent`. N/A and *sent another way* resolve a request but never imply a file arrived. **Reopen** returns it to Pending immediately and keeps the saved answer/files attached and editable. Uploading again keeps earlier versions listed.
8. **Selection:** Select All acts on the visible subset (category + status filter); selection is pruned whenever the filter changes, and bulk actions act on selected ∩ visible ∩ eligible, with counts in the menu.
9. **Introduction:** optional instructions from the analyst (`INTRODUCTION`, `{company}` / `{sender}` filled in). When present, they show as an info `Alert` at the top of *All requests*, above the list, so the requests are visible straight away. The recipient can dismiss it; the *Introduction* item above *All requests* brings it back. Picking a single category hides it.
10. **Expand:** the Tertiary Menu's *Expand* menu offers Expand all · Expand all pending · Collapse all, acting on the visible rows (icon-only on a phone).
11. **Access note (recipient only):** "Files are encrypted" and "Only approved users can access this request…" sit at the foot of the category column (end of the list on a phone).
12. **Every control does something:** Login (signs in; opens an expired link), Contact Us, Privacy Policy, How do I use this?, the sender's due date and Delegate open dialogs that validate, confirm and can fail (with the failure toggle on).
13. **Compact upload row** (Matt's feedback, `FileUpload.tsx`; source: request-portal-compact-upload-row-PR.md).
    - **Content model:** `shortNote` (inline after the title, one line, truncated with a tooltip; wraps in full when open) and `details` (below the title when open) replace `description`; placement comes from the field, never from text length. The header button is named by number + title and described by the note and response type (`aria-describedby`). `maxFiles` (default 1), `allowedExtensions` (= `acceptedFormats`) and `maxFileSizeBytes` (= `maxFileSize`) are per request.
    - **File row:** one line, `FileTypeBadge` · name (semibold, middle-truncated so version and extension stay, full name in a tooltip and in the buttons' names) · uploader · size · `Nov 2, 2026`, with Download and Remove beside it. Narrow: size goes first, then the uploader; on a phone the date moves under the name and is never cut. No visible "Your upload" label; a visually hidden heading names the list; "N files" shows when there is more than one. Remove shows an Undo toast (10 s, WCAG 2.2.1). Replaced files sit under *Earlier versions (n)*.
    - **Upload bar:** one line, "Drag & drop a file or select a file". With a file and room left → *Add another file* (`N of max`); at a one-file limit → *Replace file*; at a multi-file limit → "All N files added. Remove one to add another." Uploading shows the file name, a `ProgressBar` and **Cancel** (announced). While a file is dragged, the **whole request card** is the drop target (collapsed rows expand on drop); N/A and "sent another way" take no file until reopened.
    - **Requirements:** always visible, from the request's own limits ("Up to 250 MB · Office files, PDF, CSV"), with every extension in an info tooltip, linked to the select button by `aria-describedby`. The hidden input's `accept` filters the system picker; type and size are validated in the browser before any upload (a drop ignores `accept`), and files beyond `maxFiles` are refused with a message, never dropped silently.
    - Storage key moved to `v3` (the stored shape changed). Fixtures: 1.1 (409A) takes 3 files, 2.3 takes 10; PPA 9.2 holds a delegate's upload with a long uploader name and file name.
    - Deviation: the spec's "Replace file" at the limit applies to one-file requests; a multi-file request at its limit says how to make room, because there is no single file to replace. Out of scope (follow-ups in the spec): hiding the header's response-type label when open, consolidating the top-bar progress, moving N/A / Complete into an overflow menu.
14. **Express mode** (branch `portal-express-mode`; recipient only). *Express mode* (AI-coloured button with the Scalar AI mark, `glyphs.AiMark`, like the Ask AI tool) in the Tertiary Menu (above the list on a phone), or dropping files anywhere on the list, opens a large `Modal`: drop any number of files and/or paste notes → **Analyze** (`AiOutline` + `Spinner` and words) → **review** → **Apply N items**.
    - **Suggest, never save:** `expressMatch.ts` (prototype stand-in for the AI service, deterministic) matches filename keywords per request and file type, and answers questions from pasted sentences (Yes/No, dates, text, single-choice). Only open, non-follow-up requests are targets. One file can go to several requests.
    - **Review:** every suggestion has a checkbox, a request picker (or answer editor) and a confidence word (*Strong match* / *Check this* / *No match*), with the sentence each answer came from. Nothing is saved until Apply.
    - **Apply** saves through the store's normal lifecycle (`uploadFile` / `saveAnswer` / `saveSelection`, flagged `viaExpress`): requests save in parallel, a failure stays Pending with its error, and a toast reports saved and failed counts.
    - **Unsorted files:** unmatched files the recipient leaves unsorted sit in a tray at the top of *All requests* (bytes in IndexedDB) to assign or remove; they are never sent to the analyst on their own.
    - **Provenance:** an applied request shows the `Chip styleVariant="ai"` *Matched by Express mode* (to the recipient and the sender), and its upload reads "Uploaded by you with Express mode". A manual re-save clears it.
    - A drop on a request card that takes files still uploads to that request only. *Try with sample files and text* fills the dialog for demos. Production needs a privacy / data-processing sign-off before client documents go to an AI service.

## Components

`PageTemplate` (navigation · companyInfo · subNavigation) · `PrimaryMenu` + `MainMenuItem` (Login) · `CompanyInfo` + `SecondaryMenu` · `TertiaryMenu` · `ProgressBar` + `InformationLabel` · `FilterDropdown` + `SelectMenu` · `Checkbox` · `Button` + `ContextMenu` (bulk) · `SubmenuItem` (categories) · `Select` (mobile categories) · `Chip` (status, word + icon) · `FormField` / `Textarea` / `Input` / `RadioGroup` · `Dropzone` · `FileRow` · `Alert` · `Banner` · `EmptyState` · `Modal` · `Toast` · `CompanyDropdown` + `CompanyDropdownPanel` (fund admin) · `DatePicker` (sender's due date) · `Radio` / `Checkbox` / `Label` (multiple choice) · `ConfirmationDialog` · `SegmentedControl` (prototype panel).

## Prototype-only

Answers live in localStorage and file bytes in IndexedDB, in this browser only. Nothing is transmitted, encrypted or scanned, and the page says so. Security (P0.9), real delegation notifications and a server-provided deadline are out of scope.

## Gaps

- **Progress is a `ProgressBar`, not a ring.** `ProgressRing` is 48px and the Secondary Menu bar is 32px; at 32px its 12px label collided with the stroke. The bar (`7/27 ▬▬ 26%` plus an `InformationLabel` "Remaining 20 requests": brand while work is left, positive when all resolved) fits the tier with room to spare and is the AI-GUIDE §5 choice for progress with a known total.
- **Clickable `Chip` is a toggle** (`aria-pressed`), so the deadline is a tertiary `Button`, not a chip.
- **Templates are CSV.** Real `.xlsx` assets need a content sign-off on columns (G3.3) before they replace these.
