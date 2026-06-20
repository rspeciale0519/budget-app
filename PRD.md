# Product Requirements Document — Ledger

| | |
|---|---|
| **Product** | Ledger (working name — final name & domain TBD) |
| **Document status** | Draft for review |
| **Last updated** | 2026-06-20 |
| **Owner** | Rob (owner-operator) |
| **Related docs** | [Design spec](docs/superpowers/specs/2026-06-20-budget-app-design.md) · [README](README.md) · Mockups: [v1](docs/temp/budget-app-mockup-v1.html), [Phase 2](docs/temp/budget-app-mockup-phase2.html) |

> This PRD defines **what** the product must do and **why**. The companion
> [design spec](docs/superpowers/specs/2026-06-20-budget-app-design.md) defines **how** it is
> built (architecture, data model, technical rules). Where they overlap, the design spec is
> authoritative on implementation detail; this PRD is authoritative on product intent and scope.

---

## 1. Overview

Ledger is a self-hosted budgeting and accounts-payable application for an owner-operator who runs
their personal finances alongside one or more businesses. It unifies bank data (via CSV import and
manual entry), tracks what has been paid and what is still owed with due dates, forecasts
cash flow, and presents a consolidated view across every entity the owner controls — while keeping
each entity's books strictly separate.

It is intentionally lightweight: excellent budgeting, forecasting, and reporting **over a simple
ledger**, not a full double-entry accounting suite. The architecture reserves a clean seam for a
future AI financial-advisor microservice, but no AI is built in the initial product.

---

## 2. Problem statement

An owner-operator juggling personal finances and multiple businesses today faces:

- **Fragmentation.** Personal money, Business A, and Business B live in separate tools or separate
  logins, with no single place to see them together — or to see them apart, cleanly.
- **Rear-view-only data.** Bank feeds and most apps show what already cleared. They answer "what
  did I spend?" but not "what do I still owe, when is it due, and what's actually safe to spend
  right now?"
- **Manual cross-entity bookkeeping.** Money the owner draws from a business is income to them
  personally. Reconciling that by hand across tools is tedious and error-prone.
- **Overkill alternatives.** Full accounting software (e.g., QuickBooks) can do much of this but is
  heavyweight, opinionated, and not tailored to an owner-operator's "personal + several
  businesses, viewed side-by-side" workflow.

Ledger solves the specific workflow these tools handle clumsily, without the weight of full
accounting.

---

## 3. Goals & objectives

| # | Goal | Why it matters |
|---|---|---|
| G1 | Manage personal finances and each business in **one app, strictly separated** | A single source of truth without commingling books |
| G2 | Show **what's paid, what's unpaid, and due dates** at a glance | Avoid missed/late payments; plan ahead |
| G3 | Provide a forward-looking **"safe-to-spend" and cash-flow forecast** | Answer the real question: what can I spend without missing an obligation |
| G4 | **Recognize business→personal income** automatically (the income bridge) | Eliminate manual cross-entity reconciliation |
| G5 | View **multiple workspaces side-by-side** (tabbed + tiled) | An owner's-eye operating view across all entities |
| G6 | Start at **zero recurring cost and zero third-party approval** | CSV + manual entry, not Plaid, for v1 |
| G7 | Keep a clean **seam for a future AI advisor** | Add the advisor later as a separate service without a rewrite |

---

## 4. Non-goals

The following are explicitly out of scope for the initial product (some are future candidates):

- Live bank auto-sync (Plaid/Teller/MX) — **v1**; CSV import is the v1 mechanism.
- OFX/QFX import formats.
- Full double-entry accounting / general ledger / journal entries.
- Receipt capture / OCR / document attachments.
- Multi-currency and FX.
- Native mobile applications (the web app is responsive instead).
- A real payroll engine (payroll is *tracked* as bills, not *run*).
- Building the AI advisor itself (only the data/API seam is built now).

---

## 5. Target users & personas

**Primary — The Owner (admin/owner role).**
Runs personal finances plus one or more businesses. Wants one place to manage and forecast all of
it, with full control, and the ability to grant limited access to helpers. Comfortable downloading
CSVs from bank portals. Power-user expectations (keyboard speed, dense information, side-by-side
views). _This is the initial and most important user._

**Secondary — The Team Member / Bookkeeper (admin or viewer on specific workspaces).**
Granted access to one or more **business** workspaces only — never Personal. May enter/edit
transactions and bills (admin) or just review (viewer). Must be confidently walled off from
workspaces they weren't granted.

**Future — Other businesses (multi-tenant SaaS).**
Not in scope now, but the design must not preclude offering Ledger to other owner-operators later.

---

## 6. User stories

Grouped by epic. Each maps to functional requirements in §7.

**Epic A — Workspaces & navigation**
- As the Owner, I can create a workspace for Personal and for each business, and **customize its
  name, color, and icon**, so I can tell them apart instantly.
- As the Owner, I can **switch workspaces with one click** via tabs.
- As the Owner, I can **tile multiple workspaces side-by-side and stacked** on desktop, and **save
  a named layout**, so I can monitor several entities at once.
- As the Owner, I can open an **All Workspaces roll-up** to see combined net position.

**Epic B — Accounts & transactions**
- As a user, I can add bank/credit accounts (any institution) to a workspace, with an opening
  balance.
- As a user, I can **import a CSV** from my bank, review the parsed rows, fix categories, flag
  transfers, and commit — with duplicates flagged and a one-click undo.
- As a user, I can **add, edit, and delete transactions manually**, identically to imported ones.
- As a user, I can have the app **auto-categorize** transactions using rules I define.

**Epic C — Bills, due dates & payment status**
- As a user, I can record bills/invoices/payroll/taxes with **amounts and due dates**, and see
  **upcoming and overdue** items.
- As a user, I can set a bill to **recur** (weekly/monthly/quarterly/annual).
- As a user, I can **mark a bill paid** — by linking a real transaction or standalone.

**Epic D — Budgeting & forecasting**
- As a user, I can see my **safe-to-spend** number and **click to understand how it's calculated**.
- As a user, I can see a **cash-flow forecast** for the coming weeks, including the projected low
  point.
- As a user, I can see **spending by category** and **paid vs. unpaid** for a period.
- As a user, I can track **debts** (balance, APR, minimums) and **goals** (target, progress).

**Epic E — Cross-entity income bridge**
- As the Owner, I can tag a business outflow as an **owner draw to Personal**, and have it
  automatically recognized as **Personal income**, linked to the source — without double entry.
- As the Owner, in the roll-up, owner draws are **netted out** so combined income isn't inflated.

**Epic F — Access, trust & data ownership**
- As the Owner, I can **invite team members** and grant them access to **specific workspaces** with
  a role (admin/viewer).
- As the Owner, I'm guaranteed that a business-only teammate **cannot see Personal** anywhere.
- As the Owner, I can review an **audit log** of who changed what.
- As a user, I can **export** my data to CSV/Excel at any time.

---

## 7. Functional requirements

Priority: **P0** = required for first usable release (build Phases 1–2); **P1** = planned
convenience (Phase 2.x); **P2** = later (v2+).

### Workspaces & navigation
- **FR-1 (P0)** Create/edit/delete workspaces of type Personal or Business.
- **FR-2 (P0)** Customize each workspace's **name, color, and icon**.
- **FR-3 (P0)** Tabbed quick-switching between workspaces.
- **FR-4 (P0)** Tiled mode: multiple resizable, independent workspace panes (desktop).
- **FR-5 (P0)** Save and restore **named tiling layouts** (per user).
- **FR-6 (P0)** All Workspaces roll-up: per-workspace + combined net position.

### Accounts, transactions & import
- **FR-7 (P0)** Add/edit/delete accounts (any institution) with opening balance; live balance is
  **computed**.
- **FR-8 (P0)** **Bank-agnostic CSV import** with per-account column mapping and a **sign rule**.
- **FR-9 (P0)** Import flow is **preview-then-commit**, with per-row error flags, duplicate
  detection (flagged + user-overridable), and **undo**.
- **FR-10 (P0)** Optional **balance reconciliation** against a CSV running-balance column.
- **FR-11 (P0)** Full manual **CRUD on transactions**, including transfer flagging.
- **FR-12 (P0)** **Auto-categorization rules** (contains/equals → category) applied on import.

### Bills, recurrence & status
- **FR-13 (P0)** CRUD on bills (types: bill, invoice, payroll, tax, one-off) with **due dates**.
- **FR-14 (P0)** **Recurring schedules** that materialize upcoming bills on a rolling horizon.
- **FR-15 (P0)** **Mark bill paid** — linked to a transaction or standalone; reversible.
- **FR-16 (P0)** Upcoming/overdue surfacing (next 7/30 days; overdue highlighted).

### Budgeting, forecasting & planning
- **FR-17 (P0)** **Safe-to-spend** figure, **click-to-expand** showing its calculation.
- **FR-18 (P0)** **Cash-flow forecast** over a configurable horizon, flagging the low point.
- **FR-19 (P0)** **Spending by category** and **paid vs. unpaid** for a selectable period.
- **FR-20 (P0)** **Debt** tracking (balance, APR, minimum) and **goal** tracking (target,
  progress).
- **FR-21 (P1)** **Budget vs. actual** per category with progress indicators.
- **FR-22 (P1)** **Due-date calendar** view.
- **FR-23 (P1)** **Bill↔transaction auto-match** suggestions (user confirms).
- **FR-24 (P1)** **Command palette (⌘K)** for quick add/navigation.

### Income bridge
- **FR-25 (P0)** Tag a business outflow as **owner draw/distribution/salary → a target
  workspace**, auto-creating the linked income entry.
- **FR-26 (P0)** Roll-up **nets out** inter-workspace transfers to avoid double-counting.

### Access, trust & data
- **FR-27 (P0)** Authentication (email/password + Google OAuth).
- **FR-28 (P0)** **Per-workspace membership** with roles (admin/viewer) and org roles
  (owner/admin/member).
- **FR-29 (P0)** **Hard separation:** users see only granted workspaces, everywhere; the income
  bridge respects each side's membership independently.
- **FR-30 (P0)** **Invite** team members and assign workspace access.
- **FR-31 (P0)** **Audit log** (owner/admin-viewable).
- **FR-32 (P0)** **Export** transactions, bills, and roll-up to CSV/Excel.
- **FR-33 (P0)** Designed **empty/first-run** states.

### Reporting (v2)
- **FR-34 (P2)** **QuickBooks-style reports** over the existing ledger: Profit & Loss, cash-flow
  statement, expense by category/vendor with period-over-period comparison, A/P aging, owner-draw /
  inter-workspace transfer report — per-workspace and consolidated, exportable to PDF/CSV.

---

## 8. Non-functional requirements

- **NFR-1 — Money correctness.** No JavaScript float arithmetic on money; all monetary math uses a
  decimal library or Postgres `numeric`, rounded half-up to cents. Balances are computed, not
  stored. Dates are calendar dates (no timezone drift on due dates).
- **NFR-2 — Security.** Defense in depth: service-layer authorization **and** Postgres Row-Level
  Security on every table. A business-only user must be provably unable to read another workspace.
- **NFR-3 — Privacy.** Personal data is never exposed to a teammate not granted the Personal
  workspace, including via the income bridge or roll-up.
- **NFR-4 — Responsiveness.** Fully responsive from day one: desktop (tiling), tablet (single
  workspace), mobile (tabbed single workspace, stacked cards). Tiling is a desktop-only
  enhancement.
- **NFR-5 — Accessibility.** Keyboard navigable; sufficient contrast; status conveyed by
  icon/label, not color alone.
- **NFR-6 — Cost.** Zero recurring third-party cost for v1 (local Supabase in dev; CSV not Plaid).
- **NFR-7 — Data ownership/portability.** Users can export their data at any time; no lock-in.
- **NFR-8 — Reliability.** Atomic multi-step writes; production backup/restore plan before
  go-live.
- **NFR-9 — Maintainability.** TypeScript strict (no `any`); source files ≤ 450 LOC; business logic
  in the service layer; tests co-located.
- **NFR-10 — Extensibility.** A versioned `/api/v1` read API and membership-based access model so a
  future AI advisor can be added as a **separate, read-scoped microservice** without a rewrite.

---

## 9. UX & design principles

- **Single dense dashboard** per workspace (no sub-tabs) — everything important visible at once.
- **Safe-to-spend is the hero metric**, and it must be **traceable** (show its math).
- **Color-coded workspaces** for instant orientation, with status also shown via label/icon (not
  color alone).
- **Conventional, clean aesthetic** — clarity over novelty; this is a daily-use internal tool.
- **Preview before commit** for destructive/bulk actions (notably CSV import).
- **Never hard-delete** — archive instead (workspaces, batches).
- Reference: the approved [v1](docs/temp/budget-app-mockup-v1.html) and
  [Phase 2](docs/temp/budget-app-mockup-phase2.html) mockups.

---

## 10. Success metrics

Because v1 is a personal/team tool (not a public launch), success is measured by adoption and
trust rather than growth metrics:

- **Replaces the status quo:** the Owner manages all entities in Ledger instead of spreadsheets /
  separate tools.
- **No missed payments:** overdue bills surface reliably; due dates are trusted.
- **Trusted numbers:** safe-to-spend and forecasts are accurate enough that the Owner acts on them
  (the click-to-expand math reconciles to the penny).
- **Zero cross-workspace leaks:** a business-only teammate can never see Personal (verified by
  test and in practice).
- **Effortless bridge:** business→personal income is recognized without manual reconciliation.
- **Low-friction data entry:** CSV import + rules make monthly reconciliation fast (remembered
  mappings, auto-categorization, duplicate handling).

---

## 11. Release plan

| Milestone | Contents | Requirements |
|---|---|---|
| **Phase 1 — Data core** | Schema, auth, roles/RLS, accounts, transactions, CSV import, manual CRUD, workspace tabs + customization, audit log, export, mock-data dashboard components, empty states | FR-1–3, 7–15, 25, 27–33 (foundations) |
| **Phase 2 — Live dashboard** | Wire dashboard to live data; safe-to-spend, forecast, breakdowns, widgets; tiling + saved layouts; roll-up with netting; recurring materialization; debts/goals | FR-4–6, 16–20, 26 |
| **Phase 2.x — Convenience** | Calendar, budget-vs-actual, command palette, auto-match | FR-21–24 |
| **v2 — Reporting** | QuickBooks-style reports + export | FR-34 |
| **Later** | AI advisor (separate microservice), Plaid auto-sync, deeper payroll/tax, multi-tenant | — |

---

## 12. Dependencies & assumptions

- **Assumes** banks provide CSV/exportable transaction history (true for all major US banks).
- **Assumes** the Owner is willing to periodically download and import CSVs until Plaid is added.
- **Depends on** Supabase (Postgres + Auth), runnable locally for free during development.
- **Assumes** single currency (USD) for v1.
- **Assumes** modest scale (one organization, a handful of users, thousands of transactions).

---

## 13. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Floating-point errors in money math | Eroded trust in every number | Decimal-only arithmetic; unit tests assert correctness (NFR-1) |
| Cross-workspace data leak | Privacy breach (personal exposed to staff) | RLS + service-layer auth + bridge-privacy rule + explicit security test (NFR-2/3) |
| Bank CSV format variance (esp. credit cards) | Wrong-signed or misparsed imports | Per-account mapping + sign rule + preview + balance reconciliation (FR-8–10) |
| Duplicate or missing transactions on import | Inaccurate balances/forecasts | Dedupe hash (incl. running balance), preview overrides, balance check |
| Scope creep toward full accounting | Bloat, delayed value | Firm non-goals (§4); reports stay read-only views (FR-34) |
| Recurring-bill generation duplicates | Cluttered/incorrect forecasts | Idempotent rolling-horizon materialization (FR-14) |
| Manual data-entry burden | Abandonment | Remembered mappings, auto-categorization, ⌘K quick add, future Plaid |

---

## 14. Open questions

- Final **product name** and domain (placeholder "Ledger").
- **E2E testing** tooling (deferred to build time).
- When (and whether) to prioritize **Plaid auto-sync** vs. **v2 reporting** after the first usable
  release.
