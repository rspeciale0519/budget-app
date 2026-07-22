import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { FaqList } from "@/components/marketing/faq-list";
import { faqs } from "@/lib/marketing-content";
import { TRIAL_DAYS } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Three simple plans with a 14-day free trial. Pay more only when you add a business or a teammate — never to unlock the basics.",
};

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-4 pt-20 text-center sm:px-8 sm:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">Pricing</p>
        <h1 className="mx-auto mt-4 max-w-2xl font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
          Plans that grow with what you run.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Start free for {TRIAL_DAYS} days on any plan. Move up only when you add a business or a
          teammate — never to unlock the basics.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <PricingCards />
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <h2 className="mb-6 font-serif text-2xl text-ink">Compare every plan</h2>
        <ComparisonTable />
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h2 className="mb-6 font-serif text-2xl text-ink">Before you buy</h2>
        <FaqList items={faqs.slice(2)} />
      </section>
    </>
  );
}
