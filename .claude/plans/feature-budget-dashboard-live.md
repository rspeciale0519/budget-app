# Phase 2 — Budget Dashboard (Live) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 1 shell into a live budgeting dashboard — compute safe-to-spend, cash-flow forecast, category breakdown, paid-vs-unpaid, debts/goals, and the consolidated roll-up with transfer-netting from real data; materialize recurring bills; wire every dashboard widget to the service layer; and add desktop tiling with saved layouts.

**Architecture:** A new **computation service layer** (`src/services/dashboard/`) derives every figure from the existing repositories using `decimal.js` money math, period date-ranges, and the RLS-scoped `rlsClientFor`. A single server-side aggregator (`getDashboardData`) feeds the existing presentational components — Phase 1's mock objects are replaced by real ones of the **same shape**, so the components don't change. Recurring materialization, roll-up netting, and tiling + saved layouts round out the phase.

**Tech Stack:** Next.js 16 (App Router) · TypeScript strict · Prisma 6 · decimal.js · Vitest · Tailwind 4 · `react-resizable-panels` (tiling) · pnpm.

## Global Constraints

Carried verbatim from the spec/PRD/CLAUDE.md — every task implicitly includes these.

- **No JavaScript float math on money.** All monetary arithmetic uses `decimal.js` (`@/lib/money`) or Postgres `numeric`. Rounding half-up to cents.
- **Balances are computed** (`openingBalance + Σ transactions`), never stored.
- **Dates are calendar dates** (`@/lib/calendar-date`); a timezone offset never shifts a day.
- **Transfers excluded** from income/expense/category/forecast math via `isTransfer`.
- **Service-layer authz on every read** (`assertWorkspaceAccess`/`assertOrgRole`) AND forced Postgres RLS via `rlsClientFor`. Reads are scoped; computation never bypasses RLS except via the existing `prismaAdmin` for legitimately cross-user work (none new here).
- **Income-bridge privacy:** roll-up nets transfers only for a caller who can see both sides (org owner/admin); per-workspace figures respect membership.
- **TypeScript strict; no `any`.** Source files ≤ 450 LOC. Business logic in services, never components. Tests co-located as `*.test.ts`.
- **Never hard-delete** — archive. **Recurring materialization is idempotent** (regeneration never duplicates).
- **Package manager: pnpm.** Single currency USD.

---

## File Structure

```
src/
├── services/
│   ├── dashboard/
│   │   ├── period.ts              # period (week/month/quarter/year) → {start,end} CalendarDate range
│   │   ├── metrics.ts             # totalBalance, moneyIn, moneyOut (transfers excluded)
│   │   ├── safe-to-spend.ts       # available − unpaid-before-next-income (+ drill-down breakdown)
│   │   ├── forecast.ts            # daily projected balance + lowest point
│   │   ├── category-breakdown.ts  # expenses by category (transfers excluded)
│   │   ├── paid-unpaid.ts         # paid vs unpaid for a period
│   │   ├── planning.ts            # debts + goals read
│   │   ├── rollup.ts              # per-workspace + combined, transfer-netted
│   │   └── index.ts               # getDashboardData aggregator → DashboardData
│   ├── recurring-service.ts       # materializeRecurring (rolling 90-day horizon, idempotent)
│   └── layout-service.ts          # saved tiling layouts (per-user CRUD)
├── repositories/
│   ├── planning-repo.ts           # debts/goals queries
│   ├── recurring-repo.ts          # schedule + bill materialization queries
│   └── layout-repo.ts             # Layout CRUD
├── components/
│   ├── dashboard/dashboard.tsx    # (modified) now fed live DashboardData; mark-paid wired
│   └── tiling/
│       ├── tiled-view.tsx         # resizable pane tree (client), desktop-only
│       └── layout-controls.tsx    # save/restore named layouts
├── lib/mock/dashboard.ts          # (kept for component tests; no longer used by the page)
└── app/(app)/
    ├── w/[workspaceId]/page.tsx   # (modified) calls getDashboardData; period from searchParams
    ├── w/[workspaceId]/_actions.ts# (modified) add markBillPaidAction wired to widget
    ├── all/page.tsx               # (modified) live roll-up
    └── tiles/page.tsx             # tiling entry (desktop)
```

---

## Task Sequencing Overview

- **Tasks 1–8:** Pure computation services (period, metrics, safe-to-spend, forecast, category, paid-vs-unpaid, planning) — each heavily unit-tested with deterministic fixtures.
- **Task 9:** Recurring-bill materialization (idempotent).
- **Task 10:** `getDashboardData` aggregator → real `DashboardData`.
- **Tasks 11–13:** Wire the dashboard page + safe-to-spend drill-down + upcoming/overdue mark-paid.
- **Task 14:** Consolidated roll-up with transfer-netting + wire `/all`.
- **Tasks 15–17:** Layout service + tiling UI + saved-layout controls.

Each task ends with an independently testable deliverable and a commit.

---

## Task 1: Period date-range helper

**Files:**
- Create: `src/services/dashboard/period.ts`
- Test: `src/services/dashboard/period.test.ts`

**Interfaces:**
- Consumes: `@/lib/calendar-date` (`CalendarDate`, `addDays`, `calendarDate`).
- Produces: `type Period = "week" | "month" | "quarter" | "year"`; `periodRange(period: Period, today: CalendarDate): { start: CalendarDate; end: CalendarDate }` (inclusive start, exclusive end = first day of next period).

- [ ] **Step 1: Write failing tests** — `periodRange("month", "2026-06-20")` → `{ start: "2026-06-01", end: "2026-07-01" }`; `"week"` (Mon-anchored) of `2026-06-20` (Sat) → `{ start: "2026-06-15", end: "2026-06-22" }`; `"quarter"` of `2026-06-20` → `{ start: "2026-04-01", end: "2026-07-01" }`; `"year"` → `{ start: "2026-01-01", end: "2027-01-01" }`.
- [ ] **Step 2: Run → FAIL** (`pnpm vitest run src/services/dashboard/period.test.ts`).
- [ ] **Step 3: Implement** with pure UTC calendar math (no local `Date`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): period date-range helper"`

---

## Task 2: Metrics service (balance, money in/out)

**Files:**
- Create: `src/services/dashboard/metrics.ts`
- Test: `src/services/dashboard/metrics.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `assertWorkspaceAccess`, `money`/`add`/`sum`/`format`, `Period`/`periodRange`, `toUtcDate`.
- Produces: `workspaceMetrics(userId, workspaceId, period, today): Promise<{ totalBalance: Money; moneyIn: Money; moneyOut: Money }>`. `totalBalance` = Σ(account.openingBalance) + Σ(all transactions). `moneyIn`/`moneyOut` = Σ positive/negative transaction amounts **in the period, excluding `isTransfer`**.

- [ ] **Step 1: Write failing test** — fixture (via `prismaAdmin`): workspace + account opening `1000.00`; period-month transactions `+500` (income), `-200` (expense), `-100` (transfer, `isTransfer=true`); one transaction outside the period `+999`. Assert `totalBalance = format($2,199.00)` (1000+500-200-100+999), `moneyIn = $500.00` (transfer + out-of-period excluded), `moneyOut = $200.00`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — Prisma `aggregate`/`groupBy` with `where: { workspaceId, isTransfer: false, date: { gte, lt } }`; balances ignore the period and the transfer filter (balance counts transfers). Use `money` for all sums.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): workspace metrics (balance, money in/out)"`

---

## Task 3: Safe-to-spend service (with drill-down)

**Files:**
- Create: `src/services/dashboard/safe-to-spend.ts`
- Test: `src/services/dashboard/safe-to-spend.test.ts`

**Interfaces:**
- Consumes: `metrics` (balance), `rlsClientFor`, `money`/`sub`/`sum`/`format`, `calendar-date` (`addDays`, `fromDbDate`, `isBefore`).
- Produces: `safeToSpend(userId, workspaceId, today): Promise<{ result: Money; availableBalance: Money; nextIncomeDate: CalendarDate; unpaidBeforeIncome: { vendor: string; amount: Money; dueDate: CalendarDate }[]; unpaidTotal: Money }>`. **Definition:** `result = availableBalance − Σ(unpaid bills with dueDate < nextIncomeDate)`. `nextIncomeDate` = earliest future `RecurringSchedule.nextRunDate` whose template category `kind = income`; if none, `addDays(today, 14)` (documented default). The breakdown list IS the drill-down the UI expands.

- [ ] **Step 1: Write failing test** — account balance `5000.00`; unpaid bills: Rent `-1500` due in 5 days, Card `-400` due in 20 days; a recurring **income** schedule with `nextRunDate = today+10`. Assert `nextIncomeDate = today+10`, `unpaidBeforeIncome` contains only Rent (due in 5, before +10), `result = $3,500.00` (5000 − 1500). Card (due +20, after income) is excluded.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — compute available balance (sum account balances), resolve `nextIncomeDate`, filter unpaid bills (`status in (unpaid,scheduled,overdue)`) by `dueDate < nextIncomeDate`, subtract.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): safe-to-spend with drill-down breakdown"`

---

## Task 4: Cash-flow forecast service

**Files:**
- Create: `src/services/dashboard/forecast.ts`
- Test: `src/services/dashboard/forecast.test.ts`

**Interfaces:**
- Consumes: `metrics` (current balance), `rlsClientFor`, `money`/`add`/`sub`/`compare`/`format`, `calendar-date` (`addDays`, `fromDbDate`).
- Produces: `cashflowForecast(userId, workspaceId, today, horizonDays = 30): Promise<{ points: { date: CalendarDate; balance: Money }[]; lowest: { date: CalendarDate; balance: Money } }>`. Starting from today's balance, walk each day to `today+horizon`: subtract bills due that day (unpaid), add expected income that day (recurring income schedules), record running balance. `lowest` = the minimum-balance point.

- [ ] **Step 1: Write failing test** — balance `2000.00`; an unpaid bill `-1500` due `today+3`; recurring income `+1000` on `today+5`. Assert the `today+3` point ≈ `$500.00`, the `today+5` point ≈ `$1,500.00`, and `lowest.date = today+3` with `lowest.balance = $500.00`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — build a per-day delta map from bills (by `dueDate`) and recurring income (materialized within horizon), accumulate from the start balance, track the min.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): cash-flow forecast with lowest point"`

---

## Task 5: Category breakdown service

**Files:**
- Create: `src/services/dashboard/category-breakdown.ts`
- Test: `src/services/dashboard/category-breakdown.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `category-repo`, `money`/`sum`/`format`, `periodRange`.
- Produces: `categoryBreakdown(userId, workspaceId, period, today): Promise<{ name: string; amount: Money; pct: number }[]>` — **expenses only** (`category.kind = expense`), `isTransfer = false`, within the period, sorted by amount desc; `pct` = each category's share of the total (integer, rounds to 100±1).

- [ ] **Step 1: Write failing test** — period transactions: Groceries `-300`, Groceries `-100`, Dining `-100`; one income `+500` (excluded), one transfer `-50` (excluded). Assert `[{ name: "Groceries", amount: $400.00, pct: 80 }, { name: "Dining", amount: $100.00, pct: 20 }]`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `groupBy categoryId` with the expense/transfer/period filters; join category names; compute pct via `money` ratios (round half-up).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): spending-by-category breakdown"`

---

## Task 6: Paid-vs-unpaid service

**Files:**
- Create: `src/services/dashboard/paid-unpaid.ts`
- Test: `src/services/dashboard/paid-unpaid.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `bill-repo`, `money`/`sum`/`format`, `periodRange`.
- Produces: `paidVsUnpaid(userId, workspaceId, period, today): Promise<{ paid: Money; unpaid: Money; paidPct: number }>` — sums bill amounts with `dueDate` in the period split by `status` (`paid` vs the open statuses); `paidPct` integer.

- [ ] **Step 1: Write failing test** — period bills: two paid (`100`, `200`), one unpaid (`300`). Assert `paid = $300.00`, `unpaid = $300.00`, `paidPct = 50`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): paid-vs-unpaid"`

---

## Task 7: Planning service (debts + goals)

**Files:**
- Create: `src/repositories/planning-repo.ts`, `src/services/dashboard/planning.ts`
- Test: `src/services/dashboard/planning.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `assertWorkspaceAccess`, `money`/`sum`/`format`.
- Produces: `listDebts(userId, workspaceId): Promise<{ name: string; balance: Money; apr: string; minimum: Money }[]>` (+ `debtsTotal`); `listGoals(userId, workspaceId): Promise<{ name: string; target: Money; saved: Money; pct: number }[]>` (pct = saved/target, capped 100).

- [ ] **Step 1: Write failing test** — a debt (`balance 2480`, apr `19.99`, min `75`) and a goal (`target 5000`, saved `1200`). Assert debt balance `$2,480.00`, apr renders `19.99%`, goal pct `24`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): debts + goals read services"`

---

## Task 8: Recurring-bill materialization

**Files:**
- Create: `src/repositories/recurring-repo.ts`, `src/services/recurring-service.ts`
- Test: `src/services/recurring-service.test.ts`

**Interfaces:**
- Consumes: `prismaAdmin` (system job, runs across a workspace's schedules), `calendar-date` (`addDays`, `fromDbDate`, `toUtcDate`, `isAfter`), `Frequency` stepping.
- Produces: `materializeRecurring(workspaceId, today, horizonDays = 90): Promise<{ created: number }>` — for each `RecurringSchedule`, generate `Bill` rows from `nextRunDate` forward to `today+horizon`, stepping by frequency/interval; **idempotent**: skip a date that already has a bill with that `recurringScheduleId` + `dueDate`; advance `nextRunDate` past the horizon.

- [ ] **Step 1: Write failing test** — a monthly schedule (`templateAmount 1500`, `nextRunDate = today`); call `materializeRecurring` → asserts ≥3 bills created within 90 days, each linked to the schedule, amounts `1500.00`; **call it again** → `created = 0` (idempotent), no duplicate bills.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — frequency stepping (`weekly` +7d×interval, `monthly` +interval months on `dayOfMonth`, `quarterly` +3 months, `annual` +1 year); existence check before insert; update `nextRunDate`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: idempotent recurring-bill materialization"`

---

## Task 9: Dashboard aggregator (`getDashboardData`)

**Files:**
- Create: `src/services/dashboard/index.ts`
- Test: `src/services/dashboard/index.test.ts`

**Interfaces:**
- Consumes: all of Tasks 2–8; `bill-service.upcomingAndOverdue`.
- Produces: `getDashboardData(userId, workspaceId, period, today): Promise<DashboardData>` where `DashboardData` is the **exact shape the Phase 1 components already consume** (`@/lib/mock/dashboard`'s `DashboardData`) — kpis (formatted strings), safeToSpendMath, forecast points, lowestPoint, categories (+ color assigned from a fixed palette by index), bills (mapped from upcoming/overdue with icon/status), paidVsUnpaid, goals, debts. Calls `materializeRecurring` first so the forecast/bills reflect recurrence.

- [ ] **Step 1: Write failing test** — a seeded workspace; assert `getDashboardData(...)` returns a `DashboardData` whose `kpis.totalBalance` and `kpis.safeToSpend` match the computed `format(...)` values, `forecast.length > 0`, and `categories` carry colors.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — orchestrate the services; map Money→formatted strings at this boundary (components take strings); assign category colors from `["#2563eb","#16a34a","#d97706","#7c3aed","#64748b"]` cycling.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): live getDashboardData aggregator"`

---

## Task 10: Wire the dashboard page to live data

**Files:**
- Modify: `src/app/(app)/w/[workspaceId]/page.tsx`
- Test: existing dashboard render test stays green; add `src/app/(app)/w/[workspaceId]/page.live.test.ts` (smoke via the aggregator)

**Interfaces:**
- Consumes: `getDashboardData`, `getCurrentUser`, `today()`, period from `searchParams`.
- Produces: the page passes **live** `DashboardData` to `<Dashboard>`; period selector links set `?period=`; falls back to `mockDashboard` only if the user lacks access (defensive).

- [ ] **Step 1: Write failing smoke test** — render the page's data path for a seeded member → `Dashboard` receives non-mock totals (assert the balance equals the computed value, not the mock `$48,210`).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `const data = await getDashboardData(user.id, workspaceId, period, today())`; make the period segment real `<Link href="?period=week|month|...">`.
- [ ] **Step 4: Run → PASS** + production-server browser check (mock numbers gone).
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): wire workspace dashboard to live data + period selector"`

---

## Task 11: Safe-to-spend drill-down (live math)

**Files:**
- Modify: `src/components/dashboard/dashboard.tsx`
- Test: `src/components/dashboard/dashboard.test.tsx` (extend)

**Interfaces:**
- Consumes: the live `safeToSpendMath` + the unpaid-bill breakdown now present in `DashboardData`.
- Produces: the click-to-expand panel renders the **real** itemized bills (vendor · due date · amount) summing to the subtracted total, reconciling to the penny.

- [ ] **Step 1: Write failing test** — render `<Dashboard>` with data whose breakdown has two bills; expand → both line items + the total appear and sum to `unpaidBeforeIncome`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — extend `DashboardData.safeToSpendMath` to include the line items; render them in the expand panel.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): drillable safe-to-spend with itemized bills"`

---

## Task 12: Upcoming/overdue live + one-click mark-paid

**Files:**
- Modify: `src/components/dashboard/dashboard.tsx` (Mark-paid button → action), `src/app/(app)/w/[workspaceId]/_actions.ts`
- Test: `src/app/(app)/w/[workspaceId]/_actions.test.ts` (mark-paid action authz/flow)

**Interfaces:**
- Consumes: `bill-service.markPaid`, the live bills (with real `billId`) in `DashboardData`.
- Produces: each bill row's **Mark paid** calls `markBillPaidAction(workspaceId, billId, payFromAccountId)`; on success `revalidatePath` refreshes the dashboard. Bills now carry their real `id` and an account to pay from (the workspace's default/first account).

- [ ] **Step 1: Write failing test** — action marks a seeded unpaid bill paid (status flips, `paidTransactionId` set); a viewer is denied.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — extend `BillItem` with `id`; make the dashboard bills client-interactive (a small client wrapper) calling the action.
- [ ] **Step 4: Run → PASS** + browser check (mark a bill paid, dashboard updates).
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): one-click mark-paid on upcoming/overdue"`

---

## Task 13: Consolidated roll-up with transfer-netting

**Files:**
- Create: `src/services/dashboard/rollup.ts`
- Test: `src/services/dashboard/rollup.test.ts`

**Interfaces:**
- Consumes: `listAccessibleWorkspaces`, `metrics`, `bill-repo`, `WorkspaceTransfer` reads (via `rlsClientFor` — only transfers visible to the caller net out), `money`/`add`/`sub`/`sum`.
- Produces: `rollup(userId, organizationId, period, today): Promise<{ rows: { workspaceId; name; balance; in; out; unpaid; net }[]; combined: { balance; in; out; unpaid; net } }>`. Per-workspace figures from `metrics`. **Combined nets out inter-workspace transfers:** subtract each visible `WorkspaceTransfer.amount` once from combined `in` (the Personal-side income) and once from combined `out` (the business-side outflow), so an owner draw isn't double-counted.

- [ ] **Step 1: Write failing test** — Personal + Business, an owner-draw transfer `500` (business out, personal in). Per-row: Personal `in` includes the 500, Business `out` includes the 500. **Combined:** `in` and `out` each exclude the 500 (netted). Assert combined `net` = sum of per-workspace nets (transfer is internal, nets to zero).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — sum per-workspace metrics; query transfers in-period the caller can see; subtract from combined in/out.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): consolidated roll-up with transfer-netting"`

---

## Task 14: Wire the `/all` roll-up page

**Files:**
- Modify: `src/app/(app)/all/page.tsx`
- Test: smoke render with seeded org

**Interfaces:**
- Consumes: `rollup`, `getCurrentUser`, the user's org (first `OrgMembership`).
- Produces: a live roll-up table (per-workspace rows + a Combined total row, with the netting footnote) matching the mockup's roll-up table.

- [ ] **Step 1: Write failing smoke test** — page data path returns rows + combined for a seeded org.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — table styled to the mockup (`docs/temp/budget-app-mockup-v1.html` roll-up section); footnote noting owner draws are netted.
- [ ] **Step 4: Run → PASS** + browser check.
- [ ] **Step 5: Commit** — `git commit -am "feat(dashboard): live All-Workspaces roll-up page"`

---

## Task 15: Layout service (saved tiling layouts)

**Files:**
- Create: `src/repositories/layout-repo.ts`, `src/services/layout-service.ts`
- Test: `src/services/layout-service.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor` (Layout RLS is per-user), `assertOrgRole` (member), Zod for `config`.
- Produces: `saveLayout(userId, organizationId, name, config)`, `listLayouts(userId, organizationId)`, `getLayout`, `deleteLayout` — `config` is a validated JSON pane-tree (`{ direction: "row"|"col"; panes: (PaneLeaf | PaneNode)[] }`, leaf = `{ workspaceId: string }`).

- [ ] **Step 1: Write failing test** — save a layout, list it back (per-user isolation: another user can't see it via `rlsClientFor`), delete it.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — Zod-validate the pane tree; RLS Layout policy already restricts to `userId = app.current_user_id()`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: saved tiling layout service (per-user)"`

---

## Task 16: Tiling UI (resizable panes)

**Files:**
- Create: `src/components/tiling/tiled-view.tsx`, `src/app/(app)/tiles/page.tsx`
- Test: `src/components/tiling/tiled-view.test.tsx` (renders panes from a config)

**Interfaces:**
- Consumes: `react-resizable-panels`, `getDashboardData` (per pane), the layout config shape from Task 15.
- Produces: a desktop-only tiled view rendering one independent, live dashboard summary per pane from a pane-tree config; **each pane owns its `{ workspaceId }`** (no global current workspace); resizable; degrades to a stacked single-column on small screens.

- [ ] **Step 1: Install** — `pnpm add react-resizable-panels`.
- [ ] **Step 2: Write failing test** — render `<TiledView config={twoPaneConfig} panesData={...} />` → two pane headers with the two workspace names.
- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Implement** — recursive pane renderer (row/col groups + resize handles); each leaf shows a compact KPI summary (balance · safe-to-spend) + top bills, mirroring the mockup's tiled panes. Responsive: below `lg`, stack.
- [ ] **Step 5: Run → PASS** + browser check at desktop width.
- [ ] **Step 6: Commit** — `git commit -am "feat: desktop tiling with independent live panes"`

---

## Task 17: Saved-layout controls (save/restore)

**Files:**
- Create: `src/components/tiling/layout-controls.tsx`, server actions for layout save/list/delete
- Modify: `src/components/workspace/tab-bar.tsx` (enable the "Tile view" + "Layouts" pills → link to `/tiles`)
- Test: `src/components/tiling/layout-controls.test.tsx`

**Interfaces:**
- Consumes: `layout-service` via server actions, `tiled-view`.
- Produces: a control to **save** the current pane arrangement as a named layout and **restore** a saved one in one click; the app-bar "Tile view"/"Layouts" pills become live (no longer Phase-2 stubs).

- [ ] **Step 1: Write failing test** — the controls list saved layouts and invoke save/restore actions.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — actions wrap `layout-service`; restore loads `config` into `TiledView`; enable the app-bar pills.
- [ ] **Step 4: Run → PASS** + browser check (save "Morning review", restore it).
- [ ] **Step 5: Commit** — `git commit -am "feat: save and restore named tiling layouts"`

---

## Phase 2 Done — Definition of Done

- `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
- The dashboard shows **live** figures (mock numbers gone): balance, money in/out, **drillable safe-to-spend reconciling to the penny**, cash-flow forecast with lowest point, category breakdown, paid-vs-unpaid, debts, goals.
- **One-click mark-paid** works from the dashboard.
- Recurring bills **materialize idempotently** (re-run creates nothing new).
- The `/all` roll-up shows per-workspace + combined with **owner draws netted out**.
- Desktop **tiling** renders independent live panes; **named layouts** save and restore.
- The cross-workspace security test still passes; transfers net only for callers who can see both sides.
- Phase 2 roadmap items marked `[x]` (Rule 7) before the final checkpoint.

## Mapping to spec/PRD requirements (coverage check)

- FR-17 safe-to-spend (drillable): Tasks 3, 11 · FR-18 forecast + low point: 4, 10 · FR-19 category + paid-vs-unpaid: 5, 6, 10 · FR-20 debts/goals: 7, 10
- FR-16 upcoming/overdue (live) + mark-paid: 12 · FR-14 recurring materialization: 8 · FR-6/26 roll-up + netting: 13, 14
- FR-4 tiling · FR-5 saved layouts: 15, 16, 17
- NFR-1 money/dates: every computation task · NFR-2/3 authz+RLS+bridge privacy: 13 (netting respects visibility), all reads via `rlsClientFor`
- **Deferred to Phase 2.x (correctly):** FR-21 budget-vs-actual, FR-22 due-date calendar, FR-23 bill↔tx auto-match, FR-24 command palette (⌘K). **v2:** FR-34 reports.

## Notes / risks surfaced during planning

- **"Next expected income"** is underspecified in the spec; this plan defines it as the earliest future income-category `RecurringSchedule.nextRunDate`, defaulting to `today+14` when none exists. Surface this default in the safe-to-spend drill-down so the number is traceable. Revisit if the owner wants a configurable payday.
- **Forecast horizon** default 30 days (matches the mockup "next 30 days"); the period selector controls breakdowns, not the forecast horizon.
- **Tiling library:** `react-resizable-panels` is small, RSC-compatible, and widely used; panes render server-fetched data passed as props (the pane tree is client, the data is server).
- **Performance:** computation services use indexed `(workspaceId, date)` / `(workspaceId, dueDate)` queries already added in Phase 1; aggregate in SQL where possible, finish in `decimal.js`.
- **Component shapes unchanged:** because `getDashboardData` returns the exact Phase 1 `DashboardData` shape, the mockup-aligned components built in the dashboard redesign are reused as-is — only the data source changes.
