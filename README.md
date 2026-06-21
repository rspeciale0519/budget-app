# Ledger — Budgeting & Accounts-Payable App

> **Working name** — "Ledger" is a placeholder; the final product name and domain are TBD.

A self-hosted budgeting and accounts-payable application for an owner-operator and a small team.
It tracks money across **multiple isolated workspaces** (Personal + one per business), ingests
real bank data via **CSV import** plus full **manual entry**, and surfaces a single, dense
dashboard showing what's been paid, what's still owed, due dates, a cash-flow forecast, and a
consolidated owner's-eye roll-up across everything you own.

The app is built with a clean data/API seam so a future **AI financial-advisor microservice** can
be added later — but no AI is built today.

---

## Status

🟢 **Phase 2a (Live dashboard) complete.** On top of the Phase 1 data core, the dashboard now
runs on **live data**: owner-configurable expected income feeding a single projection helper that
sharpens both the drillable safe-to-spend and the cash-flow forecast; category breakdown, paid-vs-
unpaid, debts/goals; one-click standalone mark-paid; race-safe idempotent recurring-bill
materialization; and the consolidated roll-up with owner-draw netting. 125 tests pass;
`type-check`, `lint`, `test`, and `build` are all green. Next: **Phase 2b** (desktop tiling +
saved layouts).

- **Design spec:** [`docs/superpowers/specs/2026-06-20-budget-app-design.md`](docs/superpowers/specs/2026-06-20-budget-app-design.md)
- **UI mockups:** [`docs/temp/budget-app-mockup-v1.html`](docs/temp/budget-app-mockup-v1.html) ·
  [`docs/temp/budget-app-mockup-phase2.html`](docs/temp/budget-app-mockup-phase2.html)

---

## Why this exists

Off-the-shelf tools (QuickBooks, YNAB, Monarch, etc.) each do part of this, but none cleanly
combine, for a single owner-operator:

- **Personal finances and multiple businesses** in one place, each strictly separated, with the
  ability to view them **side-by-side**.
- An **income bridge** that recognizes money drawn from each business as Personal income —
  automatically, without double-entry bookkeeping.
- A forward-looking view of **what's owed, when it's due, and what's safe to spend** — not just a
  rear-view ledger of transactions that already cleared.

This app is purpose-built for that workflow, and kept deliberately lightweight: great budgeting
and reporting over a simple ledger, not a full accounting suite.

---

## Core concepts

| Concept | What it is |
|---|---|
| **Organization** | The tenant boundary. One today; the seam for multi-tenant SaaS later. |
| **Workspace** | Personal, or a single business. Isolated data, customizable **name + color + icon**. The unit you switch between and tile. |
| **Account** | A bank or credit account inside a workspace. Any bank, many per workspace. Balance is **computed** from an opening balance + transactions. |
| **Transaction** | A real money movement — imported from CSV or entered by hand (identical downstream). Signed amounts; transfers flagged so they don't pollute income/expense totals. |
| **Bill** | A forward-looking obligation (bill, invoice, payroll, tax, one-off) with a due date and paid/unpaid status. The "what's owed" core. |
| **RecurringSchedule** | A rule that materializes upcoming `Bill` rows on a rolling horizon. |
| **WorkspaceTransfer** | The income bridge: links a business outflow (owner draw/distribution/salary) to the matching Personal income entry. |
| **Debt / Goal** | Debt balances (APR, minimums) and savings goals (vacations, projects, big purchases). |

---

## Features (v1)

**Workspaces & navigation**
- Color-coded, **user-customizable** workspace tabs (name, color, optional icon) with one-click
  switching.
- **Tiled mode (desktop):** multiple resizable workspace panes, side-by-side and stacked, each
  live and independent.
- **Saved layouts:** name and restore tiling arrangements ("Morning review", "Tax prep").
- **All Workspaces roll-up:** combined net position across everything you own, with owner draws
  netted out so they aren't double-counted as income.

**The dashboard (single dense view per workspace)**
- KPI cards: total balance · money in · money out · **Safe-to-spend** (click-to-expand to see its
  full math).
- **Cash-flow forecast** with lowest-point warning.
- Spending-by-category breakdown.
- Upcoming & overdue bills with one-click mark-paid.
- Paid vs. unpaid, goals progress, and debts.

**Data in & out**
- **Bank-agnostic CSV import:** per-account column mapping with a sign rule (so credit-card
  exports aren't booked as income), auto-categorization rules, duplicate detection, optional
  balance reconciliation, and a **preview-then-commit** flow with undo.
- **Full manual CRUD** on every entity, including a "Tag as owner draw → Personal" action.
- **Export** transactions, bills, and the roll-up to CSV/Excel.

**Trust & safety**
- **Audit log** (who changed what, when) — owner/admin-viewable.
- **Per-workspace access control** — a teammate granted only one business never sees Personal.
- Designed **empty/first-run states**, not an afterthought.

See the [design spec](docs/superpowers/specs/2026-06-20-budget-app-design.md) for the complete,
authoritative feature list and rationale.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js** (App Router) + **TypeScript** (strict, no `any`) |
| Database | **Supabase** (Postgres + Auth), local-first dev via `supabase start` |
| ORM | **Prisma** |
| Validation | **Zod** at every boundary (forms, API, CSV rows) |
| UI | **Tailwind CSS** + **shadcn/ui** |
| Money math | **decimal.js** / Postgres `numeric` — never raw JS float arithmetic |
| Deploy | **Vercel** |

**Conventions:** source files ≤ 450 LOC · tests co-located as `*.test.ts` · business logic lives
in the service layer, never in components.

---

## Architecture

One Next.js deployment, strictly layered, with a documented API seam for the future AI service:

```
UI (Server Components + shadcn/ui)
      │  reads the service layer directly
Service layer  (business logic · money math · authorization)
      │
Repository layer (Prisma) → Postgres (Supabase)

/api/v1/*  (versioned REST · Zod-validated · role-gated)
      └── consumed later by: AI advisor microservice + any external client
```

- The **UI reads the service layer directly** (no internal HTTP hop).
- **`/api/v1`** exposes the same data and computations for external consumers — most importantly,
  the **future AI advisor**, which will be a **separate microservice** authenticating with a
  scoped, read-only token. Because access is modeled as workspace membership, the AI is "just
  another read-scoped member"; Row-Level Security physically prevents it from reading a workspace
  it wasn't granted.

### Money correctness (non-negotiable)

1. **No JavaScript float math on money.** All monetary arithmetic uses `decimal.js` or Postgres
   `numeric`; rounding is half-up to cents.
2. **Balances are computed** (opening balance + Σ transactions) — they can't silently drift.
3. **Dates are calendar dates, not timestamps** — a timezone offset never shifts a due date by a
   day.
4. **Transfers are excluded** from income/expense/category math.

### Security model

- **Primary:** service-layer authorization checks membership + role on every read/write.
- **Backstop:** Postgres **Row-Level Security** on every table — the database itself refuses rows
  the caller isn't entitled to, even if a bug slips past the service layer.
- **Income-bridge privacy:** each side of a `WorkspaceTransfer` respects its own workspace's
  membership independently — a business-only teammate sees only the business-side outflow, never
  the Personal counterpart.

---

## Getting started

> ⚠️ **Not yet runnable** — the project is in the design phase and has not been scaffolded. This
> section documents the intended local-dev workflow once Phase 1 lands.

**Prerequisites**
- Node.js (LTS) and a package manager (pnpm/npm)
- Docker Desktop (for the local Supabase stack)
- Supabase CLI

**Planned setup**

```bash
# 1. Install dependencies
pnpm install

# 2. Start the local Supabase stack (Postgres + Auth) — free, local-only
supabase start

# 3. Copy environment variables and fill in the local Supabase keys
cp .env.example .env.local

# 4. Apply the database schema
pnpm prisma migrate dev

# 5. (Optional) seed demo data for development / empty-state testing
pnpm db:seed

# 6. Run the dev server
pnpm dev   # http://localhost:3000
```

The app develops fully **locally and free** until launch; Google OAuth works on `localhost`.

---

## Project structure (intended)

```
budget-app/
├── docs/
│   ├── superpowers/specs/   # design specifications (authoritative)
│   └── temp/                # mockups & working notes
├── prisma/                  # schema + migrations
├── src/
│   ├── app/                 # Next.js App Router (pages, layouts)
│   │   └── api/v1/          # versioned REST API (the AI/external seam)
│   ├── components/          # presentational UI (shadcn-based)
│   ├── services/            # business logic, money math, authorization
│   ├── repositories/        # Prisma data access
│   └── lib/                 # shared utilities, Zod schemas, money helpers
└── README.md
```

---

## Testing

- **Unit** — the money math (safe-to-spend, forecast, breakdowns, roll-up transfer-netting,
  dedupe, Decimal/rounding). This logic must be provably correct.
- **Integration** — CSV import pipeline, CRUD, and a security test proving a business-only user
  cannot read Personal (RLS + service layer together).
- **Component** — presentational components with mock data.
- **E2E** — tooling selected at build time.

```bash
pnpm test          # unit + integration
pnpm type-check    # TypeScript
pnpm lint          # linting
pnpm build         # production build
```

---

## Roadmap

**Phase 1 — Data core** ✅ **Complete**
Schema & migrations · auth + org/workspace roles · accounts · categories · transactions · CSV
import (mapping, sign rule, dedupe, balance check, preview, undo) · full manual CRUD ·
presentational dashboard components (mock data) · workspace tabs · **forced RLS** +
service-layer authorization · audit log · data export · empty states · org bootstrap + invites ·
`/api/v1` read seam.

**Phase 2a — Budget dashboard (live)** ✅ **Complete**
Live data wired throughout · **owner-configurable expected income** (the shared projection feeding
both numbers) · drillable safe-to-spend reconciling to the penny · cash-flow forecast · paid vs.
unpaid · category breakdown · upcoming/overdue with one-click standalone mark-paid · race-safe
idempotent recurring-bill materialization · consolidated roll-up with transfer-netting · debts & goals.

**Phase 2b — Tiling (next)**
Desktop tiling (independent live panes) + saved named layouts. Split out so the live dashboard
shipped first.

**Phase 2.x — Convenience**
Due-date calendar · budget-vs-actual · command palette (⌘K) · bill↔transaction auto-match.

**v2 — QuickBooks-style reports**
Read-only computed reports over the existing ledger: Profit & Loss, cash-flow statement, expense
by category/vendor with period-over-period comparison, A/P aging, owner-draw / inter-workspace
transfer report — per-workspace and consolidated, with PDF/CSV export.

**Later**
AI advisor as a separate microservice (debt payoff, affordability, scenario planning — advisory,
not fiduciary) · Plaid auto-sync · deeper payroll/tax modules · multi-tenant SaaS.

---

## Out of scope (deliberately)

Plaid / live bank auto-sync (v1) · OFX/QFX import · full double-entry accounting · receipt OCR ·
multi-currency / FX · native mobile apps · a real payroll engine · building the AI advisor itself
(we build only the seam). Most can be added later — the schema leaves the door open.

---

## License

Private / proprietary. Not for distribution.
