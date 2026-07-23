import { Section } from "./section";
import { Reveal } from "./reveal";

// Each coping mechanism gets an auditor's verdict stamped in the margin — the
// red/gold ink an accountant would actually leave on a bad statement.
const pains = [
  {
    who: "Accounting suites",
    line: "Built for bookkeepers, not owners.",
    body: "Double-entry, chart-of-accounts, a monthly bill. You wanted to know if you can make payroll — not reconcile journals.",
    stamp: "OVERKILL",
    tone: "debit" as const,
  },
  {
    who: "Budgeting apps",
    line: "They stop at your personal life.",
    body: "The moment you draw income from a business you run, the envelopes break. Your ventures simply don't fit.",
    stamp: "STOPS AT PERSONAL",
    tone: "alert" as const,
  },
  {
    who: "Spreadsheets",
    line: "One tab per thing, reconciled by hand.",
    body: "A file for the house, a file per business, and a fragile formula bridging them. It works until the day it quietly doesn't.",
    stamp: "COUNTED TWICE",
    tone: "alert" as const,
  },
];

export function Problem() {
  return (
    <Section
      eyebrow="Why this exists"
      title="You run a household and a business or two. Nothing was built for that."
    >
      <div className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-3">
        {pains.map((p, i) => (
          <Reveal key={p.who} delay={i * 80} className="relative bg-surface p-6 pb-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">{p.who}</p>
            <p className="mt-3 font-serif text-xl leading-snug text-ink">{p.line}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
            <span
              className={`absolute bottom-5 left-6 -rotate-2 rounded-[3px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                p.tone === "alert"
                  ? "border-alert/50 bg-alert-tint text-alert"
                  : "border-debit/50 bg-debit-tint text-debit"
              }`}
            >
              {p.stamp}
            </span>
          </Reveal>
        ))}
      </div>
      <Reveal delay={260} className="mt-8">
        <div className="flex items-center gap-8">
          <p className="max-w-2xl font-serif text-xl leading-relaxed text-ink sm:text-2xl">
            So we built the one view that holds it all — separate books, side by side, with the money
            you pay yourself counted <em className="text-credit">exactly once</em>.
          </p>
          {/* The arc motif claims the empty right field. */}
          <svg aria-hidden viewBox="0 0 120 32" fill="none" className="hidden h-8 w-30 shrink-0 opacity-70 lg:block">
            <line x1="0" y1="16" x2="44" y2="16" className="stroke-rule-strong" strokeWidth="1.5" />
            <line x1="76" y1="16" x2="120" y2="16" className="stroke-rule-strong" strokeWidth="1.5" />
            <path d="M 44 16 C 54 4, 66 4, 76 16" className="stroke-credit" strokeWidth="1.5" />
            <circle cx="60" cy="7" r="3" className="fill-credit" />
          </svg>
        </div>
      </Reveal>
    </Section>
  );
}
