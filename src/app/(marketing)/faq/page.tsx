import type { Metadata } from "next";
import { FaqList } from "@/components/marketing/faq-list";
import { Cta } from "@/components/marketing/cta";
import { faqs } from "@/lib/marketing-content";
import { site } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers on security, bank support, importing, the free trial, refunds, and cancellation.",
};

export default function FaqPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-5 pb-2 pt-20 sm:px-8 sm:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">FAQ</p>
        <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
          Questions worth answering before you trust us with your money.
        </h1>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <FaqList items={faqs} />
        <div className="mt-12 rounded-card border border-rule bg-surface p-6 text-center">
          <p className="font-serif text-lg text-ink">Still have a question?</p>
          <p className="mt-1.5 text-sm text-muted">We read every message.</p>
          <div className="mt-4 flex justify-center">
            <Cta href={`mailto:${site.email}`} variant="outline" size="md">
              Email us
            </Cta>
          </div>
        </div>
      </section>
    </>
  );
}
