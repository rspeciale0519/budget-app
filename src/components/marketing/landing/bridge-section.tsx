import { Reveal } from "./reveal";

// The signature at monumental scale: two display-size figures joined by the
// arc motif from the hero, the node carrying "counted once", and the honest
// total below — with the double-count crossed out.

function AmountBlock({
  dot,
  book,
  amount,
  tone,
  align,
}: {
  dot: string;
  book: string;
  amount: string;
  tone: "in" | "out";
  align: "left" | "right";
}) {
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start"} max-lg:items-center max-lg:text-center`}>
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        {book}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Owner draw</p>
      <p
        className={`tabular mt-2 font-semibold leading-none tracking-[-0.02em] ${
          tone === "in" ? "text-credit" : "text-debit"
        }`}
        style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)" }}
      >
        {amount}
      </p>
    </div>
  );
}

function ArcHorizontal() {
  return (
    <div className="relative hidden min-w-0 flex-1 self-center px-2 lg:block">
      <svg aria-hidden viewBox="0 0 400 84" fill="none" className="h-auto w-full overflow-visible">
        <path
          d="M 0 76 C 110 10, 290 10, 400 76"
          className="mkt-arc stroke-credit"
          style={{ ["--arc-len" as string]: "470" } as React.CSSProperties}
          strokeWidth="2"
        />
        <circle cx="200" cy="26" r="5" className="mkt-node fill-credit" />
      </svg>
      <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-credit/30 bg-credit-tint px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-credit shadow-card">
        Counted once ↔
      </span>
    </div>
  );
}

function ArcVertical() {
  return (
    <div className="relative flex justify-center py-1 lg:hidden">
      <svg aria-hidden viewBox="0 0 84 120" fill="none" className="h-28 w-auto overflow-visible">
        <path
          d="M 76 0 C 10 33, 10 87, 76 120"
          className="mkt-arc stroke-credit"
          style={{ ["--arc-len" as string]: "170" } as React.CSSProperties}
          strokeWidth="2"
        />
        <circle cx="26" cy="60" r="5" className="mkt-node fill-credit" />
      </svg>
      <span className="absolute left-1/2 top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap rounded-full border border-credit/30 bg-credit-tint px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-credit">
        Counted once ↔
      </span>
    </div>
  );
}

export function BridgeSection() {
  return (
    <section className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">The income bridge</p>
          <h2 className="mt-4 font-serif text-3xl font-medium leading-[1.08] tracking-[-0.02em] text-ink sm:text-4xl">
            Pay yourself once. Counted once.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Tag a draw from a business and it lands as personal income automatically — no double-entry,
            no double-counting. Every combined total nets it out, so your bottom line is always honest.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-16">
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-end lg:gap-6">
            <AmountBlock dot="#0d9488" book="Acme Studio — business" amount="−$6,000.00" tone="out" align="left" />
            <ArcHorizontal />
            <ArcVertical />
            <AmountBlock dot="#4f46e5" book="Personal" amount="+$6,000.00" tone="in" align="right" />
          </div>
        </Reveal>

        {/* The honest total: the double-count dies on the page. */}
        <Reveal delay={220} className="mt-14 border-t border-rule pt-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-dim">Combined · every book</p>
          <p className="mt-3 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1">
            <span className="tabular text-xl text-alert/60 line-through decoration-alert/60 decoration-2">
              $59,898.01
            </span>
            <span className="tabular text-3xl font-semibold text-ink sm:text-4xl">$53,898.01</span>
          </p>
          <p className="mt-3 text-sm text-muted">
            Counted twice, your books lie by six thousand dollars. Counted once, they balance.
          </p>
        </Reveal>

        <Reveal delay={300} className="mt-14">
          <ul className="grid gap-x-12 gap-y-4 sm:grid-cols-3">
            {[
              "One tap tags the draw in the business book",
              "The matching personal income is created for you",
              "A teammate with business access never sees your personal side",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5 border-t border-rule pt-4 text-sm text-ink">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-credit" />
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
