import { primaryCta, secondaryCta } from "@/lib/site-config";
import { Cta } from "./cta";

// Phase 2 hero stub. Phase 3 replaces this with the full landing page
// (problem, feature showcases, trust, pricing teaser, FAQ, final CTA).
export function Landing() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">
        Personal + business, side by side
      </p>
      <h1 className="mt-5 max-w-3xl font-serif text-5xl font-medium leading-[1.03] tracking-[-0.02em] text-ink sm:text-6xl">
        All your money. Every business. One screen.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
        QuickBooks is too much. YNAB stops at personal. Track your household and every
        venture you own in one place — and always know what&apos;s safe to spend.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Cta href={primaryCta.href} variant="primary" size="lg">
          {primaryCta.label}
        </Cta>
        <Cta href="/demo" variant="outline" size="lg">
          See it in action
        </Cta>
      </div>
      <p className="mt-4 text-xs text-dim">
        No card charged for {14} days · cancel anytime ·{" "}
        <a href={secondaryCta.href} className="underline underline-offset-2 hover:text-ink">
          already have an account?
        </a>
      </p>
    </section>
  );
}
