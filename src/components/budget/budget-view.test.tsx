import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { BudgetView } from "@/components/budget/budget-view";
import type { BudgetRow } from "@/services/dashboard/budget-vs-actual";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

const saas: BudgetRow = { categoryId: "c-saas", name: "SaaS", budget: "$4,000.00", actual: "$5,000.00", pct: 125, status: "over" };
const postage: BudgetRow = { categoryId: "c-post", name: "Postage", budget: "$6,500.00", actual: "$6,100.00", pct: 94, status: "near" };
const cats = [
  { id: "c-saas", name: "SaaS" },
  { id: "c-post", name: "Postage" },
  { id: "c-misc", name: "Misc" },
];

describe("BudgetView", () => {
  it("renders bars with names, actual/budget, and the category options", () => {
    const html = renderToString(<BudgetView workspaceId="w" rows={[saas, postage]} categories={cats} />);
    expect(html).toContain("SaaS");
    expect(html).toContain("Postage");
    expect(html).toContain("$5,000.00 / $4,000.00");
    expect(html).toContain("Misc"); // form option
  });

  it("shows an empty state when no budgets are set", () => {
    const html = renderToString(<BudgetView workspaceId="w" rows={[]} categories={cats} />);
    expect(html).toContain("No budgets set");
  });
});
