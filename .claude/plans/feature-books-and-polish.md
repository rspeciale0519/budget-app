# Books Rename + Final Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "workspace" to "Book" in every user-visible string (UI-copy-only — routes, services, database, and code identifiers keep `workspace` forever), unify page headings behind one shared component, and upgrade `/all` into a real combined overview ("All books") that becomes the landing page for multi-book users.

**Architecture:** Three independent, small tasks on one branch. The rename is a copy pass driven by an exact string inventory (gathered from the live codebase 2026-07-19) plus a glossary; the only code-adjacent change is the `CommandGroup` union value, which doubles as a display label. The heading task adds one `ui/` primitive and swaps ~12 call sites. The `/all` upgrade reuses the existing `rollup` service's `combined` totals — no new backend work.

**Tech Stack:** Same as the repo — Next.js App Router, Tailwind, vitest (`renderToString` for components, live-DB for services), pnpm.

## Global Constraints

- **UI strings only for the rename.** Never touch: route paths (`/w/`, `/all`), service/repo/function/prop/variable names, Prisma schema, test fixture data, or the `workspace` table. `git diff` must show no changes to any identifier except the `CommandGroup` union value (which is itself a display string).
- **Glossary (exact, use everywhere):** workspace → **book**; workspaces → **books**; "All Workspaces" → **"All books"**; Workspace (column header / label) → **Book**. Type labels **Personal / Business** are unchanged. Sentence case per the app's copy rules ("All books", not "All Books").
- No new dependencies, no schema migrations.
- Gates at the end: `pnpm type-check`, `pnpm lint`, `pnpm test` all exit 0; browser verification on a **production** build via chrome-devtools MCP (never Playwright), port ≥ 3008 (3000-3005 are portproxy-hijacked; 3006 may hold the dev server).
- Branch: `feature/books-and-polish` off `main` (currently `4802bc6`). Merge directly to `main` after verification per the solo workflow — no develop, no PR.

**Dropped by owner decision (do not implement):** tap-to-expand calendar chips. The v2 reports milestone is explicitly deferred to post-MVP.

---

## Task 1: Shared `PageHeading` component + rollout

**Files:**
- Create: `src/components/ui/page-heading.tsx`
- Modify (call sites): `src/app/(app)/all/page.tsx:27`, `src/app/(app)/settings/page.tsx:16`, `src/app/(app)/settings/members/page.tsx:34`, `src/app/(app)/tiles/page.tsx:33`, `src/components/tiling/tiles-client.tsx:86`, `src/app/(app)/w/[workspaceId]/audit/page.tsx:48`, `budget/page.tsx:66`, `calendar/page.tsx:36`, `import/page.tsx:31`, `income/page.tsx:30`, `manage/page.tsx:40`, `src/components/transactions/transactions-view.tsx:64`

**Interfaces:**
- Produces: `PageHeading({ children, className? }: { children: ReactNode; className?: string })` rendering `<h1 className={cn("text-xl font-semibold text-ink", className)}>{children}</h1>` — the canonical style (already the majority: 8 of 12 pages).

**Explicitly excluded call sites (intentional, don't "fix"):** the login `<h1>` (52px brand mark), `error.tsx`/`not-found.tsx` (standalone `text-lg` pages), `update-password` (centered auth layout), and the workspace layout's serif name header (`w/[workspaceId]/layout.tsx:71` — that's an identity header, not a page title; it keeps its serif style and breadcrumb).

- [ ] **Step 1:** Create the component (≈10 lines, pattern above).
- [ ] **Step 2:** Swap the 12 call sites. Normalization that happens as a side effect:
  - `all`, `tiles` page, `budget`: `font-bold` → standard semibold; `all`/`tiles` drop the ad-hoc `my-[22px]` (their parent stacks already space with `space-y-4`; keep `my-[22px]` via `className` ONLY on `tiles-client.tsx` and `tiles/page.tsx` if removing it visibly collapses the gap — check in the browser pass).
  - `calendar` ("July 2026") and `tiles-client` ("Tiles"): serif → standard. The serif look stays exclusive to the workspace identity header.
  - Casing to sentence case while touching them: "CSV Import" → "Import CSV", "Expected Income" → "Expected income". (The "All Workspaces" heading is renamed in Task 2, but do the component swap here.)
- [ ] **Step 3:** `pnpm type-check` clean; visual check of each page comes in the final browser pass.

---

## Task 2: Rename "workspace" → "Book" (user-visible strings only)

**Files:** listed per string below — this inventory came from grepping the live code; treat it as exhaustive, then prove it with the verification grep in Step 4.

- [ ] **Step 1: Component/page copy** — exact replacements:

| File:line | Old | New |
|---|---|---|
| `src/app/(app)/all/page.tsx:11` | `title: "All workspaces"` | `title: "All books"` |
| `src/app/(app)/all/page.tsx:27` | `All Workspaces` (h1) | `All books` |
| `src/app/(app)/all/page.tsx:33` | `<th …>Workspace</th>` | `Book` |
| `src/app/(app)/all/page.tsx` footnote | `…and transfers between workspaces, are counted once…` | `…and transfers between books, are counted once…` |
| `src/components/workspace/workspace-tabs.tsx:79` | `▦ All Workspaces` | `▦ All books` |
| `src/components/workspace/tab-bar.tsx:60` | `title="Tile multiple workspaces side-by-side"` | `title="Tile multiple books side-by-side"` |
| `src/components/workspace/workspace-create-dialog.tsx:62` | `aria-label="Add workspace"` | `aria-label="Add book"` |
| `src/components/workspace/workspace-create-dialog.tsx:119` | `Create workspace` | `Create book` |
| `src/app/(app)/_actions.ts` (createWorkspaceAction fallback) | `"Could not create the workspace"` | `"Could not create the book"` |
| `src/app/(app)/w/[workspaceId]/layout.tsx:42` | `You don't have access to this workspace.` | `You don't have access to this book.` |
| `src/app/(app)/settings/page.tsx:22` | `…choose which workspaces they can see.` | `…choose which books they can see.` |
| `src/app/(app)/settings/members/page.tsx:44` | `…choose below which workspaces they can see or edit.` | `…choose below which books they can see or edit.` |
| `src/app/(app)/tiles/page.tsx:36` | `Tiling shows several workspaces side by side. Create a second workspace with the + button…` | `Tiling shows several books side by side. Create a second book with the + button…` |
| `src/components/import/import-wizard.tsx:204` | `…and this workspace has none yet.` | `…and this book has none yet.` |
| `src/app/(app)/w/[workspaceId]/audit/page.tsx` description | `A record of changes in this workspace…` | `A record of changes in this book…` |
| `src/components/tiling/layout-controls.tsx:58` | `` aria-label={`Pane ${i + 1} workspace`} `` | `` aria-label={`Pane ${i + 1} book`} `` |

- [ ] **Step 2: Command palette group** — the union value doubles as the rendered group label:
  - `src/lib/command-palette/commands.ts:1`: `"Go to workspace"` → `"Go to book"` (in the `CommandGroup` union), and the same string in the `commands.push` group field (line 28).
  - `src/components/command/command-palette.tsx:83`: update the `groups` array literal to match.
  - `src/lib/command-palette/commands.test.ts:14,21`: update the two `c.group === "Go to workspace"` assertions.
  - Check `src/components/command/command-palette.test.tsx` for any copy assertion and update if present.

- [ ] **Step 3: Service error strings that surface in toasts** (display strings only — the functions keep their names):
  - `src/services/authz.ts:25`: `"No access to this workspace"` → `"No access to this book"`
  - `src/services/dashboard/pane-summary.ts:32`: `"Workspace not found or access denied"` → `"Book not found or access denied"`
  - `src/services/membership-service.ts` (two `"Workspace not found"` throws in assign/revoke): → `"Book not found"`
  - `src/services/transfer-service.ts` (tagOwnerDraw): `"from and to workspaces must differ"` → `"from and to books must differ"` — **check first** whether `src/lib/zod/zod.test.ts` or `transfer-service.test.ts` asserts this message text (the zod schema at `src/lib/zod/entities.ts` has the same refine message; keep schema + service messages identical to each other) and update any assertions.
  - Run the affected service tests after: `pnpm vitest run src/services/authz.test.ts src/services/membership-service.test.ts src/services/transfer-service.test.ts src/lib/zod/zod.test.ts src/services/dashboard/pane-summary.test.ts`

- [ ] **Step 4: Prove exhaustiveness** — run and inspect:
  `grep -rn -iE "workspace" src --include="*.tsx" | grep -vE "workspaceId|Workspace[A-Z]|workspace-|[a-z]Workspace|import |from \"|href|/w/"` — every remaining hit must be a code identifier, comment, or test fixture, never rendered copy. Do the same over `src/lib` and `src/services` for thrown message strings. Fix stragglers.

**Not renamed (by design):** file/folder names (`components/workspace/…`), component names (`WorkspaceTabs`…), props (`workspaceId`, `allWorkspaces`), route segments, DB models, `metadata` templates that only interpolate the book's own name, and code comments (update a comment only when already editing that line).

---

## Task 3: `/all` → "All books" combined overview + landing page

**Files:**
- Modify: `src/app/(app)/all/page.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `rollup(userId, organizationId, "month", today)` — already returns `{ rows, combined }` where `combined` has `balance/in/out/unpaid/net` as `Money` (verified; the page already destructures this data for the table's Combined row). No service changes.

- [ ] **Step 1: KPI row.** In `all/page.tsx`, above the existing table, render a responsive card grid (`grid grid-cols-2 gap-4 lg:grid-cols-4`) of four stat cards from `data.combined`, following the dashboard's KPI card look (uppercase 11px label, 26px tabular value):
  - "Total balance" → `format(data.combined.balance)`
  - "Money in · this month" → `format(data.combined.in)`
  - "Money out · this month" → `format(data.combined.out)`
  - "Unpaid bills" → `format(data.combined.unpaid)` — with `text-alert` on the value only when non-zero
  Keep the table below (it keeps its per-book rows and Combined footer). Build the card locally in this file (a ~10-line `Stat` helper) — the dashboard's `Kpi` is module-private and has delta props we don't need.
- [ ] **Step 2: Landing logic.** In `src/app/page.tsx:17-18`, replace the unconditional first-book redirect:
  - `workspaces.length > 1` → `redirect("/all")` (multi-book owners land on the whole picture)
  - exactly one → `redirect(/w/{first.id})` (a single-book user's book IS the whole picture; `/all` would just be a one-row table)
- [ ] **Step 3:** Extend `src/app/(app)/all/page.smoke.test.ts` with one assertion if cheap (the rollup `combined` math is already covered there — only add if the test file structure makes it a 3-line addition; otherwise the browser pass covers the page).

---

## Task 4: Gates, browser verification, merge

- [ ] **Step 1:** `pnpm type-check && pnpm lint && pnpm test` — all exit 0.
- [ ] **Step 2:** `pnpm build`, serve on a free port ≥ 3008, then with chrome-devtools (desktop 1440×900 AND mobile 430×932, plus a dark-mode spot check):
  - Sweep every page for the rename: no visible "workspace" anywhere (login → dashboard → transactions → manage → calendar → budget → income → import → activity → tiles → all → settings → members; also open the ＋ create dialog, the ⌘K palette, and trigger the no-access card via a bogus `/w/xyz` URL).
  - Headings render uniformly on every page (and confirm the tiles/all spacing didn't collapse per Task 1 Step 2).
  - `/all` shows the four combined KPI cards matching the table's Combined row exactly.
  - Landing: with the seeded multi-book user, `/` lands on `/all`. (Single-book case is covered by reading the redirect logic — creating and deleting a one-book user isn't worth the DB churn.)
  - Zero console errors throughout.
- [ ] **Step 3:** Commit on the branch; merge to `main` (fast-forward expected), re-run the three gates on `main`, push `origin main`, delete the branch, update project memory.

---

## Self-review notes (done at write time)

- Rename inventory was generated from live greps this session, not memory; Step 4 of Task 2 re-proves it after the edits.
- The `CommandGroup` union change is the single intentional identifier-as-copy exception, called out explicitly.
- `/all` KPI row deliberately excludes a combined safe-to-spend — that would require per-book `safeToSpend` calls (new aggregation work) and is exactly the kind of scope the "modest version" decision excluded. If wanted later, it's a clean follow-up.
- Landing-page rule (multi-book → `/all`) intentionally keeps the brand-new-user path unchanged: first-run bootstrap creates one book, so new users still land on their dashboard/first-run hero, never an empty rollup table.
