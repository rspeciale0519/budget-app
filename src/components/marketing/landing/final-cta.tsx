import { primaryCta, TRIAL_DAYS } from "@/lib/site-config";
import { Cta } from "../cta";
import { Reveal } from "./reveal";

// The closing statement: ink paper, the bridge glyph drawn in green, one CTA.
export function FinalCta() {
  return (
    <section className="border-t border-rule bg-ink">
      <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-28">
        <Reveal>
          <svg aria-hidden viewBox="0 0 120 32" className="mx-auto h-8 w-30" fill="none">
            <line x1="0" y1="16" x2="44" y2="16" className="stroke-paper/25" strokeWidth="1.5" />
            <line x1="76" y1="16" x2="120" y2="16" className="stroke-paper/25" strokeWidth="1.5" />
            <path d="M 44 16 C 54 4, 66 4, 76 16" className="stroke-credit" strokeWidth="1.5" />
            <circle cx="60" cy="7" r="3.5" className="mkt-node fill-credit" />
          </svg>
          <h2 className="mx-auto mt-8 max-w-3xl font-serif text-4xl font-medium leading-[1.04] tracking-[-0.02em] text-paper sm:text-6xl">
            Know what&apos;s safe to spend —{" "}
            <span className="text-credit" style={{ filter: "brightness(1.6)" }}>
              across everything you own.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-paper/70">
            Start free for {TRIAL_DAYS} days. No card charged until it ends. Cancel anytime.
          </p>
          <div className="mt-10 flex justify-center">
            <Cta href={primaryCta.href} variant="primary" size="lg">
              {primaryCta.label}
            </Cta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
