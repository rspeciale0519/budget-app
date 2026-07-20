# Plan: Daily Money Tools — feature-daily-money-tools

**Goal:** Finish every remaining "backend exists / UI doesn't" gap and the deferred Goals & Debts
follow-ups, in one effort: (1) **Recurring bills UI** (stop re-adding rent every month),
(2) **"Pay yourself"** (owner draw) UI for business books, (3) **real data search** in the ⌘K
palette, and (4) the Goals & Debts follow-ups — **payoff planner** (snowball/avalanche),
**envelope allocation** (multiple goals on one account), **auto-contributions**, and **in-app debt
due-day reminders**. Then verify and merge.

**Explicitly deferred (user decision 2026-07-20):** v2 Reports (P&L, cash flow, A/P aging,
exports) — its own future plan.
**Excluded as a non-build item:** product naming/branding ("Ledger" is a working title). That's a
decision task — when wanted, run a naming brainstorm + Namecheap availability check separately.

**Branch:** `feature/daily-money-tools` off `main` (main-only workflow; ff-merge at the end,
delete branch). One gated commit per phase.

---

## Verified current state (do NOT rediscover)

- **Recurring engine is DONE:** `RecurringSchedule` model (frequency/interval/dayOfMonth/
  startDate/endDate/nextRunDate + templateVendor/templateAmount/templateCategoryId) and
  `materializeRecurring()` (race-safe `createMany skipDuplicates` against the
  `Bill(recurringScheduleId, dueDate)` unique constraint; called once/day per book by the
  dashboard). `stepByFrequency` lives in `src/lib/recurrence.ts`. **No migration needed** — only
  schedule create/cancel service + UI.
- **`tagOwnerDraw` service + `tagOwnerDrawAction` exist with zero UI callers** (requires admin on
  BOTH books; records one outflow + one income + a WorkspaceTransfer; /all rollup already nets it).
- **`listTransactions` supports `search`** (case-insensitive contains on description/merchant) —
  palette data search reuses it, no new query engine.
- `Frequency` enum: weekly | monthly | quarterly | annual | custom.
- Bill rows already render a "· recurring" suffix when `recurringScheduleId` is set.

## Design decisions (baked in — flag at review; defaults below)

- **DD1 — Canceling a recurring bill deletes its FUTURE unpaid materialized bills** (dueDate >
  today, status unpaid, same scheduleId) and the schedule itself; past and paid bills stay.
  Copy: "Stop repeating" with a two-step confirm noting future bills are removed. *Default: yes.*
- **DD2 — Envelope mode reuses `currentSaved` as the allocation — no migration.** One goal linked
  to an account = live balance (today's behavior). TWO OR MORE goals linked to the SAME account =
  envelope mode: each goal's saved = its stored `currentSaved` (its envelope), and the panel shows
  "Unallocated: $X" (= account balance − Σ envelopes, clamped ≥ 0) with an "Allocate" action per
  goal (validation: total allocations never exceed the account balance). *Default: yes.*
- **DD3 — Auto-contributions are for UNLINKED goals only**, via materialize-on-read (the proven
  recurring-bills pattern; no cron): while `contributionNextDate ≤ today`, add
  `contributionAmount` to `currentSaved` and step the date. Linked goals track their account, so
  auto-contributions there would double-count. **This is the plan's ONLY migration:** 3 additive
  nullable Goal columns (`contributionAmount Decimal?`, `contributionFrequency Frequency?`,
  `contributionNextDate DateTime? @db.Date`). *Default: yes.*
- **DD4 — "Reminders" = in-app due chips, nothing more.** Debts get a "next due day" chip
  (Due today / in N days / Due later) from the shared `billDisplayStatus` vocabulary, on the
  planning page + dashboard debts card. No email/push (no infra; out of scope). *Default: yes.*
- **DD5 — "Pay yourself" lives on the Income page of BUSINESS books**, rendered only when the
  user admins at least one OTHER book. The existing ⌘K "Pay myself from this business" command
  already deep-links to /income — unchanged. *Default: yes.*
- **DD6 — Palette search returns top matches per book and navigates to the register prefilled**
  with the query (no inline editing in the palette). With real data search shipped, the top-bar
  button honestly becomes "Search" again. *Default: yes.*

## Global constraints

- decimal.js money / calendar-date helpers; business logic in services; co-located tests;
  files ≤450 LOC; reuse ui primitives + shared bill-status vocabulary; calm-confident copy.
- RLS + authz patterns exactly as siblings (admin writes, viewer reads). Any new linked/foreign id
  accepted from the client gets an in-workspace ownership check inside the RLS tx (the lesson from
  the goals/debts security finding).
- **Migrations limited to DD3's one additive Goal migration.** No dependency changes.
- Every phase gate: `pnpm type-check` 0, `pnpm lint` 0, `pnpm test` all pass (shared-DB flake →
  re-run once; machine may be loaded by other projects — foreground + long timeouts).

---

# Phase 1 — Recurring bills UI

### Task 1.1 — Schedule repo + service
Files: `src/repositories/recurring-repo.ts` (read first — has list/insertBills/updateNextRun),
`src/services/recurring-service.ts`, `src/lib/zod/entities.ts`.
- [x] Repo: `insertSchedule`, `findSchedule`, `deleteScheduleRow`, and
      `deleteFutureUnpaidBills(scheduleId, afterDate)` (DD1).
- [x] Zod `createRecurringBillSchema`: vendor 1..120, amount zMoney, firstDueDate zCalendarDate,
      frequency enum (weekly|monthly|quarterly|annual), categoryId optional.
- [x] Service `createRecurringBill(actor, workspaceId, input)` — admin authz + RLS-tx categoryId
      ownership check; inserts the schedule (`nextRunDate = firstDueDate`, `dayOfMonth` from the
      date for monthly), then calls `materializeRecurring` so the first bills appear immediately.
      Audit `create` / entityType `"RecurringSchedule"`.
- [x] Service `listRecurringSchedules(actor, workspaceId)` (viewer) → view rows: vendor, amount,
      frequency label ("Repeats monthly"), next due date.
- [x] Service `cancelRecurringSchedule(actor, scheduleId)` — DD1 semantics; audit `delete`.
- [x] Live test: create → bills materialized inside the 90-day horizon with the schedule id →
      cancel → schedule gone, future unpaid bills gone, past/paid bills intact.

### Task 1.2 — "Repeats" on the Add-bill form
Files: `src/components/manage/manage-forms.tsx` (BillForm), `_actions.ts`.
- [x] BillForm gains a "Repeats" select: "Just once" (default) | Weekly | Monthly | Quarterly |
      Yearly. "Just once" → existing `addBillAction`; otherwise a new `addRecurringBillAction`.
      Helper line: "We'll add each upcoming bill automatically — cancel anytime."
- [x] Success toast for recurring: "Repeating bill added — the next ones are on the calendar."

### Task 1.3 — "Repeating bills" management card
Files: new `src/components/manage/recurring-card.tsx`, `manage/page.tsx`, `_actions.ts`.
- [x] Card lists schedules as sentences: "**Rent** · $2,000.00 · repeats monthly · next Aug 1"
      with a two-step "Stop repeating" (confirm copy per DD1). Renders under the bill form area.
- [x] Empty state: "Nothing repeats yet — set a bill to 'Repeats monthly' and it'll appear here."

### Phase 1 gate
- [x] type-check 0 / lint 0 / tests pass; commit `Phase 1: recurring bills UI`.

---

# Phase 2 — "Pay yourself" (owner draw) UI

### Task 2.1 — Data plumbing on the Income page
Files: `src/app/(app)/w/[workspaceId]/income/page.tsx`.
- [x] For a BUSINESS book: fetch the user's other accessible books where they are admin
      (`listAccessibleWorkspaces` + an admin check per book) and, for each, its non-archived
      accounts (`listAccounts` — works because the user is a member). Pass to the card. Personal
      books first in the dropdown.

### Task 2.2 — PayYourselfCard
Files: new `src/components/income/pay-yourself-card.tsx`.
- [x] Renders ONLY on business books with ≥1 other admin book. Fields: To book (default first
      personal), To account (that book's accounts), From account (this book's), Amount, Date
      (default today) → `tagOwnerDrawAction` (exists). Explainer line: "Recorded once in each
      book — the combined view never double-counts it."
- [x] Success toast: "Paid yourself ✓ — money moved to {book}." Errors surface verbatim.
- [x] Component render test (renderToString): business-with-other-book shows the card. (The
      personal-book / no-other-book "renders nothing" gate lives in the PAGE conditional —
      `ws.type === "business" && targets.length > 0 && fromAccounts.length > 0` — a server
      component branch, verified in the Phase 5 browser pass rather than a unit test.)

### Phase 2 gate
- [x] type-check 0 / lint 0 / tests pass; commit `Phase 2: pay yourself UI`.

---

# Phase 3 — Real data search in the palette

### Task 3.1 — Cross-book search action
Files: new action in `src/app/(app)/_actions.ts` (or a co-located palette actions file).
- [x] `searchTransactionsAction(query)` — for each accessible workspace (cap 10 books), call
      `listTransactions(user, wsId, { search: query, pageSize: 3 })`; return up to ~9 flattened
      hits: { workspaceId, workspaceName, description, amount (formatted), date }. Empty query or
      <3 chars → []. Viewer authz is inside listTransactions already.
- [x] Live test: seed two books with distinct descriptions → query matches across books; a
      non-member's books never appear (implicit via accessible-workspaces + authz).

### Task 3.2 — Palette wiring
Files: `src/components/command/command-palette.tsx`, `src/components/chrome/search-button.tsx`.
- [x] Debounced (≈250ms) call when the query is ≥3 chars; results render in a new "Transactions"
      group under the command matches: "{description} · {amount} — {book}". Selecting one
      navigates to `/w/{ws}/transactions?q={query}` (VERIFY the register's search param name in
      `transactions/page.tsx` first and use exactly that; prefill = the query, not the single row).
- [x] Keyboard nav must treat result rows like commands (same selected-index list).
- [x] With data search real: button label "Jump to…" → "Search", palette placeholder → "Search
      transactions, or type a command…". The teaching empty state stays.
- [x] Loading/none states: subtle "Searching…" line; if no hits, the commands-only empty state.

### Phase 3 gate
- [x] type-check 0 / lint 0 / tests pass; commit `Phase 3: palette data search`.

---

# Phase 4 — Goals & debts follow-ups

### Task 4.1 — Payoff planner (snowball vs avalanche)
Files: new `src/lib/payoff-plan.ts` (+ test), planning page + a new
`src/components/planning/payoff-planner.tsx`.
- [ ] Pure `payoffPlan(debts: {name, balance, apr, minimum}[], extraPerMonth, strategy)` →
      month-by-month simulation (decimal inputs, plain-number month counts): payoff order, months
      to debt-free, total interest paid; and `comparePlans(...)` → both strategies + interest
      saved by the winner. Guard: if Σ minimums can't cover interest, return the honest
      "minimums don't cover interest" result. Tests: hand-computed 2-debt case (avalanche beats
      snowball on interest; snowball clears the small debt first), 0% APR, zero-extra.
- [ ] Planner card on the planning page (only when ≥2 debts): "Extra per month" input + a
      Snowball/Avalanche toggle → "Debt-free in ~N months · ~$X interest. Avalanche saves ~$Y vs
      snowball." + the payoff order as a numbered list. Advisory copy: "Estimates at today's
      balances."

### Task 4.2 — Envelope allocation (shared-account goals, DD2)
Files: `src/services/dashboard/planning.ts`, `goals-panel.tsx`, `_actions.ts`.
- [ ] Service: when resolving linked goals, group by accountId; if 2+ goals share one account →
      envelope mode for that group: each saved = own `currentSaved`; expose per-goal
      `envelope: true` and a per-account `unallocated` figure (balance − Σ, clamped ≥ 0).
      Single-goal links unchanged (live balance).
- [ ] TRANSITION RULE (prevents a surprising drop-to-zero): when a create/update link makes an
      account shared (1 goal → 2), first set the previously-single goal's `currentSaved` to the
      account's current live balance — its envelope keeps everything it was showing; the new goal
      starts at $0 with $0 unallocated. Symmetrically, when deletes/unlinks drop the account back
      to exactly one linked goal, that goal resumes live tracking (its stored value is ignored
      again). Do this inside the same RLS tx as the link change. Test the 1→2 transition
      explicitly: the first goal's displayed saved must not change across the flip.
- [ ] `allocateToGoalAction(workspaceId, goalId, amount)` → service moves `amount` from
      unallocated into the goal's `currentSaved`, validated inside the RLS tx (amount > 0 and
      Σ allocations + amount ≤ live account balance → else "Only $X is unallocated").
- [ ] Panel: envelope goals show "envelope of {account}" instead of "Tracks {account}", an
      "Allocate" popover (like Add to savings), and one shared line per account group:
      "Unallocated in {account}: $X".
- [ ] Live test: two goals on one account (balance 1000): allocate 600 + 300 → saved amounts and
      unallocated 100 correct; allocating 200 more rejects; a single-goal account still live-tracks.

### Task 4.3 — Auto-contributions (DD3 — the one migration)
Files: `prisma/schema.prisma` + migration `add_goal_contributions`, `zod/entities.ts`,
`planning.ts`, `goals-panel.tsx`.
- [ ] Migration: `contributionAmount Decimal? @db.Decimal(14,2)`, `contributionFrequency
      Frequency?`, `contributionNextDate DateTime? @db.Date` on Goal (verify env host is the
      local 127.0.0.1 DB before `pnpm exec prisma migrate dev --name add_goal_contributions`).
- [ ] Service: a `materializeGoalContributions(workspaceId, today)` step that EXACTLY mirrors the
      recurring-bills pattern — runs via `prismaAdmin` (a system action, not a user write, so a
      viewer-triggered read never performs RLS writes) behind the same once-per-day in-process
      guard, called at the top of `listGoals`. For UNLINKED goals with a schedule: while
      contributionNextDate ≤ today, add contributionAmount to currentSaved and advance with
      `stepByFrequency`; reached-check applies. create/update schemas accept the 3 fields
      together-or-none (zod refine); setting them on a linked goal is rejected with the
      linked-guard error.
- [ ] Goal form/edit: "Auto-add" — amount + frequency + first date (all optional). Row label:
      "auto-adds $200 monthly". Contribute popover unchanged.
- [ ] Live test: goal with contributionNextDate 2 months back, monthly $100 → listGoals shows
      +$200 and nextDate advanced; runs idempotently on the next read.

### Task 4.4 — Debt due-day chips (DD4 reminders)
Files: `src/lib/debt-due.ts` (+ test), `planning.ts` views, `debts-panel.tsx`, `dashboard.tsx`.
- [ ] Pure `nextDebtDueDate(dueDay, today)` → this month's dueDay or next month's (clamp 29–31
      to the month's last day); feed `billDisplayStatus` for the chip {key,label}.
- [ ] DebtView gains `due: { key, label }`; chips render on the planning rows and the dashboard
      debts card (StatusTag, same vocabulary as bills). Tests cover month-end clamping (dueDay 31
      in a 30-day month) and the today/tomorrow boundaries.

### Phase 4 gate
- [ ] type-check 0 / lint 0 / tests pass; commit `Phase 4: goals & debts follow-ups`.

---

# Phase 5 — Verification & merge

### Task 5.1 — Gates + constraint evidence
- [ ] All three gates green on the branch. `git diff` vs branch-start: prisma/ limited to the ONE
      `add_goal_contributions` migration + schema fields; package.json unchanged.

### Task 5.2 — Browser verification (production build, chrome-devtools MCP)
Reseed the throwaway `verify-polish@example.com` fixtures (DIRECT_URL script) with: a business
book + a personal book (both admin), accounts on each, **distinctively-named transactions in BOTH
books** (so palette search can prove a cross-book hit), ≥2 manual debts, two goals sharing one
savings account, and an unlinked goal with a backdated auto-contribution.
- [ ] Desktop 1440×900 (light + dark) + mobile 430×932, zero console errors, covering: create a
      monthly recurring bill → bills appear on calendar/dashboard with "· recurring" → "Stop
      repeating" removes future unpaid ones; Pay yourself from the business book → toast + the
      personal book's register shows the income + /all nets it once; palette search finds a
      transaction across books and lands on the prefilled register; payoff planner toggle
      (snowball vs avalanche numbers move); envelope allocate + "Unallocated" math; auto-add
      materialized on page load; debt due chips ("Due today"/"in N days").

### Task 5.3 — Roadmap, merge, push, cleanup
- [ ] Update `docs/ROADMAP.md`; ff-merge to `main`; re-run gates ON main; push (output shown);
      `git rev-parse` parity; delete branch; update project memory.

### Definition of done
Every checkbox checked; gates green on main; origin/main = local main; browser pass clean; the
only schema change is the additive 3-column Goal contribution migration; no dep changes; the
palette button says "Search" and means it.
