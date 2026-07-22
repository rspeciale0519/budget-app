# Ledger — Development Roadmap

> Created 2026-07-18 during the UX overhaul run (no roadmap existed; created to satisfy the
> phase-tracking workflow — restructure freely).

## UX overhaul (plan: `.claude/plans/feature-ux-overhaul.md`, branch `feature/ux-overhaul`)

- [x] Phase 1 — Feedback foundations: toast system, error/not-found pages, no more silent
      redirect-on-error, surfaced failures + confirm steps on destructive actions
- [x] Phase 2 — Account & access: avatar menu + sign-out, settings pages, sign-up/forgot-password,
      member emails + grant-access UI, real workspace creation
- [x] Phase 3 — Categories, transaction register, transfers, import history
- [x] Phase 4 — First-run hero, empty states, page titles
- [x] Phase 5 — Budget page: month nav, summary, inline edit, move money
- [x] Phase 6 — Language, dates, accessibility, loading states

## UX Trust & Fun (plan: `.claude/plans/feature-ux-trust-and-fun.md`, branch `feature/ux-trust-and-fun`)

- [x] Phase 1 — Trust fixes: negative safe-to-spend alert state, honest forecast (no down-sampling,
      "Lowest point" not "Large bill"), period-aware KPI labels, one bill-status vocabulary
      ("Due later" not "scheduled"), credit-card sign suggestion, ambiguous-date warning
- [x] Phase 2 — Friction removal: clickable All-books rows, mark-paid undo, calendar-as-a-tool
      (summary/legend/clickable chips + mark-paid), dismissible toasts, honest Jump-to + Ctrl/⌘,
      deep-linked quick actions, import clarity, jargon batch (Manage → Accounts & bills), Activity
      who/what, sharing reassurance, tiles degradation, dashboard/budget/income clarity, Google in sign-up
- [x] Phase 3 — Categorize loop: rule CRUD, Auto-categorize card, smart "Always" patterns,
      apply-to-N-similar, inbox-zero payoff
- [x] Phase 4 — Celebration moments: fully-funded budget, all-bills-paid, payday up-ticks,
      first-run welcome + book-creation toast, All-books insight + greeting
- [x] Phase 5 — Verify & merge: gates green, grep evidence, browser verification (desktop/mobile/dark,
      forced negative safe-to-spend), merged to main

## Goals & Debts (plan: `.claude/plans/feature-goals-and-debts.md`, branch `feature/goals-and-debts`)

- [x] Phase 1 — Data & services: additive `Goal.accountId` migration, zod + repo CRUD, planning
      service (CRUD + account-linked live balances + manual contribute/record-payment), pure
      goalOnTrack + debtPayoff helpers, tests
- [x] Phase 2 — Actions + "Goals & debts" tab/page: goals panel & debts panel (create/edit/delete,
      link an account, contribute/record-payment, on-track + payoff insights)
- [x] Phase 3 — Dashboard wiring: live linked values + "· linked" hints, empty-state CTAs → the new
      tab (closes the prior honest exception), goal-reached "Reached ✓" moment
- [x] Phase 4 — Verify & merge: gates green, browser-verified (desktop light+dark, mobile), merged

## Daily Money Tools (plan: `.claude/plans/feature-daily-money-tools.md`, branch `feature/daily-money-tools`)

- [x] Phase 1 — Recurring bills UI: "Repeats" on Add-bill, Repeating-bills card, create/cancel
      service on the existing materializer (cancel removes future unpaid bills, keeps history)
- [x] Phase 2 — Pay yourself: business-book Income card → tagOwnerDrawAction (recorded once per
      book; /all nets it)
- [x] Phase 3 — Real palette data search: debounced cross-book transaction hits → prefilled
      register; the button honestly says "Search" again
- [x] Phase 4 — Goals & debts follow-ups: payoff planner (snowball/avalanche + saves-figure),
      envelope allocation (shared-account goals, seeded 1→2 transition), auto-contributions
      (one additive Goal migration, bills-pattern materializer), debt due-day chips
- [x] Phase 5 — Verify & merge: gates green, browser matrix (desktop light+dark, mobile), merged

## Marketing Website (plan: `.claude/plans/feature-marketing-site.md`, branch `feature/marketing-site`)

Public-facing site that sells the app (Project 1 of the launch plan). Spec:
`docs/superpowers/specs/2026-07-22-marketing-site-design.md`; build order:
`docs/MARKETING_SITE_BUILD_SPEC.md`.

- [x] Phase 1 — Branch + camera-ready demo seed (isolated demo auth user + org): `pnpm db:seed:demo`
      creates `demo@example.com` + Demo org with 3 books, 41 transactions, 11 bills, 4 goals, 2
      owner-draw bridges; idempotent (re-run no-op); isolation proven (non-demo orgs/users unchanged);
      login + dashboard screenshotted via chrome-devtools
- [x] Phase 2 — Marketing shell: `(marketing)` route group + shared header/footer, `site-config.ts`
      (single source for placeholder name + locked pricing tiers), `/` split (anonymous → landing,
      authenticated → unchanged dispatch, regression-tested), middleware opened to public marketing
      routes (app routes still gated), stub routes for every sitemap page (all 200). Also serialized
      the DB integration suite (`fileParallelism: false`) to remove pre-existing parallel flakiness
- [ ] Phase 3 — Art direction + landing page
- [ ] Phase 4 — Pricing + features pages
- [ ] Phase 5 — Demo tour, about, FAQ, legal drafts, `/signup` stub, 404
- [ ] Phase 6 — Blog (MDX + RSS)
- [ ] Phase 7 — SEO, a11y, performance (Lighthouse ≥90)
- [ ] Phase 8 — Final QA + PR (verify, code review, cross-model review, PR to `main`, unmerged)

## Earlier milestones (from git history)

- [x] Phases through 2.x of the original build (see git log)
- [ ] v2 reports (next major milestone)
