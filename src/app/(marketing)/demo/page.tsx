import type { Metadata } from "next";
import { ScreenshotFrame } from "@/components/marketing/landing/screenshot-frame";
import { Reveal } from "@/components/marketing/landing/reveal";
import { FinalCta } from "@/components/marketing/landing/final-cta";

export const metadata: Metadata = {
  title: "Demo",
  description: "A guided morning review: open the roll-up, check what's safe to spend, see what's due, and mark a bill paid.",
};

// A real sequence — the daily "morning review" — so numbered steps carry
// meaning rather than decorate.
const steps = [
  {
    n: "01",
    eyebrow: "Open up",
    title: "Start with everything at once.",
    body: "One combined view across your personal book and every business — balances, money in and out this month, what's still owed, and a combined total with owner draws already netted out.",
    image: { src: "/marketing/all-books.png", alt: "The All-books roll-up across three books with a combined total." },
  },
  {
    n: "02",
    eyebrow: "Check the runway",
    title: "See what's actually safe to spend.",
    body: "Drop into a book and the dashboard shows safe-to-spend after every upcoming bill, a 30-day cash-flow forecast with its lowest point, and where the money went this month.",
    image: { src: "/marketing/dashboard.png", alt: "A book dashboard with safe-to-spend, cash-flow forecast, and spending by category." },
  },
  {
    n: "03",
    eyebrow: "Clear the bills",
    title: "Handle what's due — before it's late.",
    body: "The calendar lays every bill on a month grid, status-colored, with overdue items flagged. Mark one paid in a click; recurring bills reappear on schedule on their own.",
    image: { src: "/marketing/calendar.png", alt: "A month calendar with status-colored bill chips." },
  },
];

export default function DemoPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-20 sm:px-8 sm:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">Demo</p>
        <h1 className="mt-4 max-w-2xl font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
          A morning review, start to finish.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Three minutes with real demo data — the exact loop owner-operators run each morning.
        </p>
      </section>

      <div className="mx-auto max-w-6xl px-5 pb-8 sm:px-8">
        {steps.map((step) => (
          <div key={step.n} className="grid items-center gap-8 border-t border-rule py-14 lg:grid-cols-12 lg:gap-12">
            <Reveal className="lg:col-span-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm text-credit">{step.n}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{step.eyebrow}</span>
              </div>
              <h2 className="mt-3 font-serif text-2xl font-medium leading-tight tracking-[-0.01em] text-ink sm:text-3xl">
                {step.title}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">{step.body}</p>
            </Reveal>
            <Reveal delay={100} className="lg:col-span-7">
              <ScreenshotFrame src={step.image.src} alt={step.image.alt} />
            </Reveal>
          </div>
        ))}
      </div>

      <FinalCta />
    </>
  );
}
