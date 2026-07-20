# Plan: Goals & Debts — feature-goals-and-debts

**Goal:** Make the already-modeled but read-only Goals and Debts into a fully working feature —
create / edit / delete, **account-linked live tracking** (a goal's progress mirrors a savings
account; a debt's balance tracks a linked credit-card/loan account), a manual fallback when no
account is linked, useful computed insights (goal "on track?", debt payoff estimate), and a
dedicated **"Goals & debts"** management page — then wire the dashboard cards to the live values and
give their empty states a real destination.

**Source of scope:** user decisions (2026-07-19) — (1) **account-linked** tracking, (2) a **new
"Goals & debts" tab**, (3) **Debts stay a separate concept** (independent of credit_card/loan
account types). This also closes the one honest exception left by feature-ux-trust-and-fun
("debts/goals empty states had nowhere to link").

**Branch:** `feature/goals-and-debts` off `main` (solo workflow: no develop, no PRs; fast-forward
merge to `main` at the end, delete branch). One gated commit per phase.

---

## Design decisions (baked in — flag for review; defaults below)

- **DD1 — Linked-primary, manual fallback.** Each goal/debt *optionally* links to an account. When
  linked, the live amount is computed via `getAccountBalance()` (never stored). When NOT linked, the
  stored `currentSaved` / `currentBalance` is used, and a manual "Add to savings" / "Record payment"
  action adjusts it. Rationale: pure linked-only would force a dedicated account per item (heavy);
  linked-primary delivers the live tracking the user asked for without that tax. *Default: yes.*
- **DD2 — Liability sign convention.** A goal links to a **savings/checking/cash** account (positive
  balance = amount saved). A debt links to a **credit_card/loan** account whose live balance is
  negative when money is owed, so **owed = −balance** (clamped at ≥ 0). The link dropdowns filter to
  the sensible account types. Documented + unit-tested so the sign can never silently flip.
  *Default: yes.*
- **DD3 — One additive migration.** `Goal` gains `accountId String?` (+ `@@index`) to match `Debt`,
  which already has it. No other schema changes; existing rows are unaffected (nullable column).
  Runs via `pnpm prisma migrate dev --name add_goal_account`. *Default: yes — this is the only
  schema change in the plan.* VERIFIED: `prisma/migrations/` exists with 6 prior migrations
  (migrate-dev is the established workflow here, not db-push), so this is routine, not a first.
- **DD4 — Payoff/on-track are computed, never stored.** Goal "on track?" compares the monthly pace
  needed (target − saved over months to target date) against nothing stored — it's advisory text.
  Debt "payoff" estimates months-to-zero at the minimum payment given APR (standard amortization),
  shown as "~N months at the minimum". Both pure + unit-tested. *Default: yes.*

## Global constraints (apply to every task)

- Money via decimal.js helpers (`src/lib/money.ts`); dates via calendar-date helpers — never float,
  never `new Date()` arithmetic on business dates. APR math uses decimal.js.
- Business logic in services, never components. Co-located `*.test.ts(x)` for logic changes.
- Two-role Prisma respected: reads/writes via `rlsClientFor(userId)`; authz via
  `assertWorkspaceAccess` (admin for writes, viewer for reads) exactly like sibling services.
- Files ≤450 LOC — split if a file would grow past it.
- Reuse existing primitives: `getAccountBalance` (account-service), `ui/card`, `ui/button`,
  `ui/field`, `PageHeading`, toast, two-step inline confirms, the money helpers.
- Tone: calm-confident, consistent with the shipped UX (semantic colors; a goal reaching 100% earns
  one quiet "✓" moment, no confetti).
- Every phase ends: `pnpm type-check` (0), `pnpm lint` (0), `pnpm test` (all pass; known shared-DB
  parallel-test flake → re-run once). Machine-load note: other projects' builds can starve
  lint/test — run gates foreground with a long timeout and retry if a background job is killed.

## Explicitly OUT of scope (future, not forgotten)

Multiple goals sharing one account with envelope allocation; auto-detecting a debt's min payment or
APR from statements; scheduled/recurring auto-contributions; debt payoff *strategies* (snowball/
avalanche across multiple debts); notifications/reminders; goal/debt reports.

---

# Phase 1 — Data & services

### Task 1.1 — Schema: add `Goal.accountId` (the one migration)
Files: `prisma/schema.prisma`, new migration under `prisma/migrations/`.
- [x] Add `accountId String?` and `@@index([accountId])` (or fold into existing index list) to the
      `Goal` model; do NOT add a hard FK relation block unless the schema already relates Account↔
      children (match how `Debt.accountId` is declared — it's a bare `String?`, so mirror that).
- [x] Run `pnpm prisma migrate dev --name add_goal_account`; commit the generated migration folder.
- [x] `pnpm prisma generate` picks up the new field (type-check will confirm).

### Task 1.2 — Zod schemas for goal & debt CRUD
Files: `src/lib/zod/entities.ts`.
- [x] `createGoalSchema` { name 1..80, targetAmount zMoney, targetDate zCalendarDate.optional(),
      accountId string.optional(), notes string.max(500).optional() }; `updateGoalSchema` = partial
      of the same + `currentSaved zMoney.optional()`, `status` enum "active"|"reached"|"archived".
- [x] `contributeGoalSchema` { amount zMoney (positive) }.
- [x] `createDebtSchema` { name 1..80, type string 1..40, apr zMoney (used as a percent, ≥0),
      minimumPayment zMoney (≥0), dueDay int 1..31, accountId string.optional(),
      currentBalance zMoney (manual fallback; required when accountId absent) }; `updateDebtSchema`
      = partial; `recordDebtPaymentSchema` { amount zMoney (positive) }.
- [x] Export the input types (`CreateGoalInput`, etc.), mirroring the file's existing pattern.

### Task 1.3 — planning-repo: CRUD
Files: `src/repositories/planning-repo.ts`.
- [x] Add `insertGoal`, `findGoal`, `updateGoalRow`, `deleteGoalRow`; `insertDebt`, `findDebt`,
      `updateDebtRow`, `deleteDebtRow`. Bare Prisma calls like the sibling `category-repo` /
      `bill-repo` (Unchecked create/update input types). Keep the existing list functions.

### Task 1.4 — planning-service: CRUD + linked balances + manual adjust
VERIFIED: the forced-RLS migration (`20260620223042_forced_rls_policies`) defines `FOR ALL`
policies on both `Goal` and `Debt` with USING + WITH CHECK on workspace membership — so writes via
`rlsClientFor` will pass RLS with no policy changes needed.
Files: `src/services/dashboard/planning.ts` (or split into `src/services/planning-service.ts` if it
would exceed 450 LOC — likely split), reusing `getAccountBalance` from `account-service`.
- [x] `DebtView`/`GoalView` gain `id`, `accountId: string | null`, `linked: boolean`, and for
      goals `targetDate: string | null`; keep existing fields.
- [x] `listGoals`/`listDebts`: when `accountId` is set, compute the live amount —
      goal.saved = `getAccountBalance(accountId)` (clamped ≥ 0); debt.balance =
      `max(0, negate(getAccountBalance(accountId)))` (DD2). When null, use the stored value.
      Recompute `pct` from the resolved saved/target. (Batch the per-account balance lookups.)
- [x] `createGoal`/`updateGoal`/`deleteGoal`; `createDebt`/`updateDebt`/`deleteDebt` — admin authz,
      RLS client, zod-parsed, audit-logged consistent with siblings that audit (bills do; match
      that — action `create|update|delete`, entityType `"Goal"`/`"Debt"`).
- [x] `contributeToGoal(actor, goalId, amount)` — only valid when the goal is NOT linked; adds to
      `currentSaved`; if it reaches/exceeds target, set `status = "reached"`. Throws a clear error
      if the goal is account-linked ("This goal tracks an account — move money into that account
      instead").
- [x] `recordDebtPayment(actor, debtId, amount)` — only when NOT linked; reduces `currentBalance`
      (clamped ≥ 0). Same linked-guard error shape.

### Task 1.5 — Pure insight helpers (+ tests)
Files: new `src/lib/goal-insight.ts`, `src/lib/debt-payoff.ts` (pure, no server deps).
- [x] `goalOnTrack({ saved, target, targetDate, today }) → { reached, needPerMonth?, monthsLeft?,
      label }` — e.g. "Reached ✓", "≈ $250/mo to hit it by Dec", "No target date". Decimal-safe.
- [x] `debtPayoff({ balance, apr, minimumPayment }) → { months, label }` — standard amortization:
      if minimum ≤ monthly interest, return `{ months: Infinity, label: "Minimum barely covers
      interest" }`; else iterate/closed-form months to zero; label "~N months at the minimum".
- [x] Unit-test boundaries for both (reached; no date; min-too-low; 0% APR; already-paid-off).

### Phase 1 gate
- [x] type-check 0 / lint 0 / tests pass; commit `Phase 1: goals & debts data + services (account-linked)`.

---

# Phase 2 — Actions & the "Goals & debts" page

### Task 2.1 — Server actions
Files: `src/app/(app)/w/[workspaceId]/_actions.ts` (or a co-located `planning/_actions.ts`).
- [ ] `addGoalAction`, `updateGoalAction`, `deleteGoalAction`, `contributeGoalAction`;
      `addDebtAction`, `updateDebtAction`, `deleteDebtAction`, `recordDebtPaymentAction`. Same
      `run()`+`ActionResult` pattern as the file's other actions; revalidate the book + the new page.

### Task 2.2 — Sub-nav entry
Files: `src/components/workspace/workspace-sub-nav.tsx`.
- [ ] Add `["Goals & debts", "/planning"]` to `WORKSPACE_SECTIONS` (placement: after "Budget",
      before "Income" — group the money-planning tabs). 9 tabs; acceptable (they already wrap).

### Task 2.3 — The page (server component)
Files: new `src/app/(app)/w/[workspaceId]/planning/page.tsx`.
- [ ] Fetch goals, debts (live-resolved via the service), and the book's non-archived accounts
      (for the link dropdowns; filter savings/checking/cash for goals, credit_card/loan for debts).
- [ ] `export const metadata = { title: "Goals & debts" }`; `PageHeading` "Goals & debts";
      `export const dynamic = "force-dynamic"`.
- [ ] Render `<GoalsPanel …/>` and `<DebtsPanel …/>`.

### Task 2.4 — Goals panel (client)
Files: new `src/components/planning/goals-panel.tsx` (≤450 LOC; split a `GoalForm` if needed).
- [ ] Add-goal form (name, target, optional target date, optional linked savings account, notes).
- [ ] Goal rows: name, progress bar + saved/target + pct, the `goalOnTrack` label, and a
      "Linked to <account>" tag when linked. Actions: edit (inline), delete (two-step confirm),
      and — only when NOT linked — "Add to savings" popover (amount → `contributeGoalAction`).
      A reached goal shows a quiet "Reached ✓" treatment.
- [ ] Empty state: "No goals yet — set a savings target and (optionally) link the account that
      holds the money." with the add form right there.

### Task 2.5 — Debts panel (client)
Files: new `src/components/planning/debts-panel.tsx` (≤450 LOC; split a `DebtForm` if needed).
- [ ] Add-debt form (name, type, APR, min payment, due day, optional linked liability account,
      manual starting balance when unlinked).
- [ ] Debt rows: name, balance owed, APR · min · "due day N", the `debtPayoff` label, and a
      "Linked to <account>" tag when linked. Actions: edit, delete (two-step), and — only when NOT
      linked — "Record payment" popover (amount → `recordDebtPaymentAction`).
- [ ] Empty state mirroring the goals one.

### Phase 2 gate
- [ ] type-check 0 / lint 0 / tests pass; commit `Phase 2: goals & debts management page + actions`.

---

# Phase 3 — Dashboard wiring + polish

### Task 3.1 — Live values on the dashboard cards
Files: `src/services/dashboard/index.ts`, `src/lib/mock/dashboard.ts` (types), `dashboard.tsx`.
- [ ] The dashboard already renders `listGoals`/`listDebts`; confirm it now shows the live
      account-linked amounts (it will, since the service resolves them) and the pct reflects them.
- [ ] `GoalItem`/`DebtItem` gain a small "· linked" hint when account-backed (optional, subtle).

### Task 3.2 — Empty-state CTAs → the new tab (closes the prior honest exception)
Files: `src/components/dashboard/dashboard.tsx`.
- [ ] Goals empty state → link "Set a savings goal →" to `/w/{ws}/planning`.
- [ ] Debts empty state → link "Track a debt →" to `/w/{ws}/planning`.

### Task 3.3 — Goal-reached moment
Files: goals-panel + wherever contribution resolves.
- [ ] When a contribution (or a linked balance) crosses the target, the row flips to "Reached ✓"
      (calm credit-tint), and the contribute toast reads "Goal reached — nice." Once per crossing.

### Phase 3 gate
- [ ] type-check 0 / lint 0 / tests pass; commit `Phase 3: dashboard wiring + goal-reached moment`.

---

# Phase 4 — Verification & merge

### Task 4.1 — Gates + targeted greps
- [ ] type-check 0, lint 0, full test suite green (flake protocol). Confirm the new pure helpers +
      service tests are included.

### Task 4.2 — Browser verification (production build, chrome-devtools MCP)
`pnpm build` + `pnpm exec next start` on a free port ≥3006 (check `netstat` first; the machine runs
other projects — expect load). Reuse/refresh the throwaway `VERIFY-POLISH` verification account
(or reseed) with: a savings account + a goal linked to it, an unlinked goal, a loan/credit_card
account + a linked debt, and an unlinked debt.
- [ ] Desktop 1440×900 (light + dark) + mobile 430×932: the Goals & debts page (create, edit,
      delete, contribute to an unlinked goal, record a payment on an unlinked debt), a linked goal's
      progress reflecting the account balance, a linked debt's owed = −(account balance), the
      payoff/on-track labels, a goal crossing 100% → "Reached ✓", and the dashboard cards + empty-
      state CTAs. Zero console errors.

### Task 4.3 — Roadmap, merge, push, cleanup
- [ ] Update `docs/ROADMAP.md`; merge `--ff-only` to `main`; re-run all three gates ON main; push
      (show output); `git rev-parse` parity; delete the feature branch; update project memory.

### Definition of done
Every checkbox checked; gates green on `main`; `origin/main` = local `main`; browser-verified with
zero console errors; the ONLY schema change is the additive `Goal.accountId` migration (call it out
explicitly in the merge — this plan, unlike the last, intentionally includes one migration); the
dashboard debts/goals empty states now link somewhere real.
