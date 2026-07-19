# Plan: UX Trust & Fun — feature-ux-trust-and-fun

**Goal:** Make Ledger easier for non-accountants and genuinely enjoyable: fix every place the UI
says something false (Tier 1), remove the worst friction (Tier 2), rebuild the categorize/rules
loop as a coherent unit (Tier 3), and add calm celebration moments at every existing victory
state (Tier 4). Then verify and merge.

**Source:** `docs/temp/ux-fun-sweep-findings.md` (4-reviewer sweep, 2026-07-19). The five keystone
claims were re-verified directly in source before this plan was written.

**Branch:** `feature/ux-trust-and-fun` off `main` (solo workflow: no develop, no PRs; fast-forward
merge to `main` at the end, delete branch). One commit per phase, gated on type-check + lint + test.

---

## Global constraints (apply to every task)

- No new dependencies. No Prisma schema changes. No route renames.
- Copy-only vocabulary: user-visible strings say **Book/books**; code identifiers keep `workspace`.
- Money via decimal.js helpers (`src/lib/money.ts`); dates via calendar-date helpers — never float,
  never `new Date()` arithmetic on business dates.
- Business logic in services, never components. Co-located `*.test.ts(x)` for logic changes.
- Files ≤450 LOC — split if a file would grow past it.
- Tone: calm-confident. No confetti, no exclamation-mark spam, at most one "✓" per moment.
- Semantic color discipline: green = money-in/good, amber = caution, red = genuinely wrong only.
- Every phase ends: `pnpm type-check` (0 errors), `pnpm lint` (0 errors), `pnpm test` (all pass;
  known shared-DB flake → re-run once, and only accept if clean `main` shows the same flake).

## Decisions (ALL THREE APPROVED by the user 2026-07-19 — build the defaults below)

- **D1 — "Manage" tab rename.** Recommendation: rename to **"Accounts & bills"** in
  `workspace-sub-nav.tsx` and anywhere the word "Manage" is used as a destination in copy
  ("Add bills in Manage…"). Page `<title>`/heading updated to match. *Default: rename.*
- **D2 — Past-month budget editing.** Budgets are not month-scoped in the DB; viewing March shows
  today's budget amounts. Recommendation: **no schema change** — banner on non-current months
  ("Budget amounts are always current — shown here against March spending") and make Set/Move/inline
  edit read-only outside the current month. *Default: banner + read-only.*
- **D3 — "Available balance" includes credit cards.** `safe-to-spend.ts:38-43` sums every account.
  Recommendation: **label clarification only** this plan — math panel row reads "Available balance
  (all accounts)"; excluding liability accounts is a future product decision. *Default: label only.*

## Explicitly OUT of scope (future plans, not forgotten)

Recurring-bills UI, "Pay yourself" (owner draw) UI, real data search in the palette,
month-scoped budget history (schema), inline edit for income sources (remove+re-add stays),
import preview >200-row expansion, quoted-newline CSV parsing rewrite.

---

# Phase 1 — Trust fixes

*The app must never say something false. Each task independently testable.*

### Task 1.1 — Negative Safe-to-spend gets an honest alert state
Files: `src/components/dashboard/dashboard.tsx` (tile ~:205-224, math panel ~:130-140),
`src/services/dashboard/safe-to-spend.ts` (read-only — result already computed).
- [x] Read both files fully first.
- [x] Tile: when the result is negative, swap `border-credit/30 bg-credit-tint/40` → alert
      border/tint and `text-credit` → `text-alert`; label stays "Safe to spend"; add a one-line
      note under the value: "Short by $X — N bills due before <date>" linking focus to the
      expandable math panel.
- [x] Math panel result row: same conditional color; never green when negative.
- [x] Component test: render with negative result → asserts alert classes present, credit classes
      absent, "Short by" text present. Positive case unchanged.

### Task 1.2 — Forecast tells the truth (legend + full resolution)
Files: `src/services/dashboard/index.ts` (~:118-126), `src/components/dashboard/dashboard.tsx`
(legend ~:242-249), `src/components/dashboard/forecast-chart.tsx`.
- [x] Remove the `i % 4` down-sampling — pass all daily points (canvas handles 31 points; verify
      hover/tooltip still performs).
- [x] Rename the marked point honestly: `largeBill` field → `lowest` (or equivalent); legend text
      "Large bill due" → "Lowest point". (Real large-bill markers are NOT added — payday ticks
      come in Phase 4; keep this task purely corrective.)
- [x] Verify caption "Lowest: $X on <date>" now exactly matches a hoverable point and the dot's
      position (same source of truth).
- [x] Update/extend existing forecast tests for the new field name and unsampled length.

### Task 1.3 — KPI labels follow the period toggle
Files: `src/app/(app)/w/[workspaceId]/page.tsx` (toggle ~:27-42), `src/services/dashboard/index.ts`,
`src/components/dashboard/dashboard.tsx` (:191, :197, :256, :307).
- [x] Thread the active period into `DashboardData` (e.g. `periodLabel: "this week" | "this month"
      | "this quarter" | "this year"`).
- [x] Interpolate: "Money in · {periodLabel}", "Money out · {periodLabel}", spending-by-category
      note, paid-vs-unpaid note.
- [x] Test: build data with period=year → labels contain "this year".

### Task 1.4 — One bill-status vocabulary: "Due later", never "scheduled"
Files: `src/services/dashboard/bill-calendar.ts` (:29-34), `src/services/dashboard/index.ts`
(:65-77), `src/services/dashboard/pane-summary.ts` (:19-23), `src/components/ui/status-tag.tsx`,
`src/components/tiling/pane-card.tsx` (:36-38), consumers of status labels.
- [x] Create ONE shared derivation, e.g. `src/services/bills/bill-status.ts` →
      `billDisplayStatus(bill, today): { key: "overdue" | "today" | "soon" | "later" | "paid",
      label: string }` with labels: "Overdue", "Due today", "Tomorrow" / "in N days", "Due later",
      "Paid". Unit-test the boundaries (yesterday/today/tomorrow/7 days/8 days).
- [x] Replace all three divergent derivations with it (dashboard `statusLabel` "N days"/"0 days"
      included — fixes the bare-number chips too).
- [x] `status-tag.tsx`: add/rename variants so "later" renders neutral, "today" amber-emphasis.
      The word "scheduled" no longer appears anywhere user-visible (DB enum value untouched).
- [x] `pane-card.tsx`: use StatusTag (capitalized labels), not raw lowercase status words.
- [x] Grep gate: `rg -i "scheduled" src/components src/app` → only code-identifier hits remain.

### Task 1.5 — Credit-card imports suggest the right sign
Files: `src/lib/import/auto-detect.ts` (:75-78), `src/components/import/import-wizard.tsx`
(account selection ~:73, :236-245), `src/components/import/column-mapper.tsx`.
- [x] Pass the selected account's `type` into detection/mapping. If type is credit card AND >90%
      of parsed sample amounts are positive → preselect the invert option and show one plain line:
      "This looks like a credit-card export — charges will count as spending."
- [x] User can still override; the note disappears if they change the sign rule.
- [x] Unit test on `guessSignRule` (or wrapper): credit-card + all-positive sample → invert
      suggested; checking-account + mixed signs → unchanged behavior.

### Task 1.6 — Ambiguous date formats warn instead of silently guessing US
Files: `src/lib/import/auto-detect.ts` (:60-72), `src/components/import/column-mapper.tsx`.
- [x] Detection returns `{ format, ambiguous: boolean }` (ambiguous = every sample day-value ≤ 12).
- [x] When ambiguous, render under the Date format select: "We can't tell if 03/04 means March 4
      or April 3 — double-check this." (uses an actual value from the file if cheap).
- [x] Unit test: all-ambiguous samples → flag true; any day >12 → false.

### Phase 1 gate
- [x] type-check 0 / lint 0 / tests pass; commit `Phase 1: trust fixes — honest numbers, colors, labels`.

---

# Phase 2 — Friction removal

*Mechanical improvements; no product controversy (D1–D3 resolved at review).*

### Task 2.1 — "All books" rows are real doors
Files: `src/app/(app)/all/page.tsx`.
- [ ] Book name cell → `<Link href={/w/${r.workspaceId}}>` covering the row's primary click target;
      hover state on the row.
- [ ] Color dot before each name (same dot pattern as `workspace-tabs.tsx:49-55`).
- [ ] "Net" column header gets `title` + footnote line: "Net = money in minus money out {periodLabel}."
- [ ] "Unpaid bills" stat label → "Bills still to pay".

### Task 2.2 — Mark-paid undo
Files: `src/app/(app)/w/[workspaceId]/_actions.ts`, `src/services/bill-service.ts` (:127-135,
`markUnpaid` exists), `src/components/dashboard/dashboard.tsx` (:173-184), toast API (already
supports `actionLabel`/`onAction`).
- [ ] Add `markBillUnpaidAction` (authz mirrors mark-paid; audit-logged like other actions).
- [ ] Success toast: `{ actionLabel: "Undo", onAction: … }` → reverts and refreshes.
- [ ] Test: service round-trip paid→unpaid restores status (extend existing bill-service tests).

### Task 2.3 — Calendar becomes a tool
Files: `src/app/(app)/w/[workspaceId]/calendar/page.tsx`, `src/components/calendar/bill-calendar-view.tsx`,
`src/services/dashboard/bill-calendar.ts`.
- [ ] Summary strip above grid: "This month: $X in bills · $Y paid · $Z still to pay" (computed in
      the existing service, decimal-safe, tested). CAUTION (verified): `billCalendar` fetches the
      full 6-week grid range including leading/trailing days of adjacent months
      (`bill-calendar.ts:46-53`) — the strip must sum ONLY bills whose due date is in the viewed
      month, not the whole grid. Test asserts an adjacent-month bill is excluded from the totals.
      (Note: chip popover needs no new data — `CalendarEvent` already carries `billId`,
      `bill-calendar.ts:10`.)
- [ ] Legend row: swatch + word for Paid / Due soon / Due later / Overdue (uses Task 1.4 vocabulary).
- [ ] Chips: add a ✓ prefix on paid, "!" on overdue (not color-only anymore); agenda chip shows
      status word + vendor, not vendor-inside-StatusTag.
- [ ] Chip click → small popover: vendor, amount, due date, status, and "Mark paid" (wired to the
      same action as dashboard; with Task 2.2's undo toast).
- [ ] Empty-month states (desktop grid, matching mobile agenda): zero bills exist → "No bills set
      up yet — add them in {Manage-name} or import transactions." / bills exist but none due this
      month → "Nothing due this month."

### Task 2.4 — Toasts: dismissible, patient with errors
Files: `src/components/ui/toast.tsx`.
- [ ] × close button on every toast; pause timer on hover/focus.
- [ ] Errors: 8s (success stays 5s) and `role="alert"`; success region stays `aria-live="polite"`.
- [ ] Existing toast tests extended for dismiss + duration branch.

### Task 2.5 — Command palette & search honesty
Files: `src/components/chrome/search-button.tsx`, `src/components/command/command-palette.tsx`,
`src/lib/command-palette/commands.ts` (+ its test).
- [ ] Platform-detect: Windows/Linux render "Ctrl K", Mac "⌘K" (button + palette hint); palette
      input icon → neutral search glyph.
- [ ] Button label "Search" → "Jump to…" (it navigates; it does not search data).
- [ ] Quick actions deep-link to the actual form. VERIFIED: all add-forms (transaction, bill,
      account) live in `src/components/manage/manage-forms.tsx` (TransactionForm at :128-200),
      NOT on the transactions page — so ALL deep-links target the manage route:
      "Add expense / transaction" → `/w/{ws}/manage?add=transaction`; "Log a new bill" →
      `/w/{ws}/manage?add=bill`; FirstRun hero "Add an account" → `/w/{ws}/manage?add=account`.
      The manage page reads the `add` search param and auto-scrolls to + focuses the matching
      form's first field (server component passes the param down; scroll/focus in a small client
      effect). Do NOT move forms to the transactions page — out of scope.
- [ ] Add missing commands: "New book" (admins), "All books", "Side by side (tile view)",
      "Switch theme". Update `commands.test.ts`.

### Task 2.6 — Import wizard clarity pass
Files: `src/components/import/import-wizard.tsx`, `import-preview.tsx`, `csv-drop-zone.tsx`,
`import-history.tsx`, `src/services/import/pipeline.ts` (transfer pill only).
- [ ] Destination restated: "Review & import" header shows "Importing into **{account name}**";
      success line includes it; Past imports rows show the account.
- [ ] All-duplicates: when committable = 0 and all rows are duplicates → replace dead button with
      "Everything in this file is already in this Book — nothing new to import. ✓" + "Import
      another file". All-errors → analogous plain message.
- [ ] File sniff: binary signature (`PK\x03\x04` → xlsx) or headers.length < 2 → "This doesn't
      look like a CSV. If it came from Excel, use File → Save As → CSV."
- [ ] Transfer pill in preview becomes a toggle (include-style), plus one summary line: "N rows
      look like account transfers and won't count as spending — tap a pill to change."
- [ ] Register: when `isTransfer`, replace the disabled category select with static "Transfer —
      not counted" text (tooltip-only explanation promoted to visible).

### Task 2.7 — Jargon & label batch
Files: `workspace-sub-nav.tsx`, `layout-controls.tsx`, `layouts-dropdown.tsx`, `tab-bar.tsx`,
`audit/page.tsx`, `workspace-create-dialog.tsx`, `w/[workspaceId]/layout.tsx`, `not-found.tsx`,
`transfer-form.tsx`, `export-panel.tsx`, `manage/page.tsx` + copy referencing "Manage".
- [ ] D1: "Manage" → "Accounts & bills" (nav tab, page heading/title, every copy reference —
      grep `"Manage"` in src to catch "Add bills in Manage…" style strings).
- [ ] Tiling: "Panes" → "Books shown"; "+ Add pane" → "+ Add a book" AND it adds the first book
      *not already shown* (fallback: first book); "⬍ Stack as column / ⬌ Arrange as row" →
      "Stacked / Side by side"; "Restore" → "Open".
- [ ] Top bar: "⊞ Tile view" → "⊞ Side by side"; "Layouts" → "Saved views".
- [ ] Audit page: empty-state "workspace" → "book" (:61); `income_bridge` label "Owner draw
      recorded" → "Paid yourself (moved money between books)".
- [ ] Create-book dialog: helper line under Type select — "Business books get owner-pay tools —
      paying yourself is tracked correctly, not counted twice."; color swatch aria-labels use
      color names not hex; ＋ trigger gets `title="New book"`.
- [ ] Book layout avatar fallback "W" → "B"; "Back to your dashboard" → "Back to your books"
      (layout :47 and not-found :12).
- [ ] TransferForm with <2 accounts: render one line "Add a second account to move money between
      them." instead of hiding entirely.
- [ ] Export panel: "(optional)" → "Leave blank for everything"; one line naming what the CSV
      contains.

### Task 2.8 — Activity log says who and what
Files: `src/app/(app)/w/[workspaceId]/audit/page.tsx`, `src/services/audit-service.ts` (read),
membership/user lookup (existing admin client patterns).
- [ ] Resolve `userId` → member email/name (batch, not per-row); render "‹who› ‹did what› ‹thing›".
- [ ] Entity naming: pull a display name from the recorded `after` JSON when present (vendor,
      account name, category name); fall back to entityType.
- [ ] Viewer hitting /audit by URL: replace fake-empty log with "Activity is visible to book
      admins." (keep nav hidden as today).
- [ ] Test: page-level formatting helper unit-tested (who + entity-name fallbacks).

### Task 2.9 — Sharing reassurance copy
Files: `src/app/(app)/settings/members/page.tsx`, `src/components/members/invite-form.tsx`,
`member-access.tsx`.
- [ ] Invite success → "Invitation sent — they can't see any books until you grant access below."
- [ ] Add under the email field: "They'll get an email with a link to set up their sign-in."
- [ ] orgRole display humanized: "owner" → "Account owner"; "member" → hidden or "Member".
- [ ] One-line explanation near role dropdowns: "Can view = balances, bills and transactions,
      read-only."

### Task 2.10 — Tiles page degrades gracefully
Files: `src/app/(app)/tiles/page.tsx` (:31-41), `tab-bar.tsx` (admin gate check).
- [ ] Zero books: copy fixed ("Create a book…" not "second"); non-admins get "Ask the book owner
      to add you to more books." instead of instructions for a + button they don't have.
- [ ] Exactly one book: render the single pane + inline line "Side by side shines with two or
      more books — create another to compare them."

### Task 2.11 — Small dashboard/budget/income clarity items
Files: `dashboard.tsx`, `budget-view.tsx`, `budget/page.tsx`, `budget-vs-actual.ts`,
`income-source-form.tsx`, `income/page.tsx`, `safe-to-spend.ts` consumers, `index.ts`.
- [ ] Dashboard overspend strip: when overspentCount > 0 → "N categories over budget → cover it"
      linking to Budget (needs overspent count added to `DashboardData`; service-tested).
- [ ] "Left to budget" subtitle: "of $X expected income"; "Over-committed by" keeps alert tone.
- [ ] D2: non-current months → banner + read-only Set/Move/inline edit.
- [ ] Budget bars: tooltip/legend for amber at 85% ("Getting close — 85% used"); ARIA reports the
      TRUE percentage (cap only the visual width).
- [ ] Safe-to-spend note "after 0 unpaid bills due before <date>" → "no bills due before <date> —
      the full balance is yours"; math panel "Available balance" → "Available balance (all
      accounts)" (D3); "= Unpaid before next income" row label matches the 30-day fallback mode.
- [ ] Income page: monthly-equivalent line "≈ $X/month across N sources" (decimal-safe conversion,
      unit-tested: weekly×52/12, biweekly×26/12, quarterly/3, etc.) + "Next paydays:" preview of
      the next 3 dates from the existing projection service.
- [ ] Debts/goals empty states link to where they're created.
- [ ] Category dropdowns in the register: `<optgroup label="Spending">` / `"Income"`.

### Task 2.12 — Login: Google in both modes
Files: `src/components/auth/login-form.tsx` (:151-169).
- [ ] "Continue with Google" renders in sign-up mode too (OAuth handles both identically).

### Phase 2 gate
- [ ] type-check 0 / lint 0 / tests pass; commit `Phase 2: friction removal — clickable, undoable, plain-language`.

---

# Phase 3 — The categorize loop (one coherent unit)

### Task 3.1 — Rules service: full CRUD
Files: `src/services/category-rule-service.ts`, `src/repositories/category-repo.ts`, tests.
- [ ] Add `deleteRule(actorUserId, workspaceId, ruleId)` and `updateRule(...)` (pattern +
      category), authz-checked (admin), audit-logged consistent with siblings.
- [ ] Live tests: create → list → update → delete; non-admin forbidden.

### Task 3.2 — "Auto-categorize" card in Accounts & bills
Files: new `src/components/manage/rules-card.tsx` (≤450 LOC), `manage/page.tsx`, `_actions.ts`.
- [ ] List rules as human sentences: "Anything containing **'NETFLIX'** → Streaming" with ✕
      delete (two-step inline confirm, same pattern as categories) and inline pattern edit.
- [ ] Empty state: "No rules yet. Set one from any transaction with the Always button — Ledger
      will categorize matching transactions automatically."
- [ ] Renders in the same section family as the category manager.

### Task 3.3 — "Always" saves a pattern that will actually fire
Files: `src/components/transactions/transaction-row.tsx` (:110-125), small popover component.
- [ ] Clicking Always opens a one-field popover pre-filled with a smart-trimmed pattern
      (strip trailing dates, store numbers, city/state fragments — pure function, unit-tested
      against realistic bank strings like "POS DEBIT 4732 STARBUCKS #10894 SEATTLE WA 06/14").
- [ ] Hint: "Keep just the part that always appears — e.g. STARBUCKS."
- [ ] Success toast links to the rules card: "Rule saved — manage rules".

### Task 3.4 — Apply to similar (retroactive, one click)
Files: `_actions.ts` (transactions), `src/services/` (new function on transaction or rule
service), `transaction-row.tsx`, toast usage.
- [ ] After a rule is created (3.3) OR a category is set on a row: count OTHER uncategorized
      transactions in the book matching the pattern/description; if N > 0, toast offers
      "Apply to N similar → " one-click action.
- [ ] Service: `applyCategoryToMatching(actor, workspaceId, pattern, categoryId)` — only
      uncategorized rows, never overwrites human choices; returns count; live-tested.
- [ ] Full refresh after apply; toast confirms "Categorized N transactions."

### Task 3.5 — Inbox-zero payoff
Files: `src/components/transactions/transactions-view.tsx` (:66-79, :127-142).
- [ ] When the uncategorized filter is active and now matches zero rows (but the book has
      transactions): "All caught up — every transaction has a category ✓" + link "Show all
      transactions". Generic empty state everywhere else unchanged.

### Phase 3 gate
- [ ] type-check 0 / lint 0 / tests pass; commit `Phase 3: categorize loop — visible rules, patterns that fire, bulk apply`.

---

# Phase 4 — Celebration moments (calm-confident)

### Task 4.1 — Fully-funded budget: "Every dollar has a job ✓"
Files: `src/components/budget/budget-view.tsx` (SummaryStrip ~:121-142).
- [ ] When Left to budget is exactly $0.00 AND expected income > 0: SummaryStrip renders
      "Every dollar has a job ✓" treatment (soft credit-tint highlight, no animation beyond the
      existing transitions). Distinct from the $0-because-nothing-configured case.
- [ ] Component test: exact-zero + income → text present; zero-income → absent.

### Task 4.2 — Import success card that leads with the win
Files: `src/components/import/import-preview.tsx` (:46-58), `import-wizard.tsx` (:285-289),
pipeline result (auto-categorized count — `proposedCategoryId` per row already known).
- [ ] VERIFIED: `commitImport` (pipeline.ts:146) currently returns only the `ImportBatch` record —
      it does NOT report categorized counts, though it has every row in hand at insert time
      (`categoryId: r.proposedCategoryId` at :173). Extend the commit path server-side: return
      `{ batch, insertedCount, categorizedCount }` (categorizedCount = committed rows with a
      non-null categoryId), thread through the commit action. Do NOT compute counts from the
      client-side preview — commit re-derives rows on the server and could differ.
- [ ] Success card: "**N transactions imported** into {account}." + "Your rules categorized X
      automatically — Y still need a home. → **Categorize them**" (links to
      `/w/{ws}/transactions?filter=uncategorized`; X/Y from the extended commit result).
- [ ] Pipeline test updated for the new return shape.
- [ ] Undo demoted to quiet text link below (function unchanged).
- [ ] When Y = 0 and X > 0: "Your rules categorized all of them. Nothing to do. ✓"

### Task 4.3 — All bills paid gets acknowledged
Files: `dashboard.tsx` (:270-274 empty list, :305-325 paid bar, mark-paid toast :173-184).
- [ ] Upcoming-bills card: bills exist this period but none open → "All caught up — every bill
      this month is paid ✓" (only truly-zero-bills books see "Add bills in {Accounts & bills}…").
- [ ] Paid-vs-unpaid bar at 100% → caption "100% paid this month ✓".
- [ ] Mark-paid toast varies: normally "Paid ✓ — {vendor} off the list"; when it was the last
      open bill: "That was the last one — all bills paid this month."

### Task 4.4 — Payday up-ticks on the forecast
Files: `src/services/dashboard/forecast.ts` (income events already computed),
`src/services/dashboard/index.ts`, `forecast-chart.tsx`, legend in `dashboard.tsx`.
- [ ] Mark income-event days in the chart data; render small up-tick markers (credit color) on
      those days; legend entry "Payday". Reduced-motion and canvas-fallback paths respected.
- [ ] Test: forecast data flags exactly the income dates.

### Task 4.5 — First-run welcome + book-creation moment
Files: `src/components/dashboard/first-run.tsx`, `src/components/workspace/workspace-create-dialog.tsx`,
`_actions.ts` (create), toast usage.
- [ ] FirstRun hero gains one warm intro line: "Welcome to Ledger. This is your book *Personal* —
      a book is one pot of money (a household, a business). Rename it in Settings, or add another
      with ＋." Visual: carry the login coin-mark gradient into the hero header (reuse existing
      brand mark styles; no new assets).
- [ ] After creating a book: success toast "'{name}' is ready — let's add its first account."
      (accent uses the book's chosen color variable, matching the tab underline mechanism).

### Task 4.6 — All-books warmth
Files: `src/app/(app)/all/page.tsx`, rollup service (read).
- [ ] Insight sentence under the Combined row: "Across all books, you kept $X of the $Y that came
      in {periodLabel}." (kept = in − out, decimal-safe; only when in > 0; service-tested).
- [ ] Time-aware greeting above the heading: "Good morning/afternoon/evening — here's everything
      as of today." (client-rendered time so no server-tz drift; falls back to no greeting).

### Task 4.7 — Palette teaches instead of shrugging
Files: `src/components/command/command-palette.tsx` (:136).
- [ ] Empty state → "Nothing matched. Try a book name, or 'import', 'bill', 'settings'."

### Phase 4 gate
- [ ] type-check 0 / lint 0 / tests pass; commit `Phase 4: celebration moments — wins get acknowledged`.

---

# Phase 5 — Verification & merge

### Task 5.1 — Full-suite gates on the branch
- [ ] `pnpm type-check` → 0. `pnpm lint` → 0. `pnpm test` → all pass (flake protocol per Global
      constraints).
- [ ] Copy greps: `rg -i "scheduled" src/components src/app` (only identifiers);
      `rg "workspace" src/components src/app` rendered-string check (identifiers/routes exempt);
      `rg '"Manage"'` if D1 approved → 0 user-visible remnants.

### Task 5.2 — Browser verification (production build, chrome-devtools MCP)
`pnpm build` + `pnpm exec next start` on a free port ≥3006 (check `netstat -ano` first; kill only
this project's stale server via `taskkill //F //PID`).
- [ ] Desktop 1440×900 light: dashboard (incl. a NEGATIVE safe-to-spend book — adjust seed data if
      none exists), forecast hover matches caption, period toggle relabels KPIs, budget
      fully-funded state, calendar summary/legend/chip-popover mark-paid + undo, import wizard
      (credit-card sign suggestion, all-duplicates message, success card), rules card CRUD,
      Always popover + apply-to-similar, inbox-zero, All books links + insight, tiles labels,
      Activity who/what, palette Ctrl K + new commands + deep-linked quick actions.
- [ ] Mobile 430×932: calendar agenda statuses, dashboard alert state, toasts dismissible,
      transactions loop usable, All books table scroll container intact.
- [ ] Dark theme spot-pass on every changed surface (alert tints, legend swatches, up-ticks).
- [ ] Zero console errors throughout.
- [ ] Regression spot-check on unchanged pages (settings, income, export).

### Task 5.3 — Roadmap, merge, push, cleanup
- [ ] Update `docs/ROADMAP.md` (mark this effort's items complete).
- [ ] Merge: `git checkout main && git merge --ff-only feature/ux-trust-and-fun` (rebase first if
      needed); re-run all three gates ON main.
- [ ] `git push` (show output); delete the feature branch.
- [ ] Update memory (`project-state-ledger-budget-app.md`) with the shipped state.

### Definition of done
Every checkbox above checked; gates green on `main`; `origin/main` = local `main`; browser
verification completed with zero console errors; no new deps (`git diff main@{start} -- package.json`
empty); no schema changes (`git diff -- prisma/` empty); findings doc retained in `docs/temp/`.
