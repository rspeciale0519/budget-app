# Phase 2b — Desktop Tiling & Saved Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner tile multiple workspaces side-by-side and stacked on desktop — each pane an independent, live workspace summary — and save/restore named layout arrangements per user.

**Architecture:** A recursive **pane-tree** config (`{ type: "leaf", workspaceId } | { type: "split", direction, children }`) is the serialized layout, stored in the existing `Layout.config` JSON (per-user, RLS-scoped). A `TiledView` client component renders the tree with `react-resizable-panels`; each leaf shows a compact, server-fetched **pane summary** (balance · safe-to-spend · top bills) reusing the Phase 2a computation services. Tiling is desktop-only — below `lg` it degrades to a stacked single column. The app-bar "Tile view"/"Layouts" pills (Phase-2 stubs) become live.

> **Builds on:** Phase 2a (`feature-budget-dashboard-live`, merged to `develop`) — reuses `workspaceMetrics`, `safeToSpend`, `bill-service.upcomingAndOverdue`, `listAccessibleWorkspaces`. The `Layout` model already exists in the schema (no migration).

**Tech Stack:** Next.js 16 (App Router) · TypeScript strict · `react-resizable-panels` · Prisma 6 · Zod · Vitest · Tailwind 4 · pnpm.

## Global Constraints

Carried verbatim from the spec/PRD/CLAUDE.md — every task implicitly includes these.

- **TypeScript strict; no `any`.** Source files ≤ 450 LOC. Business logic in services, never components. Tests co-located as `*.test.ts`.
- **Service-layer authz on every read** (`assertWorkspaceAccess`/`assertOrgRole`) AND forced Postgres RLS via `rlsClientFor`. `Layout` RLS is already per-user (`userId = app.current_user_id()`).
- **No JavaScript float math on money** — pane summaries format via `@/lib/money`. **Calendar dates** via `@/lib/calendar-date`.
- **Per-pane workspace context:** each pane owns its own `{ workspaceId }` — there is **no** single global "current workspace" (spec §5.1).
- **Responsive:** tiling is a **desktop-only enhancement**; on tablet/mobile it degrades to a stacked single column (spec §11).
- **Never hard-delete** — layouts are removable by their owner (this is user-owned config, not financial data; delete is allowed here).
- **Package manager: pnpm.** Validate the pane tree with Zod at the persistence boundary.

---

## File Structure

```
src/
├── lib/zod/layout.ts                  # pane-tree Zod schema + PaneConfig type (recursive)
├── repositories/layout-repo.ts        # Layout CRUD (Prisma)
├── services/
│   ├── layout-service.ts              # saveLayout/listLayouts/getLayout/deleteLayout (per-user)
│   └── dashboard/pane-summary.ts      # compact per-workspace summary for a tile
├── components/tiling/
│   ├── tiled-view.tsx                 # recursive pane-tree renderer (client, resizable)
│   ├── pane-card.tsx                  # one pane's summary card (presentational)
│   └── layout-controls.tsx            # save / restore / delete named layouts + pane management
├── app/(app)/tiles/
│   ├── page.tsx                       # /tiles entry: load workspaces + layout + summaries
│   └── _actions.ts                    # paneSummary / saveLayout / listLayouts / deleteLayout actions
└── components/workspace/tab-bar.tsx   # (modified) activate Tile view / Layouts pills → /tiles
```

---

## Task Sequencing Overview

- **Task 1:** Pane-tree Zod schema + types (pure, the shared contract).
- **Task 2:** Layout service + repo (per-user CRUD, RLS-isolated).
- **Task 3:** Pane-summary service (compact tile data).
- **Task 4:** `react-resizable-panels` install + `TiledView` recursive renderer + `PaneCard`.
- **Task 5:** `/tiles` page + server actions (load workspaces/layout/summaries).
- **Task 6:** Layout controls — save/restore/delete + pane management (add/remove/assign/direction) + responsive stack.
- **Task 7:** Activate the app-bar Tile view / Layouts pills.

Each task ends with an independently testable deliverable and a commit.

---

## Task 1: Pane-tree schema + types

**Files:**
- Create: `src/lib/zod/layout.ts`
- Test: `src/lib/zod/layout.test.ts`

**Interfaces:**
- Produces: `type PaneConfig = { type: "leaf"; workspaceId: string } | { type: "split"; direction: "row" | "col"; children: PaneConfig[] }`; `paneConfigSchema` (recursive Zod via `z.lazy`); `collectWorkspaceIds(config: PaneConfig): string[]` (all leaf workspaceIds, deduped); `defaultLayout(workspaceIds: string[]): PaneConfig` (a single `row` split of leaves, or one leaf if a single workspace).

- [ ] **Step 1: Write failing tests** — `paneConfigSchema` accepts a nested `{type:"split",direction:"row",children:[{type:"leaf",workspaceId:"a"},{type:"split",direction:"col",children:[{type:"leaf",workspaceId:"b"}]}]}`; rejects `{type:"split",direction:"diagonal",children:[]}` and `{type:"leaf"}` (missing workspaceId). `collectWorkspaceIds` on that tree → `["a","b"]`. `defaultLayout(["a","b"])` → a row split with two leaves; `defaultLayout(["a"])` → `{type:"leaf",workspaceId:"a"}`.
- [ ] **Step 2: Run → FAIL** (`pnpm vitest run src/lib/zod/layout.test.ts`).
- [ ] **Step 3: Implement** — `z.lazy` recursive union; `collectWorkspaceIds` via recursion + `Set`; `defaultLayout` builds the row of leaves.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): pane-tree schema + helpers"`

---

## Task 2: Layout service + repository

**Files:**
- Create: `src/repositories/layout-repo.ts`, `src/services/layout-service.ts`
- Test: `src/services/layout-service.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `assertOrgRole` (member), `paneConfigSchema` (Task 1), `prismaAdmin` (test fixtures only).
- Produces: `saveLayout(userId, organizationId, name, config): Promise<Layout>` (Zod-validates `config`; upserts by `(userId, organizationId, name)`); `listLayouts(userId, organizationId): Promise<{ id; name; config: PaneConfig }[]>`; `getLayout(userId, layoutId): Promise<Layout | null>`; `deleteLayout(userId, layoutId): Promise<void>`. All scoped to the caller via `rlsClientFor` — the `Layout` RLS policy already restricts rows to `userId = app.current_user_id()`.

- [ ] **Step 1: Write failing tests** — `saveLayout` then `listLayouts` returns it with a parsed `config`; a **second user cannot see it** (`rlsClientFor(other).run(tx => tx.layout.findMany())` → none); saving the same name twice updates (no duplicate); `deleteLayout` removes it; an invalid config throws on save.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — repo does Prisma `upsert`/`findMany`/`delete`; service validates `config` with `paneConfigSchema`, parses `config` JSON on read.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): per-user saved layout service"`

---

## Task 3: Pane-summary service

**Files:**
- Create: `src/services/dashboard/pane-summary.ts`
- Test: `src/services/dashboard/pane-summary.test.ts`

**Interfaces:**
- Consumes: `assertWorkspaceAccess`, `workspaceMetrics` (balance), `safeToSpend` (result), `bill-service.upcomingAndOverdue`, `rlsClientFor`, `getWorkspace` (name/color), `format`.
- Produces: `paneSummary(userId, workspaceId, today): Promise<{ workspaceId; name; color; balance: string; safeToSpend: string; topBills: { vendor: string; amount: string; status: "overdue" | "soon" | "scheduled" }[] }>` — a compact, formatted tile payload (top 3 overdue/upcoming bills).

- [ ] **Step 1: Write failing test** — seeded workspace (balance, one overdue + one upcoming bill); `paneSummary` returns the formatted `balance` and `safeToSpend` (matching `format(...)` of the underlying services) and `topBills` with the overdue one flagged `overdue`; a non-member is denied.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — call the services, format, take the first 3 bills (overdue first), map status by due date.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): compact pane summary service"`

---

## Task 4: TiledView renderer + PaneCard

**Files:**
- Create: `src/components/tiling/pane-card.tsx`, `src/components/tiling/tiled-view.tsx`
- Test: `src/components/tiling/tiled-view.test.tsx`

**Interfaces:**
- Consumes: `react-resizable-panels` (`PanelGroup`, `Panel`, `PanelResizeHandle`), `PaneConfig` (Task 1), the pane-summary shape (Task 3).
- Produces: `PaneCard({ summary })` (presentational tile: color header, balance, safe-to-spend, top bills); `TiledView({ config, summaries, onConfigChange? })` — recursively renders the pane tree into nested resizable `PanelGroup`s (split → group with handles, leaf → `PaneCard` for `summaries[workspaceId]`). Below `lg` it renders a **stacked single column** of `PaneCard`s (one per leaf, ignoring the tree) — desktop-only enhancement.

- [ ] **Step 1: Install** — `pnpm add react-resizable-panels`.
- [ ] **Step 2: Write failing test** — `renderToString(<TiledView config={twoLeafRow} summaries={{a:..., b:...}} />)` includes both workspace names and both balances; a missing summary renders a graceful "Loading…" placeholder, not a crash.
- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Implement** — recursive renderer; `direction="horizontal"` for `row`, `"vertical"` for `col`; `PanelResizeHandle` between children; responsive: a `hidden lg:block` resizable tree + a `lg:hidden` stacked list.
- [ ] **Step 5: Run → PASS** + production-server browser check at desktop width.
- [ ] **Step 6: Commit** — `git commit -am "feat(tiling): resizable pane-tree renderer + pane card"`

---

## Task 5: /tiles page + server actions

**Files:**
- Create: `src/app/(app)/tiles/page.tsx`, `src/app/(app)/tiles/_actions.ts`
- Test: `src/app/(app)/tiles/page.smoke.test.ts`

**Interfaces:**
- Consumes: `listAccessibleWorkspaces`, `layout-service`, `paneSummary` (Task 3), `defaultLayout`/`collectWorkspaceIds` (Task 1), `getCurrentUser`, `today()`.
- Produces: `/tiles` server page — resolves the user's org + accessible workspaces, picks an initial layout (`?layout=<id>` if given and owned, else `defaultLayout(firstTwoWorkspaceIds)`), fetches `paneSummary` for each leaf workspace (`Promise.all`), renders `<TiledView config summaries />`. Server actions: `paneSummaryAction(workspaceId)` (live data for a newly-assigned pane), `saveLayoutAction(name, config)`, `listLayoutsAction()`, `deleteLayoutAction(layoutId)`.

- [ ] **Step 1: Write failing smoke test** — for a seeded org with two workspaces, the page data path builds `defaultLayout` over their ids and `collectWorkspaceIds` returns both; `paneSummary` resolves for each.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — server page composition; actions delegate to the services with `getCurrentUser` + the org from the first `OrgMembership`; `paneSummaryAction` returns the serializable summary.
- [ ] **Step 4: Run → PASS** + browser check (`/tiles` shows two live panes).
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): /tiles page + pane/layout server actions"`

---

## Task 6: Layout controls + pane management + responsive

**Files:**
- Create: `src/components/tiling/layout-controls.tsx`
- Modify: `src/components/tiling/tiled-view.tsx` (accept edit callbacks)
- Test: `src/components/tiling/layout-controls.test.tsx`

**Interfaces:**
- Consumes: `saveLayoutAction`/`listLayoutsAction`/`deleteLayoutAction`/`paneSummaryAction` (Task 5), `PaneConfig` helpers (Task 1), the accessible-workspace list.
- Produces: `LayoutControls({ workspaces, layouts, config, onConfigChange })` — a control bar to **save** the current arrangement under a name, **restore** a saved layout from a dropdown, and **delete** one; plus pane management: **add pane** (append a leaf with the first unused workspace), **remove pane**, **assign workspace** per pane (fetches that pane's summary via `paneSummaryAction`), and a **row/column** direction toggle for the root split. Editing mutates a client-held `PaneConfig`; saving persists it.

- [ ] **Step 1: Write failing test** — the controls render the saved-layout names and call `saveLayoutAction`/`deleteLayoutAction` on click; assigning a workspace to a pane updates the config's leaf `workspaceId`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — client state holds `config`; `onConfigChange` re-renders `TiledView`; pane edits use pure tree updates (add/remove/assignAt path); a newly-shown workspace fetches its summary via `paneSummaryAction` and merges into the summaries map.
- [ ] **Step 4: Run → PASS** + browser check (save "Morning review", restore it; add/remove a pane; toggle row/column; confirm stacking below `lg`).
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): save/restore layouts + pane management"`

---

## Task 7: Activate the app-bar Tile view / Layouts pills

**Files:**
- Modify: `src/components/workspace/tab-bar.tsx`
- Test: existing build + a render assertion in `tab-bar` is impractical (server async); rely on the production build + browser check.

**Interfaces:**
- Consumes: the `/tiles` route (Task 5).
- Produces: the app-bar "⊞ Tile view" pill becomes a `<Link href="/tiles">` (no longer a disabled Phase-2 stub); "⌄ Layouts" links to `/tiles` as well (layout management lives there). Active state when on `/tiles`.

- [ ] **Step 1: Implement** — replace the two muted `<span>` stubs with real `<Link href="/tiles">` styled like the other pills; drop the `opacity-60`/`Phase 2` titles.
- [ ] **Step 2: Verify** — `pnpm type-check`, `pnpm lint`, `pnpm build` green; browser: the Tile view pill navigates to `/tiles`.
- [ ] **Step 3: Commit** — `git commit -am "feat(tiling): activate Tile view + Layouts app-bar pills"`

---

## Phase 2b Done — Definition of Done

- `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
- `/tiles` renders **multiple independent, live workspace panes** side-by-side/stacked on desktop, each with its own `{workspaceId}` context (no global current workspace).
- Panes are **resizable**; the user can **add/remove panes, assign a workspace per pane, and toggle row/column**.
- Layouts **save under a name and restore in one click**, **per user** (another user can't see them — proven by the layout-service RLS test).
- Below `lg`, tiling **degrades to a stacked single column**.
- The app-bar **Tile view / Layouts pills are live** (no longer Phase-2 stubs).
- The cross-workspace security test still passes; a pane only renders a summary for a workspace the caller can access.
- Phase 2b roadmap items marked `[x]` (Rule 7) before the final checkpoint.

## Mapping to spec/PRD requirements (coverage check)

- **FR-4 (tiled mode: multiple resizable, independent workspace panes, desktop):** Tasks 3, 4, 5, 6
- **FR-5 (save & restore named tiling layouts, per user):** Tasks 1, 2, 6
- Per-pane `{workspaceId, view}` context (spec §5.1): Tasks 1, 4, 6 · Responsive degrade-to-tabs (spec §11): Task 4
- NFR-2/3 authz + RLS: Task 2 (Layout per-user RLS), Task 3 (pane summary access-checked)
- **Out of scope (later):** drag-to-split arbitrary tree editing (v1 ships add/remove/assign + row/col toggle), cross-device layout sync.

## Notes / decisions

- **No migration:** the `Layout` model and its per-user RLS already exist from Phase 1, so Phase 2b is pure service + UI.
- **Pane editing scope:** v1 supports a tree-capable *renderer* but a bounded *editor* (add/remove leaf, assign workspace, root row/col toggle). Full drag-to-split nested editing is deferred — it's a large interaction surface and not required for the core "multiple workspaces side-by-side, saved" value.
- **Per-pane data:** the page fetches initial summaries server-side; pane edits fetch a single pane's summary via `paneSummaryAction` (avoids refetching the whole grid). With a handful of panes this is cheap; the existing `(workspaceId, …)` indexes back it.
- **`react-resizable-panels`** is small, RSC-compatible (the tree is client, data is server-fetched and passed as props), and widely used. Panel sizes can be persisted into the layout `config` in a later iteration; v1 persists the tree structure + direction.
- **Reuse, not rebuild:** pane summaries reuse the Phase 2a computation services — no new money math, so the figures match the full dashboard exactly.
