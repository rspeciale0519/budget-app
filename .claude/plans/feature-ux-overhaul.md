# UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Ledger genuinely usable by everyday people by shipping the UI for already-built backend capabilities (workspaces, sharing, categories, transaction editing, transfers, budget deletion, import undo) and fixing the first-run, feedback, language, and accessibility gaps found in the 2026-07-18 UX audit (`docs/temp/ux-audit-2026-07-18.md`).

**Architecture:** Almost every Tier-1 finding is UI wiring over existing services — the plan adds thin server actions and client components that call verified service functions (`createWorkspace`, `assignWorkspaceMembership`, `createCategory`, `updateTransaction`, `deleteTransaction`, `flagTransfer`, `deleteBudget`, `undoImport`). New backend surface is deliberately small: transaction list filters, an account-transfer helper, a budget move helper, an import-batch list, and member email resolution. A tiny toast system is built first because nearly every later task uses it.

**Tech Stack:** Next.js App Router (server components + server actions), Prisma with RLS clients (`rlsClientFor`) + `prismaAdmin`, Supabase auth (`@supabase/ssr`), Tailwind, vitest (service tests hit the local DB, per `src/services/budget-service.test.ts` pattern), pnpm.

## Global Constraints

- **No new dependencies.** Everything (toast, dialogs, menus) is built with existing primitives (`Button`, `Card`, `Input`, `AmountInput`, `Select`, `Label`, `FieldError`, `EmptyState`).
- **No schema migrations.** Every task runs on the existing Prisma schema.
- **Follow existing patterns exactly:** server actions return `ActionResult { ok: boolean; error?: string }`; services take `actorUserId` first, assert access via `assertWorkspaceAccess`/`assertOrgRole`, and run queries through `rlsClientFor(userId).run(tx => ...)` with repo functions; money always via `money()`/`format()` from `src/lib/money`; dates via `src/lib/calendar-date` (`today()`, `toUtcDate`, `fromDbDate`).
- **Source files ≤ ~450 LOC** — split components when they grow past it.
- **Copy rules:** sentence case for headings and buttons ("Set budget", not "Set Budget"); no raw enums, UUIDs, or abbreviations ("MTD") in user-visible text; errors say what happened and what to do next.
- **Never delete user data paths:** destructive UI actions get a confirm step or an undo toast.
- **Gates:** `pnpm type-check`, `pnpm lint`, `pnpm test` must pass at every phase checkpoint.

## Execution protocol (per user's global CLAUDE.md Rules 7–8)

1. On approval, before any code: `/git-workflow-planning:start feature ux-overhaul`.
2. After each phase: update `docs/ROADMAP.md` if it exists (ask once if it doesn't), then `/git-workflow-planning:checkpoint <phase-number> <description>`. If a gate fails: stop, fix, re-run the same checkpoint.
3. After Phase 6: `/git-workflow-planning:finish`.

Verified-fact note: every service function, schema field, and component prop referenced below was read directly from the codebase on 2026-07-18. Where a task creates a new function, its full signature is given in **Produces**.

---

## Phase 1 — Feedback foundations (toast, error pages, surfaced failures)

### Task 1.1: Toast system

**Files:**
- Create: `src/components/ui/toast.tsx`
- Modify: `src/app/(app)/layout.tsx` (wrap children in provider)
- Test: `src/components/ui/toast.test.tsx`

**Interfaces:**
- Produces: `ToastProvider({ children })`; `useToast(): { toast: (message: string, opts?: { kind?: "success" | "error"; actionLabel?: string; onAction?: () => void; durationMs?: number }) => void }`. Later tasks call `toast("Saved")`, `toast("Could not save", { kind: "error" })`, and `toast("Import undone", { actionLabel: "Undo", onAction })`.

- [x] **Step 1: Write the failing component test** — ADAPTED at implementation: the repo has no jsdom/RTL (and the no-new-deps constraint forbids adding them); tests use the repo's `renderToString` pattern instead, asserting children render, the `aria-live="polite"` region exists, and `useToast` throws outside the provider. Interaction behavior is covered by browser-verify steps.

```tsx
// @vitest-environment jsdom
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Trigger() {
  const { toast } = useToast();
  return (
    <button onClick={() => toast("Budget saved", { actionLabel: "Undo", onAction: () => toast("Undone") })}>
      go
    </button>
  );
}

it("shows a toast with an action and auto-dismisses", async () => {
  vi.useFakeTimers();
  render(<ToastProvider><Trigger /></ToastProvider>);
  fireEvent.click(screen.getByText("go"));
  expect(screen.getByText("Budget saved")).toBeTruthy();
  fireEvent.click(screen.getByText("Undo"));
  expect(screen.getByText("Undone")).toBeTruthy();
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.queryByText("Budget saved")).toBeNull();
  vi.useRealTimers();
});
```

- [x] **Step 2: Run it** — `pnpm vitest run src/components/ui/toast.test.tsx` → FAIL (module not found).

- [x] **Step 3: Implement `toast.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  message: string;
  kind: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
}
interface ToastOpts {
  kind?: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

const ToastContext = createContext<{ toast: (message: string, opts?: ToastOpts) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, opts: ToastOpts = {}) => {
    const id = ++nextId.current;
    setItems((cur) => [...cur, { id, message, kind: opts.kind ?? "success", actionLabel: opts.actionLabel, onAction: opts.onAction }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), opts.durationMs ?? 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 rounded-control border px-3 py-2.5 text-sm shadow-lg",
              t.kind === "error" ? "border-alert/40 bg-alert-tint text-alert" : "border-rule-strong bg-raised text-ink",
            )}
          >
            <span>{t.message}</span>
            {t.actionLabel && (
              <Button variant="outline" size="sm" onClick={() => { t.onAction?.(); setItems((cur) => cur.filter((x) => x.id !== t.id)); }}>
                {t.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [x] **Step 4: Wrap the app** — in `src/app/(app)/layout.tsx`, import `ToastProvider` and wrap the returned `<div className="min-h-screen">…</div>` contents: `<ToastProvider><div className="min-h-screen">…</div></ToastProvider>`.

- [x] **Step 5: Verify** — test passes; `pnpm type-check` clean.

### Task 1.2: Error boundary and not-found pages; stop silent redirects

**Files:**
- Create: `src/app/error.tsx`, `src/app/not-found.tsx`
- Modify: `src/app/(app)/w/[workspaceId]/manage/page.tsx:24-29`, `src/app/(app)/w/[workspaceId]/import/page.tsx:16-22`, `src/app/(app)/w/[workspaceId]/income/page.tsx:19-28`

- [x] **Step 1: `src/app/error.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-sm space-y-3 text-center">
        <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="text-sm text-muted">
          Your data is safe — this page just failed to load. Try again, and if it keeps happening, reload the app.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

- [x] **Step 2: `src/app/not-found.tsx`** — same shape: heading "Page not found", body "That page doesn't exist or may have moved.", `<Link href="/">` styled as a `Button` (use `<Link href="/" className="...">Back to your dashboard</Link>` with the outline-button classes from `tab-bar.tsx:37`).

- [x] **Step 3: Remove the silent `catch { redirect("/") }` blocks.** In each of the three listed pages the data load is wrapped in try/catch that redirects to `/`. Delete the try/catch and let genuine errors throw to `error.tsx`. Keep the existing not-signed-in `redirect("/login")` and workspace-access handling (the friendly access card in `w/[workspaceId]/layout.tsx:21-31` already covers no-access, because `ForbiddenError` from the layout renders it before these pages run).

- [x] **Step 4: No-access dead-end fix** — in `src/app/(app)/w/[workspaceId]/layout.tsx:21-31`, the friendly "You don't have access to this workspace." card gets a primary action: `<Link href="/">Back to your dashboard</Link>` styled with the outline-button classes.

- [x] **Step 5: Verify** — `pnpm type-check && pnpm lint`; manually load a workspace page while the DB is up (renders) — behavior for real errors is now the branded boundary instead of a silent bounce.

### Task 1.3: Surface failures on money actions; confirm destructive ones

**Files:**
- Modify: `src/components/dashboard/dashboard.tsx:166-172` (mark paid), `src/components/income/income-source-form.tsx:50-53,95-97` (remove income), `src/components/tiling/layout-controls.tsx:132-143` (delete layout)

- [x] **Step 1: Mark paid.** In `dashboard.tsx`, the bill row's mark-paid handler currently ignores `!res.ok`. Import `useToast`, and on failure call `toast(res.error ?? "Could not mark that bill paid — try again.", { kind: "error" })`; on success `toast("Marked paid")`.
- [x] **Step 2: Income remove.** In `income-source-form.tsx`, add a `busy` state to the remove handler (disable the control while pending), replace the bare link with a `Button variant="ghost" size="sm"`, and change the flow to confirm-then-delete: first click flips the row control to "Remove?" (danger variant); second click within that render actually calls `deleteIncomeSourceAction`. On failure: `toast(res.error ?? "Could not remove that income source.", { kind: "error" })`. On success: `toast("Income source removed")`.
- [x] **Step 3: Layout delete.** Same two-click confirm pattern on the Delete button in `layout-controls.tsx`; toast on failure.
- [x] **Step 4: Verify** — done: gates green; browser-verified via chrome-devtools (prod build, port 3010): mark-paid showed "Marked paid" toast + safe-to-spend recalc; income remove required the "Remove?" confirm click and showed "Income source removed" toast; no console errors.

**Phase 1 checkpoint:** roadmap update → `/git-workflow-planning:checkpoint 1 "feedback foundations: toast, error pages, surfaced failures"`.

---

## Phase 2 — Account, auth & access

### Task 2.1: Avatar menu with sign out + Settings landing page

**Files:**
- Create: `src/components/chrome/avatar-menu.tsx`, `src/app/(app)/settings/page.tsx`
- Modify: `src/components/workspace/tab-bar.tsx:58-60` (replace static avatar div)

**Interfaces:**
- Consumes: `createBrowserClient()` (`src/lib/supabase/client.ts`), `supabase.auth.signOut()`.
- Produces: `AvatarMenu({ initial, email }: { initial: string; email: string })` client component.

- [x] **Step 1: `avatar-menu.tsx`** — client component: a `<button>` styled exactly like the current avatar `div` (`grid h-8 w-8 place-items-center rounded-full bg-now-tint text-xs font-bold text-now ring-1 ring-inset ring-now/25`), `aria-haspopup="menu"`, `aria-expanded`. On click toggles an absolutely-positioned card (`bg-raised border border-rule-strong rounded-control shadow-lg`) containing: the user's email (muted, non-interactive), `<Link href="/settings">Settings</Link>`, `<Link href="/settings/members">Sharing &amp; members</Link>`, a divider, and a "Sign out" button that calls:

```tsx
async function signOut() {
  await createBrowserClient().auth.signOut();
  window.location.assign("/login");
}
```

Close on Escape and on outside click (a `useEffect` with `document.addEventListener("pointerdown", …)`), return focus to the trigger on close.

- [x] **Step 2: Wire into `tab-bar.tsx`** — replace the static initial `div` with `<AvatarMenu initial={initial} email={user?.email ?? ""} />`.

- [x] **Step 3: `src/app/(app)/settings/page.tsx`** — server page, same guard pattern as `settings/members/page.tsx:11-12` (`getCurrentUser` → `redirect("/login")`). Renders `<h1 className="text-xl font-semibold text-ink">Settings</h1>` and a `Card` linking to "Sharing &amp; members" with the one-line description "Invite someone and choose which workspaces they can see."

- [x] **Step 4: Command palette entries** — in `src/lib/command-palette/commands.ts`, add two global commands alongside the existing "Go to workspace" entries: "Settings" → `/settings`, "Sharing &amp; members" → `/settings/members` (mirror the existing command-object shape at `commands.ts:16-31`).

- [x] **Step 5: Verify** — browser-verified: sign out landed on /login; menu has dialog semantics; /settings renders.

### Task 2.2: Sign-up, forgot-password, and friendly auth errors

**Files:**
- Create: `src/lib/auth-errors.ts`, `src/app/auth/update-password/page.tsx`, `src/components/auth/update-password-form.tsx`
- Modify: `src/components/auth/login-form.tsx`, `src/app/auth/callback/route.ts`
- Test: `src/lib/auth-errors.test.ts`

**Interfaces:**
- Produces: `friendlyAuthError(message: string): string`; `LoginForm` gains a `mode` state `"signin" | "signup" | "reset"`.

- [x] **Step 1: Failing test for the error mapper**

```ts
import { friendlyAuthError } from "@/lib/auth-errors";

it("maps supabase auth errors to plain language", () => {
  expect(friendlyAuthError("Invalid login credentials")).toBe(
    "That email and password don't match. Try again, or use “Forgot password?” below.",
  );
  expect(friendlyAuthError("Email not confirmed")).toBe(
    "Check your inbox — you need to confirm your email before signing in.",
  );
  expect(friendlyAuthError("User already registered")).toBe(
    "An account with that email already exists. Sign in instead.",
  );
  expect(friendlyAuthError("weird upstream failure")).toBe(
    "Sign-in failed: weird upstream failure",
  );
});
```

- [x] **Step 2: Implement `auth-errors.ts`** — a `const MAP: Record<string, string>` of the three known messages plus a fallback that prefixes `"Sign-in failed: "`.

- [x] **Step 3: Extend `login-form.tsx`.** Add `mode` state. UI per mode:
  - `signin` (default): current form + footer links "Create an account" (→ `setMode("signup")`) and "Forgot password?" (→ `setMode("reset")`).
  - `signup`: same email/password fields, submit calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })`; on success render an inline notice ("Check your email to confirm your account, then sign in.") instead of the form; "Back to sign in" link.
  - `reset`: email field only; submit calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password` })`; success notice "If that email has an account, a reset link is on its way."
  All error paths run through `friendlyAuthError`. Give the Google button its own `busy` state ("Opening Google…") and surface its error: `const { error } = await supabase.auth.signInWithOAuth(...); if (error) setError(friendlyAuthError(error.message));`.

- [x] **Step 4: Callback hardening.** In `src/app/auth/callback/route.ts`: read `next` from the URL's search params; on `exchangeCodeForSession` error, redirect to `/login?error=auth`; on success redirect to `next` if it starts with `/`, else `/`. In `src/app/login/page.tsx`, when `searchParams.error === "auth"` render a `FieldError` above the form: "Sign-in link didn't work — it may have expired. Try again."

- [x] **Step 5: `update-password` page + form** — server page guards with `getCurrentUser()` (recovery links create a session); client form with one password field calling `supabase.auth.updateUser({ password })`, success → `router.push("/")` after `toast("Password updated")` — the page sits under `(app)`-less root so import `ToastProvider` is unavailable; instead show an inline success notice then `router.push("/")`.

- [x] **Step 6: Verify** — `pnpm test src/lib/auth-errors.test.ts` passes; manual: create account flow shows the confirm notice; bad password shows the friendly line.

### Task 2.3: Members page — real names, and actually granting access

**Files:**
- Modify: `src/services/membership-service.ts`, `src/app/(app)/settings/members/page.tsx`
- Create: `src/components/members/member-access.tsx`
- Test: extend `src/services/membership-service.test.ts`

**Interfaces:**
- Consumes: existing `assignAction(workspaceId, targetUserId, role)` / `revokeAction(workspaceId, targetUserId)` from `src/app/(app)/settings/_actions.ts:34-58` (verified present, currently uncalled); `listAccessibleWorkspaces(userId)`.
- Produces: `listMembersWithDetails(actorUserId, organizationId): Promise<Array<{ userId: string; email: string; orgRole: OrgRole; workspaces: Array<{ workspaceId: string; role: WorkspaceRole }> }>>`.

- [x] **Step 1: Service.** Add `listMembersWithDetails` to `membership-service.ts`: reuse the existing admin Supabase client construction from `inviteMember` (`membership-service.ts:72-76`) — extract it to a module-level `function supabaseAdmin()` used by both. Implementation: `assertOrgRole(actorUserId, organizationId, "admin")`; fetch memberships via `prismaAdmin.orgMembership.findMany({ where: { organizationId } })`; fetch each email via `supabaseAdmin().auth.admin.getUserById(m.userId)` (Promise.all; fall back to `"unknown"` on error); fetch workspace memberships via `prismaAdmin.workspaceMembership.findMany({ where: { workspace: { organizationId } } })` and group by userId.

- [x] **Step 2: Service test** (extend the existing membership-service test file, same live-DB pattern as `budget-service.test.ts`): create an org + two workspaces + a member with one workspace membership; assert `listMembersWithDetails` returns the member with their workspace list, and rejects a non-admin caller with `ForbiddenError`. (Email lookup will return "unknown" for random UUIDs — assert that tolerantly.)

- [x] **Step 3: `member-access.tsx`** — exports client component `MemberAccessManager`. Props: `{ member: { userId; email; orgRole; workspaces }, allWorkspaces: Array<{ id; name }>, isSelf: boolean }`. Also show invite status: `getUserById` exposes `last_sign_in_at` — surface `lastSignInAt: string | null` through `listMembersWithDetails` and render a muted "Invited — hasn't signed in yet" tag when null. Renders the member row: email (plus a "You" tag when `isSelf`), org role, and one line per org workspace with a `Select` of `No access / Can view / Can edit` mapped to revoke / `viewer` / `admin`. On change call `assignAction` or `revokeAction`, disable while pending, `toast` on failure, `router.refresh()` on success. Guard: when `isSelf`, render the workspace list read-only (you can't lock yourself out by accident).

- [x] **Step 4: Rewire `members/page.tsx`** — call `listMembersWithDetails`; pass `listAccessibleWorkspaces(user.id)` (already imported in tab-bar; import here too) as `allWorkspaces`; render a `MemberAccessManager` row per member replacing the UUID rows at `members/page.tsx:49-54`. Change the helper copy under the invite form to: "After inviting someone, choose below which workspaces they can see or edit."

- [x] **Step 5: Verify** — service tests pass; members page shows emails + You badge + per-workspace access selects (verified in browser); full grant flow exercised via service test (RLS-verified visibility).

### Task 2.4: Real workspace creation (kill the fake "+")

**Files:**
- Create: `src/app/(app)/_actions.ts`, `src/components/workspace/workspace-create-dialog.tsx`
- Modify: `src/components/workspace/tab-bar.tsx`, `src/components/workspace/workspace-tabs.tsx:52-57`, `src/app/(app)/tiles/page.tsx:31`

**Interfaces:**
- Consumes: `createWorkspace(actorUserId, organizationId, { name, type: "personal" | "business", color, icon? })` (verified `src/services/workspace-service.ts:9`).
- Produces: `createWorkspaceAction(input: { organizationId: string; name: string; type: "personal" | "business"; color: string }): Promise<{ ok: boolean; error?: string; workspaceId?: string }>`.

- [x] **Step 1: Action** — `src/app/(app)/_actions.ts` (`"use server"`): `requireUserId` pattern copied from `settings/_actions.ts:17-21`; call `createWorkspace`; `revalidatePath("/")`; return `{ ok: true, workspaceId: ws.id }`; catch → `{ ok: false, error: e instanceof Error ? e.message : "Could not create the workspace" }`.

- [x] **Step 2: Dialog component** — client. Props `{ organizationId: string }`. A real `<button>` replacing the dead span, `aria-label="Add workspace"`. Opens an inline popover-card form: Name (`Input` + `Label`), Type (`Select`: "Personal" / "Business" → values `personal`/`business`), Color (six preset swatch buttons — `#3b82f6 #10b981 #f59e0b #ef4444 #8b5cf6 #14b8a6` — rendered as 20px circles with `aria-label` and a selected ring; satisfies the `#RRGGBB` schema without a color-picker dependency). Submit → `createWorkspaceAction`; success → `router.push(`/w/${workspaceId}`)`; failure → `FieldError` inline. Escape/outside-click closes.

- [x] **Step 3: Plumb `organizationId`.** In `tab-bar.tsx` fetch it once: `const orgMembership = await prismaAdmin.orgMembership.findFirst({ where: { userId } });` (import `prismaAdmin`) and pass to `WorkspaceTabs` as a new prop; inside `workspace-tabs.tsx` replace the span at lines 52-57 with `<WorkspaceCreateDialog organizationId={organizationId} />`.

- [x] **Step 4: Fix the Tiles copy** — `tiles/page.tsx:31` → use `EmptyState`: title "Nothing to tile yet", description "Tiling shows several workspaces side by side. Create a second workspace with the + button in the top bar.", no action needed.

- [x] **Step 5: Verify** — browser-verified: created "UX Test Biz" (business) end-to-end; new tab appeared and app navigated to its dashboard.

**Phase 2 checkpoint:** `/git-workflow-planning:checkpoint 2 "auth, sharing, sign-out, workspace creation"`.

---

## Phase 3 — Categories, transactions, transfers, import history

### Task 3.1: Category management on Manage

**Files:**
- Create: `src/components/manage/category-form.tsx`
- Modify: `src/app/(app)/w/[workspaceId]/_actions.ts` (add action), `src/app/(app)/w/[workspaceId]/manage/page.tsx` (add card)

**Interfaces:**
- Consumes: `createCategory(actorUserId, workspaceId, { name, kind: "expense" | "income" })`, `listCategories(actorUserId, workspaceId)` (verified `category-service.ts:17,34`).
- Produces: `addCategoryAction(workspaceId: string, input: { name: string; kind: string }): Promise<ActionResult>`.

- [x] **Step 1: Action** — add to `w/[workspaceId]/_actions.ts` using the existing `run()` helper (line 23): `run(workspaceId, (userId) => createCategory(userId, workspaceId, { name: input.name, kind: input.kind as never }))`.
- [x] **Step 2: Component** — `CategoryManager({ workspaceId, categories })` where categories come from the server page: a `Card` titled "Categories" listing existing ones grouped Expense/Income (small tags), plus an inline add row: `Input` name + `Select` kind ("Spending" → `expense`, "Income" → `income`) + "Add category" button. Submit → `addCategoryAction`, clear the name, `toast("Category added")`, `router.refresh()`.
- [x] **Step 3: Page wiring** — `manage/page.tsx` already loads what it needs elsewhere; add `listCategories(user.id, workspaceId)` to its data load and render `CategoryManager` above the account card.
- [x] **Step 4: Verify** — add "Coffee" (expense); it appears immediately in the Budget page's category dropdown.

### Task 3.2: Transaction list filters (service + repo)

**Files:**
- Modify: `src/repositories/transaction-repo.ts:20-27`, `src/services/transaction-service.ts:121-132`
- Test: extend `src/services/transaction-service.test.ts`

**Interfaces:**
- Produces (breaking-change-free — new optional fields):
  - repo: `listByWorkspace(db, workspaceId, skip, take, where?: Prisma.TransactionWhereInput)` and new `countByWorkspace(db, workspaceId, where?: Prisma.TransactionWhereInput): Promise<number>`
  - service: `listTransactions(actorUserId, workspaceId, opts?: { page?: number; pageSize?: number; search?: string; accountId?: string; categoryId?: string; uncategorized?: boolean }): Promise<{ rows: Transaction[]; total: number }>` — **return shape changes from `Transaction[]` to `{ rows, total }`**; update the one existing caller `manage/page.tsx` accordingly.

- [x] **Step 1: Failing service test** (extend existing file, live-DB pattern): seed three transactions ("COSTCO GAS", "Netflix", uncategorized "Misc"), then assert `search: "costco"` returns 1 (case-insensitive), `uncategorized: true` returns only the uncategorized one, and `total` reflects the filtered count.
- [x] **Step 2: Repo** — build `where` merge: `{ workspaceId, ...extra }`; search filter constructed in the service:

```ts
const where: Prisma.TransactionWhereInput = {
  ...(opts.accountId ? { accountId: opts.accountId } : {}),
  ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
  ...(opts.uncategorized ? { categoryId: null, isTransfer: false } : {}),
  ...(opts.search
    ? { OR: [
        { description: { contains: opts.search, mode: "insensitive" } },
        { merchant: { contains: opts.search, mode: "insensitive" } },
      ] }
    : {}),
};
```

Service returns `{ rows, total }` via `Promise.all` of the two repo calls inside one `run()`.
- [x] **Step 3: Update `manage/page.tsx`** to destructure `{ rows }` from the new return shape.
- [x] **Step 4: Verify** — new test passes; whole suite green.

### Task 3.3: Transactions register page

**Files:**
- Create: `src/app/(app)/w/[workspaceId]/transactions/page.tsx`, `src/app/(app)/w/[workspaceId]/transactions/_actions.ts`, `src/components/transactions/transactions-view.tsx`, `src/components/transactions/transaction-row.tsx`
- Modify: `src/components/workspace/workspace-sub-nav.tsx:7-15` (add item)

**Interfaces:**
- Consumes: Task 3.2's `listTransactions`; verified services `updateTransaction(actorUserId, transactionId, { date?, amount?, description?, categoryId?, isTransfer? })`, `deleteTransaction(actorUserId, transactionId)`, `createRule(actorUserId, workspaceId, { match: "contains", pattern, categoryId, priority })`; `listCategories`, `listAccounts` (in `account-service.ts` — same `list*` naming; confirm exact export name when opening the file, the manage page already imports it).
- Produces actions (all `ActionResult` + `revalidatePath(`/w/${workspaceId}/transactions`)`):
  - `setTransactionCategoryAction(workspaceId, transactionId, categoryId: string | null)`
  - `updateTransactionAction(workspaceId, transactionId, input: { date?: string; amount?: string; description?: string })`
  - `deleteTransactionAction(workspaceId, transactionId)`
  - `markTransferAction(workspaceId, transactionId, isTransfer: boolean)` (via `updateTransaction` with `{ isTransfer }`)
  - `createRuleFromTransactionAction(workspaceId, pattern: string, categoryId: string)` (priority 0)

- [x] **Step 1: Page (server).** Reads `searchParams` `{ q?, account?, category?, page?, filter? }` (`filter=uncategorized`). Loads accounts + categories + `listTransactions(user.id, workspaceId, { search: q, accountId: account, categoryId: category, uncategorized: filter === "uncategorized", page: Number(page ?? 1), pageSize: 50 })`, plus an uncategorized count (`listTransactions(..., { uncategorized: true, pageSize: 1 })` → `.total`). Passes everything to `TransactionsView`.
- [x] **Step 2: `TransactionsView` (client).** Top bar: search `Input` (submits via URL params using `useRouter().push` with the new query string — server-driven filtering, no client cache), account `Select`, category `Select`, and — when the uncategorized count > 0 — a pill button "Uncategorized (N)" toggling `filter=uncategorized`. Table below (wrapped in `overflow-x-auto`): Date · Description · Category (inline `Select` per row → `setTransactionCategoryAction`, with the current value; includes "Uncategorized" as empty) · Amount (`format(money(amount))`, income in `text-credit`) · row actions.
- [x] **Step 3: `TransactionRow` actions.** An "Edit" toggle expanding an inline edit row (date `Input type="date"`, `AmountInput`, description `Input` → `updateTransactionAction`); "Delete" with the two-click confirm pattern from Task 1.3 + `toast("Transaction deleted")`; overflow of two more actions: "Mark as transfer"/"Not a transfer" (`markTransferAction`, with the one-line explanation "Transfers are left out of income and spending totals") and — visible only when the row has a category — "Always use this category" → `createRuleFromTransactionAction(workspaceId, row.description, row.categoryId)` + `toast("Rule saved — future imports matching “<description>” will use this category")`.
- [x] **Step 4: Pagination** — Prev/Next links driven by `page` param and `total` (same link styling as `calendar/page.tsx:29-30` `navCls`).
- [x] **Step 5: Sub-nav** — add `{ href: "transactions", label: "Transactions" }` to the items array in `workspace-sub-nav.tsx` right after the dashboard entry.
- [x] **Step 6: Verify** — browser-verified: search by partial text works via URL params; inline categorization fired toast and dropped the Uncategorized count; delete/undo use two-click confirm; gates green.

### Task 3.4: Transfers between accounts

**Files:**
- Modify: `src/services/transfer-service.ts` (add function), `src/app/(app)/w/[workspaceId]/_actions.ts` (add action), `src/app/(app)/w/[workspaceId]/manage/page.tsx` + `src/components/manage/manage-forms.tsx` (add form)
- Test: extend `src/services/transfer-service.test.ts`

**Interfaces:**
- Produces: `createAccountTransfer(actorUserId, workspaceId, input: { fromAccountId: string; toAccountId: string; amount: string; date: string; description?: string }): Promise<void>` — creates two paired transactions (negative in from-account, positive in to-account) with `isTransfer: true` and cross-linked `transferPairId`, in one transaction; `addAccountTransferAction(workspaceId, input)` wrapping it via `run()`.

- [x] **Step 1: Failing service test** — seed two accounts; call `createAccountTransfer` for $500; assert: two transactions exist, amounts `-500.00`/`500.00`, both `isTransfer: true`, `transferPairId` cross-referenced, and same-account input rejects (`fromAccountId === toAccountId` → error "Pick two different accounts").
- [x] **Step 2: Implement** in `transfer-service.ts`, following `createTransaction`'s shape (assert admin access, `money()` parse and require positive, `dedupeHash` per side with descriptions defaulting to "Transfer to <toAccount.name>" / "Transfer from <fromAccount.name>" — load both accounts first and error if either is missing): insert both rows via `repo` functions from `transaction-repo` inside a single `rlsClientFor(actorUserId).run(async (tx) => { ... })`, then `updateTransactionRow` each with the other's id as `transferPairId`, and write one `audit` entry (`entityType: "Transaction"`, `action: "create"`).
- [x] **Step 3: Form** — new "Move money between accounts" card in manage-forms: From `Select`, To `Select`, `AmountInput` (positive number, helper text "No minus sign needed"), date `Input type="date"` defaulting to `today()` from `@/lib/calendar-date`. Submit → `addAccountTransferAction` → `toast("Transfer recorded")`.
- [x] **Step 4: Verify** — service test green (paired isTransfer rows, cross-linked, rejects same-account/non-positive); browser: form correctly hidden when workspace has <2 accounts.

### Task 3.5: Import history with undo; paste-box and error-row fixes

**Files:**
- Modify: `src/services/import/pipeline.ts` (add list function), `src/repositories/import-repo.ts` (add repo fn — file referenced by pipeline as its `repo` import; open it and add alongside `findBatch`), `src/services/import/index.ts` (export), `src/app/(app)/w/[workspaceId]/import/page.tsx` + `src/components/import/import-wizard.tsx` (history card), `src/components/import/csv-drop-zone.tsx:7-8,32,101-110` (sample), `src/components/import/import-preview.tsx` (error guidance), `src/app/(app)/w/[workspaceId]/import/_actions.ts:83-104` (reviewed-set guard)

**Interfaces:**
- Consumes: `undoImportAction(workspaceId, batchId)` (verified `import/_actions.ts:106`), ImportBatch fields `{ id, filename, rowCount, importedAt, status, archivedAt }` (schema:144-157).
- Produces: `listImportBatches(actorUserId, workspaceId): Promise<ImportBatch[]>` (non-archived, newest first, cap 20); `listBatchesByWorkspace(db, workspaceId)` repo fn.

- [x] **Step 1: Repo + service + export** — `db.importBatch.findMany({ where: { workspaceId, archivedAt: null }, orderBy: { importedAt: "desc" }, take: 20 })`; service asserts viewer access then runs it; export from `services/import/index.ts`.
- [x] **Step 2: History card** — import page loads batches server-side and passes them down; below the wizard render "Past imports": one row per batch (`filename · rowCount rows · <formatted importedAt>`) with an "Undo" button (two-click confirm) calling `undoImportAction` then `toast("Import undone — those transactions were removed")` + `router.refresh()`.
- [x] **Step 3: Paste box** — change the `SAMPLE` constant usage so the textarea starts empty with the sample moved to `placeholder`; disable "Use pasted text" until the textarea is non-empty.
- [x] **Step 4: Error-row guidance** — in `import-preview.tsx`, when ≥1 row has a date-parse error (error text starts with "Cannot parse date"), show one banner above the table: "Some dates don't match the chosen format — go back a step and try a different date format." with a "Back" button invoking the wizard's existing back navigation (pass the existing step-setter down as a prop).
- [x] **Step 5: Reviewed-set guard** — in `commitImportAction`, after re-running `previewImport`, compare `preview.rows.length` against a new `expectedRowCount: number` parameter sent by the client (the row count the user reviewed). On mismatch return `{ ok: false, error: "This account changed since you reviewed — please review the import again." }`. Update `import-wizard.tsx`'s commit call to pass `rows.length`.
- [x] **Step 6: Verify** — browser-verified end-to-end: pasted 2-row CSV (button disabled until text present), committed, history card listed the batch, two-click Undo archived it and the transactions disappeared from the register; suite green.

**Phase 3 checkpoint:** `/git-workflow-planning:checkpoint 3 "categories, transaction register, transfers, import history"`.

---

## Phase 4 — First-run experience & empty states

### Task 4.1: Dashboard first-run hero + empty cards

**Files:**
- Create: `src/components/dashboard/first-run.tsx`
- Modify: `src/components/dashboard/dashboard.tsx` (branch at top; empty Upcoming card)

- [x] **Step 1: `FirstRun({ workspaceId })`** — a full-width `Card` (reuses `EmptyState` internally or standalone): heading "Let's set up your money", body "Add a bank or credit account, or import transactions straight from your bank's CSV export.", two buttons: primary `Link` → `/w/{workspaceId}/manage` ("Add an account") and outline `Link` → `/w/{workspaceId}/import` ("Import from your bank").
- [x] **Step 2: Branch** — in `dashboard.tsx`, the dashboard data object already carries `accountCount` (computed at `src/services/dashboard/index.ts:112`; confirm the prop name where it's consumed in dashboard.tsx and reuse it). When it is 0, render `FirstRun` in place of the KPI row, forecast, and donut (keep the page header).
- [x] **Step 3: Upcoming & overdue empty state** — where the card maps its array (`dashboard.tsx:257-285`), add: when empty, `<p className="text-sm text-muted">Nothing due. Add bills in Manage and they'll show up here with due dates.</p>`.
- [x] **Step 4: Verify** — browser-verified: zero-account "UX Test Biz" shows the "Let's set up your money" hero with both CTAs.

### Task 4.2: EmptyState rollout

**Files:**
- Modify: `src/app/(app)/w/[workspaceId]/audit/page.tsx:50-51`, `src/app/(app)/w/[workspaceId]/manage/page.tsx:56-57` (recent transactions), income page list area, `src/components/budget/budget-view.tsx:102` (placeholder — full text lands in Task 5.5)

- [x] **Step 1:** Audit: replace "No entries visible." with `EmptyState` title "No activity yet" description "Changes made in this workspace — new accounts, edits, imports — will be listed here."
- [x] **Step 2:** Manage recent transactions: `EmptyState` title "No transactions yet" description "Add one above, or import a CSV from your bank." action: `Link` to `/w/{workspaceId}/import` styled as outline button ("Import CSV").
- [x] **Step 3:** Income: when the sources list is empty, `EmptyState` title "No expected income yet" description "Add your paycheck or other regular income so Safe to spend can look ahead." (keep the existing form visible).
- [x] **Step 4: Verify** — income empty state browser-verified; audit/manage empty states implemented (render path identical); gates clean.

### Task 4.3: Page titles

**Files:**
- Modify: `src/app/layout.tsx:6-7`, plus one-line `metadata` exports in: login, settings, members, all, tiles, and each workspace sub-page; `src/app/(app)/w/[workspaceId]/layout.tsx` gains `generateMetadata`.

- [x] **Step 1:** Root layout: `export const metadata = { title: { template: "%s — Ledger", default: "Ledger" } }`.
- [x] **Step 2:** Static pages: `export const metadata = { title: "Budget" }` (etc.: Manage, Calendar, Income, Import, Activity, Transactions, Settings, Members, All workspaces, Tiles, Sign in).
- [x] **Step 3:** Workspace layout `generateMetadata`: fetch the workspace name (`getWorkspace` from workspace-service, verified line 66; wrap in try/catch → fall back to "Workspace") and return `{ title: { template: `%s · ${ws.name} — Ledger`, default: ws.name } }`.
- [x] **Step 4: Verify** — browser-verified: "UX Test Biz — Ledger" and "Income · UX Test Biz — Ledger" titles.

**Phase 4 checkpoint:** `/git-workflow-planning:checkpoint 4 "first-run hero, empty states, page titles"`.

---

## Phase 5 — Budget page

### Task 5.1: Month navigation

**Files:**
- Create: `src/lib/month-nav.ts` (+ test `src/lib/month-nav.test.ts`)
- Modify: `src/app/(app)/w/[workspaceId]/calendar/page.tsx:15-27` (use the extracted helpers), `src/app/(app)/w/[workspaceId]/budget/page.tsx`

**Interfaces:**
- Produces: `parseYm(ym: string | undefined, fallback: string): { year: number; month: number }` and `shiftMonth(year: number, month: number, delta: number): string` — moved verbatim from `calendar/page.tsx:15-27`.

- [x] **Step 1:** Move the two helpers into `month-nav.ts`; add a small test (December → January rollover both directions; garbage `ym` falls back).
- [x] **Step 2:** Calendar page imports them (delete its local copies). Also add a "Today" link between Prev/Next: `href={`/w/${workspaceId}/calendar`}` labeled "Today" (addresses the calendar nav finding in the same touch).
- [x] **Step 3:** Budget page: accept `searchParams: Promise<{ ym?: string }>`, compute `{ year, month }`, build the month's first day as a `CalendarDate` (`${year}-${String(month).padStart(2, "0")}-01`), and pass it to `budgetVsActual` instead of `todayFn()` (verified: `budgetVsActual` uses `periodRange("month", date)` internally, so any date in the target month works — `budget-vs-actual.ts:28`). Add the same Prev/Today/Next header the calendar has, with the month name (`MONTHS` array moves into `month-nav.ts` too, exported).
- [x] **Step 4: Verify** — browser-verified: ?ym=2026-06 showed June actuals (Housing 145%, Groceries 43%) against monthly budgets; Prev/Today/Next links correct.

### Task 5.2: Summary header (total budgeted vs expected income)

**Files:**
- Modify: `src/app/(app)/w/[workspaceId]/budget/page.tsx`, `src/components/budget/budget-view.tsx`

**Interfaces:**
- Consumes: `listBudgets(userId, workspaceId)` → `SavedBudget[]` with `amount: Money`; `projectIncome(db, workspaceId, from, to)` (verified: takes a **Db**, so call inside `rlsClientFor(user.id).run(tx => projectIncome(tx, workspaceId, start, end))`); `periodRange("month", date)` from `src/services/dashboard/period`.
- Produces: `BudgetView` gains prop `summary: { totalBudgeted: string; expectedIncome: string; unbudgeted: string; overspentCount: number }` (pre-formatted strings via `format()`).

- [x] **Step 1:** In the budget page, alongside `budgetVsActual`: load `listBudgets`, sum with `add` from money lib → `totalBudgeted`; project income over `periodRange("month", monthDate)` and sum event amounts → `expectedIncome`; `unbudgeted = sub(expectedIncome, totalBudgeted)`; `overspentCount = rows.filter(r => r.status === "over").length`.
- [x] **Step 2:** In `BudgetView`, render a three-stat strip above the list: "Expected income", "Budgeted", and either "Left to budget: $X" (when ≥ 0, neutral) or "Over-committed by $X" (`text-alert`); plus, when `overspentCount > 0`, the line "N categories over budget" linking nowhere (plain text). When expected income is $0.00, swap the first stat for a link to `/w/{workspaceId}/income`: "Set expected income to see what's left to budget →" (mirrors the dashboard's proven prompt).
- [x] **Step 3: Verify** — browser-verified: Budgeted total correct ($1,200); income-unset state shows the "Set expected income" link (this workspace has no sources).

### Task 5.3: Row upgrade — plain labels, inline edit, remove

**Files:**
- Modify: `src/components/budget/budget-view.tsx:104-121`, `src/components/budget/budget-view.test.tsx`

**Interfaces:**
- Consumes: `setBudgetAction(workspaceId, categoryId, amount)` (verified in use at `budget-view.tsx:40`), `deleteBudgetAction(workspaceId, budgetId)` (verified `budget/_actions.ts:33`, currently unused). Row needs the budget id — extend `BudgetRow` (in `budget-vs-actual.ts`) with `budgetId: string` (available from `listBudgets` inside that function; map `b.id` through at line 63).

- [x] **Step 1:** Update the component test: rendering a row with `actual: "$240.00", budget: "$200.00", status: "over"` asserts the visible text "Over by $40.00"; a row under budget asserts "$20.00 left". (Compute the delta server-side: extend `BudgetRow` with `delta: string` — `format(sub(actual, budget))` magnitude — set in `budget-vs-actual.ts` where `over` is computed at line 61.)
- [x] **Step 2:** Row layout becomes: name · status text (`"Over by <delta>"` in `text-alert font-semibold` / `"<delta> left"` muted / `"Right at budget"` when equal) · the amount, where the amount is now a button showing `<actual> of <budget>`; clicking it swaps in an `AmountInput` prefilled with the raw budget number + Save/Cancel (Enter saves, Escape cancels) calling `setBudgetAction` then `router.refresh()` + `toast("Budget updated")`.
- [x] **Step 3:** Add per-row "Remove" ghost button (two-click confirm) → `deleteBudgetAction(workspaceId, r.budgetId)` → `toast("Budget removed")`.
- [x] **Step 4:** Progress bar semantics: on the outer bar div add `role="progressbar"`, `aria-valuenow={r.pct}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label={`${r.name}: ${r.pct}% of budget spent`}`.
- [x] **Step 5: Verify** — component tests green; browser-verified inline edit (click amount → input → Save → toast + refresh); progressbar roles present.

### Task 5.4: Move money between categories

**Files:**
- Modify: `src/services/budget-service.ts` (add `moveBudget`), `src/app/(app)/w/[workspaceId]/budget/_actions.ts` (add action), `src/components/budget/budget-view.tsx` (move control)
- Test: extend `src/services/budget-service.test.ts`

**Interfaces:**
- Produces: `moveBudget(userId, workspaceId, fromCategoryId: string, toCategoryId: string, amount: string): Promise<void>` — errors "No budget set for that category yet" if either side lacks a budget row, "You can only move up to $X" if amount exceeds the from-side; both upserts inside one `rlsClientFor(userId).run()` (atomic — `run` executes in a single transaction, same guarantee `createTransaction` relies on); `moveBudgetAction(workspaceId, fromCategoryId, toCategoryId, amount): Promise<ActionResult>`.

- [x] **Step 1: Failing test** — set Groceries $200 / Dining $100; `moveBudget` $50 Dining→Groceries; assert $250/$50; assert moving $500 rejects with the "only move up to" message.
- [x] **Step 2: Implement** using `listBudgets` internally + `repo.upsertAmount` for both sides (`budget-repo` verified in use at `budget-service.ts:24`).
- [x] **Step 3: UI** — on each row an overflow "Move money" action opening an inline strip: "Move `<AmountInput>` from `<this category>` to `<Select of other budgeted categories>`" + Move button → action → `toast("Moved $X from A to B")`. On over-budget rows, change the status line to include a nudge button: "Over by $40 — cover it" which opens the same strip prefilled with the delta and this category as the *to* side.
- [x] **Step 4: Verify** — service test green (atomic move, cap, same-category rejection); browser-verified: moved $50 Housing→Groceries with toast, totals conserved, then reverted.

### Task 5.5: Explainer empty state + plain page framing

**Files:**
- Modify: `src/app/(app)/w/[workspaceId]/budget/page.tsx:29`, `src/components/budget/budget-view.tsx:100-102`

- [x] **Step 1:** Page `<h1>` → "Budget" with a subtitle `<p className="text-sm text-muted">` "Give each category a monthly limit, then watch spending fill the bar."
- [x] **Step 2:** Empty state → `EmptyState` title "No budgets yet" description "Pick a category above and give it a monthly amount. As you spend, its bar fills — red means you went over, and you can move money from another category to cover it."
- [x] **Step 3: Verify** — visual check done (header + subtitle live; empty state covered by component test).

**Phase 5 checkpoint:** `/git-workflow-planning:checkpoint 5 "budget month nav, summary, inline edit, move money"`.

---

## Phase 6 — Language, consistency, accessibility, polish

### Task 6.1: Copy pass (exact replacements)

**Files:** as listed per line below.

- [x] `src/components/dashboard/dashboard.tsx:179,185`: "Money in · MTD" → "Money in · this month"; same for Money out.
- [x] `src/components/manage/manage-forms.tsx:66-69`: account type `<option>` labels → "Checking", "Savings", "Credit card", "Loan", "Cash" (values stay the raw enums; open the file section and map whatever enum values are listed — label = capitalized with spaces).
- [x] `src/app/(app)/w/[workspaceId]/audit/page.tsx:44` + `workspace-sub-nav.tsx` label: "Audit Log"/"Audit" → "Activity"; page description line → "A record of changes in this workspace (visible to owners and admins)."
- [x] `src/app/(app)/all/page.tsx:33-34`: "MTD" column headers → "This month"; footnote at 61-64 → "Money you pay yourself from a business, and transfers between workspaces, are counted once — not as both income and spending."
- [x] `src/lib/command-palette/commands.ts:23`: "Record owner draw" → "Pay myself from this business".
- [x] `src/app/(app)/settings/members/page.tsx:46,59`: "Organization members" → "People"; "organization owner or admin" → "owner or admin".
- [x] `src/components/import/import-preview.tsx:46`: drop the batch-id line entirely (history from Task 3.5 identifies imports by filename/date).
- [x] `src/components/income/income-source-form.tsx`: frequency `<select>` options get human labels ("Weekly", "Every 2 weeks", "Monthly", …) mapped over the raw `Frequency` enum values.
- [x] Verify: gates green; grep confirms only code comments/test names mention the old terms — no user-visible hits.

### Task 6.2: One date formatter

**Files:**
- Create: `src/lib/format-date.ts` (+ test)
- Modify: `src/app/(app)/w/[workspaceId]/manage/page.tsx:63`, `src/app/(app)/w/[workspaceId]/audit/page.tsx:58`, `src/components/income/income-source-form.tsx:91,94`, `src/app/(app)/w/[workspaceId]/income/page.tsx:24`

**Interfaces:**
- Produces: `formatDate(d: Date | string): string` → "Jul 18, 2026" (`en-US`, UTC — dates are `@db.Date`, so always format in UTC to avoid off-by-one: `new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })`).

- [x] **Step 1:** Test: `formatDate("2026-07-18")` and `formatDate(new Date("2026-07-18T00:00:00Z"))` both → "Jul 18, 2026".
- [x] **Step 2:** Implement; swap the four call sites (audit's `toISOString().slice(0,10)`, manage's ISO date cell, income's "next <iso>" → "next Jul 1, 2026").
- [x] **Step 3:** Income amounts through the money formatter at the same call sites: `income/page.tsx:24` and `income-source-form.tsx:94` render `format(money(s.amount))` instead of raw `.toFixed(2)` interpolation.
- [x] **Step 4: Verify** — tests green; income list shows "$1,200.00".

### Task 6.3: Form defaults, labels, and money-in/out entry

**Files:**
- Modify: `src/components/manage/manage-forms.tsx` (all three forms), `src/components/income/income-source-form.tsx:34`

- [x] **Step 1: Dates** — replace the four hardcoded literals (`manage-forms.tsx:57,88,119`; `income-source-form.tsx:34`) with `today()` from `@/lib/calendar-date` (it returns the `YYYY-MM-DD` `CalendarDate` string these inputs need).
- [x] **Step 2: Amounts** — defaults `"-0.00"`/`"0.00"` → `""`; placeholders become plain examples ("25.50").
- [x] **Step 3: Sign toggle** — in the add-transaction form, add a two-button segmented control ("Money out" default / "Money in") stored as `direction` state; on submit, send `direction === "out" ? `-${amount}` : amount` (strip any user-typed minus first: `amount.replace(/^-/, "")`). Helper text under the field: "Just the number — the buttons above set the direction."
- [x] **Step 4: Labels** — wrap every input in the three manage forms and the income form with the existing `Label` component (`ui/field.tsx:26`) + `htmlFor`/`id` pairs; placeholders keep only example values.
- [x] **Step 5: Reset + confirm + rapid entry** — on successful add (all four forms): clear amount/description fields but **keep** account/date selections, `toast("Saved")`, and move focus back to the first cleared field (`ref.current?.focus()`) so consecutive entries are keyboard-only.
- [x] **Step 6: Verify** — browser-verified: added a Money-out transaction with no minus sign (saved as -$4.56), form reset with focus returned to Amount, dates default to today (2026-07-18).

### Task 6.4: Accessibility & interaction polish

**Files:**
- Modify: `src/app/globals.css:39` (and the dark-theme `--ink-dim` declaration in the same file), `src/components/command/command-palette.tsx:71-146`, `src/components/workspace/tab-bar.tsx:36-56`, `src/app/(app)/w/[workspaceId]/layout.tsx` + `src/components/workspace/workspace-sub-nav.tsx` (audit visibility)

- [x] **Step 1: Contrast** — light `--ink-dim: #9a9482` → `#6f6a5b` (measures ≈5.1:1 on `--surface #fbfaf5`). Check the dark-theme `--ink-dim` against its surface with a contrast checker and darken/lighten until ≥4.5:1 the same way. Visually sweep hint text afterward.
- [x] **Step 2: Command palette dialog semantics** — on the overlay: `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette"`; trap Tab (on keydown, if Tab and focus would leave the palette, wrap to first/last focusable); store `document.activeElement` on open and restore focus on close.
- [x] **Step 3: ⌘K discoverability** — in `tab-bar.tsx`, remove the duplicate "⌄ Layouts" link (both links point to `/tiles`; "⊞ Tile view" stays and gains `aria-label`); in its place a subtle button "Search ⌘K" (outline style, `hidden lg:flex`) that dispatches the same open event the palette listens for (open `command-palette.tsx` to find its open mechanism — keyboard listener — and export a small `openCommandPalette()` helper or a custom `window` event both listen to).
- [x] **Step 4: Hide Activity for non-admins** — in the workspace layout, compute `const isAdmin = await assertWorkspaceAccess(user.id, workspaceId, "admin").then(() => true).catch(() => false)` and pass `showActivity={isAdmin}` into `WorkspaceSubNav`; filter the item there.
- [x] **Step 5: Touch targets** — income remove and transaction row action buttons: ensure ≥40px hit area (`h-9` buttons or `p-2` on ghosts); theme toggle and tile icon get `h-9 w-9`.
- [x] **Step 6: Workspace header links home** — in `w/[workspaceId]/layout.tsx:37-53`, wrap the workspace name heading in `<Link href={`/w/${workspaceId}`}>` so deep pages have a one-tap way back to that workspace's dashboard.
- [x] **Step 7: Verify** — browser-verified: palette opens via Search ⌘K with role=dialog/aria-modal, input auto-focused, Escape closes and restores focus to the trigger; Tab-trap implemented; contrast tokens now #6f6a5b (light, ≈5.1:1) / #94907e (dark, ≈4.8:1).

### Task 6.5: Per-route loading states + export filename

**Files:**
- Create: `src/app/(app)/w/[workspaceId]/{budget,manage,calendar,income,import,transactions}/loading.tsx`
- Modify: `src/app/(app)/w/[workspaceId]/export/route.ts` (filename + error copy)

- [x] **Step 1:** A shared minimal skeleton per route: header bar + one `Card`-shaped shimmer block (copy the shimmer classes from the existing `w/[workspaceId]/loading.tsx`, minus the dashboard-specific KPI grid). Each file is ~10 lines; the existing dashboard skeleton stays for the dashboard route only.
- [x] **Step 2:** Export route: set `Content-Disposition` filename to `ledger-transactions-<YYYY-MM-DD>.csv` (today's date via `today()`); replace bare "Forbidden"/"Unauthorized" bodies with a one-line HTML message "You don't have access to this export. Go back and sign in with the right account." (status codes unchanged).
- [x] **Step 3: Verify** — per-route loading.tsx files in place (prod nav too fast to visually catch a flash); export verified: Content-Disposition filename="ledger-transactions-2026-07-18.csv".

**Phase 6 checkpoint:** `/git-workflow-planning:checkpoint 6 "language, dates, a11y, loading states"` → then `/git-workflow-planning:finish`.

---

## Explicitly deferred (called out in the audit, not in this plan)

- **Renaming "workspace" product-wide** (audit Tier 4): genuinely a product decision — every service, route, and doc uses the term. Recommend deciding separately; everything else in the language pass lands regardless.
- **`/all` as an enriched landing dashboard**: worth its own design pass once workspace creation ships and multi-workspace use is real.
- **Category rename/archive, saved-layout dropdown in the top bar, export date-range filters, import inline row editing**: follow-ups; the plan covers their high-impact siblings.
- **Grouping workspace tabs by personal/business type, full breadcrumbs, calendar month/year picker, a shared heading component, tap-to-expand calendar chips**: real but lower-leverage; revisit after this plan lands.

## Verification map (audit finding → task)

Tier 1: workspace creation → 2.4 · settings/members reachability + grant access + UUIDs → 2.1/2.3 · sign-out → 2.1 · sign-up/reset/auth errors → 2.2 · categories → 3.1 · categorize/search/edit/delete transactions + uncategorized queue + rules → 3.2/3.3 · transfers → 3.4.
Tier 2: first-run wall of zeros → 4.1 · EmptyState rollout → 4.2 · budget month nav → 5.1 · move money → 5.4 · inline edit + delete + labels → 5.3 · left-to-budget → 5.2 · overspend labels → 5.3 · jargon framing → 5.5/6.1 · stale dates & sign entry → 6.3.
Tier 3: import undo history → 3.5 · sample-paste hazard → 3.5 · error-row guidance → 3.5 · commit/preview drift → 3.5 · export polish → 6.5.
Tier 4/5: silent failures → 1.3 · raw errors/boundaries → 1.2 · no-access dead-end → 1.2 · success feedback/reset → 6.3 (+toasts throughout) · loading mismatch → 6.5 · contrast → 6.4 · placeholder-labels → 6.3 · palette a11y + ⌘K hint → 6.4 · color-only budget states → 5.3 · UUID/enum leakage → 2.3/6.1 · date formats → 6.2 · page titles → 4.3 · dead "+" → 2.4 · duplicate Layouts link → 6.4 · audit tab for non-admins → 6.4 · touch targets → 6.4 · workspace header links home → 6.4 · calendar Today button → 5.1.
