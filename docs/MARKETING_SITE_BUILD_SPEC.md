# Marketing Site — Autonomous Build Spec

Run instructions for the goal-driven build of the public marketing website.
Authoritative design: `docs/superpowers/specs/2026-07-22-marketing-site-design.md` (the design spec).
This file adds the build order, quality gates, and transcript-provable EXIT CRITERIA.

---

## GOAL

Build the entire marketing website from the design spec — every page, demo seed data,
real screenshots, blog pipeline, SEO plumbing — to launch-ready, portfolio-grade visual
quality, ending with a pushed branch and an open PR (merge is the owner's call).

## CURRENT STATE (do not rediscover)

- Next.js 16 App Router · TypeScript strict · Tailwind v4 · shadcn/ui · Prisma · Supabase. Scripts: `pnpm type-check | lint | test | build`, `pnpm db:seed`.
- The authenticated app lives in `src/app/(app)`; `src/app/page.tsx` currently redirects `/` to login/app. There is **no marketing surface, no billing, no Stripe** anywhere.
- Product name is a placeholder — all marketing copy/metadata must read it from **one new site-config constant** so renaming is a single edit.
- Locked commercial facts (design spec §2): tiers Starter $9 / Pro $19 / Team $39 per month, annual ≈ 2 months free; structure-gated feature split (books/seats/roll-up/tiling/audit); CTA copy **"Start your 14-day free trial"**; positioning: owner-operators ("QuickBooks is too much; YNAB stops at personal").
- Git: repo is main-only (no `develop`); `main` is current and pushed. Work happens on `feature/marketing-site`.
- Billing/checkout is **Project 2** — `/signup` here is a plan-select page whose checkout handoff is a clearly-marked stub.
- **Screenshot environment:** app screenshots require the local Supabase stack running (`supabase start`) and an authenticated session. The owner's local DB contains their own non-repo data — **it must never be modified or wiped.** The demo seed creates its own isolated demo user + org (known credentials, e.g. `demo@example.com`) and only ever writes inside that org; chrome-devtools logs in as that user to capture screenshots.

## PROCESS RULES (non-negotiable)

1. **Branching:** create `.claude/plans/feature-marketing-site.md` (a one-page pointer to the design spec + this file), then run `/git-workflow-planning:start feature marketing-site`. All work stays on `feature/marketing-site`.
2. **Per phase:** update `docs/ROADMAP.md`, then `/git-workflow-planning:checkpoint <N> <desc>`. If a gate fails: stop, fix, re-run the same checkpoint before proceeding.
3. **Skills mandate — use them, every time they apply:**
   - `frontend-design:frontend-design` **before designing any new UI** (art direction, and again per page group).
   - `vercel:shadcn` / `shadcn-cli-v4` for all component work.
   - **chrome-devtools MCP** for every screenshot, browser check, and Lighthouse run (never Playwright; don't close the browser without approval).
   - `superpowers:test-driven-development` for logic (seed script, RSS, sitemap, config).
   - `chrome-devtools-mcp:a11y-debugging` for the accessibility pass; `dataviz` if any chart-like marketing graphic is drawn.
   - `verify` end-to-end before the PR; `/code-review` on the full diff, fixes applied.
4. **Visual bar (the "impress me" clause):** before page building, write an art-direction doc `docs/temp/marketing-art-direction.md` (typography scale, palette, spacing register, hero treatment — distinctive, not template-default). Every page then gets **at least 2 screenshot → critique → iterate rounds** at desktop 1440px, tablet 768px, and mobile 390px, critiqued against the art-direction doc and frontend-design principles — covering **both visual design and copy persuasiveness** (does the page sell to an owner-operator, per the locked positioning?). A page passes only when a critique round finds **zero P1 (must-fix) items** — and the **final round for each page must be performed by a fresh-context subagent** (dispatched via the Agent tool with only the screenshots, the art-direction doc, and the design spec — not the build reasoning), so the author never grades their own work.
5. **Hard constraints:** source files ≤ 450 LOC · no app-behavior change except the `/` anonymous/authenticated split (regression-tested) · `pnpm type-check && lint && test && build` all exit 0 at every checkpoint · only demo-seed data ever appears in screenshots · legal pages carry a visible "DRAFT — pending owner review" banner · prices/tiers/CTA copy exactly as locked above.

## PHASES (in order; each ends with a checkpoint commit)

**Phase 1 — Branch + demo seed.**
Plan file + `start` run; a committed demo seed script (`pnpm db:seed:demo` — idempotent, camera-ready: isolated demo user + org with Personal + 2 business books, realistic categorized transactions, upcoming/overdue bills, goals, debts, budgets, an owner-draw bridge example).
*EXIT: branch name shown via `git branch --show-current`; `pnpm db:seed:demo` exits 0 (output shown) and re-running it is a no-op; evidence shown that pre-existing local users/orgs are untouched (before/after count or spot query); chrome-devtools logs in as the demo user and screenshots the seeded dashboard; suite green; checkpoint commit in `git log`.*

**Phase 2 — Marketing shell.**
`(marketing)` route group + layout (header: logo/nav/Log in/CTA; footer), site-config constant, `/` split (anonymous → landing stub; authenticated → existing redirect chain), stub routes for every sitemap page.
*EXIT: every marketing route returns 200 and renders (route list + screenshots); regression test proving the authenticated `/` redirect is unchanged passes; suite green; checkpoint.*

**Phase 3 — Art direction + landing page.**
Art-direction doc written; full landing page per design spec §4 (hero with real tiled-dashboard screenshot, problem, five feature showcases, trust, pricing teaser, FAQ teaser, final CTA).
*EXIT: art-direction doc exists; ≥2 critique rounds shown with final round zero-P1; desktop+mobile screenshots shown; suite green; checkpoint.*

**Phase 4 — Pricing + features pages.**
Pricing: 3 cards (Pro emphasized), monthly/annual toggle, comparison table, anxiety FAQ. Features: five themed groups with screenshots.
*EXIT: pricing figures on-page match locked numbers (visible in screenshot); ≥2 critique rounds each, zero-P1; suite green; checkpoint.*

**Phase 5 — Demo tour, about, FAQ, legal drafts, /signup stub, 404.**
Scroll-driven "morning review" screenshot tour; about; FAQ; legal drafts with DRAFT banners; `/signup` plan-select with marked stub handoff; branded marketing 404 page.
*EXIT: all six render with screenshots; DRAFT banners visible; critique rounds zero-P1; suite green; checkpoint.*

**Phase 6 — Blog.**
MDX pipeline (`content/blog/`), 3 seed posts targeting owner-operator searches, RSS.
*EXIT: 3 posts render (screenshots); RSS validity covered by a passing test; suite green; checkpoint.*

**Phase 7 — SEO, a11y, performance.**
Per-page metadata + OG images (placeholder-name-safe), `sitemap.xml`, `robots.txt`, Vercel Analytics, a11y pass, Lighthouse.
*EXIT: Lighthouse ≥90 performance/SEO/accessibility on `/`, `/pricing`, `/features`, and `/demo` (scores shown in transcript); a11y findings fixed (re-run shown); sitemap/robots served (fetch shown); suite green; checkpoint.*

**Phase 8 — Final QA + PR.**
`verify` skill end-to-end (stranger's journey: land → understand → compare plans → reach signup); `/code-review` on the full diff with fixes applied; **cross-model `/codex:adversarial-review`** on the full diff, each finding fixed or dismissed with a stated reason (if the codex tooling errors, note it and proceed — it is a second opinion, not a gate); roadmap updated; push; PR to `main` — **do not merge**.
*EXIT: verify + both review passes evidenced; full suite green; PR URL shown.*

## BLOCKER PROTOCOL

If blocked on something only the owner can resolve (credentials, product decision, broken upstream), write the specifics to `docs/temp/marketing-site-blockers.md`, state it in the transcript, and stop the run.

## DEFINITION OF DONE

All phase EXIT CRITERIA evidenced in-transcript, in order · suite green at every checkpoint · every page zero-P1 with the final critique by a fresh-context subagent · Lighthouse ≥90 ×3 on `/`, `/pricing`, `/features`, `/demo` · pre-existing local data proven untouched · authenticated app behavior regression-proven unchanged · branch pushed, PR open, unmerged.
