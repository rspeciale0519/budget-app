import type { Metadata } from "next";
import { Features } from "@/components/marketing/landing/features";
import { Trust } from "@/components/marketing/landing/trust";
import { FinalCta } from "@/components/marketing/landing/final-cta";

export const metadata: Metadata = {
  title: "Features",
  description: "Isolated books, a side-by-side roll-up, cash-flow forecasting, the owner-draw income bridge, bills and calendar, and CSV import — everything an owner-operator needs.",
};

export default function FeaturesPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-4 pt-20 sm:px-8 sm:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">Features</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
          Everything an owner-operator needs. Nothing an accountant demands.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Forward-looking budgeting and bill-tracking over a simple ledger — built to hold your
          personal life and every business you run, side by side.
        </p>
      </section>
      <Features withHeader={false} />
      <Trust />
      <FinalCta />
    </>
  );
}
