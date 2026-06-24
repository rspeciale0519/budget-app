# UI Smoke-Test & Hardening Spec

**GOAL:** Browser-verify every UI component does exactly what it's intended to, fix anything broken or confusing, and apply *safe* UI polish informed by best-in-class design research — all on a branch, with evidence in the transcript.

## CURRENT STATE (do not rediscover)
- App = Ledger (Next.js 16, local Supabase, forced RLS). `main` is canonical; this work runs on branch **`feature/ui-smoke-hardening`** cut from `main`.
- Browser checks REQUIRE: a **production** build (`pnpm build` + `pnpm exec next start -H 0.0.0.0 -p 3000`) — dev mode's HMR breaks hydration in automated Chrome. Drive it with the **chrome-devtools MCP only (never Playwright)**. Reach it at `http://127.0.0.1:3000` (or the tailnet host). Log in with `owner@test.local` / `Password123!`.
- Use device emulation: **desktop = 1440×900**, **mobile = 430×932 (mobile,touch)**. Reload after changing emulation.
- The local DB carries seeded verification data (see memory `local-verification-test-data`). Don't wipe it.

### Component inventory (every item must reach PASS)
Auth: login (email/password submit, Google button present). Shell: top app-bar (workspace tabs + active state, ＋, ▦ All Workspaces, ⊞ Tile view + ⌄ Layouts pills on desktop / ⊞ icon on mobile, avatar), shared workspace header (avatar+name+type persists on every tab), workspace sub-nav (Dashboard·Manage·Calendar·Budget·Income·Import·Audit), ⌘K command palette (open/filter/arrow/enter/esc, quick-actions scoped to workspace, go-to-workspace). Dashboard: period selector (Week/Month/Quarter/Year), 4 KPI cards, Safe-to-spend drill-down panel toggle, auto-match banner (Yes/No), cash-flow forecast chart, spending donut, Upcoming & overdue + Mark-paid, Paid-vs-unpaid bar, Goals, Debts. Manage: add account / add transaction / add bill forms (+ validation), recent transactions, Export transactions/bills. Calendar: month grid (desktop) + agenda list (mobile), Prev/Next, status-colored chips. Budget: set-budget form, bars (over=red / near=amber / under=blue), empty state. Income: add expected-income form + list/empty state. Import: account select, CSV paste, field mapping, Preview, Preview&confirm list, Commit, undo. Audit: audit log (owner/admin). All Workspaces (/all): rollup table + horizontal scroll on mobile. Tiles (/tiles): panes render live, Add/Remove/Assign pane, row/col toggle, drag-resize (desktop), Save/Restore/Delete named layout (restore preserves proportions), stacked on mobile. Settings/Members: invite form, members list.

## PHASES (do in order; each exit criterion must be transcript-provable)

### Phase 0 — Setup
EXIT: branch `feature/ui-smoke-hardening` created from `main`; `pnpm build` exits 0; prod server returns HTTP 200 on `/login`; chrome-devtools connected; logged in (screenshot of an authenticated dashboard).

### Phase 1 — Inventory file
EXIT: `docs/temp/ui-smoke-report.md` created listing EVERY component above as a checkbox row with columns: Component · Desktop · Mobile · Notes — all initially unchecked.

### Phase 2 — Design research
Research 4–6 best-in-class personal/business finance UIs (e.g. Monarch Money, Copilot Money, YNAB, Lunch Money, Rocket Money, Mercury) via web search/fetch.
EXIT: `docs/UI_INSPIRATION.md` written with: per-reference 2–3 concrete takeaways; a **prioritized list** split into **SAFE polish** (low-risk: spacing, labels, empty states, affordances, copy, focus/hover states, consistent iconography) vs **RISKY/SUBJECTIVE** (layout overhauls, color-system changes, new flows). Risky items are NOT implemented here.

### Phase 3 — Functional smoke-test + fix (desktop 1440px)
For EACH inventory component: drive it in chrome-devtools, assert its intended behavior (state change / navigation / data update visible), confirm **console is error-free**, screenshot. If broken: fix (TDD when logic lives in a service/pure fn), re-verify, commit. Use programmatic value-setters + `.click()` for forms (LastPass/hydration workaround).
EXIT: every component's Desktop box checked in the report with a one-line evidence note; `pnpm type-check`, `lint`, `vitest run`, `build` all exit 0 after the phase.

### Phase 4 — Functional smoke-test (mobile 430px)
Repeat the per-component drive at mobile width; confirm nothing overflows, taps work, and mobile-specific views (calendar agenda, /tiles stacked, /all scroll, ⊞ entry) behave.
EXIT: every component's Mobile box checked with evidence; no horizontal-overflow or hidden controls.

### Phase 5 — UX-clarity + safe polish
For each component, judge from a first-time user's view: is the purpose/affordance obvious? Apply the **SAFE polish** items from Phase 2 + any clarity fixes (clearer labels, empty states, disabled-state reasons, loading states, button copy). Anything subjective or structural → append to `docs/temp/ui-decisions.md` as an owner decision (with a recommendation), do NOT auto-apply.
EXIT: report's Notes column records each component's UX verdict; safe polish applied + re-verified (screenshot); `docs/temp/ui-decisions.md` lists deferred owner calls.

### Phase 6 — Final gate + report
EXIT: `pnpm type-check`, `lint`, `vitest run`, `build` all exit 0; `docs/temp/ui-smoke-report.md` shows EVERY component PASS on both Desktop and Mobile (or BLOCKED with a written reason); a closing summary lists what was fixed, what was polished, and what awaits owner decisions. Branch left ready for the owner to merge.

## HARD CONSTRAINTS
- Stay on `feature/ui-smoke-hardening`. **Do NOT merge to `main` or push** — the owner does that after review.
- Never break an existing test; keep type-check/lint/build green at every checkpoint; commit per fix.
- chrome-devtools MCP only — **never Playwright**. **Production** build for browser checks, not dev.
- Conventions: no `any`; source files ≤450 LOC; money via `@/lib/money`, dates via `@/lib/calendar-date`; business logic in services, not components; co-located `*.test.ts`.
- Do NOT auto-apply subjective/structural redesigns — document them in `docs/temp/ui-decisions.md`.
- **No faked PASS.** A component you can't verify is logged BLOCKED with the reason. A documented honest "this is broken and needs an owner decision" satisfies the goal for that item.

## DEFINITION OF DONE
Every phase's EXIT CRITERIA met and evidenced in the transcript; the report shows all components PASS (or BLOCKED-with-reason) on desktop + mobile; `UI_INSPIRATION.md` and `ui-decisions.md` exist; final gate green; branch ready to merge.
