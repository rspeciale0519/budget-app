import { Section } from "./section";
import { ScreenshotFrame } from "./screenshot-frame";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

interface Feature {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  image?: { src: string; alt: string };
}

const features: Feature[] = [
  {
    eyebrow: "Side by side",
    title: "Every book, live, in one glance.",
    body: "Your personal life and each business get their own isolated book — then come together in one combined view, or sit next to each other in resizable panes you can save and restore.",
    points: ["Combined roll-up across every book", "Side-by-side tiled panes + saved layouts", "Drill into any book from the top"],
    image: {
      src: "/marketing/all-books.png",
      alt: "The All-books roll-up: Personal, Acme Studio, and Maple & Co shown together with balance, money in and out, unpaid, and a combined total.",
    },
  },
  {
    eyebrow: "Safe to spend",
    title: "Not a rear-view ledger. A forward-looking one.",
    body: "See what's actually yours to spend after every bill that's coming — with a 30-day cash-flow forecast that flags the lowest point before you hit it.",
    points: ["Drillable safe-to-spend math", "30-day forecast with a low-point warning", "Spending by category, this period"],
    image: {
      src: "/marketing/dashboard.png",
      alt: "The dashboard's safe-to-spend figure and 30-day cash-flow forecast, with spending broken down by category.",
    },
  },
  {
    eyebrow: "The income bridge",
    title: "Pay yourself once. Counted once.",
    body: "Tag a draw from a business and it lands as personal income automatically — no double-entry, no double-counting. The combined roll-up nets it out so your total is always honest.",
    points: ["One-tap owner draw → personal income", "Roll-up nets draws automatically", "Business teammates never see personal"],
  },
  {
    eyebrow: "Bills & calendar",
    title: "Know what's due before it's late.",
    body: "Every bill, recurring or one-off, on a month grid and an upcoming list — with one-click mark-paid and a nudge the moment something slips overdue.",
    points: ["Recurring bills that materialize themselves", "Status-colored month calendar", "One-click mark-paid with undo"],
    image: {
      src: "/marketing/calendar.png",
      alt: "A month calendar with status-colored bill chips for upcoming and overdue payments.",
    },
  },
  {
    eyebrow: "Import",
    title: "Bring in any bank. Keep the mess out.",
    body: "Map a CSV from any bank once, and every import after is clean: a sign rule so credit-card exports aren't booked as income, duplicate detection, and a preview you commit — or undo.",
    points: ["Per-account column mapping", "Duplicate detection + balance check", "Preview, commit, undo"],
  },
];

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const flip = index % 2 === 1;
  const hasImage = Boolean(feature.image);
  return (
    <div className="grid items-center gap-8 border-t border-rule py-16 first:border-t-0 lg:grid-cols-12 lg:gap-12">
      <Reveal
        className={cn(
          hasImage ? "lg:col-span-5" : "lg:col-span-8",
          flip && hasImage && "lg:order-2 lg:col-start-8",
        )}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">{feature.eyebrow}</p>
        <h3 className="mt-3 font-serif text-2xl font-medium leading-tight tracking-[-0.01em] text-ink sm:text-3xl">
          {feature.title}
        </h3>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{feature.body}</p>
        <ul className="mt-5 space-y-2.5">
          {feature.points.map((pt) => (
            <li key={pt} className="flex items-start gap-2.5 text-sm text-ink">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-credit" />
              {pt}
            </li>
          ))}
        </ul>
      </Reveal>
      {feature.image && (
        <Reveal delay={100} className={cn("lg:col-span-7", flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-6")}>
          <ScreenshotFrame src={feature.image.src} alt={feature.image.alt} />
        </Reveal>
      )}
    </div>
  );
}

export function Features({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <Section
      eyebrow={withHeader ? "What you get" : undefined}
      title={withHeader ? "Built for owner-operators — nothing an accountant demands." : undefined}
    >
      <div>
        {features.map((f, i) => (
          <FeatureRow key={f.eyebrow} feature={f} index={i} />
        ))}
      </div>
    </Section>
  );
}
