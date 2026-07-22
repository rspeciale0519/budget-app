# Plan — Marketing Website (`feature/marketing-site`)

Pointer plan. The authoritative documents are:

- **Design (what to build):** [`docs/superpowers/specs/2026-07-22-marketing-site-design.md`](../../docs/superpowers/specs/2026-07-22-marketing-site-design.md)
- **Build order + quality gates + exit criteria:** [`docs/MARKETING_SITE_BUILD_SPEC.md`](../../docs/MARKETING_SITE_BUILD_SPEC.md)

## Type / subject
`feature` / `marketing-site` → branch `feature/marketing-site`

## Phases (see build spec for full EXIT CRITERIA)
1. Branch + camera-ready demo seed (isolated demo auth user + org)
2. Marketing shell — `(marketing)` route group, layout, site-config, `/` split, stub routes
3. Art direction + landing page
4. Pricing + features pages
5. Demo tour, about, FAQ, legal drafts, `/signup` stub, 404
6. Blog (MDX + RSS)
7. SEO, a11y, performance (Lighthouse ≥90 on `/`, `/pricing`, `/features`, `/demo`)
8. Final QA + PR (verify, `/code-review`, cross-model review, PR to `main`, unmerged)

## Hard constraints
- No app-behavior change except the `/` anonymous/authenticated split (regression-tested).
- `pnpm type-check && lint && test && build` green at every checkpoint.
- Only demo-seed data in screenshots; the owner's existing local data must never be touched.
- Prices/tiers/CTA copy exactly as locked in the build spec.
- Source files ≤ 450 LOC.

## Out of scope
Stripe/billing internals (Project 2) · final product name (Project 3) · SaaS-readiness audit (Project 4).
