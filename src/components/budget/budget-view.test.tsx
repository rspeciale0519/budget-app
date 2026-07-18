import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { BudgetView, type BudgetSummary } from "@/components/budget/budget-view";
import { ToastProvider } from "@/components/ui/toast";
import type { BudgetRow } from "@/services/dashboard/budget-vs-actual";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

const saas: BudgetRow = {
  budgetId: "b-saas",
  categoryId: "c-saas",
  name: "SaaS",
  budget: "$4,000.00",
  budgetRaw: "4000.00",
  actual: "$5,000.00",
  delta: "$1,000.00",
  pct: 125,
  status: "over",
};
const postage: BudgetRow = {
  budgetId: "b-post",
  categoryId: "c-post",
  name: "Postage",
  budget: "$6,500.00",
  budgetRaw: "6500.00",
  actual: "$6,100.00",
  delta: "$400.00",
  pct: 94,
  status: "near",
};
const cats = [
  { id: "c-saas", name: "SaaS" },
  { id: "c-post", name: "Postage" },
  { id: "c-misc", name: "Misc" },
];
const summary: BudgetSummary = {
  totalBudgeted: "$10,500.00",
  expectedIncome: "$12,000.00",
  incomeConfigured: true,
  unbudgeted: "$1,500.00",
  overCommitted: false,
  overspentCount: 1,
};

function render(rows: BudgetRow[]) {
  // Strip React's SSR text-boundary comments so assertions can match plain phrases.
  return renderToString(
    <ToastProvider>
      <BudgetView workspaceId="w" rows={rows} categories={cats} summary={summary} />
    </ToastProvider>,
  ).replace(/<!-- -->/g, "");
}

describe("BudgetView", () => {
  it("labels overspending in words, not color alone, and shows what's left", () => {
    const html = render([saas, postage]);
    expect(html).toContain("Over by $1,000.00");
    expect(html).toContain("$400.00 left");
    expect(html).toContain("$5,000.00 of $4,000.00");
    expect(html).toContain('role="progressbar"');
  });

  it("shows the summary strip with left-to-budget", () => {
    const html = render([saas]);
    expect(html).toContain("Expected income");
    expect(html).toContain("$12,000.00");
    expect(html).toContain("Left to budget");
    expect(html).toContain("1 category over");
  });

  it("shows an explanatory empty state when no budgets are set", () => {
    const html = render([]);
    expect(html).toContain("No budgets yet");
    expect(html).toContain("move money from another category");
  });
});
