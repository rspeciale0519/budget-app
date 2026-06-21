# Phase 2a — Budget Dashboard (Live) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 1 shell into a live budgeting dashboard — compute safe-to-spend, cash-flow forecast, category breakdown, paid-vs-unpaid, debts/goals, and the consolidated roll-up with transfer-netting from real data; let the owner configure **expected income**; materialize recurring bills idempotently; and wire every dashboard widget to the service layer.

**Architecture:** A new **computation service layer** (`src/services/dashboard/`) derives every figure from the existing repositories using `decimal.js` money math, period date-ranges, and RLS-scoped `rlsClientFor`. Expected income is an explicit, owner-configured **`IncomeSource`** (0..N per workspace); a single shared **income-projection helper** feeds both safe-to-spend and the forecast so they never diverge. A server-side aggregator (`getDashboardData`) feeds the existing presentational components — Phase 1's mock objects are replaced by real ones of the **same shape**, so the components don't change.

> **Scope note:** Desktop **tiling + saved layouts** (spec §5.1, FR-4/5) is deliberately split into a separate **Phase 2b** plan (`feature-tiling-layouts.md`), to be written after 2a ships and is verified. 2a delivers the live dashboard — the core value.

**Tech Stack:** Next.js 16 (App Router) · TypeScript strict · Prisma 6 · decimal.js · Vitest · Tailwind 4 · pnpm.

## Global Constraints

Carried verbatim from the spec/PRD/CLAUDE.md — every task implicitly includes these.

- **No JavaScript float math on money.** All monetary arithmetic uses `decimal.js` (`@/lib/money`) or Postgres `numeric`. Rounding half-up to cents.
- **Balances are computed** (`openingBalance + Σ transactions`), never stored.
- **Dates are calendar dates** (`@/lib/calendar-date`); a timezone offset never shifts a day.
- **Transfers excluded** from income/expense/category/forecast math via `isTransfer`.
- **Service-layer authz on every read** (`assertWorkspaceAccess`/`assertOrgRole`) AND forced Postgres RLS via `rlsClientFor`. New tables get ENABLE+FORCE RLS + a membership policy.
- **Income-bridge privacy:** roll-up nets transfers only for a caller who can see both sides; per-workspace figures respect membership.
- **TypeScript strict; no `any`.** Source files ≤ 450 LOC. Business logic in services, never components. Tests co-located as `*.test.ts`.
- **Never hard-delete** — archive. **Recurring materialization is idempotent and race-safe** (DB unique constraint, not just check-then-insert).
- **Package manager: pnpm.** Single currency USD.

---

## File Structure

```
prisma/
└── schema.prisma                  # + IncomeSource model; + Bill @@unique([recurringScheduleId, dueDate])
supabase/migrations/               # + RLS policy for IncomeSource (Prisma raw-SQL migration)
src/
├── services/
│   ├── income-source-service.ts   # IncomeSource CRUD (admin authz, rlsClientFor)
│   ├── recurring-service.ts       # materializeRecurring (race-safe, once-per-day guard)
│   └── dashboard/
│       ├── period.ts              # period → {start,end} CalendarDate range
│       ├── income-projection.ts   # projectIncome(db, ws, from, to) — THE shared income helper
│       ├── metrics.ts             # totalBalance, moneyIn, moneyOut (transfers excluded)
│       ├── safe-to-spend.ts       # available − unpaid-before-next-income (+ drill-down)
│       ├── forecast.ts            # daily projected balance (bills out + income in) + lowest point
│       ├── category-breakdown.ts  # expenses by category (transfers excluded)
│       ├── paid-unpaid.ts         # paid vs unpaid for a period
│       ├── planning.ts            # debts + goals read
│       ├── rollup.ts              # per-workspace + combined, transfer-netted
│       └── index.ts               # getDashboardData aggregator → DashboardData
├── repositories/
│   ├── income-source-repo.ts
│   ├── planning-repo.ts
│   └── recurring-repo.ts
├── components/
│   ├── dashboard/dashboard.tsx    # (modified) live data; drill-down items; mark-paid wired
│   └── income/income-source-form.tsx  # configure expected income
├── lib/zod/income.ts              # IncomeSource schema
└── app/(app)/
    ├── w/[workspaceId]/page.tsx           # (modified) getDashboardData; period from searchParams
    ├── w/[workspaceId]/_actions.ts        # (modified) markBillPaid + income-source actions
    ├── w/[workspaceId]/income/page.tsx    # expected-income config page
    └── all/page.tsx                       # (modified) live roll-up
```

---

## Task Sequencing Overview

- **Task 1:** Schema — `IncomeSource` + Bill unique constraint + RLS policy (migrations).
- **Tasks 2–4:** Foundations — period helper, income-projection helper (shared), metrics.
- **Tasks 5–9:** Computations — safe-to-spend, forecast, category, paid-vs-unpaid, planning.
- **Task 10:** Income-source CRUD service.
- **Task 11:** Race-safe recurring materialization.
- **Task 12:** `getDashboardData` aggregator (stable category colors).
- **Tasks 13–16:** Wire dashboard page + period selector, safe-to-spend drill-down, mark-paid, income-config UI.
- **Tasks 17–18:** Roll-up service + wire `/all`.

Each task ends with an independently testable deliverable and a commit.

---

## Task 1: Schema — IncomeSource, Bill unique constraint, RLS

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_income_source_and_constraints/migration.sql` (Prisma), a raw-SQL RLS migration for the new table
- Test: `prisma/schema.income.test.ts`

**Interfaces:**
- Produces: model `IncomeSource { id; workspaceId; name; amount Decimal @db.Decimal(14,2); frequency Frequency; interval Int @default(1); dayOfMonth Int?; nextDate DateTime @db.Date; endDate DateTime? @db.Date; createdAt; updatedAt; @@index([workspaceId]) }`; and `Bill @@unique([recurringScheduleId, dueDate])` (nulls distinct → manual bills unaffected; materialized bills can't duplicate per schedule+date). RLS: ENABLE+FORCE on `IncomeSource` with the workspace-membership policy (same predicate as other workspace tables).

- [ ] **Step 1: Write failing smoke test** — create an `IncomeSource` and read it back; assert `amount` is `Prisma.Decimal`, `nextDate` round-trips as calendar date; creating two materialized bills with the same `(recurringScheduleId, dueDate)` throws a unique violation.
- [ ] **Step 2: Run → FAIL** (`pnpm vitest run prisma/schema.income.test.ts`).
- [ ] **Step 3: Add model + constraint** — `pnpm prisma migrate dev --name income_source_and_constraints`.
- [ ] **Step 4: Add RLS** — raw-SQL migration: `ENABLE`/`FORCE ROW LEVEL SECURITY` on `"IncomeSource"` + `CREATE POLICY income_source_rls ... USING/WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))`. Apply via `pnpm prisma migrate dev`.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** — `git commit -am "feat(schema): IncomeSource + bill recurrence unique constraint + RLS"`

---

## Task 2: Period date-range helper

**Files:**
- Create: `src/services/dashboard/period.ts`
- Test: `src/services/dashboard/period.test.ts`

**Interfaces:**
- Consumes: `@/lib/calendar-date` (`CalendarDate`, `addDays`, `calendarDate`).
- Produces: `type Period = "week" | "month" | "quarter" | "year"`; `periodRange(period, today): { start: CalendarDate; end: CalendarDate }` (inclusive start, exclusive end).

- [ ] **Step 1: Write failing tests** — `periodRange("month","2026-06-20")` → `{start:"2026-06-01",end:"2026-07-01"}`; week (Mon-anchored) of Sat `2026-06-20` → `{start:"2026-06-15",end:"2026-06-22"}`; quarter → `{start:"2026-04-01",end:"2026-07-01"}`; year → `{start:"2026-01-01",end:"2027-01-01"}`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** with pure UTC calendar math.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): period date-range helper"`

---

## Task 3: Income-projection helper (the shared income source of truth)

**Files:**
- Create: `src/services/dashboard/income-projection.ts`, `src/repositories/income-source-repo.ts`
- Test: `src/services/dashboard/income-projection.test.ts`

**Interfaces:**
- Consumes: `income-source-repo` (list a workspace's `IncomeSource`s), `calendar-date` (`addDays`, `fromDbDate`, `isBefore`, `compare`), `money`, `Frequency` stepping.
- Produces: `projectIncome(db, workspaceId, from: CalendarDate, to: CalendarDate): Promise<{ date: CalendarDate; amount: Money; sourceName: string }[]>` (every expected income event in `[from, to)`, generated by stepping each source's `nextDate` by `frequency`/`interval`, sorted by date); and `nextIncomeEvent(events, today): { date; amount; sourceName } | null` (earliest event with `date >= today`). **Both safe-to-spend and forecast use ONLY this helper for income** — no other code resolves "expected income".

- [ ] **Step 1: Write failing test** — a monthly IncomeSource (`amount 4000`, `nextDate today+10`); `projectIncome(today, today+70)` returns events at `today+10` and `today+40` (and ~`today+70` boundary excluded), each `$4,000.00`; `nextIncomeEvent(events, today).date = today+10`. With **no** sources, `projectIncome` returns `[]` and `nextIncomeEvent` returns `null`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — frequency stepping (`weekly` +7d×interval; `monthly` +interval months on `dayOfMonth`/`nextDate` day; `quarterly` +3; `annual` +1y); stop at `endDate` or `to`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): shared income-projection helper"`

---

## Task 4: Metrics service (balance, money in/out)

**Files:**
- Create: `src/services/dashboard/metrics.ts`
- Test: `src/services/dashboard/metrics.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `assertWorkspaceAccess`, `money`/`add`/`sum`, `periodRange`, `toUtcDate`.
- Produces: `workspaceMetrics(userId, workspaceId, period, today): Promise<{ totalBalance: Money; moneyIn: Money; moneyOut: Money }>`. `totalBalance` = Σ(account.openingBalance) + Σ(all transactions). `moneyIn`/`moneyOut` = Σ positive/negative transaction amounts **in the period, excluding `isTransfer`**.

- [ ] **Step 1: Write failing test** — opening `1000.00`; in-period `+500`, `-200`, `-100` (transfer); out-of-period `+999`. Assert `totalBalance = $2,199.00`, `moneyIn = $500.00`, `moneyOut = $200.00`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — Prisma aggregates with the period/transfer filters; balance ignores period and counts transfers.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): workspace metrics"`

---

## Task 5: Safe-to-spend service (with drill-down + graceful no-income)

**Files:**
- Create: `src/services/dashboard/safe-to-spend.ts`
- Test: `src/services/dashboard/safe-to-spend.test.ts`

**Interfaces:**
- Consumes: `metrics` (balance), `projectIncome`/`nextIncomeEvent` (Task 3), `rlsClientFor`, `money`/`sub`/`sum`, `calendar-date`.
- Produces: `safeToSpend(userId, workspaceId, today): Promise<{ result: Money; availableBalance: Money; horizonDate: CalendarDate; incomeConfigured: boolean; incomeSourceName: string | null; unpaidBeforeHorizon: { vendor; amount: Money; dueDate: CalendarDate }[]; unpaidTotal: Money }>`. **Definition:** `horizonDate` = `nextIncomeEvent(...).date` if an income source is configured, else `addDays(today, 30)` (and `incomeConfigured = false`, so the UI hints "set expected income for a sharper number"). `result = availableBalance − Σ(unpaid bills with dueDate < horizonDate)`.

- [ ] **Step 1: Write failing tests** — (a) **with income:** balance `5000`, unpaid Rent `-1500` due+5, Card `-400` due+20, IncomeSource `nextDate today+10` → `horizonDate=today+10`, `incomeConfigured=true`, breakdown = [Rent], `result=$3,500.00`. (b) **no income:** same bills, no source → `horizonDate=today+30`, `incomeConfigured=false`, breakdown = [Rent, Card], `result=$3,100.00`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): safe-to-spend with income horizon + drill-down"`

---

## Task 6: Cash-flow forecast service

**Files:**
- Create: `src/services/dashboard/forecast.ts`
- Test: `src/services/dashboard/forecast.test.ts`

**Interfaces:**
- Consumes: `metrics` (current balance), `projectIncome` (Task 3), `rlsClientFor`, `money`/`add`/`sub`/`compare`, `calendar-date` (`addDays`, `fromDbDate`).
- Produces: `cashflowForecast(userId, workspaceId, today, horizonDays = 30): Promise<{ points: { date: CalendarDate; balance: Money }[]; lowest: { date; balance }; incomeConfigured: boolean }>`. From today's balance, walk each day to `today+horizon`: subtract unpaid bills due that day, add **projected income events** that day, record running balance; `lowest` = min point.

- [ ] **Step 1: Write failing test** — balance `2000`, unpaid bill `-1500` due+3, IncomeSource event `+1000` at +5. Assert the +3 point ≈ `$500.00`, the +5 point ≈ `$1,500.00`, `lowest.date = today+3`, `lowest.balance = $500.00`, `incomeConfigured = true`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — per-day delta map from bills (`dueDate`) + `projectIncome` events; accumulate; track min.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): cash-flow forecast (bills + projected income)"`

---

## Task 7: Category breakdown service

**Files:**
- Create: `src/services/dashboard/category-breakdown.ts`
- Test: `src/services/dashboard/category-breakdown.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `category-repo`, `money`/`sum`, `periodRange`.
- Produces: `categoryBreakdown(userId, workspaceId, period, today): Promise<{ categoryId: string; name: string; amount: Money; pct: number }[]>` — expenses only (`kind = expense`), `isTransfer = false`, in-period, sorted by amount desc; `pct` integer. **Carries `categoryId`** so the aggregator can assign a stable color by id (fix: colors no longer shift with sort order).

- [ ] **Step 1: Write failing test** — Groceries `-300`,`-100`; Dining `-100`; income `+500` and transfer `-50` excluded. Assert `[{name:"Groceries",amount:$400.00,pct:80}, {name:"Dining",amount:$100.00,pct:20}]` with `categoryId` populated.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): spending-by-category breakdown"`

---

## Task 8: Paid-vs-unpaid service

**Files:**
- Create: `src/services/dashboard/paid-unpaid.ts`
- Test: `src/services/dashboard/paid-unpaid.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `bill-repo`, `money`/`sum`, `periodRange`.
- Produces: `paidVsUnpaid(userId, workspaceId, period, today): Promise<{ paid: Money; unpaid: Money; paidPct: number }>` — bill amounts with `dueDate` in-period split by `status`.

- [ ] **Step 1: Write failing test** — two paid (`100`,`200`), one unpaid (`300`) → `paid=$300.00`, `unpaid=$300.00`, `paidPct=50`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): paid-vs-unpaid"`

---

## Task 9: Planning service (debts + goals)

**Files:**
- Create: `src/repositories/planning-repo.ts`, `src/services/dashboard/planning.ts`
- Test: `src/services/dashboard/planning.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `assertWorkspaceAccess`, `money`/`sum`.
- Produces: `listDebts(userId, workspaceId): Promise<{ name; balance: Money; apr: string; minimum: Money }[]>` (+ `debtsTotal`); `listGoals(userId, workspaceId): Promise<{ name; target: Money; saved: Money; pct: number }[]>` (pct capped 100).

- [ ] **Step 1: Write failing test** — debt (`2480`, apr `19.99`, min `75`), goal (`target 5000`, saved `1200`) → debt balance `$2,480.00`, apr `19.99%`, goal pct `24`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): debts + goals read services"`

---

## Task 10: Income-source CRUD service

**Files:**
- Create: `src/lib/zod/income.ts`, `src/services/income-source-service.ts`
- Test: `src/services/income-source-service.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `assertWorkspaceAccess` (admin), `income-source-repo`, Zod.
- Produces: `createIncomeSource(userId, workspaceId, input)`, `listIncomeSources(userId, workspaceId)`, `updateIncomeSource`, `deleteIncomeSource`. `createIncomeSourceSchema = { name; amount: zMoney; frequency: nativeEnum(Frequency); interval?; dayOfMonth?; nextDate: zCalendarDate; endDate? }`.

- [ ] **Step 1: Write failing tests** — create requires workspace-admin; created source appears in `listIncomeSources`; a viewer is denied create; non-member sees none via `rlsClientFor`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: income-source CRUD service"`

---

## Task 11: Race-safe recurring materialization

**Files:**
- Create: `src/repositories/recurring-repo.ts`, `src/services/recurring-service.ts`
- Test: `src/services/recurring-service.test.ts`

**Interfaces:**
- Consumes: `prismaAdmin`, `calendar-date`, `Frequency` stepping, the Task 1 unique constraint.
- Produces: `materializeRecurring(workspaceId, today, horizonDays = 90): Promise<{ created: number }>` — generate `Bill` rows from each schedule's `nextRunDate` to `today+horizon`; **inserts use `createMany({ skipDuplicates: true })` against the `(recurringScheduleId, dueDate)` unique constraint** (race-safe, not check-then-insert); advance `nextRunDate`. `materializeDueWorkspaces(today)` is the once-per-day entry the aggregator calls behind a per-workspace "last materialized today" guard (a cheap `updatedAt`/marker check), so it does **not** write on every render.

- [ ] **Step 1: Write failing test** — monthly schedule (`1500`, `nextRunDate today`) → ≥3 bills in 90 days, each linked, `1500.00`; **second call → `created = 0`** (constraint + skipDuplicates), no duplicates even when called twice "concurrently" (call `materializeRecurring` twice without awaiting in between, then assert no dupes).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — frequency stepping; `createMany skipDuplicates`; once-per-day guard.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: race-safe idempotent recurring materialization"`

---

## Task 12: Dashboard aggregator (`getDashboardData`, stable colors)

**Files:**
- Create: `src/services/dashboard/index.ts`
- Test: `src/services/dashboard/index.test.ts`

**Interfaces:**
- Consumes: all of Tasks 4–9, 11; `bill-service.upcomingAndOverdue`.
- Produces: `getDashboardData(userId, workspaceId, period, today): Promise<DashboardData>` — the **exact shape** the Phase 1 components consume (`@/lib/mock/dashboard`'s `DashboardData`), extended with: `safeToSpendMath.items` (the drill-down bills), `safeToSpendMath.incomeConfigured`, and `BillItem.id`. Money→formatted strings at this boundary. **Category colors are assigned by a stable map keyed on `categoryId`** (hash → palette index), not array index. Calls the once-per-day `materializeDueWorkspaces` guard before computing forecast/bills.

- [ ] **Step 1: Write failing test** — seeded workspace; `getDashboardData(...).kpis.totalBalance` and `.safeToSpend` equal the computed `format(...)` values; `forecast.length > 0`; the same category keeps the same color across two calls even if amounts change its rank.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): live getDashboardData aggregator (stable colors)"`

---

## Task 13: Wire the dashboard page to live data + period selector

**Files:**
- Modify: `src/app/(app)/w/[workspaceId]/page.tsx`
- Test: `src/app/(app)/w/[workspaceId]/page.live.test.ts`

**Interfaces:**
- Consumes: `getDashboardData`, `getCurrentUser`, `today()`, `period` from `searchParams`.
- Produces: the page passes **live** `DashboardData` to `<Dashboard>`; the period segment becomes real `<Link href="?period=...">` with the active one highlighted; defensive fallback to a "no access" state (not mock) if `getDashboardData` throws.

- [ ] **Step 1: Write failing smoke test** — for a seeded member, the page data path yields the computed balance (not the mock `$48,210`).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `const data = await getDashboardData(user.id, workspaceId, period, today())`; wire the segment links.
- [ ] **Step 4: Run → PASS** + production-server browser check (mock numbers gone; period switch works).
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): wire workspace dashboard to live data + period selector"`

---

## Task 14: Safe-to-spend drill-down (live, traceable, with income hint)

**Files:**
- Modify: `src/components/dashboard/dashboard.tsx`
- Test: `src/components/dashboard/dashboard.test.tsx` (extend)

**Interfaces:**
- Consumes: live `safeToSpendMath` (now with `items` + `incomeConfigured` + `horizonDate`).
- Produces: the expand panel lists the **real** unpaid bills (vendor · due · amount) summing to the subtracted total and reconciling to the penny; when `incomeConfigured = false`, shows a hint linking to the income-config page.

- [ ] **Step 1: Write failing test** — render with two breakdown items → both line items + total appear and sum to `unpaidTotal`; with `incomeConfigured:false`, the "set expected income" hint renders.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): drillable, traceable safe-to-spend"`

---

## Task 15: Upcoming/overdue live + one-click mark-paid (standalone)

**Files:**
- Modify: `src/components/dashboard/dashboard.tsx` (Mark-paid → action via a small client wrapper), `src/app/(app)/w/[workspaceId]/_actions.ts`
- Test: `src/app/(app)/w/[workspaceId]/_actions.test.ts`

**Interfaces:**
- Consumes: `bill-service.markUnpaid`/`markPaid`, the live bills (real `billId`).
- Produces: **Mark paid marks the bill paid *standalone* (no transaction, no silent account guess)** — `markBillPaidStandaloneAction(workspaceId, billId)` sets `status=paid` with `paidTransactionId=null`; account-linked payment stays in the explicit Manage form. `revalidatePath` refreshes the dashboard; viewers denied.

- [ ] **Step 1: Write failing test** — action flips a seeded unpaid bill to `paid` with `paidTransactionId` null; no transaction created; a viewer is denied.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — extend `markPaid` (or add `markPaidStandalone`) to support the no-transaction path; small client wrapper on the bill row.
- [ ] **Step 4: Run → PASS** + browser check.
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): one-click standalone mark-paid"`

---

## Task 16: Expected-income configuration UI

**Files:**
- Create: `src/components/income/income-source-form.tsx`, `src/app/(app)/w/[workspaceId]/income/page.tsx`
- Modify: `_actions.ts` (income-source server actions), workspace sub-nav (+ "Income")
- Test: `src/app/(app)/w/[workspaceId]/_actions.test.ts` (income actions)

**Interfaces:**
- Consumes: `income-source-service`.
- Produces: a page to add/edit/delete expected-income sources (name, amount, frequency, next date); server actions delegate to the service; the safe-to-spend hint links here.

- [ ] **Step 1: Write failing test** — `addIncomeSourceAction` validates + creates (admin only); list/delete actions work.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS** + browser check (add income → safe-to-spend horizon shifts to the income date).
- [ ] **Step 5: Commit** — `git commit -am "feat: expected-income configuration UI"`

---

## Task 17: Consolidated roll-up with transfer-netting

**Files:**
- Create: `src/services/dashboard/rollup.ts`
- Test: `src/services/dashboard/rollup.test.ts`

**Interfaces:**
- Consumes: `listAccessibleWorkspaces`, `metrics`, `bill-repo`, `WorkspaceTransfer` reads (via `rlsClientFor` — only transfers the caller can see net out), `money`/`add`/`sub`/`sum`.
- Produces: `rollup(userId, organizationId, period, today): Promise<{ rows: { workspaceId; name; balance; in; out; unpaid; net }[]; combined: { balance; in; out; unpaid; net } }>`. Per-workspace from `metrics`; **combined subtracts each visible transfer once from `in` and once from `out`** so owner draws aren't double-counted.

- [ ] **Step 1: Write failing test** — Personal + Business + owner-draw `500`. Per-row: Personal `in` includes 500, Business `out` includes 500. **Combined:** `in`/`out` exclude the 500; combined `net` = Σ per-workspace nets.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): consolidated roll-up with transfer-netting"`

---

## Task 18: Wire the `/all` roll-up page

**Files:**
- Modify: `src/app/(app)/all/page.tsx`
- Test: smoke render with seeded org

**Interfaces:**
- Consumes: `rollup`, `getCurrentUser`, the user's org.
- Produces: a live roll-up table (per-workspace rows + Combined total, with the netting footnote) styled to the mockup's roll-up section.

- [ ] **Step 1: Write failing smoke test** — page data path returns rows + combined for a seeded org.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — table per `docs/temp/budget-app-mockup-v1.html` roll-up; footnote on netting.
- [ ] **Step 4: Run → PASS** + browser check.
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): live All-Workspaces roll-up page"`

---

## Phase 2a Done — Definition of Done

- `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
- The dashboard shows **live** figures (mock numbers gone): balance, money in/out, **drillable safe-to-spend reconciling to the penny**, forecast with lowest point, category breakdown, paid-vs-unpaid, debts, goals.
- **Expected income is owner-configurable**; safe-to-spend and the forecast both derive income from the single shared projection helper; with no income set, both degrade gracefully (30-day horizon + a hint).
- **One-click standalone mark-paid** works from the dashboard (no silent account guess).
- Recurring bills materialize **idempotently and race-safely** (unique constraint + `skipDuplicates`), once per day, not on every render.
- The `/all` roll-up shows per-workspace + combined with **owner draws netted out**.
- The cross-workspace security test still passes; transfers net only for callers who can see both sides; the new `IncomeSource` table is RLS-forced.
- Phase 2 roadmap items marked `[x]` (Rule 7) before the final checkpoint.

## Mapping to spec/PRD requirements (coverage check)

- FR-17 safe-to-spend (drillable): Tasks 5, 14 · FR-18 forecast + low point: 6, 13 · FR-19 category + paid-vs-unpaid: 7, 8, 13 · FR-20 debts/goals: 9, 13
- FR-16 upcoming/overdue (live) + mark-paid: 15 · FR-14 recurring materialization: 11 · FR-6/26 roll-up + netting: 17, 18
- Expected-income config (resolves the spec's under-specified "next expected income"): Tasks 1, 3, 10, 16
- NFR-1 money/dates: every computation task · NFR-2/3 authz+RLS+bridge privacy: 1 (IncomeSource RLS), 17 (netting respects visibility), all reads via `rlsClientFor`
- **Deferred to Phase 2b (separate plan):** FR-4 tiling · FR-5 saved layouts. **Phase 2.x:** FR-21 budget-vs-actual, FR-22 due-date calendar, FR-23 auto-match, FR-24 ⌘K. **v2:** FR-34 reports.

## Notes / decisions

- **Expected income = explicit `IncomeSource`s (owner-configured).** Safe-to-spend's horizon and the forecast's income both come from the single `projectIncome` helper (Task 3) — they cannot diverge. No income configured → 30-day horizon + a visible hint, so the number is never silently fake.
- **Recurring materialization is race-safe** via the `(recurringScheduleId, dueDate)` unique constraint + `createMany({ skipDuplicates })`, and runs at most once per day per workspace (guard), not on every render.
- **Mark-paid from the dashboard is standalone** (no transaction) to avoid silently booking against the wrong account; account-linked payment remains the explicit Manage-form path.
- **Category colors** keyed on `categoryId` (stable across renders), not sort index.
- **Tiling + saved layouts** is split into **Phase 2b** (`feature-tiling-layouts.md`), written after 2a ships — it's the heaviest, least-core piece and shouldn't gate the live-data value.
- **Component shapes unchanged:** `getDashboardData` returns the Phase 1 `DashboardData` shape (+ a few additive fields), so the mockup-aligned components are reused as-is.
