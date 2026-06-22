# Phase 2.x — Convenience Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four Phase 2.x convenience features — bill↔transaction **auto-match** suggestions, a **due-date calendar**, **budget vs. actual** per category, and a global **⌘K command palette** — reusing the existing live services, with no schema migration.

**Architecture:** Each feature is an independent subsystem layered the same way the rest of the app is: a **service** (authz + forced RLS via `rlsClientFor`) computes the data, a **pure helper** holds any non-trivial logic so it is unit-testable without a DB (matching score, month grid, command filtering), and a **thin component** renders it (render-tested via `renderToString`; interactions are driven by pure handlers). Auto-match and budget-vs-actual reuse Phase 2a computation (`upcomingAndOverdue`, `markPaid`, `categoryBreakdown`'s per-category spend). The `Budget` model already exists **with forced RLS** — budget-vs-actual is migration-free. Calendar and command palette add no tables. New per-workspace pages (`/calendar`, `/budget`) hang off a shared sub-nav; the palette mounts once in the app shell.

> **Builds on:** Phase 1 (schema, RLS, `Budget` table, auth) and Phase 2 (live dashboard services). Reuses `bill-service` (`upcomingAndOverdue`, `markPaid`), `transaction-service` (`listTransactions`), `category-service` (`listCategories`), `dashboard/category-breakdown`, `dashboard/period` (`periodRange`/`parsePeriod`), `calendar-date` helpers, and the existing workspace quick-add server actions.

**Tech Stack:** Next.js 16 (App Router) · TypeScript strict · Prisma 6 · Zod · Vitest · Tailwind 4 · pnpm.

## Global Constraints

Carried verbatim from the spec/PRD/CLAUDE.md — every task implicitly includes these.

- **TypeScript strict; no `any`.** Source files ≤ 450 LOC. Business logic in services, never components. Tests co-located as `*.test.ts(x)`.
- **Service-layer authz on every read/write** (`assertWorkspaceAccess` — `"viewer"` for reads, `"editor"` for writes) **AND** forced Postgres RLS via `rlsClientFor`. Never use `prismaAdmin` for user-facing reads/writes (test fixtures only).
- **No JavaScript float math on money** — all monetary values use `@/lib/money` (`money`, `add`, `sub`, `sum`, `compare`, `format`, `Money`). **Calendar dates** via `@/lib/calendar-date` (no `Date` arithmetic for due dates).
- **No migration.** The `Budget` table exists (`workspaceId, categoryId, period, amount`, unique `(workspaceId, categoryId, period)`) with forced RLS (`budget_rls`). Saves are find-then-update/create (no new constraint). No other schema change in this phase.
- **Validate at the persistence boundary with Zod.** **Package manager: pnpm.**
- **Responsive:** new pages must be usable on mobile (stack, no horizontal scroll). The command palette is a desktop-first enhancement but must not break mobile (it simply never opens without a keyboard; expose no broken UI).
- **Reuse, don't rebuild:** figures must match the dashboard exactly — derive actual spend and bill buckets from the existing Phase 2a services/queries, not new ad-hoc math.

---

## File Structure

```
src/
├── lib/
│   ├── match-score.ts                     # PURE: scoreMatch(bill, txn) -> number | null
│   ├── month-grid.ts                      # PURE: monthGrid(year, month) -> CalendarDate[][] (6x7, Sun-start)
│   └── command-palette/commands.ts        # PURE: buildCommands(ctx), filterCommands(cmds, q)
├── repositories/budget-repo.ts            # Budget CRUD (Prisma)
├── services/
│   ├── match-service.ts                   # matchSuggestions(); confirm reuses bill-service.markPaid
│   ├── budget-service.ts                  # setBudget / listBudgets / deleteBudget (per-workspace)
│   └── dashboard/
│       ├── bill-calendar.ts               # billCalendar(): bills bucketed onto a month grid
│       └── budget-vs-actual.ts            # budgetVsActual(): budget vs per-category spend (month)
├── components/
│   ├── match/match-suggestions.tsx        # confirm/dismiss banner (client)
│   ├── calendar/bill-calendar-view.tsx    # month grid (presentational)
│   ├── budget/budget-view.tsx             # bars + set-budget form (client)
│   ├── workspace/workspace-sub-nav.tsx    # shared Dashboard/Manage/Calendar/Budget/Income/Import/Audit nav
│   └── command/command-palette.tsx        # global ⌘K launcher (client)
└── app/(app)/
    ├── w/[workspaceId]/
    │   ├── calendar/page.tsx              # /calendar route
    │   ├── budget/page.tsx                # /budget route
    │   ├── budget/_actions.ts             # setBudgetAction / deleteBudgetAction
    │   └── _actions.ts                    # (modified) + confirmMatchAction / dismissMatchAction
    └── layout.tsx                         # (modified) mount <CommandPalette workspaces=… />
src/services/dashboard/index.ts            # (modified) add matchSuggestions to DashboardData
src/components/dashboard/dashboard.tsx     # (modified) render <MatchSuggestions/>; swap in WorkspaceSubNav
src/app/(app)/w/[workspaceId]/page.tsx     # (modified) use WorkspaceSubNav
src/app/(app)/w/[workspaceId]/manage/page.tsx # (modified) use WorkspaceSubNav
```

---

## Task Sequencing Overview

**Feature A — Auto-match (Tasks 1–4):** pure scorer → match service → confirm/dismiss actions → dashboard banner.
**Feature B — Due-date calendar (Tasks 5–7):** pure month grid → calendar service → `/calendar` page + view.
**Feature C — Budget vs. actual (Tasks 8–11):** budget repo+service → budget-vs-actual service → `/budget` page + set-budget UI.
**Feature D — Command palette (Tasks 12–14):** pure command model → global `CommandPalette` client → mount in shell.
**Task 15 — Shared sub-nav + wiring:** extract `WorkspaceSubNav`, add Calendar/Budget links, swap into pages.

Each task ends with an independently testable deliverable and a commit. The first three features are each shippable on their own; the palette and sub-nav tie them together.

---

## Task 1: Pure match scorer

**Files:**
- Create: `src/lib/match-score.ts`, `src/lib/match-score.test.ts`

**Interfaces:**
- Produces: `interface ScoreInput { billVendor: string; billAmount: Money; billDue: CalendarDate; txnDescription: string; txnMerchant: string | null; txnAmount: Money; txnDate: CalendarDate }`; `scoreMatch(input: ScoreInput): number | null` — returns a confidence in `[0,1]`, or `null` when the candidate is disqualified (amount off by more than the tolerance, or date outside ±5 days). Higher = better. Pure; no I/O.
- Scoring: outflow magnitude must match within `max($1.00, 2% of bill)`; date within ±5 calendar days of due date; final score = `0.6 * amountCloseness + 0.2 * dateCloseness + 0.2 * vendorTokenOverlap`. `vendorTokenOverlap` = Jaccard over lowercased alphanumeric tokens of `billVendor` vs `txnMerchant ?? txnDescription`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { scoreMatch } from "@/lib/match-score";
import { money } from "@/lib/money";
import { calendarDate } from "@/lib/calendar-date";

const base = {
  billVendor: "USPS Postage Account",
  billAmount: money("2150.00"),
  billDue: calendarDate("2026-07-03"),
};

it("scores an exact amount + same-day + vendor-overlap candidate highly", () => {
  const s = scoreMatch({
    ...base,
    txnDescription: "USPS POSTAGE",
    txnMerchant: "USPS",
    txnAmount: money("-2150.00"),
    txnDate: calendarDate("2026-07-03"),
  });
  expect(s).not.toBeNull();
  expect(s!).toBeGreaterThan(0.8);
});

it("disqualifies an amount outside tolerance", () => {
  expect(
    scoreMatch({ ...base, txnDescription: "USPS", txnMerchant: null, txnAmount: money("-2500.00"), txnDate: calendarDate("2026-07-03") }),
  ).toBeNull();
});

it("disqualifies a date outside the ±5 day window", () => {
  expect(
    scoreMatch({ ...base, txnDescription: "USPS POSTAGE", txnMerchant: "USPS", txnAmount: money("-2150.00"), txnDate: calendarDate("2026-07-12") }),
  ).toBeNull();
});

it("ranks a closer amount above a vendor-only overlap", () => {
  const close = scoreMatch({ ...base, txnDescription: "payment", txnMerchant: null, txnAmount: money("-2150.00"), txnDate: calendarDate("2026-07-04") })!;
  const vendorOnly = scoreMatch({ ...base, txnDescription: "USPS Postage", txnMerchant: "USPS", txnAmount: money("-2120.00"), txnDate: calendarDate("2026-07-04") })!;
  expect(close).toBeGreaterThan(vendorOnly);
});
```

- [ ] **Step 2: Run → FAIL** (`pnpm vitest run src/lib/match-score.test.ts`).
- [ ] **Step 3: Implement** — compare `txnAmount` magnitude (`money(input.txnAmount).abs()` via `sub(money(0), …)` when negative; use `compare`/`sub` from `@/lib/money`, never `Number`) to `billAmount`; tolerance `max(1.00, billAmount * 0.02)`; date delta via `compare`/`addDays` (count days by stepping, or compare against `addDays(billDue, ±5)`); tokens via `String.toLowerCase().match(/[a-z0-9]+/g)`. Return `null` on disqualify.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(match): pure bill/transaction match scorer"`

---

## Task 2: Match service

**Files:**
- Create: `src/services/match-service.ts`, `src/services/match-service.test.ts`

**Interfaces:**
- Consumes: `assertWorkspaceAccess`, `rlsClientFor`, `scoreMatch` (Task 1), `fromDbDate`/`addDays` (`@/lib/calendar-date`), `money`/`format` (`@/lib/money`).
- Produces: `interface MatchSuggestion { billId; vendor: string; dueDate: string; amount: string; transactionId: string; txnDescription: string; txnDate: string; txnAmount: string; score: number }`; `matchSuggestions(userId, workspaceId, today: CalendarDate): Promise<MatchSuggestion[]>` — for each **open** bill (`status in unpaid/scheduled/overdue`) whose `dueDate ∈ [today−30, today+30]`, scan **unreconciled outflow** transactions (`isTransfer=false`, `billId=null`, `amount < 0`) within ±5 days of the due date, score each via `scoreMatch`, keep the best with `score ≥ 0.55`, and emit **one suggestion per bill** and **per transaction** (a transaction already chosen for an earlier bill is not offered again). Confirmation is **not** here — callers reuse `bill-service.markPaid(userId, billId, { transactionId })`.

- [ ] **Step 1: Write failing test** (integration; fixtures via `prismaAdmin`, asserts through the service):

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { matchSuggestions } from "@/services/match-service";
import { ForbiddenError } from "@/services/authz";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string, workspaceId: string, accountId: string;
const today = calendarDate("2026-07-01");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Match Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Acme", type: "business", color: "#10b981" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acct = await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "B", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  accountId = acct.id;
  await prismaAdmin.bill.create({ data: { workspaceId, vendor: "USPS Postage Account", amount: "2150.00", dueDate: toUtcDate(calendarDate("2026-07-03")), status: "unpaid", type: "bill" } });
  // matching outflow (unreconciled) + a noise inflow + an unrelated outflow
  await prismaAdmin.transaction.createMany({ data: [
    { workspaceId, accountId, date: toUtcDate(calendarDate("2026-07-03")), amount: "-2150.00", description: "USPS POSTAGE", merchant: "USPS", source: "manual", dedupeHash: "m1" },
    { workspaceId, accountId, date: toUtcDate(calendarDate("2026-07-02")), amount: "500.00", description: "Deposit", source: "manual", dedupeHash: "m2" },
    { workspaceId, accountId, date: toUtcDate(calendarDate("2026-07-02")), amount: "-90.00", description: "Coffee", source: "manual", dedupeHash: "m3" },
  ] });
});

afterAll(async () => { await prismaAdmin.organization.delete({ where: { id: orgId } }); await prismaAdmin.$disconnect(); });

it("suggests the matching outflow for the bill", async () => {
  const s = await matchSuggestions(admin, workspaceId, today);
  expect(s).toHaveLength(1);
  expect(s[0]).toMatchObject({ vendor: "USPS Postage Account", txnDescription: "USPS POSTAGE", amount: "$2,150.00" });
});

it("denies a non-member", async () => {
  await expect(matchSuggestions(stranger, workspaceId, today)).rejects.toBeInstanceOf(ForbiddenError);
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `assertWorkspaceAccess(userId, workspaceId, "viewer")`; in one `rlsClientFor(userId).run`, load open bills in the due window and candidate outflows in `[today−35, today+35]` with `billId=null, isTransfer=false`; for each bill pick the best unused transaction via `scoreMatch`; format money with `format(money(...))` and dates with `fromDbDate`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(match): per-bill transaction match suggestions service"`

---

## Task 3: Confirm / dismiss server actions

**Files:**
- Modify: `src/app/(app)/w/[workspaceId]/_actions.ts`
- Test: covered by the existing action-smoke pattern; assert via `markPaid` reuse (no new integration test required beyond Task 2 + bill-service's existing tests).

**Interfaces:**
- Consumes: `bill-service.markPaid`, `getCurrentUser`.
- Produces: `confirmMatchAction(workspaceId: string, billId: string, transactionId: string): Promise<ActionResult>` → `markPaid(userId, billId, { transactionId })` then `revalidatePath(\`/w/${workspaceId}\`)`. `workspaceId` is passed by the client (the banner already has it), avoiding an extra lookup. `dismissMatchAction` is a **no-op server action returning `{ ok: true }`** (dismissals are client-only for v1 — see Notes); included so the banner has a stable contract.

- [ ] **Step 1: Implement** — add both actions next to the existing `markBillPaidAction`, following the `requireUserId()` + try/catch `ActionResult` pattern already in the file.

```ts
export async function confirmMatchAction(
  workspaceId: string,
  billId: string,
  transactionId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await markPaid(userId, billId, { transactionId });
    revalidatePath(`/w/${workspaceId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Match failed" };
  }
}

export async function dismissMatchAction(): Promise<ActionResult> {
  return { ok: true };
}
```
- [ ] **Step 2: Verify** — `pnpm type-check`, `pnpm lint` green.
- [ ] **Step 3: Commit** — `git commit -am "feat(match): confirm/dismiss match server actions"`

---

## Task 4: Match-suggestions banner + dashboard wiring

**Files:**
- Create: `src/components/match/match-suggestions.tsx`, `src/components/match/match-suggestions.test.tsx`
- Modify: `src/services/dashboard/index.ts` (add `matchSuggestions` to `DashboardData`), `src/components/dashboard/dashboard.tsx` (render the banner above Upcoming & overdue).

**Interfaces:**
- Consumes: `confirmMatchAction`/`dismissMatchAction` (Task 3), `MatchSuggestion` (Task 2), `useRouter`.
- Produces: `MatchSuggestions({ workspaceId, suggestions }: { workspaceId: string; suggestions: MatchSuggestion[] })` — one row per suggestion: “An imported transaction **“{txnDescription} {txnAmount}”** on {txnDate} looks like your bill **“{vendor}.”** Mark it paid?” with **Yes, match** (`confirmMatchAction(workspaceId, billId, transactionId)` → `router.refresh()`) and **No** (local hide). Renders nothing when `suggestions` is empty.
- `getDashboardData` gains `matchSuggestions: MatchSuggestion[]` (computed via `matchSuggestions(userId, workspaceId, today)`), so the server page passes them down with the rest of the dashboard.

- [ ] **Step 1: Write failing test** — `renderToString(<MatchSuggestions workspaceId="w" suggestions={[one]} />)` contains the txn description, the bill vendor, and “Mark it paid?”; an empty array renders empty string. Mock `next/navigation` (`useRouter` → `{ refresh(){}, push(){} }`) per the Phase 2a pattern.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — presentational rows + `useTransition` confirm; add `matchSuggestions` to the `DashboardData` type + `getDashboardData` aggregator; render `<MatchSuggestions … />` in `dashboard.tsx` directly above the Upcoming & overdue card. Keep `dashboard.tsx` ≤ 450 LOC (extract the banner — already its own file).
- [ ] **Step 4: Run → PASS** (component test) + `pnpm vitest run src/services/dashboard` stays green.
- [ ] **Step 5: Commit** — `git commit -am "feat(match): dashboard auto-match suggestions banner"`

---

## Task 5: Pure month grid

**Files:**
- Create: `src/lib/month-grid.ts`, `src/lib/month-grid.test.ts`

**Interfaces:**
- Produces: `monthGrid(year: number, month1to12: number): CalendarDate[][]` — a 6×7 grid of `CalendarDate`s, **Sunday-start**, covering the weeks that contain the month (leading/trailing days from adjacent months included). Pure; built from `calendarDate`/`addDays` only (no `Date` timezone math beyond constructing the first-of-month string).

- [ ] **Step 1: Write failing tests** — `monthGrid(2026, 6)` (June 2026; June 1 is a Monday): first cell is `2026-05-31` (Sunday), the grid is 6 rows × 7 cols, contains `2026-06-30`, and every row has 7 entries; consecutive cells differ by exactly one day.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — compute first-of-month `calendarDate(\`${year}-${pad(month)}-01\`)`; find its weekday via a fixed reference (use `toUtcDate(d).getUTCDay()` — safe because the value is a pure UTC date with no tz drift); step back to the prior Sunday with `addDays`; emit 42 days via `addDays`, sliced into 6 rows of 7.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(calendar): pure Sunday-start month grid"`

---

## Task 6: Bill-calendar service

**Files:**
- Create: `src/services/dashboard/bill-calendar.ts`, `src/services/dashboard/bill-calendar.test.ts`

**Interfaces:**
- Consumes: `assertWorkspaceAccess`, `rlsClientFor`, `monthGrid` (Task 5), `fromDbDate`/`toUtcDate`/`addDays`/`compare`, `format`/`money`.
- Produces: `type DayStatus = "overdue" | "soon" | "scheduled" | "paid"`; `interface CalendarEvent { billId; vendor; amount: string; status: DayStatus }`; `interface CalendarDay { date: string; inMonth: boolean; isToday: boolean; events: CalendarEvent[] }`; `interface CalendarMonth { year; month; weeks: CalendarDay[][] }`; `billCalendar(userId, workspaceId, year, month, today): Promise<CalendarMonth>` — load bills whose `dueDate` falls within the grid’s first…last day; bucket onto days; status: `paid` if `status==="paid"`, else `overdue` if `due < today`, else `soon` if `due ≤ today+7`, else `scheduled`.

- [ ] **Step 1: Write failing test** — seeded workspace with three bills (one overdue, one within 7 days, one later this month); `billCalendar(admin, ws, 2026, 7, calendarDate("2026-07-01"))` returns `weeks` 6×7, the overdue bill flagged `overdue` on its day, the near one `soon`, the later one `scheduled`; `isToday` true on `2026-07-01`; a non-member is denied.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `monthGrid(year, month)`; query bills `dueDate ∈ [toUtcDate(first), toUtcDate(addDays(last,1)))`; index by `fromDbDate(dueDate)`; map each grid day to `{ date, inMonth: monthOf(day)===month, isToday: compare(day,today)===0, events }`; format amounts via `format(money(b.amount.toFixed(2)))`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(calendar): bills bucketed onto a month grid (RLS-scoped)"`

---

## Task 7: /calendar page + view

**Files:**
- Create: `src/components/calendar/bill-calendar-view.tsx`, `src/components/calendar/bill-calendar-view.test.tsx`, `src/app/(app)/w/[workspaceId]/calendar/page.tsx`

**Interfaces:**
- Consumes: `billCalendar` (Task 6), `getCurrentUser`, `today`, `parsePeriod`-style `?ym=YYYY-MM` parsing (default current month).
- Produces: `BillCalendarView({ month }: { month: CalendarMonth })` — header `Su…Sa`; 6×7 cells showing day number (muted when `!inMonth`, ring when `isToday`) and event chips colored by status (`overdue`→red, `soon`→amber, `scheduled`→indigo, `paid`→green). Responsive: the grid scales down; below `sm` it remains a 7-col grid with smaller chips (no horizontal scroll). The page resolves user + workspace, parses `?ym`, calls `billCalendar`, and renders the view with prev/next month links (`?ym=…`).

- [ ] **Step 1: Write failing test** — `renderToString(<BillCalendarView month={fixture} />)` contains a known vendor chip and the weekday headers `Su`/`Sa`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — presentational grid + the server page (`export const dynamic = "force-dynamic"`; auth + `assertWorkspaceAccess` happen inside `billCalendar`). Prev/next compute the adjacent `YYYY-MM` purely (wrap year on Jan/Dec).
- [ ] **Step 4: Run → PASS** + browser check (`/w/<ws>/calendar` shows the month with colored bill chips).
- [ ] **Step 5: Commit** — `git commit -am "feat(calendar): /calendar route + month view"`

---

## Task 8: Budget repository + service

**Files:**
- Create: `src/repositories/budget-repo.ts`, `src/services/budget-service.ts`, `src/services/budget-service.test.ts`

**Interfaces:**
- Consumes: `assertWorkspaceAccess` (`"viewer"` read / `"editor"` write), `rlsClientFor`, `money`/`Money`, `Prisma`.
- Produces (`budget-repo.ts`): `findByCategory(db, workspaceId, categoryId, period)`, `upsertAmount(db, {workspaceId, categoryId, period, amount})` (find-then-update/create — **no reliance on the DB unique constraint for upsert semantics**, mirroring `layout-repo`), `listByWorkspace(db, workspaceId)`, `deleteById(db, id)`.
- Produces (`budget-service.ts`): `interface SavedBudget { id; categoryId; period: string; amount: Money }`; `setBudget(userId, workspaceId, categoryId, amount: string, period?: string): Promise<SavedBudget>` (default `period="monthly"`; validates `amount` ≥ 0 via `money`); `listBudgets(userId, workspaceId): Promise<SavedBudget[]>`; `deleteBudget(userId, workspaceId, budgetId): Promise<void>`.

- [ ] **Step 1: Write failing test** — `setBudget(admin, ws, catId, "6500.00")` then `listBudgets` returns it with `amount` as `Money` equal to `money("6500.00")`; setting the **same category again** updates in place (one row); a **second user sees none** via `rlsClientFor(other)`; `deleteBudget` removes it; a non-editor (`viewer`) is denied on `setBudget`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — repo find-then-update/create in one `rlsClientFor(userId).run` tx; service asserts access, parses amount with `money`, maps rows to `SavedBudget` (`money(row.amount.toFixed(2))`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(budget): per-category budget service (migration-free upsert)"`

---

## Task 9: Budget-vs-actual service

**Files:**
- Create: `src/services/dashboard/budget-vs-actual.ts`, `src/services/dashboard/budget-vs-actual.test.ts`

**Interfaces:**
- Consumes: `assertWorkspaceAccess`, `rlsClientFor`, `budget-service.listBudgets`, `category-service.listCategories` (names), `periodRange` (`@/services/dashboard/period`), `toUtcDate`, `money`/`sub`/`sum`/`format`/`compare`.
- Produces: `interface BudgetRow { categoryId; name: string; budget: string; actual: string; pct: number; status: "under" | "near" | "over" }`; `budgetVsActual(userId, workspaceId, today): Promise<BudgetRow[]>` — **month period only** (the `Budget` table stores monthly amounts); actual = expense magnitude per category for the current month (same `groupBy` shape as `categoryBreakdown`: `isTransfer=false`, `category.kind="expense"`, `date ∈ month`). One row per **budgeted** category, sorted by `pct` desc; `pct = min(actual/budget, 1.5)*100` (rounded); `status` = `over` if `actual > budget`, `near` if `pct ≥ 85`, else `under`.

- [ ] **Step 1: Write failing test** — seed two expense categories with budgets ($6,500 and $4,000) and transactions summing to $6,100 and $5,000; `budgetVsActual` returns the SaaS row `over` with `actual:"$5,000.00"` and the postage row `under`/`near` with `actual:"$6,100.00"`; categories with no budget are omitted; a non-member is denied.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `listBudgets` for the month period; `groupBy` actual per category over `periodRange("month", today)`; join on `categoryId`; compute pct/status; format with `format(money(...))`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(budget): budget-vs-actual computation (month, reuses spend query)"`

---

## Task 10: Budget page actions

**Files:**
- Create: `src/app/(app)/w/[workspaceId]/budget/_actions.ts`

**Interfaces:**
- Consumes: `budget-service.setBudget`/`deleteBudget`, `getCurrentUser`.
- Produces: `setBudgetAction(workspaceId, categoryId, amount: string): Promise<ActionResult>`; `deleteBudgetAction(workspaceId, budgetId): Promise<ActionResult>` — both `requireUserId()`, delegate, `revalidatePath(\`/w/${workspaceId}/budget\`)`, return `ActionResult`.

- [ ] **Step 1: Implement** — mirror the `settings/_actions.ts` shape (`ActionResult`, `requireUserId`, try/catch).
- [ ] **Step 2: Verify** — `pnpm type-check`, `pnpm lint` green.
- [ ] **Step 3: Commit** — `git commit -am "feat(budget): set/delete budget server actions"`

---

## Task 11: /budget page + view (bars + set-budget form)

**Files:**
- Create: `src/components/budget/budget-view.tsx`, `src/components/budget/budget-view.test.tsx`, `src/app/(app)/w/[workspaceId]/budget/page.tsx`

**Interfaces:**
- Consumes: `budgetVsActual` (Task 9), `listCategories` (expense categories for the form), `listBudgets`, the Task 10 actions, `useRouter`.
- Produces: `BudgetView({ workspaceId, rows, categories }: { workspaceId: string; rows: BudgetRow[]; categories: { id: string; name: string }[] })` — a **set-budget form** (category `<select>` + amount input → `setBudgetAction` → `router.refresh()`), and one progress bar per `BudgetRow`: `“{name}” · “{actual} / {budget}”` with a fill width `pct%` colored by status (`under`→blue/green, `near`→amber, `over`→red) and the amount in red when `over`. Empty state when no budgets set. The page resolves user/workspace, fetches `budgetVsActual` + expense `listCategories`, renders the view.

- [ ] **Step 1: Write failing test** — `renderToString(<BudgetView workspaceId="w" rows={[saas,postage]} categories={cats} />)` contains both category names, `"$5,000.00 / $4,000.00"`, and the category options in the form. Mock `next/navigation`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — presentational bars + `useTransition` form; server page composition. Keep the file ≤ 450 LOC (extract the form into a sub-component in the same file if needed).
- [ ] **Step 4: Run → PASS** + browser check (`/w/<ws>/budget`: set a budget, see the bar; over-budget shows red).
- [ ] **Step 5: Commit** — `git commit -am "feat(budget): /budget route + set-budget UI + bars"`

---

## Task 12: Pure command model

**Files:**
- Create: `src/lib/command-palette/commands.ts`, `src/lib/command-palette/commands.test.ts`

**Interfaces:**
- Produces: `type Command = { id: string; label: string; icon: string; group: "Quick actions" | "Go to workspace"; href: string }`; `interface PaletteCtx { workspaces: { id: string; name: string; color: string }[]; currentWorkspaceId: string | null }`; `buildCommands(ctx: PaletteCtx): Command[]` — quick actions scoped to `currentWorkspaceId` when present (Add expense/transaction → `/w/{id}/manage`, Log a new bill → `/w/{id}/manage`, Record owner draw → `/w/{id}/income`, Import CSV → `/w/{id}/import`), plus one “Go to workspace” command per workspace (`/w/{id}`); `filterCommands(commands, query: string): Command[]` — case-insensitive subsequence match on `label`, preserving order, returning all when `query` is empty.

- [ ] **Step 1: Write failing tests** — `buildCommands({workspaces:[A,B], currentWorkspaceId:"A"})` includes an “Add expense” command with `href:"/w/A/manage"` and two go-to-workspace commands; with `currentWorkspaceId:null` the quick actions that need a workspace are omitted; `filterCommands(cmds,"add exp")` returns the Add-expense command; `filterCommands(cmds,"")` returns all.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — pure builders + a subsequence matcher (`label.toLowerCase()` walked against `query.toLowerCase()`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(cmdk): pure command model + fuzzy filter"`

---

## Task 13: Command palette client component

**Files:**
- Create: `src/components/command/command-palette.tsx`, `src/components/command/command-palette.test.tsx`

**Interfaces:**
- Consumes: `buildCommands`/`filterCommands` (Task 12), `usePathname`/`useRouter` (`next/navigation`).
- Produces: `CommandPalette({ workspaces }: { workspaces: { id: string; name: string; color: string }[] })` — a client component that (a) derives `currentWorkspaceId` from `usePathname()` (`/w/<id>/…`), (b) opens on **⌘K / Ctrl-K** (and closes on Esc) via a `keydown` listener, (c) shows an input + grouped, filtered command list with arrow-key selection and Enter → `router.push(cmd.href)` then close. Closed by default; renders an overlay only when open. SSR-safe (no `window` access during render; attach listeners in `useEffect`).

- [ ] **Step 1: Write failing test** — `renderToString(<CommandPalette workspaces={[A,B]} />)` returns a string that does **not** contain the palette’s list (closed by default — assert it does not include a known command label like “Add expense / transaction”). Mock `next/navigation` (`usePathname` → `"/w/A"`, `useRouter` → `{ push(){} }`). (Open-state interaction is keyboard-driven and not simulable in `renderToString`; the open render path is exercised by the pure model tests + browser check.)
- [ ] **Step 2: Run → FAIL** (component import / contract).
- [ ] **Step 3: Implement** — `useState(open)`, `useEffect` keydown (`(e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"` → `preventDefault`, toggle), filtered list from `filterCommands(buildCommands({workspaces, currentWorkspaceId}), query)`, keyboard nav, overlay styled per the mockup (scrim + centered card).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(cmdk): global command palette client component"`

---

## Task 14: Mount palette in the app shell

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `CommandPalette` (Task 13), `listAccessibleWorkspaces`, `getCurrentUser`.
- Produces: the app shell fetches the user’s accessible workspaces and renders `<CommandPalette workspaces={…} />` once, alongside `<TabBar/>` and `<main>`, so ⌘K works on every authenticated page.

- [ ] **Step 1: Implement** — in `AppLayout`, after the auth check, `const workspaces = await listAccessibleWorkspaces(user.id)`; pass `workspaces.map(w => ({ id: w.id, name: w.name, color: w.color }))` to `<CommandPalette/>`.
- [ ] **Step 2: Verify** — `pnpm type-check`, `pnpm lint`, `pnpm build` green; browser: ⌘K opens the palette on the dashboard and a workspace command navigates.
- [ ] **Step 3: Commit** — `git commit -am "feat(cmdk): mount command palette in the app shell"`

---

## Task 15: Shared sub-nav with Calendar + Budget links

**Files:**
- Create: `src/components/workspace/workspace-sub-nav.tsx`
- Modify: `src/app/(app)/w/[workspaceId]/page.tsx`, `src/app/(app)/w/[workspaceId]/manage/page.tsx` (and any other page rendering the inline `<nav>`), `src/components/dashboard/dashboard.tsx` if it owns the nav.

**Interfaces:**
- Produces: `WorkspaceSubNav({ workspaceId }: { workspaceId: string })` — the existing pill nav extended to `Dashboard · Manage · Calendar · Budget · Income · Import · Audit`, each a `<Link href={\`/w/${workspaceId}${sub}\`}>` with the current styling. Replaces the duplicated inline `<nav>` blocks (DRY).

- [ ] **Step 1: Implement** — extract the nav (currently inline at `w/[workspaceId]/page.tsx:75-91`) into `WorkspaceSubNav`, add `["Calendar","/calendar"]` and `["Budget","/budget"]` between Manage and Income, and swap every inline copy for `<WorkspaceSubNav workspaceId={workspaceId} />`.
- [ ] **Step 2: Verify** — `pnpm type-check`, `pnpm lint`, `pnpm build` green; browser: Calendar and Budget tabs appear and navigate from every workspace page.
- [ ] **Step 3: Commit** — `git commit -am "feat(nav): shared workspace sub-nav with Calendar + Budget"`

---

## Phase 2.x Done — Definition of Done

- `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `security.rls.test.ts` still passes.
- **Auto-match:** the dashboard surfaces a suggestion when an unreconciled outflow plausibly matches an open bill; **Yes, match** marks the bill paid (reusing `markPaid`) and the figure reconciles; **No** dismisses it. A non-member gets no suggestions (RLS + authz).
- **Calendar:** `/w/<ws>/calendar` shows the month grid with each bill on its due day, colored by overdue/soon/scheduled/paid; prev/next months work.
- **Budget vs. actual:** `/w/<ws>/budget` lets the user set a monthly budget per expense category and shows budget-vs-actual bars; over-budget is flagged red; actuals match the dashboard’s category spend.
- **Command palette:** ⌘K/Ctrl-K opens from any authenticated page; quick actions and jump-to-workspace navigate; Esc closes.
- **No migration** (verified: no new file under `prisma/migrations/`); **no JS float money**; **calendar dates** throughout; new pages are responsive.
- Browser-verified on the **production server** with screenshots + a written report (per the project’s Rule 4 + the standing verification expectation): auto-match confirm, calendar render, budget set + over-budget, ⌘K navigation.
- Phase 2.x roadmap items marked `[x]` (Rule 7) before the final checkpoint.

## Mapping to spec/PRD requirements (coverage check)

- **FR-23 (bill↔transaction auto-match, user confirms):** Tasks 1–4
- **FR-22 (due-date calendar):** Tasks 5–7
- **FR-21 (budget vs. actual per category):** Tasks 8–11
- **FR-24 (command palette ⌘K):** Tasks 12–14
- NFR-1 money/dates: Tasks 1, 6, 8, 9 · NFR-2/3 authz+RLS: every service task (`assertWorkspaceAccess` + `rlsClientFor`) · NFR-4 responsive: Tasks 7, 11, 13

## Notes / decisions

- **Migration-free, confirmed:** `Budget` exists with forced RLS (`budget_rls`, migration `20260620223042`); auto-match/calendar/palette add no tables. `setBudget` is find-then-update/create.
- **Budget-vs-actual is month-scoped for v1** — the `Budget` row stores a monthly amount; comparing it to a quarter/year actual would mislead. The page shows the current month; multi-period budgets are deferred.
- **Match dismissals are client-only for v1** — “No” hides the row for the session; we don’t persist a “rejected match” table (YAGNI). `dismissMatchAction` exists as a stable seam if persistence is added later.
- **Matching is deliberately conservative** (`score ≥ 0.55`, ±5 days, ≤2%/$1 amount) — the user always confirms; a missed suggestion is cheaper than a wrong auto-pay. The scorer is pure and unit-tested so the threshold is tunable with confidence.
- **Command palette v1 is navigation-first** — it routes to the relevant quick-add page rather than embedding inline forms, keeping the global component small and SSR-safe. Inline quick-add is a clean future enhancement on the same pure command model.
- **All non-trivial logic is pure + unit-tested** (`match-score`, `month-grid`, `commands`); services are integration-tested through the RLS client; components are `renderToString`-tested via always-rendered content (closed-by-default for the palette).
