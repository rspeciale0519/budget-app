import type { Metadata } from "next";
import { FinalCta } from "@/components/marketing/landing/final-cta";

export const metadata: Metadata = {
  title: "About",
  description: "Why we built a budgeting app for people who run a household and a business or two at the same time.",
};

export default function AboutPage() {
  return (
    <>
      <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">About</p>
        <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.06] tracking-[-0.02em] text-ink sm:text-5xl">
          Built by an owner-operator, for owner-operators.
        </h1>
        <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-muted">
          <p>
            I run a household and more than one business. For years my finances lived in a spreadsheet
            for the house, a spreadsheet per company, and a fragile formula bridging them — plus a
            bookkeeping suite that wanted a chart of accounts I didn&apos;t have time to maintain.
          </p>
          <p>
            None of it answered the only questions I actually asked at 6am: <em>What&apos;s due this
            week? What&apos;s safe to spend? If I pay myself from the business, where does my personal
            balance land?</em>
          </p>
          <p>
            So I built the tool I wanted. Every part of it is shaped by one belief: an owner should be
            able to see everything they own — personal and business, side by side — without becoming a
            bookkeeper to do it. The money you pay yourself is counted once. Balances are computed, not
            typed. And it looks forward, to what&apos;s coming, not just back at what already cleared.
          </p>
          <p>
            It&apos;s deliberately not a full accounting suite. It&apos;s a clear, honest view of your
            money across every venture you run — and a straight answer to &ldquo;can I spend this?&rdquo;
          </p>
        </div>
      </article>
      <FinalCta />
    </>
  );
}
