import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { TRIAL_DAYS } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Start your free trial",
  description: "Pick a plan and start your 14-day free trial. No card charged until the trial ends.",
};

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">Start free trial</p>
        <h1 className="mx-auto mt-4 max-w-2xl font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
          Pick a plan. Start your {TRIAL_DAYS}-day trial.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          No card charged for {TRIAL_DAYS} days. Cancel anytime before then and you pay nothing.
        </p>
      </div>

      <div className="mt-12">
        <PricingCards />
      </div>

      {/* Checkout is delivered in a separate release (billing). Until then this
          page selects a plan; the CTA on each card leads here, and secure Stripe
          checkout will attach at this seam. */}
      <div className="mx-auto mt-12 max-w-xl rounded-card border border-debit/40 bg-debit-tint px-5 py-4 text-center text-sm text-ink">
        <span className="font-semibold">Checkout is coming online.</span> Secure card checkout and
        account creation attach here in our billing release. Want in early?{" "}
        <a href="/login" className="underline underline-offset-2">
          Create an account
        </a>{" "}
        to start using the app now.
      </div>
    </section>
  );
}
