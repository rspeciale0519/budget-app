import { Section } from "./section";
import { Reveal } from "./reveal";

const pains = [
  {
    who: "Accounting suites",
    line: "Built for bookkeepers, not owners.",
    body: "Double-entry, chart-of-accounts, a monthly bill. You wanted to know if you can make payroll — not reconcile journals.",
  },
  {
    who: "Budgeting apps",
    line: "They stop at your personal life.",
    body: "The moment you draw income from a business you run, the envelopes break. Your ventures simply don't fit.",
  },
  {
    who: "Spreadsheets",
    line: "One tab per thing, reconciled by hand.",
    body: "A file for the house, a file per business, and a fragile formula bridging them. It works until the day it quietly doesn't.",
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
          <Reveal key={p.who} delay={i * 80} className="bg-surface p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">{p.who}</p>
            <p className="mt-3 font-serif text-xl leading-snug text-ink">{p.line}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
          </Reveal>
        ))}
      </div>
      <Reveal delay={260} className="mt-8">
        <p className="max-w-2xl text-lg leading-relaxed text-ink">
          So we built the one view that holds it all — personal and every business, strictly separate
          but side by side, with the money you pay yourself counted exactly once.
        </p>
      </Reveal>
    </Section>
  );
}
