import { primaryCta, TRIAL_DAYS } from "@/lib/site-config";
import { Cta } from "../cta";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section className="border-t border-rule bg-ink">
      <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-28">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-credit-tint">
            Personal + business, side by side
          </p>
          <h2 className="mx-auto mt-5 max-w-2xl font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-paper sm:text-5xl">
            Know what&apos;s safe to spend — across everything you own.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-paper/70">
            Start free for {TRIAL_DAYS} days. No card charged until it ends. Cancel anytime.
          </p>
          <div className="mt-9 flex justify-center">
            <Cta href={primaryCta.href} variant="primary" size="lg">
              {primaryCta.label}
            </Cta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
