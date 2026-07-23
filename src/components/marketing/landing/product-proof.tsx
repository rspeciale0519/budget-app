import { ScreenshotFrame } from "./screenshot-frame";
import { Reveal } from "./reveal";

// The proof section: after the typographic performance, the real instrument at
// full width. No decoration competes with the screenshot.
export function ProductProof() {
  return (
    <section className="border-t border-rule bg-raised/30">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">Not a mockup</p>
          <h2 className="mt-4 font-serif text-3xl font-medium leading-[1.08] tracking-[-0.02em] text-ink sm:text-4xl">
            This is a real Tuesday morning.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Live balances, a drillable safe-to-spend, a 30-day forecast with its lowest point marked,
            and every bill that&apos;s coming — one book of three.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <ScreenshotFrame
            src="/marketing/dashboard.png"
            alt="The dashboard: total balance, money in and out, safe-to-spend with the bills behind it, a 30-day cash-flow forecast with the lowest point marked, spending by category, and upcoming and overdue bills."
            priority
          />
        </Reveal>
      </div>
    </section>
  );
}
