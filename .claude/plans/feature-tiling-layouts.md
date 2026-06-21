# Phase 2b — Desktop Tiling & Saved Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner tile multiple workspaces side-by-side and stacked on desktop — each pane an independent, live workspace summary — and save/restore named layout arrangements (including pane proportions) per user.

**Architecture:** A recursive **pane-tree** config (`leaf{workspaceId}` | `split{direction,children,sizes}`) is the serialized layout, stored in the existing `Layout.config` JSON (per-user, RLS-scoped) — **no migration**. Pure tree-operation helpers do all editing (add/remove/assign/direction/sizes) and are unit-tested directly; a `TiledView` client component renders the tree with `react-resizable-panels`, applying saved sizes and capturing resizes. Each leaf shows a compact, server-fetched **pane summary** reusing the Phase 2a computation services. Tiling is desktop-only — below `lg` it degrades to a stacked single column.

> **Builds on:** Phase 2a (`feature-budget-dashboard-live`, merged to `develop`) — reuses `workspaceMetrics`, `safeToSpend`, `bill-service.upcomingAndOverdue`, `listAccessibleWorkspaces`, `getWorkspace`. The `Layout` model + its per-user RLS already exist (Phase 1).

**Tech Stack:** Next.js 16 (App Router) · TypeScript strict · `react-resizable-panels` · Prisma 6 · Zod · Vitest · Tailwind 4 · pnpm.

## Global Constraints

Carried verbatim from the spec/PRD/CLAUDE.md — every task implicitly includes these.

- **TypeScript strict; no `any`.** Source files ≤ 450 LOC. Business logic in services, never components. Tests co-located as `*.test.ts`.
- **Service-layer authz on every read** (`assertWorkspaceAccess`/`assertOrgRole`) AND forced Postgres RLS via `rlsClientFor`. `Layout` RLS is already per-user (`userId = app.current_user_id()`).
- **No JavaScript float math on money** — pane summaries format via `@/lib/money`. **Calendar dates** via `@/lib/calendar-date`.
- **Per-pane workspace context:** each pane owns its own `{ workspaceId }` — there is **no** single global "current workspace" (spec §5.1).
- **Responsive:** tiling is a **desktop-only enhancement**; below `lg` it degrades to a stacked single column (spec §11).
- **Editing logic lives in pure, tested functions**, not in components (our test harness can't simulate clicks; components are renderToString-only).
- **No migration** — the `Layout` model exists; saves are find-then-update/create (no unique-constraint dependency). **Package manager: pnpm.** Validate the pane tree with Zod at the persistence boundary.

---

## File Structure

```
src/
├── lib/
│   ├── zod/layout.ts                  # PaneConfig type + paneConfigSchema (recursive, with sizes)
│   └── pane-tree.ts                   # PURE tree ops: collectWorkspaceIds, defaultLayout,
│                                      #   addLeaf, removeLeafAt, assignAt, setDirection, setSizes
├── repositories/layout-repo.ts        # Layout CRUD (Prisma)
├── services/
│   ├── layout-service.ts              # saveLayout/listLayouts/getLayout/deleteLayout (per-user)
│   └── dashboard/pane-summary.ts      # compact per-workspace summary for a tile
├── components/tiling/
│   ├── pane-card.tsx                  # one pane's summary card (presentational)
│   ├── tiled-view.tsx                 # recursive pane-tree renderer (client, resizable, sizes)
│   └── layout-controls.tsx            # save / restore / delete + pane management
└── app/(app)/tiles/
    ├── page.tsx                       # /tiles entry: load workspaces + layout + summaries
    └── _actions.ts                    # paneSummaries / saveLayout / listLayouts / deleteLayout
src/components/workspace/tab-bar.tsx   # (modified) activate Tile view / Layouts pills → /tiles
```

---

## Task Sequencing Overview

- **Task 1:** Pane-tree schema + PURE tree operations (the shared, fully-tested contract — incl. sizes).
- **Task 2:** Layout service + repo (per-user CRUD, RLS-isolated, migration-free save).
- **Task 3:** Pane-summary service (compact tile data).
- **Task 4:** `react-resizable-panels` install + `TiledView` renderer (applies/captures sizes) + `PaneCard`.
- **Task 5:** `/tiles` page + server actions (incl. batch pane summaries for restore).
- **Task 6:** Layout controls — save/restore/delete + pane management, wired via the pure tree ops.
- **Task 7:** Activate the app-bar Tile view / Layouts pills.

Each task ends with an independently testable deliverable and a commit.

---

## Task 1: Pane-tree schema + pure tree operations

**Files:**
- Create: `src/lib/zod/layout.ts`, `src/lib/pane-tree.ts`
- Test: `src/lib/pane-tree.test.ts`

**Interfaces:**
- Produces (`layout.ts`): `type PaneConfig = { type: "leaf"; workspaceId: string } | { type: "split"; direction: "row" | "col"; children: PaneConfig[]; sizes?: number[] }`; `paneConfigSchema` (recursive via `z.lazy`; `sizes` optional array of positive numbers).
- Produces (`pane-tree.ts`, all **pure**): `collectWorkspaceIds(c): string[]` (deduped leaves); `defaultLayout(ids: string[]): PaneConfig` (single leaf if one id, else a `row` split of leaves); `rootSplit(c): {direction; children; sizes?}` (treat a lone leaf as a 1-child split); `addLeaf(c, workspaceId): PaneConfig`; `removeLeafAt(c, index): PaneConfig` (collapses to a lone leaf when one child remains); `assignAt(c, index, workspaceId): PaneConfig`; `setDirection(c, "row"|"col"): PaneConfig`; `setSizes(c, sizes: number[]): PaneConfig`. All return new configs (no mutation); index ops target root-level children (v1 bounded editor).

- [ ] **Step 1: Write failing tests** — schema accepts a nested split with `sizes:[60,40]`; rejects `direction:"diagonal"` and a leaf missing `workspaceId`. `collectWorkspaceIds({split row [leaf a, leaf b]})` → `["a","b"]`. `defaultLayout(["a","b"])` → row split of two leaves; `defaultLayout(["a"])` → `{type:"leaf",workspaceId:"a"}`. `addLeaf(defaultLayout(["a"]), "b")` → row split `[a,b]`. `assignAt(rowAB, 1, "c")` → `[a,c]`. `removeLeafAt(rowAB, 0)` → lone leaf `b`. `setSizes(rowAB, [70,30])` → split with `sizes:[70,30]`. `setDirection(rowAB,"col")` → direction `col`.
- [ ] **Step 2: Run → FAIL** (`pnpm vitest run src/lib/pane-tree.test.ts`).
- [ ] **Step 3: Implement** — `z.lazy` union; pure helpers operating on a normalized root split.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): pane-tree schema + pure tree operations"`

---

## Task 2: Layout service + repository (migration-free)

**Files:**
- Create: `src/repositories/layout-repo.ts`, `src/services/layout-service.ts`
- Test: `src/services/layout-service.test.ts`

**Interfaces:**
- Consumes: `rlsClientFor`, `assertOrgRole` (member), `paneConfigSchema` (Task 1), `prismaAdmin` (test fixtures).
- Produces: `saveLayout(userId, organizationId, name, config): Promise<{ id; name; config: PaneConfig }>` — Zod-validates `config`; **find-then-update/create** by `(userId, organizationId, name)` within one `rlsClientFor` transaction (no unique constraint / no migration); `listLayouts(userId, organizationId): Promise<{ id; name; config: PaneConfig }[]>`; `getLayout(userId, layoutId): Promise<{ id; name; config: PaneConfig } | null>`; `deleteLayout(userId, layoutId): Promise<void>`. `config` parsed via `paneConfigSchema` on read. RLS already restricts `Layout` rows to the owner.

- [ ] **Step 1: Write failing tests** — `saveLayout(...,"Morning review", rowAB)` then `listLayouts` returns it with a parsed `config` (a `PaneConfig`, not raw JSON); saving the **same name again** updates in place (still one row); a **second user sees none** (`rlsClientFor(other).run(tx => tx.layout.findMany())` empty); `deleteLayout` removes it; an invalid config (`direction:"x"`) throws on save.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — repo `findFirst`/`create`/`update`/`delete`/`findMany`; service validates + parses; save: `findFirst({userId,organizationId,name})` → update its `config` else create.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): per-user saved layout service (migration-free)"`

---

## Task 3: Pane-summary service

**Files:**
- Create: `src/services/dashboard/pane-summary.ts`
- Test: `src/services/dashboard/pane-summary.test.ts`

**Interfaces:**
- Consumes: `assertWorkspaceAccess`, `workspaceMetrics` (balance), `safeToSpend` (result), `bill-service.upcomingAndOverdue`, `getWorkspace` (name/color), `format`, `today`.
- Produces: `type PaneSummary = { workspaceId; name; color; balance: string; safeToSpend: string; topBills: { vendor: string; amount: string; status: "overdue" | "soon" | "scheduled" }[] }`; `paneSummary(userId, workspaceId, today): Promise<PaneSummary>` (top 3 bills, overdue first).

- [ ] **Step 1: Write failing test** — seeded workspace (balance + one overdue + one upcoming bill); `paneSummary` returns `balance`/`safeToSpend` equal to `format(...)` of the underlying services and `topBills` with the overdue flagged `overdue`; a non-member is denied.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — call the services for the period "month", format, take the first 3 (overdue then upcoming), map status by due date.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): compact pane summary service"`

---

## Task 4: TiledView renderer + PaneCard (sizes applied + captured)

**Files:**
- Create: `src/components/tiling/pane-card.tsx`, `src/components/tiling/tiled-view.tsx`
- Test: `src/components/tiling/tiled-view.test.tsx`

**Interfaces:**
- Consumes: `react-resizable-panels` (`PanelGroup`, `Panel`, `PanelResizeHandle`), `PaneConfig` (Task 1), `PaneSummary` (Task 3).
- Produces: `PaneCard({ summary }: { summary: PaneSummary })` (color header, balance, safe-to-spend, top bills); `TiledView({ config, summaries, onSizesChange? }: { config: PaneConfig; summaries: Record<string, PaneSummary>; onSizesChange?: (sizes: number[]) => void })` — renders the tree into nested `PanelGroup`s (`row`→horizontal, `col`→vertical), applies each split's `sizes` as panel `defaultSize`, and calls `onSizesChange` from the root group's `onLayout`. A missing summary renders a "Loading…" placeholder (no crash). Below `lg`: a `lg:hidden` **stacked column** of `PaneCard`s (one per leaf) and a `hidden lg:block` resizable tree.

- [ ] **Step 1: Install** — `pnpm add react-resizable-panels`.
- [ ] **Step 2: Write failing test** — `renderToString(<TiledView config={rowAB} summaries={{a,b}} />)` includes both workspace names + both balances (assert via the always-rendered stacked-column fallback, which doesn't depend on the panel runtime); an unknown leaf id renders "Loading…".
- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Implement** — recursive renderer + `PaneCard`; mock `next/navigation` in the test if needed (per Phase 2a pattern).
- [ ] **Step 5: Run → PASS** + production-server browser check at desktop width (resize works).
- [ ] **Step 6: Commit** — `git commit -am "feat(tiling): resizable pane-tree renderer + pane card"`

---

## Task 5: /tiles page + server actions

**Files:**
- Create: `src/app/(app)/tiles/page.tsx`, `src/app/(app)/tiles/_actions.ts`
- Test: `src/app/(app)/tiles/page.smoke.test.ts`

**Interfaces:**
- Consumes: `listAccessibleWorkspaces`, `layout-service`, `paneSummary` (Task 3), `defaultLayout`/`collectWorkspaceIds` (Task 1), `getCurrentUser`, `today`.
- Produces: `/tiles` server page — resolves the user's org + accessible workspaces, picks an initial layout (`?layout=<id>` if owned, else `defaultLayout(firstTwoWorkspaceIds)`), fetches `paneSummary` for each leaf (`Promise.all`), renders `<TilesClient workspaces layouts initialConfig initialSummaries />`. Server actions: `paneSummariesAction(workspaceIds: string[]): Promise<Record<string, PaneSummary>>` (**batch** — used on assign AND on restore), `saveLayoutAction(name, config)`, `listLayoutsAction()`, `deleteLayoutAction(layoutId)`. (A thin `TilesClient` holds `config`, `summaries`, and the controls — Task 6.)

- [ ] **Step 1: Write failing smoke test** — seeded org with two workspaces: the page data path builds `defaultLayout` over their ids, `collectWorkspaceIds` returns both, and `paneSummariesAction`'s underlying loop resolves a summary for each.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — server page composition; actions delegate to services with `getCurrentUser` + org from the first `OrgMembership`; `paneSummariesAction` maps ids → `paneSummary` (Promise.all) returning a serializable record.
- [ ] **Step 4: Run → PASS** + browser check (`/tiles` shows two live panes).
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): /tiles page + pane/layout server actions"`

---

## Task 6: Layout controls + pane management (sizes + restore-loads-data)

**Files:**
- Create: `src/components/tiling/layout-controls.tsx`, `src/components/tiling/tiles-client.tsx`
- Test: `src/components/tiling/tiles-client.test.tsx`
- (Pure tree-edit logic is already tested in Task 1; this task wires it + data loading.)

**Interfaces:**
- Consumes: the Task 1 pure ops (`addLeaf`/`removeLeafAt`/`assignAt`/`setDirection`/`setSizes`/`collectWorkspaceIds`), the Task 5 actions, `PaneSummary`.
- Produces: `TilesClient({ workspaces, layouts, initialConfig, initialSummaries })` — holds `config` + `summaries` state, renders `LayoutControls` + `TiledView`. `LayoutControls({ workspaces, layouts, config, onAddPane, onRemovePane, onAssign, onToggleDirection, onSave, onRestore, onDelete })`: **Save** (name → `saveLayoutAction(name, config)`), **Restore** (dropdown → load a layout's `config`, then `paneSummariesAction(collectWorkspaceIds(config))` to populate summaries for its panes), **Delete**, plus **add pane / remove pane / assign workspace / row⇄column**. On `TiledView` resize → `setSizes(config, sizes)` so saves capture proportions.

- [ ] **Step 1: Write failing test** — `renderToString(<LayoutControls ...>)` lists the saved-layout names and the workspace options; a unit test on the wiring: calling the `onAssign(index, wsId)` handler applies `assignAt` (assert resulting config). (Interaction-free: assert the pure handlers + rendered options, since clicks aren't simulable.)
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `TilesClient` state + handlers built on the pure ops; restore fetches summaries via the batch action and merges; resize updates `config` sizes; mock `next/navigation` in the test.
- [ ] **Step 4: Run → PASS** + browser check (save "Morning review", resize a pane, restore it → proportions preserved; add/remove pane; toggle row/column; confirm stacking below `lg`).
- [ ] **Step 5: Commit** — `git commit -am "feat(tiling): save/restore layouts (with sizes) + pane management"`

---

## Task 7: Activate the app-bar Tile view / Layouts pills

**Files:**
- Modify: `src/components/workspace/tab-bar.tsx`
- Test: production build + browser check (the app bar is an async server component; render assertions are impractical).

**Interfaces:**
- Consumes: the `/tiles` route (Task 5).
- Produces: the "⊞ Tile view" and "⌄ Layouts" pills become real `<Link href="/tiles">` (no longer disabled Phase-2 stubs); drop the `opacity-60` / "Phase 2" titles.

- [ ] **Step 1: Implement** — replace the two muted `<span>` stubs with `<Link href="/tiles">` styled like the other pills.
- [ ] **Step 2: Verify** — `pnpm type-check`, `pnpm lint`, `pnpm build` green; browser: the Tile view pill navigates to `/tiles`.
- [ ] **Step 3: Commit** — `git commit -am "feat(tiling): activate Tile view + Layouts app-bar pills"`

---

## Phase 2b Done — Definition of Done

- `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
- `/tiles` renders **multiple independent, live workspace panes** side-by-side/stacked on desktop, each with its own `{workspaceId}` context.
- Panes are **resizable**; the user can **add/remove panes, assign a workspace per pane, and toggle row/column**.
- Layouts **save under a name and restore in one click — including pane proportions** — **per user** (another user can't see them; proven by the layout-service RLS test).
- Below `lg`, tiling **degrades to a stacked single column**.
- The app-bar **Tile view / Layouts pills are live**.
- The cross-workspace security test still passes; a pane only renders a summary for a workspace the caller can access.
- Phase 2b roadmap items marked `[x]` (Rule 7) before the final checkpoint.

## Mapping to spec/PRD requirements (coverage check)

- **FR-4 (tiled mode: multiple resizable, independent panes, desktop):** Tasks 3, 4, 5, 6
- **FR-5 (save & restore named layouts, per user, incl. proportions):** Tasks 1, 2, 6
- Per-pane `{workspaceId}` context (spec §5.1): Tasks 1, 4, 6 · Responsive degrade (spec §11): Task 4
- NFR-2/3 authz + RLS: Task 2 (Layout per-user RLS), Task 3 (pane summary access-checked)
- **Out of scope (later):** drag-to-split arbitrary nesting (v1 = add/remove/assign + row/col toggle), cross-device layout sync, persisting which layout is "active" across sessions.

## Notes / decisions

- **Migration-free, confirmed:** `Layout` exists with per-user RLS; `saveLayout` is find-then-update/create (no unique-constraint dependency), so Phase 2b touches no schema.
- **Panel sizes ARE persisted** (in the config `sizes`), so a restored named layout reproduces its proportions — the point of "Morning review" / "Tax prep".
- **All editing logic is pure + unit-tested** (`pane-tree.ts`), because the test harness can't click; the components are thin and render-tested via the always-on stacked fallback (which doesn't depend on the resizable-panels runtime).
- **Bounded editor for v1:** add/remove leaf, assign workspace, root row/col toggle. The renderer is tree-capable; drag-to-split arbitrary nesting is deferred.
- **Per-pane data:** initial summaries fetched server-side; assign AND restore use the batch `paneSummariesAction`. Cheap for a handful of panes; backed by existing `(workspaceId, …)` indexes.
- **Reuse, not rebuild:** pane summaries reuse the Phase 2a computation services — figures match the full dashboard exactly.
