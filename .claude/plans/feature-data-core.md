# Phase 1 — Data Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data foundation of Ledger — schema, money/date primitives, auth, RLS, the service/repository layers for accounts/transactions/categories/bills, the CSV import pipeline, the cross-workspace income bridge, audit log, export, workspace tabs, and presentational dashboard components fed by mock data — so the app is a navigable, secure, correctly-computing shell ready for Phase 2 to wire live.

**Architecture:** One Next.js (App Router) deployment, strictly layered: UI → Service layer (business logic, money math, authorization) → Repository layer (Prisma) → Postgres (Supabase, local). A versioned `/api/v1` read API is reserved for the future AI advisor. Defense-in-depth security: service-layer authorization checks on every read/write **and** Postgres Row-Level Security *forced* on every table — the runtime connects as a non-privileged, RLS-subject role, so the database independently enforces isolation even if a service check is ever missed. Money is decimal end-to-end; dates are calendar dates.

**Tech Stack:** Next.js (App Router) · TypeScript (strict, no `any`) · Supabase (Postgres + Auth, local via `supabase start`) · Prisma · Zod · Tailwind CSS · shadcn/ui · decimal.js · Vitest · pnpm.

## Global Constraints

Copied verbatim from the spec/PRD/CLAUDE.md. Every task's requirements implicitly include these.

- **No JavaScript float math on money.** All monetary arithmetic uses `decimal.js` or Postgres `numeric(14,2)`. Rounding is **half-up to cents**. Raw JS `+`/`*`/`-` on money values is forbidden.
- **Balances are computed**, never stored: `account.balance = openingBalance + Σ(transactions)`.
- **Dates are calendar dates, not timestamps** for transaction dates and bill due dates. Use a date-only type/string (`YYYY-MM-DD`); a timezone offset must never shift a date by a day.
- **Transfers excluded** from income/expense/category math via `isTransfer`.
- **TypeScript strict; no `any` types.** (`tsconfig` strict + `noUncheckedIndexedAccess`.)
- **Source files ≤ 450 LOC** (markdown exempt). Split before exceeding.
- **Business logic lives in the service layer**, never in components or route handlers.
- **Tests co-located** with source as `*.test.ts`.
- **Zod at every boundary**: forms, `/api/v1`, and per-row CSV parse. Schemas shared client↔server.
- **Defense in depth:** service-layer authorization AND Postgres RLS on every table. A business-only user must be provably unable to read another workspace.
- **Income-bridge privacy:** each side of a `WorkspaceTransfer` respects its own workspace's membership independently.
- **Never hard-delete** — archive instead (workspaces, import batches). (Mirrors CLAUDE.md Rule 1.)
- **Atomicity:** multi-step writes (import commit, bill-payment, owner-draw) wrapped in DB transactions.
- **Package manager: pnpm.** All commands use `pnpm`.
- **Single currency (USD)** for v1.

---

## File Structure

Locked-in decomposition. Each file has one responsibility; split by responsibility, not layer.

```
budget-app/
├── prisma/
│   ├── schema.prisma                 # full data model (may split via prismaSchemaFolder if >450 LOC)
│   ├── migrations/                   # generated SQL migrations (committed)
│   └── seed.ts                       # dev seed: org, workspaces, default categories, demo data
├── supabase/
│   ├── config.toml                   # local stack config (committed)
│   └── migrations/                   # RLS + policy SQL (committed)
├── src/
│   ├── app/
│   │   ├── layout.tsx                # root layout (fonts, Tailwind, providers)
│   │   ├── page.tsx                  # redirect → /w (workspace switcher) or /login
│   │   ├── login/page.tsx            # email/password + Google OAuth
│   │   ├── auth/callback/route.ts    # Supabase OAuth code exchange
│   │   ├── (app)/
│   │   │   ├── layout.tsx            # authed shell: tab bar + content
│   │   │   ├── w/[workspaceId]/page.tsx   # single-workspace dashboard (mock data in P1)
│   │   │   ├── w/[workspaceId]/import/page.tsx  # CSV import wizard
│   │   │   ├── w/[workspaceId]/audit/page.tsx   # audit log view
│   │   │   └── all/page.tsx          # All-Workspaces roll-up (shell in P1)
│   │   └── api/v1/
│   │       └── workspaces/route.ts   # first versioned read endpoint (seam proof)
│   ├── components/
│   │   ├── ui/                        # shadcn primitives (generated)
│   │   ├── workspace/                 # tab bar, customization dialog
│   │   ├── dashboard/                 # presentational KPI/forecast/bills/etc. (mock-fed in P1)
│   │   ├── transactions/              # transaction table + CRUD forms
│   │   ├── bills/                     # bill list + CRUD + mark-paid
│   │   ├── import/                    # upload/map/preview/commit wizard steps
│   │   └── empty/                     # empty/first-run states
│   ├── services/
│   │   ├── authz.ts                  # membership + role assertions
│   │   ├── workspace-service.ts
│   │   ├── account-service.ts
│   │   ├── category-service.ts
│   │   ├── transaction-service.ts
│   │   ├── bill-service.ts
│   │   ├── import/                    # csv parse, mapping, enrich, dedupe, reconcile, commit, undo
│   │   ├── transfer-service.ts        # owner-draw / income bridge
│   │   ├── audit-service.ts
│   │   └── export-service.ts
│   ├── repositories/                  # thin Prisma data access, one file per aggregate
│   ├── lib/
│   │   ├── money.ts                  # decimal.js helpers (the money primitive)
│   │   ├── calendar-date.ts          # calendar-date primitive
│   │   ├── dedupe.ts                 # transaction dedupeHash
│   │   ├── supabase/                 # browser + server SSR clients
│   │   ├── prisma.ts                 # Prisma client singleton (+ RLS connection auth)
│   │   ├── zod/                       # shared Zod schemas per entity
│   │   ├── mock/                      # mock dashboard data (P1 only)
│   │   └── env.ts                     # Zod-validated environment loader
├── .env.example
└── docs/temp/                          # mockups land here (user-provided)
```

---

## Task Sequencing Overview

- **Tasks 1–3:** Scaffold + local Supabase + Prisma wiring (infrastructure).
- **Tasks 4–6:** Money + calendar-date + dedupe primitives (pure, heavily unit-tested). *These come before schema so services can rely on them.*
- **Tasks 7–9:** Prisma schema (identity, ledger, obligations/planning/config) + migrations.
- **Task 10:** Security plumbing — the RLS-subject `app_runtime` role, `rlsClientFor` (transaction-local claim auth), and Supabase SSR clients. *Built before the policies so the security test can run.*
- **Task 11:** Forced RLS policies on every table + the headline cross-workspace security test (via `rlsClientFor`).
- **Tasks 12–13:** Authorization service, then shared Zod schemas.
- **Task 14:** Shared Zod schemas.
- **Tasks 15–23:** Service + repository layers (workspace, account, category, transaction, bill, import, transfer, audit, export).
- **Task 24:** `/api/v1` seam proof.
- **Tasks 25–30:** UI (shell + auth, tab bar + customization, dashboard mock components, manual CRUD, import wizard, empty states + audit/export views).
- **Task 31:** Organization bootstrap, membership management & email invites (closes FR-28/30 + first-run).

Each task ends with an independently testable deliverable and a commit.

---

## Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `.prettierrc`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/env.ts`

**Interfaces:**
- Produces: pnpm scripts `dev`, `build`, `start`, `lint`, `type-check`, `test`, `test:watch`; path alias `@/*` → `src/*`; `env` object exporting validated `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Scaffold Next.js app** — Run `pnpm create next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-pnpm --no-turbopack` (accept into the non-empty dir; keep existing docs/README). Verify `src/app/` exists.
- [ ] **Step 2: Enable strict TS** — In `tsconfig.json` set `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`. Add `"type-check": "tsc --noEmit"` to `package.json` scripts.
- [ ] **Step 3: Add tooling deps** — `pnpm add decimal.js zod` and `pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths prettier`. Create `vitest.config.ts` using `vite-tsconfig-paths` so `@/*` resolves in tests; add scripts `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] **Step 4: Env loader** — Write `src/lib/env.ts`: a Zod schema parsing `process.env` into a typed, frozen `env` object; throw a readable error listing missing keys on startup.

```ts
// src/lib/env.ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
}
export const env = Object.freeze(parsed.data);
```

- [ ] **Step 5: Verify** — Run `pnpm type-check` (PASS), `pnpm lint` (PASS), `pnpm test` (no tests yet → exits 0).
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: scaffold Next.js + TS strict + Tailwind + tooling"`

---

## Task 2: Local Supabase dev environment

**Files:**
- Create: `supabase/config.toml`, `.env.example`, `.env.local` (gitignored)

**Interfaces:**
- Produces: a running local Postgres (`DATABASE_URL`, `DIRECT_URL`), local Auth (anon + service-role keys), Google OAuth configured for `localhost`.

- [ ] **Step 1: Invoke the setup skill** — Use the `local-supabase-setup` skill (greenfield mode) to scaffold Docker + Supabase local stack, env wiring, and Google OAuth localhost config. Follow its steps; it owns `supabase init`, `config.toml`, and `.env` scaffolding.
- [ ] **Step 2: Start the stack** — Run `supabase start`; capture the printed `API URL`, `anon key`, `service_role key`, and DB connection string.
- [ ] **Step 3: Populate env** — Fill `.env.local` with the captured values. `DATABASE_URL` uses the pooled port (6543) with `?pgbouncer=true`; `DIRECT_URL` uses the direct port (5432) for migrations. Mirror keys (no secrets) into `.env.example`.
- [ ] **Step 4: Verify** — Run `supabase status` (all services healthy) and confirm Studio reachable at its local URL. Confirm `src/lib/env.ts` loads without throwing via a one-off `pnpm tsx -e "import('@/lib/env').then(m=>console.log(Object.keys(m.env)))"` (or equivalent node check).
- [ ] **Step 5: Commit** — `git add supabase/config.toml .env.example && git commit -m "chore: local Supabase dev environment"` (never commit `.env.local`).

---

## Task 3: Prisma wiring

**Files:**
- Create: `prisma/schema.prisma` (datasource + generator only, for now), `src/lib/prisma.ts`

**Interfaces:**
- Produces: `prisma` (PrismaClient singleton). Datasource uses `DATABASE_URL` (pooled) + `directUrl` (`DIRECT_URL`).

- [ ] **Step 1: Install** — `pnpm add @prisma/client && pnpm add -D prisma tsx`. Add scripts: `"db:migrate": "prisma migrate dev"`, `"db:seed": "tsx prisma/seed.ts"`, `"db:studio": "prisma studio"`.
- [ ] **Step 2: Datasource/generator** — Write `prisma/schema.prisma` header:

```prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- [ ] **Step 3: Client singleton** — Write `src/lib/prisma.ts` with the standard global-singleton guard to avoid hot-reload connection storms.
- [ ] **Step 4: Verify** — `pnpm prisma migrate dev --name init_datasource` (creates an empty migration / baseline) and `pnpm prisma generate` succeed against the local DB.
- [ ] **Step 5: Commit** — `git add prisma src/lib/prisma.ts package.json && git commit -m "chore: wire Prisma to local Supabase"`

---

## Task 4: Money primitive (`lib/money.ts`)

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Produces: `type Money` (branded), `money(value: string | number | Decimal): Money`, `add`, `sub`, `mul`, `sum(values: Money[]): Money`, `toCents(m: Money): bigint`, `format(m: Money): string`, `isNegative`, `compare`. All return/operate on `Decimal` internally; rounding **half-up to 2 dp** on materialization. No function accepts the result of raw JS float math.

- [ ] **Step 1: Write failing tests** — Cover: `0.1 + 0.2 === 0.30` exactly; half-up rounding (`2.345 → 2.35`, `-2.345 → -2.35` magnitude); `sum([])` is `0.00`; large sums stay exact; `format` renders `$1,234.56` and `-$3.00`; `toCents(2.35) === 235n`.

```ts
import { describe, it, expect } from "vitest";
import { money, add, sum, format, toCents } from "@/lib/money";

describe("money", () => {
  it("adds without float error", () => {
    expect(format(add(money("0.10"), money("0.20")))).toBe("$0.30");
  });
  it("rounds half-up to cents", () => {
    expect(format(money("2.345"))).toBe("$2.35");
  });
  it("sums an empty list to zero", () => {
    expect(format(sum([]))).toBe("$0.00");
  });
  it("converts to integer cents", () => {
    expect(toCents(money("2.35"))).toBe(235n);
  });
});
```

- [ ] **Step 2: Run → FAIL** — `pnpm vitest run src/lib/money.test.ts` (module not found).
- [ ] **Step 3: Implement** — Wrap `decimal.js`; configure `Decimal.set({ rounding: Decimal.ROUND_HALF_UP })`; brand the type so a plain number can't be passed where `Money` is expected.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: decimal money primitive with half-up rounding"`

---

## Task 5: Calendar-date primitive (`lib/calendar-date.ts`)

**Files:**
- Create: `src/lib/calendar-date.ts`
- Test: `src/lib/calendar-date.test.ts`

**Interfaces:**
- Produces: `type CalendarDate` (branded `string` `YYYY-MM-DD`), `calendarDate(s: string): CalendarDate`, `today(tz?: string): CalendarDate`, `addDays`, `compare`, `isBefore`, `isAfter`, `toUtcDate(d): Date` (midnight UTC, for Prisma `@db.Date`), `fromDbDate(d: Date): CalendarDate`. No timezone math ever shifts the day.

- [ ] **Step 1: Write failing tests** — `calendarDate("2026-02-28")` round-trips; `addDays("2026-02-28", 1) === "2026-03-01"` (leap year 2026? no — 2026 not leap, Feb has 28; assert `2026-03-01`); `toUtcDate("2026-06-20")` is `2026-06-20T00:00:00.000Z`; `fromDbDate(new Date("2026-06-20T00:00:00Z")) === "2026-06-20"`; rejects `"2026-13-01"`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — Pure string/UTC arithmetic; never use local-time `Date` constructors that apply an offset.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: calendar-date primitive (no timezone drift)"`

---

## Task 6: Dedupe hash (`lib/dedupe.ts`)

**Files:**
- Create: `src/lib/dedupe.ts`
- Test: `src/lib/dedupe.test.ts`

**Interfaces:**
- Produces: `dedupeHash(input: { accountId: string; date: CalendarDate; amount: Money; description: string; runningBalance?: Money | null }): string` — stable SHA-256 over normalized fields (trimmed/lowercased description, cents-string amount, ISO date, optional running balance). Two identical rows → same hash; any field change → different hash.

- [ ] **Step 1: Write failing tests** — identical inputs produce identical hashes; differing amount/description/date/runningBalance each change the hash; description whitespace/case normalized.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — Use Node `crypto.createHash("sha256")`; amount via `toCents`; deterministic field order.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: transaction dedupe hash"`

---

## Task 7: Schema — identity & access

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `prisma/schema.identity.test.ts` (smoke: client types compile + a created org/workspace round-trips)

**Interfaces:**
- Produces models: `Organization`, `OrgMembership(role: OrgRole)`, `Workspace(type: WorkspaceType, color, icon?, sortOrder)`, `WorkspaceMembership(role: WorkspaceRole)`; enums `OrgRole(owner|admin|member)`, `WorkspaceRole(admin|viewer)`, `WorkspaceType(personal|business)`. `Workspace.archivedAt: DateTime?` (soft-delete). User identity is Supabase `auth.users`; we store `userId String` (uuid) without an FK to the auth schema.

- [ ] **Step 1: Write failing smoke test** — create an Organization + Workspace + memberships via Prisma in a transaction, read them back, assert fields. (Runs against local DB.)
- [ ] **Step 2: Run → FAIL** (models don't exist).
- [ ] **Step 3: Add models** — Add the identity models with `@@index([organizationId])`, `@@unique([organizationId, userId])` on OrgMembership, `@@unique([workspaceId, userId])` on WorkspaceMembership. `Workspace.sortOrder Int`, `color String`, `icon String?`, `archivedAt DateTime?`.
- [ ] **Step 4: Migrate** — `pnpm prisma migrate dev --name identity_access`.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** — `git commit -am "feat(schema): identity & access models"`

---

## Task 8: Schema — money sources & ledger

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `prisma/schema.ledger.test.ts`

**Interfaces:**
- Produces: `Account(type: AccountType, institution, last4?, openingBalance Decimal @db.Decimal(14,2), openingDate @db.Date, currency)`, `Transaction(date @db.Date, amount Decimal @db.Decimal(14,2), description, merchant?, categoryId?, notes?, source: TxSource, importBatchId?, dedupeHash, isTransfer Boolean, transferPairId?, billId?)`, `Category(kind: CategoryKind, parentId?)`, `ImportBatch(filename, rowCount, importedAt, status, archivedAt?)`. Enums `AccountType(checking|savings|credit_card|loan|cash)`, `TxSource(csv|manual)`, `CategoryKind(income|expense)`. Every record carries `workspaceId`. Indexes: `@@index([workspaceId, date])` on Transaction, `@@index([workspaceId, accountId, dedupeHash])`.

- [ ] **Step 1: Write failing smoke test** — create account + two transactions (one transfer), read back; assert `amount` is a `Prisma.Decimal` and `date` round-trips as calendar date.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Add models** — All money columns `@db.Decimal(14,2)`; all dates `@db.Date`. Add relations (Account→Transaction, Category self-relation, ImportBatch→Transaction).
- [ ] **Step 4: Migrate** — `pnpm prisma migrate dev --name money_ledger`.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** — `git commit -am "feat(schema): accounts, transactions, categories, import batches"`

---

## Task 9: Schema — obligations, planning, config, cross-workspace

**Files:**
- Modify: `prisma/schema.prisma` (consider `prismaSchemaFolder` preview to keep files ≤450 LOC)
- Test: `prisma/schema.obligations.test.ts`

**Interfaces:**
- Produces: `Bill(vendor, amount Decimal(14,2), dueDate @db.Date, status: BillStatus, type: BillType, categoryId?, payFromAccountId?, recurringScheduleId?, paidTransactionId?, notes?)`; `RecurringSchedule(frequency: Frequency, interval, dayOfMonth?, dayOfWeek?, startDate @db.Date, endDate? @db.Date, nextRunDate @db.Date, + template vendor/amount/categoryId)`; `Debt(name, type, currentBalance Decimal(14,2), apr Decimal, minimumPayment Decimal(14,2), dueDay Int, accountId?)`; `Goal(name, targetAmount Decimal(14,2), targetDate? @db.Date, currentSaved Decimal(14,2), status, notes?)`; `WorkspaceTransfer(organizationId, fromWorkspaceId, toWorkspaceId, type: TransferType, amount Decimal(14,2), date @db.Date, fromTransactionId?, toTransactionId?, notes?)`; `ImportMapping(accountId, columnMap Json, signRule: SignRule, dateFormat)`; `CategoryRule(workspaceId, match: MatchKind, pattern, categoryId, priority)`; `Budget(workspaceId, categoryId, period, amount Decimal(14,2))`; `Layout(userId, organizationId, name, config Json)`; `AuditLog(organizationId, workspaceId?, userId, action, entityType, entityId, before? Json, after? Json, at)`. Enums: `BillStatus(unpaid|scheduled|paid|overdue)`, `BillType(bill|invoice|payroll|tax|one_off)`, `Frequency(weekly|monthly|quarterly|annual|custom)`, `TransferType(owner_draw|distribution|salary|transfer)`, `SignRule(single_signed|separate_debit_credit|invert)`, `MatchKind(contains|equals)`.

- [ ] **Step 1: Write failing smoke test** — create a Bill + RecurringSchedule + WorkspaceTransfer (cross-workspace) and read back.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Add models** — with indexes `@@index([workspaceId, dueDate])` on Bill, `@@index([organizationId])` on WorkspaceTransfer/AuditLog.
- [ ] **Step 4: Migrate** — `pnpm prisma migrate dev --name obligations_planning_config`.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** — `git commit -am "feat(schema): bills, recurrence, debts, goals, transfers, config, audit"`

---

## Task 10: Security plumbing — RLS runtime role, `rlsClientFor`, Supabase clients

> Built **before** the policies (Task 11) so the security test has its harness. This task creates the unprivileged runtime role and the only sanctioned way to issue RLS-scoped queries.

**Files:**
- Create: `supabase/migrations/<ts>_app_runtime_role.sql`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/prisma-rls.ts`
- Test: `src/lib/prisma-rls.test.ts`

**Interfaces:**
- Produces: `createServerClient()` / `createBrowserClient()` (`@supabase/ssr`); `getCurrentUser(): Promise<{ id: string } | null>`; `rlsClientFor(userId: string)` — runs every operation inside a `prisma.$transaction` whose **first statement** is `SELECT set_config('request.jwt.claims', '{"sub":"<userId>"}', true)` (transaction-local → pgbouncer-transaction-mode safe; cannot leak across pooled connections), so RLS sees the user. Consumed by every service. Also produces a SQL helper `app.current_user_id()` reading `request.jwt.claims → sub` (used by Task 11's policies).

**Security architecture (the crux of "RLS as a real enforcer"):**
- For RLS to actually constrain queries, Prisma must connect at runtime as a role that is **subject to** RLS — never the table owner, `postgres`, or `service_role` (those bypass RLS). This task introduces `app_runtime`: a login role with `NOBYPASSRLS`, granted only `SELECT/INSERT/UPDATE/DELETE` on app tables (no DDL). Runtime `DATABASE_URL` authenticates as `app_runtime`; the privileged `DIRECT_URL` is used **only** for `prisma migrate` and the seed.
- `set_config(..., true)` is **transaction-scoped** (`true` = `is_local`), so the claim is wiped at transaction end and never bleeds onto the next borrower of a pooled connection. All RLS-scoped reads/writes therefore MUST go through `rlsClientFor` (which always wraps a transaction). Bare `prisma` (no claim) will see **zero** rows once policies land — by design.
- Defense in depth: the service layer still calls `authz` on every mutation; forced RLS (Task 11) is the independent database guarantee beneath it.

- [ ] **Step 1: Install** — `pnpm add @supabase/ssr @supabase/supabase-js`.
- [ ] **Step 2: Create the runtime role + claim helper** — SQL migration (run via privileged `DIRECT_URL`): `CREATE ROLE app_runtime LOGIN PASSWORD '<local>' NOBYPASSRLS;`; `GRANT USAGE ON SCHEMA public/app`; `GRANT SELECT/INSERT/UPDATE/DELETE ON ALL TABLES` (+ default privileges for future tables); no DDL, no `BYPASSRLS`. Add `CREATE FUNCTION app.current_user_id() RETURNS uuid` returning `(current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid`. Switch `DATABASE_URL` to authenticate as `app_runtime`; keep `DIRECT_URL` privileged. Update `.env.example` (keys only) + `.env.local`.
- [ ] **Step 3: Write failing tests** — within a `rlsClientFor(userX.id)` transaction, `SELECT current_setting('request.jwt.claims', true)` returns a JSON containing `userX.id`; the claim does **not** persist across two sequential `rlsClientFor` calls on the same pooled connection (second call with no claim → empty setting). (Full row-isolation is asserted in Task 11 once policies exist.)
- [ ] **Step 4: Implement** — SSR cookie clients; `rlsClientFor` using `prisma.$transaction` with the `set_config` prelude. Document that all RLS-scoped reads/writes go through `rlsClientFor`, and that migrations/seed use the privileged direct connection.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** — `git commit -am "feat(security): RLS-subject runtime role + transaction-local claim auth + SSR clients"`

---

## Task 11: Forced RLS policies + cross-workspace security test

**Files:**
- Create: `supabase/migrations/<ts>_rls_policies.sql`
- Test: `src/services/security.rls.test.ts` (the headline security test)

**Interfaces:**
- Consumes: `rlsClientFor`, `app.current_user_id()` (Task 10).
- Produces: RLS **enabled and FORCED** (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`) on every app table — applies even to the table owner. Workspace-scoped tables keyed to `WorkspaceMembership`; org-scoped tables to `OrgMembership`; `WorkspaceTransfer` to the both-sides/org-admin privacy rule.

- [ ] **Step 1: Write the failing security test** — Two users, two workspaces (Personal owned by User A; Business shared with User B). Assert, querying through `rlsClientFor(userB.id)` (bypassing the service layer to prove the DB itself enforces isolation):
  - transactions query returns only Business rows and **zero** Personal rows;
  - a direct read of a Personal transaction id returns null/empty;
  - **WorkspaceTransfer:** an owner-draw Business→Personal exists; User B (business-only, not a Personal member) gets **zero** transfer rows — the row's existence is hidden, not column-masked;
  - the Business-side outflow `Transaction` is still visible to User B (it lives in their workspace).

```ts
it("a business-only user cannot read Personal rows", async () => {
  const asB = rlsClientFor(userB.id);
  const rows = await asB.transaction.findMany({ where: { workspaceId: personal.id } });
  expect(rows).toHaveLength(0);
});
it("a business-only user cannot see the cross-workspace transfer at all", async () => {
  const asB = rlsClientFor(userB.id);
  const transfers = await asB.workspaceTransfer.findMany();
  expect(transfers).toHaveLength(0); // row hidden by RLS, not column-masked in app code
});
```

- [ ] **Step 2: Run → FAIL** (no policies yet → rows leak, or — if `DATABASE_URL` already points at `app_runtime` with RLS not yet enabled — rows still visible because RLS is off).
- [ ] **Step 3: Write policies** — Enable **and force** RLS on every table. Workspace-scoped tables: `USING (workspace_id IN (SELECT workspace_id FROM workspace_membership WHERE user_id = app.current_user_id()))` (with matching `WITH CHECK` on writes). Org-scoped tables (Organization, OrgMembership, AuditLog, Layout) keyed to org membership. **WorkspaceTransfer (privacy rule — row-level, no app masking):** visible only to a caller who is a member of **both** sides, or an org owner/admin:

```sql
ALTER TABLE workspace_transfer ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_transfer FORCE ROW LEVEL SECURITY;
CREATE POLICY wt_select ON workspace_transfer FOR SELECT USING (
  EXISTS (SELECT 1 FROM org_membership om
          WHERE om.organization_id = workspace_transfer.organization_id
            AND om.user_id = app.current_user_id()
            AND om.role IN ('owner','admin'))
  OR (
    from_workspace_id IN (SELECT workspace_id FROM workspace_membership WHERE user_id = app.current_user_id())
    AND to_workspace_id   IN (SELECT workspace_id FROM workspace_membership WHERE user_id = app.current_user_id())
  )
);
```
  A business-only teammate (no Personal membership) cannot see the transfer **row at all** — enforced by the database, not by the app remembering to hide a column. The two underlying `Transaction` rows remain governed by their own workspace's RLS.
- [ ] **Step 4: Apply** — `supabase migration up` (or `supabase db reset` in dev).
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** — `git commit -am "feat(security): forced RLS policies + cross-workspace + bridge-privacy tests"`

---

## Task 12: Authorization service (`services/authz.ts`)

**Files:**
- Create: `src/services/authz.ts`
- Test: `src/services/authz.test.ts`

**Interfaces:**
- Produces: `assertWorkspaceAccess(userId, workspaceId, need: "viewer" | "admin"): Promise<void>` (throws `ForbiddenError`); `assertOrgRole(userId, orgId, need: OrgRole)`; `listAccessibleWorkspaces(userId): Promise<Workspace[]>`; `class ForbiddenError extends Error`. Consumed by all mutating services.

- [ ] **Step 1: Write failing tests** — admin passes admin+viewer checks; viewer passes viewer but throws on admin; non-member throws; org owner sees all workspaces; member sees only granted.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — query memberships via `rlsClientFor` / direct admin client as appropriate; role hierarchy `admin ⊇ viewer`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: service-layer authorization"`

---

## Task 13: Shared Zod schemas (`lib/zod/`)

**Files:**
- Create: `src/lib/zod/{workspace,account,transaction,bill,category,import,transfer}.ts`, `src/lib/zod/money.ts`
- Test: `src/lib/zod/*.test.ts` (one per schema file)

**Interfaces:**
- Produces: input/output schemas per entity (`createWorkspaceSchema`, `updateTransactionSchema`, `csvRowSchema`, etc.). `money.ts` exports `zMoney` (accepts string, validates 2-dp, coerces to `Money`) and `zCalendarDate` (validates `YYYY-MM-DD`). Shared client↔server.

- [ ] **Step 1: Write failing tests** — `zMoney` rejects `"1.234"` and floats; accepts `"10.00"`; `zCalendarDate` rejects `"2026-13-40"`; `createWorkspaceSchema` requires name/type/color.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — schemas reuse the money/date primitives for parsing.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: shared Zod schemas at every boundary"`

---

## Task 14: Workspace service + repository

**Files:**
- Create: `src/repositories/workspace-repo.ts`, `src/services/workspace-service.ts`
- Test: `src/services/workspace-service.test.ts`

**Interfaces:**
- Consumes: `authz`, `rlsClientFor`, `createWorkspaceSchema`, `audit` (Task 21 — call is added when audit lands; until then a no-op shim).
- Produces: `createWorkspace`, `updateWorkspace` (name/color/icon/sortOrder), `archiveWorkspace` (sets `archivedAt`, never deletes), `listWorkspaces(userId)`, `getWorkspace`. Returns domain types (Decimal→Money mapped at the boundary).

- [ ] **Step 1: Write failing tests** — create requires org-admin; update customization persists; `archiveWorkspace` soft-deletes (row still present, `archivedAt` set, excluded from `listWorkspaces`); non-member can't read.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — repo does Prisma I/O; service does authz + validation + audit. Enforce "never hard-delete."
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: workspace service (CRUD + customization + archive)"`

---

## Task 15: Account service + computed balance

**Files:**
- Create: `src/repositories/account-repo.ts`, `src/services/account-service.ts`
- Test: `src/services/account-service.test.ts`

**Interfaces:**
- Consumes: `authz`, `money` (`sum`, `add`), `rlsClientFor`.
- Produces: `createAccount`, `updateAccount`, `archiveAccount`, `listAccounts(workspaceId)`, `getAccountBalance(accountId): Promise<Money>` = `openingBalance + Σ(transactions.amount)` computed via SQL `SUM` cast through `money`, never stored.

- [ ] **Step 1: Write failing tests** — balance of account with opening `100.00` + tx `-25.50` + tx `+10.00` = `84.50` (assert exact, via `format`); empty account = opening balance; balance never persisted (no `balance` column).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — aggregate with Prisma `aggregate({ _sum: { amount } })`, wrap result in `money`, `add` opening.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: account service with computed balances"`

---

## Task 16: Category service + seeding + CategoryRule

**Files:**
- Create: `src/repositories/category-repo.ts`, `src/services/category-service.ts`, `src/services/category-rule-service.ts`, `src/lib/default-categories.ts`
- Test: `src/services/category-service.test.ts`, `src/services/category-rule-service.test.ts`

**Interfaces:**
- Produces: `seedDefaultCategories(workspaceId)` (income/expense defaults); CRUD on categories (with parent); `applyRules(workspaceId, tx): categoryId | null` — first match by `priority` (contains/equals on description/merchant).

- [ ] **Step 1: Write failing tests** — seeding creates the default set; `applyRules` returns the highest-priority matching category; `equals` vs `contains` semantics; no match → null.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: categories, defaults, and auto-categorization rules"`

---

## Task 17: Transaction service (CRUD, transfer flag, dedupe)

**Files:**
- Create: `src/repositories/transaction-repo.ts`, `src/services/transaction-service.ts`
- Test: `src/services/transaction-service.test.ts`

**Interfaces:**
- Consumes: `authz`, `money`, `dedupeHash`, `calendarDate`, `applyRules`.
- Produces: `createTransaction`, `updateTransaction`, `deleteTransaction` (hard delete allowed for transactions per spec §9 referential cleanup — deleting a bill-paying tx reopens its bill), `listTransactions(workspaceId, { page })`, `flagTransfer(txId, pairId)`. On create: compute `dedupeHash`, run `applyRules` if no category, exclude transfers from totals downstream.

- [ ] **Step 1: Write failing tests** — create computes dedupeHash + auto-category; transfer pair links both rows and sets `isTransfer`; deleting a bill-paying tx flips the bill back to `unpaid` and clears `paidTransactionId`; pagination.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — referential cleanup in a `$transaction`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: transaction service (CRUD, transfers, dedupe, referential cleanup)"`

---

## Task 18: Bill service (CRUD, mark-paid)

**Files:**
- Create: `src/repositories/bill-repo.ts`, `src/services/bill-service.ts`
- Test: `src/services/bill-service.test.ts`

**Interfaces:**
- Consumes: `authz`, `money`, `calendarDate`, `transaction-service`.
- Produces: `createBill`, `updateBill`, `deleteBill`, `listBills(workspaceId, { window })`, `markPaid(billId, { transactionId? | payFromAccountId? })` (atomic: links or creates the paying transaction, sets `status=paid`, `paidTransactionId`), `markUnpaid(billId)` (reverses). `upcomingAndOverdue(workspaceId, today)` returns next 7/30-day + overdue split. (Recurring **materialization** is Phase 2; schema + manual bills only here.)

- [ ] **Step 1: Write failing tests** — markPaid with existing tx links it and flips status; markPaid standalone with `payFromAccountId` creates a linked tx atomically; markUnpaid reverses; overdue detection uses calendar `today` (no tz drift); deleting the paying tx reopens the bill (cross-check Task 17).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — all multi-step writes in `$transaction`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: bill service (CRUD, mark-paid/unpaid, upcoming/overdue)"`

---

## Task 19: CSV import pipeline

**Files:**
- Create: `src/services/import/parse.ts`, `mapping.ts`, `sign-rule.ts`, `enrich.ts`, `reconcile.ts`, `commit.ts`, `undo.ts`, `src/services/import/index.ts`
- Create: `src/repositories/import-repo.ts`
- Test: co-located `*.test.ts` for each step + `src/services/import/pipeline.test.ts`

**Interfaces:**
- Consumes: `csvRowSchema`, `money`, `calendarDate`, `dedupeHash`, `applyRules`, `account-service`, `authz`.
- Produces: `previewImport(input): Promise<ImportPreview>` (parse → apply mapping → sign rule → enrich → dedupe-flag → reconcile) and `commitImport(preview, decisions): Promise<ImportBatch>` (atomic insert + batch) and `undoImport(batchId)` (archives batch + removes its rows). `signRule` converts `single_signed | separate_debit_credit | invert` to a signed `Money` (credit-card exports not booked as income). `ImportPreview` rows carry `{ parsed, proposedCategoryId, isTransferGuess, isDuplicate, errors[] }`. Bad rows flag per-row without blocking good rows.

- [ ] **Step 1: Write failing tests (sign rule)** — `single_signed` keeps sign; `separate_debit_credit` maps debit→negative, credit→positive; `invert` flips (credit-card statement). Assert via `format`.
- [ ] **Step 2–4: parse/mapping** — per-account column map + date format → typed rows; malformed cells → per-row `errors`, others proceed. Tests then implementation.
- [ ] **Step 5–7: enrich/dedupe/reconcile** — proposed category via `applyRules`; transfer guess; `isDuplicate` via `dedupeHash` (pre-checked-for-skip but overridable); running-balance reconciliation warns on computed-vs-reported mismatch, skipped gracefully when absent.
- [ ] **Step 8–10: commit/undo** — `commitImport` inserts rows + `ImportBatch` atomically (`$transaction`); duplicates honored per user decision; `undoImport` archives the batch and deletes its rows. Tests assert atomicity (a mid-batch failure inserts nothing) and undo restores prior balance.
- [ ] **Step 11: Run full pipeline test → PASS.**
- [ ] **Step 12: Commit** — `git commit -am "feat: bank-agnostic CSV import pipeline (preview→commit→undo)"`

---

## Task 20: Income bridge (owner-draw / WorkspaceTransfer)

**Files:**
- Create: `src/services/transfer-service.ts`, `src/repositories/transfer-repo.ts`
- Test: `src/services/transfer-service.test.ts`

**Interfaces:**
- Consumes: `authz` (the writer must be admin on the **from** workspace; the matching income entry is written into the **to** workspace by the system on the owner's behalf), `money`, `transaction-service`.
- Produces: `tagOwnerDraw({ fromWorkspaceId, fromTransactionId | amount+date, toWorkspaceId, type })` — atomically creates/links the business outflow and the matching Personal **income** transaction, plus the `WorkspaceTransfer` record. `from/toTransactionId` nullable (draw recognized before deposit clears). **Privacy is enforced by the database (Task 11 forced RLS), not by this service masking columns:** the transfer row is only readable by a caller who is a member of both sides or an org owner/admin; each underlying `Transaction` is governed by its own workspace's RLS.

- [ ] **Step 1: Write failing tests** — tagging creates two linked transactions + transfer atomically; the Personal side reads as income; a caller who is a member of only the business side sees the business outflow `Transaction` but, when querying through `rlsClientFor`, gets **zero** `WorkspaceTransfer` rows and **cannot** read the Personal income transaction (re-asserts the Task 11 guarantee at the service boundary); a rollback on failure leaves neither side and no transfer.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `$transaction` for atomicity; authorize the writer on the from-side; rely on forced RLS for read privacy (no app-layer column masking). Writes use a context that can populate both workspaces (owner/admin performing the draw is a member of both).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: income bridge (atomic) with DB-enforced per-side privacy"`

---

## Task 21: Audit log service

**Files:**
- Create: `src/services/audit-service.ts`, `src/repositories/audit-repo.ts`
- Test: `src/services/audit-service.test.ts`

**Interfaces:**
- Produces: `audit(action, { userId, orgId, workspaceId?, entityType, entityId, before?, after? })`; `listAudit(orgId, filter)` (owner/admin-only via `assertOrgRole`). Wire `audit()` calls into create/update/delete/mark-paid in services from Tasks 14–20 (replace the no-op shim).

- [ ] **Step 1: Write failing tests** — a workspace update writes an audit row with before/after; `listAudit` rejects a non-admin; entries are immutable (no update/delete API).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement + wire shims** — replace the Task 14 no-op with real `audit()` calls across services.
- [ ] **Step 4: Run → PASS** (re-run affected service tests).
- [ ] **Step 5: Commit** — `git commit -am "feat: audit log (owner/admin-viewable) wired into services"`

---

## Task 22: Export service

**Files:**
- Create: `src/services/export-service.ts`
- Test: `src/services/export-service.test.ts`

**Interfaces:**
- Consumes: `authz`, `money` (`format`/plain decimal string), transaction/bill repos.
- Produces: `exportTransactionsCsv(workspaceId)`, `exportBillsCsv(workspaceId)`, `exportRollupCsv(orgId)` → returns CSV strings (Excel-compatible). Money rendered as plain decimal strings (not `$`-formatted) for re-import fidelity; dates as `YYYY-MM-DD`.

- [ ] **Step 1: Write failing tests** — CSV header + row shape; amounts are exact decimal strings; dates calendar-formatted; respects access (non-member throws).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: CSV/Excel export"`

---

## Task 23: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Test: manual (`pnpm db:seed` then inspect Studio)

**Interfaces:**
- Produces: one Organization, a Personal + two Business workspaces (distinct colors/icons), default categories per workspace, a couple of accounts, a handful of transactions and bills, one owner-draw transfer — enough to exercise empty-state vs populated-state UI. **Connects via the privileged `DIRECT_URL`** (not `app_runtime`), since seeding writes across all workspaces with no per-user claim.

- [ ] **Step 1: Implement** — idempotent upserts keyed by stable ids; uses the services where practical to keep invariants.
- [ ] **Step 2: Run** — `pnpm db:seed`; verify in Studio.
- [ ] **Step 3: Commit** — `git commit -am "chore: dev seed data"`

---

## Task 24: `/api/v1` seam proof

**Files:**
- Create: `src/app/api/v1/workspaces/route.ts`, `src/lib/api/auth.ts` (service-token + session resolver), `src/lib/api/respond.ts`
- Test: `src/app/api/v1/workspaces/route.test.ts`

**Interfaces:**
- Produces: `GET /api/v1/workspaces` — Zod-validated, role-gated, returns the caller's accessible workspaces as JSON. Auth resolves either a logged-in session **or** a scoped read-only service token (the future-AI seam). Read-only; mutations are out of scope for `/api/v1` in v1.

- [ ] **Step 1: Write failing test** — authed request returns only accessible workspaces; unauthenticated → 401; a business-scoped token can't list Personal.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — thin handler delegating to `workspace-service` + `authz`; Zod-validate query/response.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: versioned /api/v1 read seam (workspaces)"`

---

## Task 25: App shell, auth pages, middleware

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts`, `src/app/(app)/layout.tsx`, `src/app/page.tsx`
- Create: `src/components/auth/login-form.tsx`
- Test: `src/middleware.test.ts` (redirect logic), component smoke test

**Interfaces:**
- Consumes: Supabase SSR clients, `getCurrentUser`.
- Produces: email/password + Google OAuth login; OAuth callback code-exchange; middleware redirecting unauthenticated users to `/login` and authenticated `/` → first accessible workspace.

- [ ] **Step 1: Write failing middleware test** — unauthenticated request to `/w/x` → redirect `/login`; authenticated `/` → `/w/<first>`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `@supabase/ssr` cookie session refresh in middleware; login form (shadcn) with both auth methods; Google works on localhost (Task 2 config).
- [ ] **Step 4: Run → PASS** + manual login smoke (browser via chrome-devtools MCP).
- [ ] **Step 5: Commit** — `git commit -am "feat: auth shell (email/password + Google OAuth) + route guards"`

---

## Task 26: Workspace tab bar + customization

**Files:**
- Create: `src/components/workspace/tab-bar.tsx`, `src/components/workspace/customize-dialog.tsx`, `src/components/workspace/workspace-switcher.ts` (client actions)
- Test: component tests with mock workspaces

**Interfaces:**
- Consumes: `workspace-service` (via server actions), shadcn `Tabs`/`Dialog`/`Popover`.
- Produces: color-coded tab bar with one-click switch, `＋` add-workspace, an **All Workspaces** tab, and a customize dialog (name + color picker + optional icon). Status/identity conveyed by label+icon, not color alone (accessibility).

- [ ] **Step 1: Write failing component tests** — renders one tab per accessible workspace with its color/icon; clicking a tab navigates; customize dialog submits name/color/icon.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — server actions call `workspace-service`; optimistic UI with rollback on error.
- [ ] **Step 4: Run → PASS** + browser smoke.
- [ ] **Step 5: Commit** — `git commit -am "feat: workspace tab bar + customization"`

---

## Task 27: Presentational dashboard components (mock data)

> **Dependency (satisfied):** the approved mockups are present at `docs/temp/budget-app-mockup-v1.html` and `...-phase2.html` (committed `822eb41`). Build components to match them faithfully (spec §12). Components are **presentational only** — fed by `src/lib/mock/` data in Phase 1; Phase 2 wires them to services.

**Files:**
- Create: `src/lib/mock/dashboard.ts`; `src/components/dashboard/{kpi-cards,safe-to-spend,cashflow-forecast,category-breakdown,bills-widget,goals-widget,debts-widget,period-selector}.tsx`
- Create: `src/app/(app)/w/[workspaceId]/page.tsx` (composes them), `src/app/(app)/all/page.tsx` (roll-up shell)
- Test: component tests per widget with mock data

**Interfaces:**
- Consumes: mock data only (no services). Props typed to the eventual service return shapes (so Phase 2 swaps the data source without prop churn).
- Produces: KPI cards (total balance · in · out · **Safe-to-spend** with click-to-expand math placeholder); cash-flow forecast chart with lowest-point marker; category breakdown; upcoming/overdue bills with mark-paid button (wired in P2); paid-vs-unpaid; goals; debts; period selector.

- [ ] **Step 1: Write failing component tests** — each widget renders its mock values; safe-to-spend expand toggles the math panel; statuses show icon+label not color-only.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** to match the mockup; dense single-screen layout, even columns (tidy the mockup's dead-space gap per §12).
- [ ] **Step 4: Run → PASS** + browser visual check against mockup.
- [ ] **Step 5: Commit** — `git commit -am "feat: presentational dashboard widgets (mock data)"`

---

## Task 28: Manual CRUD UI (transactions, bills, accounts)

**Files:**
- Create: `src/components/transactions/{table,form}.tsx`, `src/components/bills/{list,form,mark-paid}.tsx`, `src/components/accounts/form.tsx`
- Create: server actions under `src/app/(app)/w/[workspaceId]/_actions/`
- Test: form validation tests (Zod) + action tests

**Interfaces:**
- Consumes: services from Tasks 15–18, shared Zod schemas, `tagOwnerDraw` (Task 20).
- Produces: create/edit/delete forms for transactions, bills (incl. mark-paid + "Tag as owner draw → Personal"), accounts. All validation via shared Zod; server actions delegate to services (no business logic in components).

- [ ] **Step 1: Write failing tests** — form rejects invalid money/date via Zod; submitting calls the right service; owner-draw action invokes `tagOwnerDraw`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — thin components; logic stays in services.
- [ ] **Step 4: Run → PASS** + browser smoke.
- [ ] **Step 5: Commit** — `git commit -am "feat: manual CRUD UI for transactions, bills, accounts"`

---

## Task 29: CSV import wizard UI

**Files:**
- Create: `src/components/import/{upload,map-columns,preview,summary}.tsx`, `src/app/(app)/w/[workspaceId]/import/page.tsx`
- Create: server actions for `previewImport`/`commitImport`/`undoImport`
- Test: wizard step tests with a sample CSV fixture

**Interfaces:**
- Consumes: the Task 19 import pipeline via server actions.
- Produces: **Upload → Map → Preview (confirm) → Commit → Summary** wizard. Map step persists `ImportMapping` for reuse; preview shows per-row errors, transfer ticks, and pre-checked-but-overridable duplicates + balance-reconciliation warning; summary offers **undo**.

- [ ] **Step 1: Write failing tests** — upload+map yields a preview; toggling a duplicate's skip flag flows to commit; commit returns a batch; undo removes it.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — preview-then-commit; never silently discard duplicates.
- [ ] **Step 4: Run → PASS** + browser smoke with a real bank CSV sample.
- [ ] **Step 5: Commit** — `git commit -am "feat: CSV import wizard UI"`

---

## Task 30: Empty/first-run states, audit & export views

**Files:**
- Create: `src/components/empty/{no-workspaces,no-accounts,no-transactions,no-bills}.tsx`
- Create: `src/app/(app)/w/[workspaceId]/audit/page.tsx`, export buttons/actions
- Test: component tests; access test on audit view

**Interfaces:**
- Consumes: `audit-service` (`listAudit`, admin-gated), `export-service`.
- Produces: designed empty states for each major surface; an audit log view (owner/admin-only); export buttons that stream CSV from `export-service`.

- [ ] **Step 1: Write failing tests** — empty states render with a clear primary action; audit view rejects non-admins; export button triggers the right service.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS** + full browser walkthrough (login → create workspace → import → CRUD → export).
- [ ] **Step 5: Commit** — `git commit -am "feat: empty states, audit view, export UI"`

---

## Task 31: Organization bootstrap, membership management & invites

> Closes FR-28/30 and the implicit first-run requirement: a brand-new user must land in a usable org, and the owner must be able to grant teammates scoped access.

**Files:**
- Create: `src/services/membership-service.ts`, `src/repositories/membership-repo.ts`, `src/app/(app)/settings/members/page.tsx`, `src/components/members/{invite-form,member-list}.tsx`
- Create: server actions under `src/app/(app)/settings/_actions/`
- Test: `src/services/membership-service.test.ts`

**Interfaces:**
- Consumes: `authz` (`assertOrgRole`), Supabase Auth admin (service client, via `DIRECT_URL`/service role — bootstrap/invite legitimately bypass per-user RLS), `workspace-service`, `audit`.
- Produces: `bootstrapOrgForUser(userId): Promise<Organization>` — idempotent first-run: creates the Organization, the `owner` `OrgMembership`, and a default Personal workspace if the user has none (called from the auth callback / first authed request); `inviteMember({ email, orgRole })` → Supabase invite + pending `OrgMembership`; `assignWorkspaceMembership({ userId, workspaceId, role })` / `revokeWorkspaceMembership(...)` (owner/admin-only); `listMembers(orgId)`.

- [ ] **Step 1: Write failing tests** — `bootstrapOrgForUser` is idempotent (second call returns the same org, no duplicate Personal); `inviteMember` rejects a non-owner/admin; `assignWorkspaceMembership` then makes that workspace visible to the invitee via `rlsClientFor` (and Personal stays invisible to a business-only grantee — cross-checks Task 11); `revoke` removes visibility.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — bootstrap wired into the auth callback (Task 25) so first login is seamless; invite via Supabase Auth admin API; all membership writes audited.
- [ ] **Step 4: Run → PASS** + browser smoke (invite a second test user, grant Business only, confirm they can't see Personal).
- [ ] **Step 5: Commit** — `git commit -am "feat: org bootstrap, membership management & email invites"`

---

## Phase 1 Done — Definition of Done

- `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
- The cross-workspace **security test passes** (RLS + service layer): a business-only user cannot read Personal.
- Money math unit tests prove decimal correctness (no float drift; half-up rounding); balances are computed.
- CSV import works end-to-end (preview → commit → undo) with sign rules, dedupe, reconciliation.
- The income bridge creates linked entries atomically and honors per-side privacy.
- The app is navigable: login → workspace tabs → dense dashboard (mock data) → manual CRUD → import → export → audit.
- Roadmap items for Phase 1 marked `[x]` (Rule 7) before the final checkpoint.

## Mapping to spec/PRD requirements (coverage check)

- FR-1–3 (workspaces, customization, tabs): Tasks 14, 26 · FR-6 roll-up shell: 27
- FR-7 accounts + computed balance: 15 · FR-8–10 CSV import: 19, 29 · FR-11 tx CRUD: 17, 28 · FR-12 rules: 16
- FR-13 bills CRUD: 18, 28 · FR-15 mark-paid: 18, 28 · FR-16 upcoming/overdue: 18, 27
- FR-25 owner-draw bridge: 20, 28 · FR-27 auth: 25 · FR-28 roles/membership: 7, 12, 31 · FR-29 hard separation: 10, 11, 12 · FR-30 invite + assign access: 31
- FR-31 audit: 21, 30 · FR-32 export: 22, 30 · FR-33 empty states: 30 (+ org bootstrap/first-run: 31)
- NFR-1 money/dates: 4, 5, 15 · NFR-2/3 RLS+authz+privacy: 10, 11, 12, 20 · NFR-9 strict/≤450/services/co-located tests: throughout · NFR-10 `/api/v1` seam: 24
- **Deferred to Phase 2 (correctly):** FR-4/5 tiling + saved layouts, FR-14 recurring materialization, FR-17/18 live safe-to-spend/forecast computation, FR-19/20 live breakdowns/debts/goals, FR-26 roll-up netting. (Schema for all of these lands in Phase 1; computation/wiring is Phase 2.)

## Notes / risks surfaced during planning

- **RLS + Prisma (chosen: RLS as a true enforcer, not a backstop):** Prisma doesn't natively carry the Supabase JWT into Postgres, so Task 10 (a) connects the runtime as a dedicated `app_runtime` role that is *subject to* forced RLS (never owner/`service_role`/BYPASSRLS), and (b) sets the user claim via transaction-local `set_config` inside every `rlsClientFor` transaction (pgbouncer-safe; cannot leak across pooled connections); Task 11 then forces RLS + writes the policies. Forced RLS + service-layer `authz` = genuine defense in depth; the database enforces isolation even if a service-layer check is ever missed. There is no "RLS-off" degraded mode. **Consequence:** anything that must bypass per-user scoping (migrations, the seed, the Supabase-Auth admin invite flow) uses the privileged `DIRECT_URL`/service client — never `app_runtime`.
- **WorkspaceTransfer privacy (chosen: row-level RLS, no app masking):** the transfer row is readable only by a caller who is a member of **both** workspaces (or org owner/admin). A business-only teammate cannot see the row's existence at all — privacy is a database guarantee, not an app remembering to hide a column. The two underlying transactions are each governed by their own workspace's RLS. This is both the most secure reading of "each side respects its own membership independently" and fully functional (the owner, a member of both, sees the complete bridge for roll-up netting).
- **Mockups** are present (`docs/temp/budget-app-mockup-v1.html`, `...-phase2.html`, committed `822eb41`) — Task 27's dependency is satisfied.
- **Spec header path** corrected to `...\Software\data-management\budget-app` (applied during planning).
