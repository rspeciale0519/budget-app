import { primaryCta, secondaryCta, TRIAL_DAYS } from "@/lib/site-config";
import { Cta } from "../cta";
import { ScreenshotFrame } from "./screenshot-frame";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Faint ledger-rule texture behind the hero, never louder than the type. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent, transparent 47px, var(--rule) 47px, var(--rule) 48px)",
          backgroundSize: "100% 48px",
          maskImage: "linear-gradient(to bottom, black, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pb-20 sm:pt-24">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-credit">
            Personal + business, side by side
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="mx-auto mt-5 max-w-4xl font-serif text-5xl font-medium leading-[1.02] tracking-[-0.025em] text-ink sm:text-6xl lg:text-7xl">
            All your money.
            <br className="hidden sm:block" /> Every business.{" "}
            <span className="whitespace-nowrap">One screen.</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            QuickBooks is too much. YNAB stops at personal. Track your household and every venture you
            own in one place — and always know what&apos;s safe to spend.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Cta href={primaryCta.href} variant="primary" size="lg">
              {primaryCta.label}
            </Cta>
            <Cta href="/demo" variant="outline" size="lg">
              See it in action
            </Cta>
          </div>
          <p className="mt-4 text-xs text-dim">
            No card charged for {TRIAL_DAYS} days · cancel anytime ·{" "}
            <a href={secondaryCta.href} className="underline underline-offset-2 hover:text-ink">
              already have an account?
            </a>
          </p>
        </Reveal>
      </div>

      <Reveal delay={220} className="relative mx-auto max-w-6xl px-5 pb-8 sm:px-8">
        <ScreenshotFrame
          src="/marketing/dashboard.png"
          alt="The dashboard: total balance, money in and out, safe-to-spend, a 30-day cash-flow forecast, spending by category, and upcoming and overdue bills."
          priority
        />
      </Reveal>
    </section>
  );
}
