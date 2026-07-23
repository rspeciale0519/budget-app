// A thin strip of real ledger entries running like teller tape — the product's
// world as ambient texture. Content is duplicated once for a seamless CSS loop;
// reduced-motion shows it static. Purely decorative → aria-hidden.

const ENTRIES: { name: string; amount: string; tone: "in" | "out" | "bridge" }[] = [
  { name: "Retainer — Northwind", amount: "+7,500.00", tone: "in" },
  { name: "Mortgage", amount: "−1,850.00", tone: "out" },
  { name: "Owner draw ↔ counted once", amount: "6,000.00", tone: "bridge" },
  { name: "Etsy payout", amount: "+1,200.00", tone: "in" },
  { name: "Payroll", amount: "−3,200.00", tone: "out" },
  { name: "Safe to spend", amount: "$10,798.31", tone: "in" },
  { name: "Quarterly taxes · due in 20 days", amount: "−5,400.00", tone: "out" },
  { name: "Project — Globex", amount: "+4,200.00", tone: "in" },
  { name: "City Water · overdue", amount: "−78.50", tone: "out" },
  { name: "Owner draw ↔ counted once", amount: "1,500.00", tone: "bridge" },
  { name: "Groceries", amount: "−210.55", tone: "out" },
  { name: "Lowest point · Aug 07", amount: "$10,876.81", tone: "in" },
];

function Tape() {
  return (
    <div className="flex shrink-0 items-center">
      {ENTRIES.map((e, i) => (
        <span key={i} className="flex items-center whitespace-nowrap font-mono text-[11px] tracking-tight">
          <span className="text-dim">{e.name}</span>
          <span
            className={`ml-2 tabular ${
              e.tone === "in" ? "text-credit" : e.tone === "out" ? "text-debit" : "text-now"
            }`}
          >
            {e.amount}
          </span>
          <span className="mx-5 text-rule-strong">·</span>
        </span>
      ))}
    </div>
  );
}

export function LedgerTicker() {
  return (
    <div aria-hidden className="overflow-hidden border-y border-rule bg-surface/70 py-2.5">
      <div className="mkt-tape flex w-max">
        <Tape />
        <Tape />
      </div>
    </div>
  );
}
