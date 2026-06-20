# Budget App — Design Specification

- **Date:** 2026-06-20
- **Status:** Draft for review
- **Working name:** "Ledger" (placeholder — final name + domain TBD)
- **Project home:** `C:\Users\rob\Documents\Software\data-management\budget-app`

---

## 1. Overview

A self-hosted budgeting and accounts-payable application for an owner-operator and a small
team. It tracks money across **multiple isolated workspaces** (Personal + one per business),
ingests real bank data via **CSV import** plus full **manual entry**, and surfaces a single
dense dashboard showing what's been paid, what's still owed, due dates, cash-flow forecast,
and a consolidated owner's-eye roll-up.

The app is built so a future **AI financial-advisor microservice** can be added later as a
separate service consuming a documented API — but no AI is built now.

### Goals
- One place to manage Personal finances + each business, kept strictly separate.
- See **what's paid vs. unpaid**, **due dates**, and a forward **cash-flow forecast**.
- Recognize income drawn from each business into Personal (the "income bridge").
- Zero recurring cost and zero third-party approval to start (CSV, not Plaid).
- A clean data/API seam so an AI advisor can be bolted on later as its own microservice.

### Non-goals (explicitly out of scope)
Plaid / live bank auto-sync · OFX/QFX import · full double-entry accounting · receipt OCR ·
multi-currency / FX · native mobile apps · a real payroll engine · building the AI advisor
itself (we build only the seam).

---

## 2. Users & access

- **Audience now:** the owner + a small team (option "2"), with an eye to multi-tenant SaaS
  later (option "3") — designed so that's a contained extension, not a rewrite.
- **Identity:** `Organization` (the tenant; one today) → `Workspace` (Personal, Business A, …)
  → `Account` (bank/credit accounts) → financial records.
- **Org roles** (`OrgMembership`: `owner | admin | member`):
  - **owner / org-admin:** manage everything — create workspaces, invite users, assign access,
    view audit log, see all workspaces.
  - **member:** **no** financial access except explicitly granted workspace memberships.
- **Workspace roles** (`WorkspaceMembership`: `admin | viewer`):
  - **admin:** full CRUD within that workspace; may manage *viewers on that workspace only*.
  - **viewer:** read-only.
- **Separation guarantee:** a teammate granted only Business A never sees Personal — not in
  tabs, search, roll-up, or anywhere. Enforced at the data layer (see §8).

---

## 3. Architecture

One **Next.js (App Router)** deployment, strictly layered:

```
UI (Server Components + shadcn/ui)
      │  (reads service layer directly — option "b")
Service layer  (business logic, money math, authorization)
      │
Repository layer (Prisma) → Postgres (Supabase)

/api/v1/*  (versioned REST, Zod-validated, role-gated)
      └── consumed by: the future AI microservice + any external client
```

- **The seam:** business logic lives in the **service layer**, never in components. The UI reads
  the service layer **directly** (no internal HTTP hop). A versioned **`/api/v1`** read API
  exposes the same data/computations for the **future AI advisor microservice** and external
  consumers.
- **Decision (option b):** UI → service layer direct; `/api/v1` reserved for AI/external. Same
  seam, less ceremony than routing the UI's own reads through HTTP.
- **AI later = Approach C:** the advisor will be built as a **separate microservice** that
  authenticates with a scoped, read-only service token and consumes `/api/v1`. Because access is
  modeled as membership (§8), the AI is "just another read-scoped member." Nothing about the AI
  is built now beyond keeping this seam clean.

### Stack
Next.js (App Router) + TypeScript strict · Supabase (Postgres + Auth), local-first dev
(`supabase start`) · Prisma · Zod · Tailwind + shadcn/ui · Vercel (deploy). No `any` types;
source files ≤ 450 LOC; tests co-located as `*.test.ts`.

---

## 4. Data model

Hierarchy: **Organization → Workspace → Account → records.** Money stored as Postgres
`numeric(14,2)` (`Decimal`). All records carry `workspaceId`.

### Identity & access
- **Organization** — `id, name`. One row now; tenant boundary for the future.
- **OrgMembership** — `organizationId, userId, role(owner|admin|member)`.
- **Workspace** — `id, organizationId, name (user-editable), type(personal|business),
  color (user-editable), icon?, sortOrder`. First-class, switchable, customizable.
- **WorkspaceMembership** — `workspaceId, userId, role(admin|viewer)`. The access gate.

### Money sources
- **Account** — `id, workspaceId, name, type(checking|savings|credit_card|loan|cash),
  institution (free-text nickname — any bank), last4, openingBalance, openingDate, currency`.
  **Live balance is computed** = `openingBalance + Σ(transactions)`, never a drifting stored value.

### Ledger
- **Transaction** — `id, workspaceId, accountId, date (calendar date), amount (signed: −out/+in),
  description, merchant?, categoryId?, notes?, source(csv|manual), importBatchId?, dedupeHash,
  isTransfer, transferPairId?, billId?`. Hand-entered and imported rows are identical downstream.
- **Category** — `id, workspaceId, name, kind(income|expense), parentId?`. Seeded defaults.
- **ImportBatch** — `id, workspaceId, accountId, filename, rowCount, importedAt, status`.
  Enables import undo.

### Obligations (the "what's owed / due / paid" core)
- **Bill** — `id, workspaceId, vendor, amount, dueDate (calendar date),
  status(unpaid|scheduled|paid|overdue), type(bill|invoice|payroll|tax|one_off), categoryId?,
  payFromAccountId?, recurringScheduleId?, paidTransactionId?, notes?`.
  Paying a bill = a `Transaction` linked via `billId`; bill flips to `paid` with
  `paidTransactionId`. Can also be marked paid standalone (link stays null).
- **RecurringSchedule** — `id, workspaceId, frequency(weekly|monthly|quarterly|annual|custom),
  interval, dayOfMonth?/dayOfWeek?, startDate, endDate?, nextRunDate` + template
  (vendor, amount, category). Materializes upcoming `Bill` rows (see §6).

### Planning
- **Debt** — `id, workspaceId, name, type, currentBalance, apr, minimumPayment, dueDay,
  accountId?`. Credit cards are **Accounts**; a `Debt` *links* to one via `accountId` rather than
  re-storing the balance (no double-counting). Loans with no tracked account stand alone.
- **Goal** — `id, workspaceId, name, targetAmount, targetDate?, currentSaved, status, notes?`.

### Cross-workspace
- **WorkspaceTransfer** (income bridge) — `id, organizationId, fromWorkspaceId, toWorkspaceId,
  type(owner_draw|distribution|salary|transfer), amount, date, fromTransactionId?,
  toTransactionId?, notes?`. Tagging a business outflow as "owner draw → Personal" creates/links
  the matching Personal income transaction. `from/toTransactionId` nullable so a draw can be
  recognized before the deposit clears. **Each side respects its own workspace's membership
  independently** (privacy rule, §8).

### Config / supporting
- **ImportMapping** — per-account remembered CSV column map + **sign rule**
  (`single_signed | separate_debit_credit | invert`) + date format.
- **CategoryRule** — `workspaceId, match(contains|equals), pattern, categoryId, priority`.
  Auto-tagging on import. No ML.
- **Budget** — `workspaceId, categoryId, period(monthly), amount`. (Schema v1; UI in Phase 2.)
- **Layout** — `id, userId, organizationId, name, config(JSON)`. Saved tiling arrangements,
  per-user.
- **AuditLog** — `id, organizationId, workspaceId?, userId, action, entityType, entityId,
  before?, after?, at`. Owner/admin-viewable only.

---

## 5. Features — v1

> "v1" = the complete budgeting app (everything in this section), delivered across **build
> Phases 1–2** in §13. "v2" = the QuickBooks-style reports that come after.

### 5.1 Workspaces & navigation
- **Tab bar** of customizable, color-coded workspaces (name + color + optional icon, all
  user-editable) with quick-switch, a `＋` to add, and an **All Workspaces** roll-up tab.
- **Tiled mode (desktop):** split the screen into multiple resizable panes, each an independent,
  live workspace (side-by-side and stacked). **Each pane owns its own `{workspaceId, view}`
  context** — there is no single global "current workspace."
- **Saved layouts:** serialize the pane tree to `Layout.config`; restore a named arrangement in
  one click. Per-user.

### 5.2 Single dense dashboard (per workspace)
One screen (no sub-tabs — deliberate choice):
- **KPI cards:** total balance · money in (period) · money out (period) · **Safe-to-spend**.
- **Safe-to-spend** = `available balance − unpaid bills due before next expected income`.
  **Click-to-expand** shows its full math (it must be traceable to be trusted).
- **Cash-flow forecast** — projected balance over next N days, from balances + materialized
  recurring bills + known income; flags the lowest point.
- **Spending by category** (expenses only; transfers excluded).
- **Upcoming & overdue bills** — next 7/30 days, overdue highlighted, one-click mark-paid.
- **Paid vs. unpaid**, **Goals** (progress), **Debts** (balances, APR, minimums).
- Period selector (week/month/quarter/year).

### 5.3 Consolidated "All Workspaces" roll-up (owner)
Net position per workspace + combined (balance, in, out, unpaid, net). **Owner draws / workspace
transfers are netted out** of the combined total (internal movement, not new income), while still
reading as income inside Personal. Respects membership.

### 5.4 CSV import (bank-agnostic)
Pipeline: **Upload → Map → Enrich → Preview (confirm) → Commit → Summary**, undoable.
- **Bank-agnostic:** per-`Account` `ImportMapping` learns each bank's columns, date format, and
  **sign rule** (so a credit-card export isn't booked as income). Many banks/accounts per
  workspace.
- **Enrich:** proposed category via `CategoryRule`s + remembered merchant→category; **transfer
  guess**; **duplicate flag** via `dedupeHash` (account+date+amount+description+running-balance).
- **Preview:** review table — fix categories, tick `isTransfer`, drop rows; **duplicates are
  flagged + pre-checked for skip but user-overridable** (never silently discarded).
- **Balance reconciliation:** when the mapping has a running-balance column, compare computed vs.
  reported balance and warn on mismatch (catches missing rows). Skipped gracefully when absent.
- **Commit:** atomic insert + `ImportBatch`; undo removes the batch's rows.

### 5.5 Manual CRUD
Full create/edit/delete on Transactions, Bills (+ recurrence, + mark-paid), Accounts, Categories,
Debts, Goals, CategoryRules, Budgets. Special action: **"Tag as owner draw → Personal"** spawns
the linked Personal income entry + `WorkspaceTransfer`.

### 5.6 Data export
Export transactions, bills, and the roll-up to **CSV/Excel** (accountant handoff, portability,
anti-lock-in). Pairs with import.

### 5.7 Audit log
Records create/edit/delete and bill-paid actions (who/what/when). Owner/admin-viewable only.

### 5.8 Empty / first-run states
Every workspace starts empty — onboarding/empty states are designed, not an afterthought.

---

## 6. Recurring bills generation

A `RecurringSchedule` is a rule; the calendar/forecast need concrete `Bill` rows.
- Materialize a **rolling horizon** (default 90 days) of upcoming `Bill` instances,
  **idempotently** (regeneration never duplicates).
- Refresh on app load now; a lightweight scheduled job can take over later.

---

## 7. Money correctness (hard rules)

1. **Decimal end-to-end — no JavaScript float math on money.** All monetary arithmetic runs
   through a decimal library (`decimal.js`) or is aggregated in Postgres `numeric`. Raw JS `+`/`*`
   on money is forbidden (it silently coerces to float). Rounding: **half-up to cents**. Unit
   tests assert this.
2. **Computed balances** (opening + Σ transactions) — single source of truth, can't drift.
3. **Dates as calendar dates, not timestamps** for transaction dates and bill due dates — a
   timezone offset must never shift a date by a day.
4. **Transfers excluded** from income/expense/category math via `isTransfer`.

---

## 8. Auth, roles & separation

- **Auth:** Supabase Auth (email/password + Google OAuth; works on localhost). Next.js sessions
  via `@supabase/ssr` cookies.
- **Enforcement — defense in depth:**
  - **Primary:** service-layer authorization — every read/write checks membership + role.
  - **Backstop:** Postgres **Row-Level Security** on every table, keyed to workspace membership;
    the database refuses rows the caller isn't entitled to even if a bug slips past the service
    layer.
  - *Implementation note:* Prisma doesn't auto-carry user identity into Postgres for RLS — set
    request auth claims on the connection per-request, or treat RLS strictly as the backstop with
    the service layer as enforcer. Known, solved pattern; planned, not discovered.
- **Income-bridge privacy (hard rule):** each side of a `WorkspaceTransfer` respects its own
  workspace's membership independently. A business-only teammate sees only the business-side
  outflow — never the Personal counterpart's amount or existence.
- **AI seam:** the future AI microservice = a scoped, read-only service token mapped to specific
  workspaces; RLS physically prevents access beyond its grant.
- **Invites:** owner invites by email → Supabase invite → assign workspace memberships + roles.

---

## 9. Validation, integrity & error handling

- **Zod** at every boundary: forms, `/api/v1`, and **per-row CSV parse**. Schemas shared
  client↔server.
- **Atomicity:** multi-step writes wrapped in DB transactions — import commit, bill-payment
  linking, owner-draw (two linked entries + transfer) — all-or-nothing.
- **Referential cleanup (explicit):** delete a bill-paying transaction → bill reopens; delete an
  `ImportBatch` → its rows go too; **deleting a workspace archives rather than hard-deletes**
  (matches "never delete, archive").
- **Errors:** CSV problems surface in the preview as per-row flags (bad rows don't block good
  ones); mutations return typed results with friendly messages + optimistic-UI rollback; auth
  failures refresh session or redirect to login.

---

## 10. Testing

Co-located `*.test.ts`.
- **Unit — the money math** (must be provably correct): safe-to-spend, forecast, category
  breakdown, **roll-up transfer-netting**, dedupe hashing, Decimal/rounding behavior.
- **Integration:** import pipeline, CRUD, and a **security test that a business-only user cannot
  read Personal** (RLS + service layer together).
- **Component:** presentational components with mock data.
- **E2E:** tooling chosen at build time per project conventions.

---

## 11. Responsive, performance, accessibility, backups

- **Responsive (from day one):** desktop = tiling enabled; tablet = single workspace (limited
  tiling); mobile = tabbed single workspace, cards stack to one column, tables scroll. Tiling is a
  desktop-only enhancement that degrades to tabs on small screens.
- **Performance:** indexed `(workspaceId, date)` queries, paginated transaction lists, lightly
  cached computed views. Scale is modest (one org, few users, thousands of rows).
- **Accessibility:** keyboard navigation, sufficient contrast, and **status conveyed by
  icon/label, not color alone** (bill statuses lean on red/amber/green).
- **Backups (production):** Supabase scheduled backups + periodic export; restore plan documented
  before go-live. (Moot during local dev.)

---

## 12. UI build approach

Build the dashboard as **presentational ("dumb") components fed by mock data first** (so the app
immediately matches the approved mockup), then wire them to the live service layer. The mockup's
dead-space gap is tidied (same cards, even columns) — a mockup artifact, not a design choice.
Aesthetic is deliberately conventional (clarity over flair) for an internal tool.

Reference mockups: `docs/temp/budget-app-mockup-v1.html`, `docs/temp/budget-app-mockup-phase2.html`.

---

## 13. Roadmap / phasing

**Phase 1 — Data core**
Schema + migrations; auth + org/workspace memberships & roles; Accounts; Categories;
Transactions; CSV import pipeline (mapping, sign rule, dedupe, balance check, preview, undo);
full manual CRUD; presentational dashboard components with mock data; workspace tabs +
customization; RLS + service-layer authorization; audit log; data export; empty states.

**Phase 2 — Budget dashboard (live)**
Wire components to live data; Safe-to-spend (drillable); cash-flow forecast; paid vs. unpaid;
category breakdown; upcoming/overdue widgets; **tiling + saved layouts**; consolidated roll-up
with transfer-netting; recurring-bill materialization; debts & goals views.

**Phase 2.x — Convenience (per approved scope)**
Due-date calendar; budget-vs-actual; command palette (⌘K); bill↔transaction auto-match
suggestions.

**v2 — QuickBooks-style report generation**
Read-only computed reports over the existing ledger (no new data, no double-entry): Profit &
Loss, cash-flow statement, expense by category/vendor with period-over-period comparison, **A/P
aging** (from bills + due dates), **owner-draw / inter-workspace transfer report**, per-workspace
+ consolidated, with PDF/CSV export. Stays "great reports over a simple ledger," not full
accounting.

**Later**
AI advisor as a **separate microservice** (Approach C) consuming `/api/v1` (debt payoff,
affordability, goal/scenario planning — advisory, not fiduciary); Plaid auto-sync; deeper
payroll/tax modules; multi-tenant SaaS.

---

## 14. Decisions log (resolved)

- Build custom (not adapt QuickBooks). · Team now, multi-tenant later. · Scope: bills, invoices,
  one-off, payroll & taxes (tracked, simple). · CSV + manual CRUD; **no Plaid in v1**. · Stack as
  §3. · UI reads service layer direct; `/api/v1` for AI/external (option b). · Multi-workspace
  with income bridge. · Tabbed + tiled UI + saved layouts; per-pane workspace context. ·
  Customizable workspace name + color (+ icon). · Single dense dashboard (no sub-tabs). ·
  Responsive from day one; tiling desktop-only. · Decimal end-to-end; calendar dates. · RLS +
  service-layer auth; bridge privacy hard rule. · Audit log in v1, owner/admin-only. · Data export
  in v1. · AI built later as separate microservice. · v2 = QuickBooks-style reports.

## 15. Open questions
- Final product name + domain (placeholder "Ledger").
- E2E test tooling choice (deferred to build time).
