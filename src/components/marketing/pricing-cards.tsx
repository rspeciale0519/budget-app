"use client";

import { useState } from "react";
import { tiers, primaryCta, TRIAL_DAYS, type Tier } from "@/lib/site-config";
import { Cta } from "./cta";
import { cn } from "@/lib/utils";

function Price({ tier, annual }: { tier: Tier; annual: boolean }) {
  // Whole dollars for monthly ($9); always two decimals for the annual per-month
  // equivalent so prices never render as "$7.5".
  const display = annual ? (tier.annual / 12).toFixed(2) : String(tier.monthly);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-serif text-4xl font-medium tracking-[-0.02em] text-ink tabular">${display}</span>
      <span className="text-sm text-muted">/mo</span>
      {annual && <span className="ml-1 text-xs text-dim">billed ${tier.annual}/yr</span>}
    </div>
  );
}

export function PricingCards({ showToggle = true }: { showToggle?: boolean }) {
  const [annual, setAnnual] = useState(true);

  return (
    <div>
      {showToggle && (
        <div className="mb-10 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm transition-colors",
              !annual ? "bg-credit font-medium text-paper" : "text-muted hover:text-ink",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm transition-colors",
              annual ? "bg-credit font-medium text-paper" : "text-muted hover:text-ink",
            )}
          >
            Annual
            <span
              className={cn(
                "ml-1.5 font-mono text-[10px] uppercase tracking-wide",
                annual ? "text-paper/80" : "text-credit",
              )}
            >
              2 months free
            </span>
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "flex flex-col rounded-card border bg-surface p-6",
              tier.highlight ? "border-credit shadow-lift ring-1 ring-credit/20" : "border-rule-strong",
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-ink">{tier.name}</h3>
              {tier.highlight && (
                <span className="rounded-full bg-credit-tint px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-credit">
                  Most popular
                </span>
              )}
            </div>
            <p className="mt-2 min-h-[40px] text-sm leading-relaxed text-muted">{tier.tagline}</p>
            <div className="mt-4">
              <Price tier={tier} annual={annual} />
            </div>
            <div className="mt-5">
              <Cta href={primaryCta.href} variant={tier.highlight ? "primary" : "outline"} size="md" className="w-full">
                {primaryCta.shortLabel}
              </Cta>
            </div>
            <p className="mt-3 text-center text-xs text-dim">{TRIAL_DAYS}-day trial · cancel anytime</p>
            <ul className="mt-6 space-y-2.5 border-t border-rule pt-5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-credit" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
