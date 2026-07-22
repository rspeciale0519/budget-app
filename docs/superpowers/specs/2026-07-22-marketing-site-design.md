# Marketing Website — Design Spec

**Date:** 2026-07-22
**Status:** Draft — pending user approval
**Scope:** The public-facing website that sells the app to visitors (Project 1 of the launch plan). Not the authenticated app UI.

---

## 1. Launch-plan decomposition

Launching and selling the app decomposes into four projects. **This spec covers Project 1 only.**

| # | Project | Status |
|---|---|---|
| 1 | **Marketing website** — public pages, design, copy, funnel UX up to the "choose a plan" click | This spec |
| 2 | **Billing & entitlements** — Stripe products/checkout/webhooks, subscription state, plan gating in the app, customer portal | Needs its own spec; launch blocker |
| 3 | **Naming & domain** — replace the "Ledger" placeholder; drives logo, copy, OG images, domain | Short session; launch blocker |
| 4 | **Public-SaaS readiness audit** — email verification, password-reset abuse, onboarding for strangers, data-deletion requests, support channel | Needs scoping; launch blocker |

## 2. Decisions locked (2026-07-22)

- **Funnel:** Full paid checkout at launch. CTA → plan selection → Stripe checkout (14-day trial, card collected upfront, first charge after trial, cancel anytime). Primary CTA copy: "Start your 14-day free trial."
- **Pricing:** Three tiers — Starter **$9/mo**, Pro **$19/mo**, Team **$39/mo**; annual billing ≈ 2 months free. Numbers are launch ballparks, adjustable in Stripe without site redesign.
- **Tier split — gate on structure, never on core features.** Every plan includes the full core app: dashboard, safe-to-spend drill-down, cash-flow forecast, bills + recurring + auto-match, due-date calendar, budget-vs-actual, CSV import, planning/payoff tools, export, and the owner-draw income bridge.

| | Starter | Pro | Team |
|---|---|---|---|
| Books | Personal + 1 business | Unlimited | Unlimited |
| Seats | 1 | 1 | 5 included |
| Full core app + income bridge | ✓ | ✓ | ✓ |
| All-books roll-up | — | ✓ | ✓ |
| Tiled multi-book view + saved layouts | — | ✓ | ✓ |
| v2 reports (P&L, A/P aging — when built) | — | ✓ | ✓ |
| Per-book access control | — | — | ✓ |
| Audit log | — | — | ✓ |
| Priority support | — | — | ✓ |

  Rationale: the Starter→Pro trigger is a life event (second business), so upgrades align with rising customer value; roll-up/tiling only matter with 3+ books, so Starter users never miss them. Gating engineering is minimal: two numeric limits (books, seats) + three feature flags (roll-up, tiling, audit log).
- **Positioning:** Owner-operators / solopreneurs. Lead with the wedge: personal money and every business, side by side, with the owner-draw bridge. Named competitors framing: "QuickBooks is too much; YNAB stops at personal."
- **Name:** Swappable placeholder throughout. All copy, logo slots, and metadata reference a single site-config constant so renaming is one edit (plus asset regeneration).
- **Architecture:** Same repo. A `(marketing)` route group in this Next.js app with its own layout (marketing header/footer, no app chrome). One deploy; shared Tailwind v4 + shadcn tokens; Stripe code (Project 2) lives beside the database it updates.

## 3. Sitemap

```
/                 Landing page (anonymous). Logged-in users redirect to the app exactly as today.
/features         Full feature tour
/pricing          3 tiers, monthly/annual toggle, comparison table, purchase-anxiety FAQ
/demo             Guided screenshot product tour
/about            Founder story
/blog             Index + /blog/[slug] — MDX in-repo, statically generated, RSS feed
/faq              Pre-sales FAQ + contact channel
/legal/terms      /legal/privacy   /legal/refunds
/signup           Plan select → Stripe checkout (flow built in Project 2; route + CTA target defined here)
/login            Unchanged (existing app login)
```

All marketing pages statically rendered. The only dynamic behavior is the logged-in redirect at `/` (current `src/app/page.tsx` logic moves behind an auth check: anonymous → landing, authenticated → existing redirect chain).

## 4. Page designs

### Landing page (`/`)
Section order:
1. **Hero** — headline on the wedge (working draft: "All your money. Every business. One screen."), subhead, primary CTA, real screenshot of the tiled multi-book dashboard.
2. **Problem** — three pain points; "QuickBooks is too much, YNAB stops at personal."
3. **Feature showcase** — five alternating text/screenshot sections: isolated Books · side-by-side tiling · safe-to-spend + cash-flow forecast · owner-draw income bridge · CSV import (any bank).
4. **Trust** — money-math correctness (decimal, computed balances), per-book access control, audit log, row-level security.
5. **Pricing teaser** → `/pricing`.
6. **FAQ teaser** → `/faq`.
7. **Final CTA.**

Real UI screenshots do the selling; the product is visual and dense. No stock illustration style.

### Pricing (`/pricing`)
Three cards (Pro visually emphasized as the expected default), monthly/annual toggle, full comparison table per the tier split above, FAQ beneath the cards (cancellation, refunds, what happens after trial, card-upfront explanation). Talking point: one Pro subscription replaces multiple per-company QuickBooks files.

### Features (`/features`)
Long-form tour grouped by theme: Books & roll-up · Dashboard & forecasting · Bills & calendar · Import & data control · Team & trust. Each block: screenshot, 2–3 sentences, link to relevant FAQ where anxiety-prone (import, security).

### Demo (`/demo`)
v1: scroll-driven guided screenshot tour of a seeded demo book — a sequence of captioned screenshots walking the "morning review" story (open tiled view → check safe-to-spend → mark a bill paid → glance at the roll-up). Read-only live sandbox is explicitly deferred.

### Blog (`/blog`)
MDX files in `content/blog/`, statically generated, RSS. Launch with 2–3 seed posts targeting owner-operator searches (e.g. "separate business and personal finances," "track owner draws"). Post cadence after launch is out of scope here.

### About / FAQ / Legal
- **About:** short founder story — why off-the-shelf tools didn't fit an owner-operator.
- **FAQ:** security, CSV import ("any bank"), refunds, cancellation, trial mechanics, data export/deletion.
- **Legal:** terms, privacy (must reflect actual data practices), refund policy. Content production is a flagged prerequisite (§7).

## 5. Visual direction

Same Tailwind v4 + shadcn token system as the app — the trial must not feel like a bait-and-switch — but a marketing register: bolder display typography, more whitespace, the app's dense dark dashboard as hero visual against a lighter page. Final art direction at build time via the frontend-design skill, referencing `docs/UI_INSPIRATION.md`.

## 6. SEO & plumbing

Per-page metadata + OG images (blocked on name for final assets), `sitemap.xml`, `robots.txt`, RSS, Vercel Analytics, Lighthouse pass on all static pages. Existing security headers/CSP apply repo-wide and are inherited; verify marketing pages don't need CSP exceptions.

## 7. Flagged prerequisites (build/launch blockers outside page design)

1. **Demo seed data** — the polished demo state currently exists only in a local database, not the repo. Build a committed demo seed that photographs well; it feeds every screenshot on the site.
2. **Legal copy** — terms/privacy/refund text must be produced (template + review); privacy policy must match real data practices.
3. **Name** (Project 3) — blocks final logo, OG images, domain, and copy polish; does not block page structure or build.
4. **Public-SaaS readiness** (Project 4) — must be scoped and resolved before real customers arrive, independent of this site.

## 8. Out of scope

Stripe/billing internals (Project 2) · naming (Project 3) · readiness audit (Project 4) · email marketing/newsletter automation · affiliate program · localization · live demo sandbox · any app-UI changes beyond the `/` redirect logic.

## 9. Testing & acceptance

- Route smoke tests: every marketing route renders statically without auth.
- `/` behavior: anonymous sees landing; authenticated user still lands in the app (existing redirect chain preserved — regression test).
- Link check across nav/footer/CTAs; all CTAs resolve to `/signup`.
- Lighthouse: 90+ performance/SEO/accessibility on landing and pricing.
- Blog: MDX pipeline renders seed posts; RSS validates.

**Done means:** a stranger can land on `/`, understand what the product is and who it's for, see real screenshots, compare three plans, and click through to `/signup` — where Project 2 takes over.
