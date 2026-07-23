import { primaryCta, secondaryCta, TRIAL_DAYS } from "@/lib/site-config";
import { Cta } from "../cta";
import { Ripple } from "@/components/canvasui/Ripple";

// The hero performs the product's thesis in type: a statement that prints
// itself, then draws the owner-draw bridge from the business block to the
// personal block — counted once. Fixed row heights (h-9 = 36px) make the arc
// geometry deterministic. All motion is CSS; reduced-motion renders it static.

// Every row keeps a wide left "binding margin" — the gutter the bridge arc is
// drawn in, like the ruled margin of a paper statement.
const ROW = "flex h-9 items-center justify-between gap-3 pl-9 pr-4";
const FIG = "tabular text-[13px]";

function delay(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` };
}

function SectionRow({ dot, label, d }: { dot: string; label: string; d: number }) {
  return (
    <div className={`${ROW} mkt-print bg-raised/50`} style={delay(d)}>
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        {label}
      </span>
    </div>
  );
}

function EntryRow({
  name,
  amount,
  tone = "out",
  d,
  bold,
}: {
  name: string;
  amount: string;
  tone?: "in" | "out" | "neutral";
  d: number;
  bold?: boolean;
}) {
  const toneClass = tone === "in" ? "text-credit" : tone === "out" ? "text-debit" : "text-ink";
  return (
    <div className={`${ROW} mkt-print`} style={delay(d)}>
      <span className={`text-[13px] ${bold ? "font-semibold text-ink" : "text-muted"}`}>{name}</span>
      <span className={`${FIG} ${toneClass} ${bold ? "font-semibold" : ""}`}>{amount}</span>
    </div>
  );
}

function Statement() {
  return (
    <figure className="relative overflow-hidden rounded-card border border-rule-strong bg-surface shadow-overlay">
      {/* Statement masthead */}
      <div className={`${ROW} mkt-print border-b border-rule-strong`} style={delay(200)}>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">Statement · July 2026</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">All books</span>
      </div>

      <div className="relative divide-y divide-rule">
        <SectionRow dot="#0d9488" label="Acme Studio — business" d={320} />
        <EntryRow name="Retainer — Northwind" amount="+7,500.00" tone="in" d={410} />
        <EntryRow name="Payroll" amount="−3,200.00" tone="out" d={500} />

        {/* The bridge: two adjacent owner-draw rows joined by an arc drawn in
            the binding margin; the "counted once" chip sits inline in the
            Personal section row where there's empty space. */}
        <div className="relative">
          <div className="divide-y divide-rule">
            <EntryRow name="Owner draw" amount="−6,000.00" tone="out" d={590} />
            <div className={`${ROW} mkt-print bg-raised/50`} style={delay(680)}>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                <span className="h-2 w-2 rounded-full" style={{ background: "#4f46e5" }} />
                Personal
              </span>
              <span
                className="mkt-print rounded-full bg-credit-tint px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-credit"
                style={delay(2050)}
              >
                Counted once ↔
              </span>
            </div>
            <EntryRow name="Owner draw" amount="+6,000.00" tone="in" d={770} />
          </div>
          {/* Arc spans row 1 (center 18) to row 3 (center 90) inside the margin. */}
          <svg
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-[108px] w-9"
            viewBox="0 0 36 108"
            fill="none"
          >
            <path
              d="M 30 18 C 10 18, 10 90, 30 90"
              className="mkt-arc stroke-credit"
              style={{ ...delay(1150), ["--arc-len" as string]: "150" } as React.CSSProperties}
              strokeWidth="1.5"
            />
            <circle cx="15" cy="54" r="3.5" className="mkt-node fill-credit" style={delay(2050)} />
          </svg>
        </div>

        <EntryRow name="Mortgage" amount="−1,850.00" tone="out" d={860} />
        <EntryRow name="Groceries" amount="−210.55" tone="out" d={950} />
      </div>

      {/* The tally: a double-ruled total, the private-bank signature move. */}
      <div className="border-t-[3px] border-double border-rule-strong">
        <div className={`${ROW} mkt-print h-11`} style={delay(1250)}>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink">Combined · every book</span>
          <span className="tabular text-lg font-semibold text-ink">$53,898.01</span>
        </div>
      </div>
    </figure>
  );
}

export function LedgerHero() {
  // The dark cover of the ledger book: ink ground, ivory statement lying on it,
  // the arc glowing green. The body of the site is the paper inside.
  return (
    <section className="relative overflow-hidden bg-[#14140f]">
      {/* Still water on the cover: soft ambient rings of light, and a splash on
          every click. Pure WebGL overlay — works in every modern browser; the
          content beneath stays ordinary HTML. */}
      <Ripple trigger="click" interval={7} amplitude={0.5} shine={1.2} rings={3} wavelength={95} speed={0.5} decay={0.85}>
      {/* Ruled ground in faint light ink. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent, transparent 47px, rgba(236,234,223,0.05) 47px, rgba(236,234,223,0.05) 48px)",
          backgroundSize: "100% 48px",
        }}
      />
      {/* A soft green lamp over the statement. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-0 h-[720px] w-[720px]"
        style={{
          background: "radial-gradient(closest-side, rgba(87,196,142,0.14), transparent 70%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <p
            className="mkt-reveal font-mono text-[11px] uppercase tracking-[0.18em] text-credit"
            style={{ filter: "brightness(1.7)" }}
          >
            Personal + business · one statement
          </p>
          <h1
            className="mkt-reveal mt-5 font-serif font-medium leading-[0.98] tracking-[-0.03em] text-paper"
            style={{ ...delay(80), fontSize: "clamp(3rem, 6.5vw, 5.5rem)" }}
          >
            All your money.
            <br />
            Every business.
            <br />
            <span className="text-credit" style={{ filter: "brightness(1.7)" }}>
              One screen.
            </span>
          </h1>
          <p className="mkt-reveal mt-6 max-w-md text-lg leading-relaxed text-paper/75" style={delay(160)}>
            QuickBooks is too much. YNAB stops at personal. Run your household and every venture you
            own from one forward-looking ledger — and always know what&apos;s safe to spend.
          </p>
          <div className="mkt-reveal mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center" style={delay(240)}>
            <Cta href={primaryCta.href} variant="primary" size="lg" className="w-full sm:w-auto">
              {primaryCta.label}
            </Cta>
            <Cta
              href="/demo"
              variant="outline"
              size="lg"
              className="w-full border-paper/25 bg-white/5 text-paper hover:border-paper/50 hover:bg-white/10 sm:w-auto"
            >
              See it in action
            </Cta>
          </div>
          <p className="mkt-reveal mt-4 text-xs text-paper/45" style={delay(300)}>
            No card charged for {TRIAL_DAYS} days · cancel anytime ·{" "}
            <a href={secondaryCta.href} className="underline underline-offset-2 hover:text-paper">
              already have an account?
            </a>
          </p>
        </div>

        <div className="lg:col-span-6 lg:pl-6">
          <div className="relative">
            {/* The ivory statement, lying on the dark desk. */}
            <Statement />
          </div>
          <p className="mkt-print mt-4 text-center text-xs leading-relaxed text-paper/50" style={delay(1500)}>
            The owner draw leaves the business, lands in your pocket — and is never counted twice.
          </p>
        </div>
      </div>
      </Ripple>
    </section>
  );
}
