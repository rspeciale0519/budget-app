// Single source of truth for the marketing site. The product NAME is a
// placeholder (launch Project 3) — every marketing surface reads it from here,
// so renaming the product is a one-line edit.

export const site = {
  name: "Ledger",
  // The thesis, not a tagline: the one line that separates this from every
  // rear-view accounting tool.
  tagline: "Know what's owed, what's due, and what's safe to spend.",
  description:
    "The budgeting and bill-tracking app for owner-operators — your personal money and every business, side by side.",
  email: "hello@ledger.example.com",
  // Placeholder until the launch rename (Project 3). A deploy sets
  // NEXT_PUBLIC_SITE_DOMAIN so sitemap/robots/OG/canonical never ship the
  // example host to production.
  domain: process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "ledger.example.com",
} as const;

export const TRIAL_DAYS = 14;

export const primaryCta = {
  label: `Start your ${TRIAL_DAYS}-day free trial`,
  shortLabel: "Start free trial",
  href: "/signup",
} as const;
export const secondaryCta = { label: "Log in", href: "/login" } as const;

export const mainNav = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
  { label: "Blog", href: "/blog" },
] as const;

export interface Tier {
  id: "starter" | "pro" | "team";
  name: string;
  monthly: number;
  annual: number; // ~2 months free vs. monthly * 12
  tagline: string;
  highlight: boolean;
  books: string;
  seats: number;
  features: string[];
}

export const tiers: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 9,
    annual: 90,
    tagline: "Get your own money — and your first business — in order.",
    highlight: false,
    books: "Personal + 1 business",
    seats: 1,
    features: [
      "Full dashboard & safe-to-spend",
      "Cash-flow forecast",
      "Bills, calendar & budgets",
      "CSV import from any bank",
      "Owner-draw income bridge",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 19,
    annual: 190,
    tagline: "Run several ventures at once, without losing the personal picture.",
    highlight: true,
    books: "Unlimited",
    seats: 1,
    features: [
      "Everything in Starter",
      "Unlimited business books",
      "All-books roll-up",
      "Side-by-side tiled view + saved layouts",
      "Reports (P&L, A/P aging) as they ship",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthly: 39,
    annual: 390,
    tagline: "Bring in a bookkeeper or partner — on your terms.",
    highlight: false,
    books: "Unlimited",
    seats: 5,
    features: [
      "Everything in Pro",
      "5 seats included",
      "Per-book access control",
      "Audit log",
      "Priority support",
    ],
  },
];

// Comparison matrix rows for the pricing table (Phase 4). Value per tier id.
export const comparison: { group: string; rows: { label: string; starter: string; pro: string; team: string }[] }[] = [
  {
    group: "Books & seats",
    rows: [
      { label: "Personal book", starter: "✓", pro: "✓", team: "✓" },
      { label: "Business books", starter: "1", pro: "Unlimited", team: "Unlimited" },
      { label: "Seats", starter: "1", pro: "1", team: "5" },
    ],
  },
  {
    group: "The core app",
    rows: [
      { label: "Dashboard & safe-to-spend", starter: "✓", pro: "✓", team: "✓" },
      { label: "Cash-flow forecast", starter: "✓", pro: "✓", team: "✓" },
      { label: "Bills, calendar & budgets", starter: "✓", pro: "✓", team: "✓" },
      { label: "CSV import (any bank)", starter: "✓", pro: "✓", team: "✓" },
      { label: "Owner-draw income bridge", starter: "✓", pro: "✓", team: "✓" },
    ],
  },
  {
    group: "Multi-business",
    rows: [
      { label: "All-books roll-up", starter: "—", pro: "✓", team: "✓" },
      { label: "Side-by-side tiled view", starter: "—", pro: "✓", team: "✓" },
      { label: "Saved layouts", starter: "—", pro: "✓", team: "✓" },
    ],
  },
  {
    group: "Team & trust",
    rows: [
      { label: "Per-book access control", starter: "—", pro: "—", team: "✓" },
      { label: "Audit log", starter: "—", pro: "—", team: "✓" },
      { label: "Priority support", starter: "—", pro: "—", team: "✓" },
    ],
  },
];

export const footerNav = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Demo", href: "/demo" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: `mailto:${site.email}` },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Refunds", href: "/legal/refunds" },
    ],
  },
] as const;
