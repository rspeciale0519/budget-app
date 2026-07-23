// Shared marketing copy used across the landing FAQ teaser and the full FAQ page.

import { TRIAL_DAYS } from "@/lib/site-config";

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "Which banks are supported?",
    a: "All of them. You import a CSV export from any bank or credit card — map the columns once, and every import after is one click. No account credentials ever leave your bank.",
  },
  {
    q: "Is my financial data safe?",
    a: "Your books are isolated at the database with row-level security, every figure is computed in exact decimal, and an audit log records every change. A teammate you grant one business can never see your personal book.",
  },
  {
    q: `What happens after the ${TRIAL_DAYS}-day trial?`,
    a: "You pick a plan when you sign up and aren't charged until the trial ends. Cancel anytime before then and you pay nothing. After that it's a simple monthly or annual subscription you can cancel whenever you like.",
  },
  {
    q: "Do you connect to my bank automatically?",
    a: "Not yet — today it's CSV import, which means nothing sits between us and your bank login. Automatic sync is on the roadmap.",
  },
  {
    q: "Can I run more than one business?",
    a: "That's the whole point. Pro and Team give you unlimited business books alongside your personal one, a combined roll-up, and the side-by-side view.",
  },
  {
    q: "Is this accounting software?",
    a: "No — deliberately. It's forward-looking budgeting and bill-tracking over a simple ledger, not double-entry bookkeeping. It answers 'what's safe to spend and what's due,' not 'reconcile my journals.'",
  },
];
