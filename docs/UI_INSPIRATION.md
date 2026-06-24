# UI Inspiration — reference designs & prioritized improvements

Research for the UI hardening pass. Sources: app comparisons (beancount.io, era.app, NerdWallet, Reddit r/MonarchMoney), fintech dashboard/data-viz & empty-state UX articles (star.global, pencilandpaper.io, fuselabcreative.com, Medium). Goal: extract concrete, *adoptable* patterns and split them into SAFE polish (applied in this pass) vs RISKY/subjective (deferred to `ui-decisions.md`).

## Reference apps & takeaways

**Copilot Money** — widely called the best-looking finance app.
- Generous whitespace + a calm, restrained palette; color is reserved for *meaning* (category/status), not decoration.
- Polished, tailored empty/loading states rather than blank panels.
- Smooth, legible data viz with clear legends and tabular figures.

**Monarch Money** — information-dense done well.
- Strong visual hierarchy: each card has a clear title, a primary number, and a secondary trend/context line.
- Consistent semantic color across the whole app (income green, spend neutral/red, etc.).
- Plain-language labels; the "one number that matters" is always the largest thing on a card.

**YNAB** — budgeting clarity.
- Category **progress bars** with unmistakable over/under states are the core UI — the bar *is* the message.
- Every figure answers "what does this mean for me right now?" (e.g. money still to assign).

**Simplifi (Quicken)** — "what's left to spend" front-and-center.
- A single prominent safe-to-spend style number, with the math one tap away (progressive disclosure).
- Minimal clutter; projected cash flow shown simply.

**Mercury (business banking)** — professional B2B calm.
- Excellent typography and **tabular numbers**; numbers line up in columns everywhere.
- Helpful tooltips/microcopy explaining each metric; great empty states with a clear next action.

## Cross-cutting best practices (from UX articles)
- **Empty states should explain + guide**, not just say "nothing here": one line of what-this-is + a CTA or hint. Tailor per surface.
- **Color = meaning, consistently**: one semantic palette (overdue/red, soon/amber, scheduled/indigo, paid/green; positive/green, negative/red) used identically everywhere.
- **Tabular numbers** for all money so figures align and scan.
- **Progressive disclosure**: lead with the number, reveal the math on demand.
- **Affordance clarity**: anything clickable must look clickable; anything disabled must say why.

---

## SAFE polish — APPLY in this pass (low-risk, clearly beneficial)
1. **Helpful empty states** where panels are currently blank: dashboard **Goals** ("No goals yet — add one to track savings progress"), **Debts** ("No debts tracked"). Confirm Income/Budget/Calendar/Tiles empty states read as guidance, not dead-ends.
2. **Safe-to-spend affordance**: the KPI card is a button that reveals the math but doesn't obviously look tappable — add a subtle "tap for breakdown" affordance / clearer hover+focus state. Keep the existing ⓘ.
3. **Consistent focus-visible + hover states** on interactive controls (buttons, pills, nav links, command-palette rows) for keyboard/accessibility parity.
4. **Tabular-number consistency**: audit money figures; ensure the `.tabular` treatment is applied everywhere numbers should align (KPI cards, tables, tiles, bills).
5. **Microcopy clarity**: make sure each metric's secondary line explains itself in plain language (e.g. safe-to-spend note, "new this period" deltas). Fix any jargon/ambiguous labels found during smoke-test.
6. **Disabled/stub affordances**: the ＋ "add workspace (coming soon)" must clearly read as not-yet-available (cursor + tooltip), not a broken button.
7. **Route loading states**: add lightweight `loading.tsx` skeletons for the heaviest routes (dashboard) so navigation doesn't feel frozen during server work. (Additive, standard Next.js, no behavior change.)

## RISKY / SUBJECTIVE — DEFER to `docs/temp/ui-decisions.md` (owner decides)
- Net-worth trend + sparklines on cards (Monarch) — new feature/data.
- Drag-to-customize dashboard card layout (Monarch) — large structural change.
- Color-system / theming overhaul, dark mode — subjective, app-wide.
- Animated transitions / motion polish (Copilot) — nice-to-have, scope risk.
- Re-laying-out the dashboard grid or replacing the spending donut with another viz — subjective hierarchy change.
- Onboarding / first-run experience — new flow.
