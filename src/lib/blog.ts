// Blog content as structured, type-safe data (no MDX toolchain needed). Each
// post is a list of blocks rendered by PostBody. Dates are fixed strings — no
// Date.now() — so builds stay deterministic.

import { site } from "@/lib/site-config";

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "quote"; text: string };

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  dateLabel: string;
  readMins: number;
  blocks: Block[];
}

const posts: Post[] = [
  {
    slug: "separate-business-and-personal-finances",
    title: "How to separate business and personal finances (without a bookkeeper)",
    description:
      "The practical way to keep your household and your business money apart — separate accounts, a clean owner draw, and one view that shows both.",
    date: "2026-07-15",
    dateLabel: "July 15, 2026",
    readMins: 6,
    blocks: [
      { t: "p", text: "If you run a business and a household, the fastest way into trouble is a single blurry pile of money. Here's the minimum setup that keeps them apart — no accounting degree required." },
      { t: "h2", text: "1. Give each a real account" },
      { t: "p", text: "Open a dedicated checking account for the business, even a sole proprietorship. Business income lands there; business expenses leave from there. Your personal account stays personal. This one move removes ninety percent of the mess." },
      { t: "h2", text: "2. Pay yourself deliberately" },
      { t: "p", text: "You don't spend business money on groceries. Instead you move money from the business to yourself on purpose — an owner draw — and then it's yours to spend personally. The draw is the bridge between the two worlds, and it should be the only bridge." },
      { t: "h2", text: "3. Keep one view of both" },
      { t: "p", text: "Separation doesn't mean blindness. You still need to see the whole picture: what the business holds, what you hold personally, and how a draw shifts both. That's exactly what a per-book roll-up gives you — separate books, one combined total, draws counted once." },
      { t: "quote", text: "Separate the accounts, make the draw explicit, and keep one honest total. Everything else is bookkeeping you probably don't need." },
      { t: "p", text: `That's the model ${site.name} is built around — personal and every business, side by side, with the owner-draw bridge handled for you.` },
    ],
  },
  {
    slug: "paying-yourself-owner-draws-explained",
    title: "Paying yourself from your business: owner draws, explained simply",
    description:
      "What an owner draw is, how it's different from a salary, and how to record it so your personal and business numbers both stay honest.",
    date: "2026-07-08",
    dateLabel: "July 8, 2026",
    readMins: 5,
    blocks: [
      { t: "p", text: "\"Can I just take money out of my business?\" For most owner-operators, yes — it's called an owner draw. Here's what that means and how to keep it clean." },
      { t: "h2", text: "Draw vs. salary" },
      { t: "p", text: "A salary runs through payroll with taxes withheld. A draw is simpler: you move profit from the business to yourself. Many single-owner businesses pay themselves with draws. Which is right for you is a question for your accountant — but recording a draw correctly is something you can own." },
      { t: "h2", text: "The double-counting trap" },
      { t: "p", text: "Here's where people get burned. The draw is money leaving the business AND money arriving in your personal account. If you count it as business spending and personal income, your combined net looks wrong — you've counted the same dollars twice." },
      { t: "ul", items: [
        "In the business: the draw is not an expense — it's a distribution of profit.",
        "In your personal book: the draw is income you can spend.",
        "In any combined total: it must net to zero, not double up.",
      ] },
      { t: "h2", text: "The clean way to record it" },
      { t: "p", text: "Tag the transaction once as an owner draw, and let the tool mirror it into your personal book and net it out of the combined view. One action, both sides correct, no double-entry." },
      { t: "p", text: `${site.name} does this with a one-tap owner draw: business outflow, personal income, and a roll-up that nets it automatically.` },
    ],
  },
  {
    slug: "safe-to-spend-beats-budgeting",
    title: "Safe-to-spend: the one number that beats a budget",
    description:
      "Budgets tell you what you planned. Safe-to-spend tells you what's actually yours right now — after every bill that's coming. Here's the difference.",
    date: "2026-06-30",
    dateLabel: "June 30, 2026",
    readMins: 4,
    blocks: [
      { t: "p", text: "A budget is a plan you made at the start of the month. Safe-to-spend is the truth at any moment inside it. For people with irregular income — which is most owner-operators — the second one is what you actually need." },
      { t: "h2", text: "Why budgets slip" },
      { t: "p", text: "Budgets assume a steady rhythm: money in on the 1st, spending paced evenly. Run a business and that rhythm breaks — a client pays late, payroll lands, a tax bill appears. The budget was reasonable; reality just didn't follow it." },
      { t: "h2", text: "What safe-to-spend actually is" },
      { t: "p", text: "Take your balance. Subtract every bill that's already coming before your next reliable income. What's left is safe to spend — the number that answers the only question that matters at the checkout: can I afford this right now?" },
      { t: "quote", text: "A budget is what you meant to do. Safe-to-spend is what you can actually do today." },
      { t: "h2", text: "Pair it with a forecast" },
      { t: "p", text: "Safe-to-spend is a snapshot; a 30-day cash-flow forecast is the movie. Together they show today's headroom and the lowest point you'll hit before the next payday — so you're never surprised." },
      { t: "p", text: `Both are the heart of ${site.name}'s dashboard, on every book you keep.` },
    ],
  },
];

export function getAllPosts(): Post[] {
  // Newest first (dates are ISO strings, so string sort is chronological).
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
