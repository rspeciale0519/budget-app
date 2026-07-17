# feature/new-ui-001 — Full frontend redesign

## The thesis

The README states the product's reason to exist in one line:

> "A forward-looking view of **what's owed, when it's due, and what's safe to spend** — not
> just a rear-view ledger of transactions that already cleared."

That sentence is the design. Every competing tool (QuickBooks, YNAB, Monarch) renders money as
history. This one renders money as **a position in time**. So the organizing principle of the
entire UI is:

**The present moment is a physical edge on the screen.**

- What has **cleared** is settled: solid, opaque, ink. It is a fact.
- What is **projected** is provisional: lighter, dashed, translucent. It is a forecast.
- The boundary between them — **now** — is a real, visible line that appears on every surface
  that touches time.

This is not decoration. It encodes the one thing that is true about this product and false about
its competitors.

## Direction: "Instrument"

Dark-first. A precision financial instrument rendered in fountain-pen ink and phosphor. Not a
dashboard — a piece of equipment you sit down at.

### Signature element: the guilloché

The login surface renders a **live WebGL guilloché** — the engraved rosette line-work found on
every banknote, share certificate, and cheque. It is the actual visual language of money, and it
is real math: epitrochoids and hypotrochoids, the curves a rose-engine lathe cuts. Drawn as
luminous hairlines on ink, breathing slowly, seeded per-session.

This is the one place spectacle is free — there is no data to obscure and atmosphere is the whole
job. It is also genuinely a shader problem, not a decorative excuse for one.

**Raw WebGL2, not three.js.** A fullscreen fragment shader needs one quad. three.js would add
~150 kB gzipped to draw two triangles. The brief asked for WebGL; this is WebGL, done correctly.
Documented here so the choice is on the record rather than an omission.

### Palette — "Ledger at night"

Semantics first. Two rules that most finance UIs get wrong:

1. **Hue encodes direction** (money in / money out). **Opacity encodes certainty** (cleared /
   projected). These are orthogonal, so they compose.
2. **Red is scarce.** Most finance apps burn red on every expense, so red comes to mean nothing.
   Here, spending is not an error — outflow is warm amber. Red is reserved *exclusively* for
   things that are actually wrong: overdue bills, negative runway. When it appears, it means
   something.

| Token | Value | Role |
|---|---|---|
| `--paper` | `#070A11` | Base. Indigo-black, never pure black. |
| `--surface` | `#0D1119` | Cards. |
| `--raised` | `#131926` | Hover / elevated. |
| `--rule` | `#1E2634` | Hairlines — the ledger's ruled lines. |
| `--ink` | `#EAEEF6` | Primary text. |
| `--ink-muted` | `#8792A8` | Secondary. |
| `--credit` | `#5EEAD4` | Money in. |
| `--debit` | `#F0A868` | Money out. Warm, not alarming. |
| `--alert` | `#F4526A` | Scarce. Only for genuinely wrong. |
| `--now` | `#7DA2FF` | The present-moment line. |

Light theme ships as a token flip on the same semantic layer.

### Type

- **Instrument Serif** — display. Big statement numbers and the login hero only. Used with
  restraint.
- **Instrument Sans** — UI and body.
- **JetBrains Mono** — all data and numerals, `tabular-nums` always.

Self-hosted via `next/font/google` (build-time, no runtime network). Deliberately not Inter.

## Anti-default check

The three current AI-design defaults are (1) cream + serif + terracotta, (2) near-black + one
acid accent, (3) broadsheet hairlines + zero radius. This plan is nearest to (2), so it must
earn its distance:

- Not one accent — a **three-role semantic palette** where hue and opacity mean different things.
- The accent logic is **inverted** from the norm (red is scarce, spending is warm).
- Base is indigo-cast, not neutral black.
- Signature is a **guilloché from the subject's own material world**, not a particle field or a
  gradient orb.
- Layout is organized by **time**, not by card grid.

## Phases

1. **Foundation** — fix `cn()` (add `clsx` + `tailwind-merge`; the current join-only version
   makes every `className` override silently lose). Token architecture in `globals.css`.
   Fonts. Root layout + theme.
2. **Signature** — WebGL guilloché login. Reduced-motion + no-WebGL fallback.
3. **Primitives** — Button, Card, and a single `StatusTag` to kill the status→color map that is
   currently duplicated across `dashboard.tsx`, `bill-calendar-view.tsx`, and `pane-card.tsx`.
4. **Chrome** — tab bar, workspace tabs, sub-nav (gains active state, which it lacks today),
   command palette.
5. **Dashboard + forecast** — GPU/canvas cash-flow chart with the now-line. Replaces the
   hardcoded 560×150 SVG that cannot scale to 1,300+ imported transactions.
6. **Remaining surfaces** — budget, calendar, tiling, import, manage, empty states.
7. **Verify** — 125 tests green, type-check, lint, build, browser pass at 3 widths, a11y + reduced
   motion.

## Constraints

- Tests are `renderToString` substring assertions. Class names are free to change; **literal text
  is load-bearing** — `"Loading…"` (U+2026), `"$5,000.00 / $4,000.00"` (exact spaces),
  `"Overdue"`/`"Unpaid"` (status must stay conveyed by text, not color alone), `"· Today"`.
- `match-suggestions` must return `null` (not an empty wrapper) when empty — asserted `toBe("")`.
- Command palette must not render its list when closed — asserted negatively.
- Source files stay under ~450 LOC.
- Workflow: build here, test here, merge directly to `main`. No PR.
