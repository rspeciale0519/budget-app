import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { Dashboard, SafeToSpendPanel } from "@/components/dashboard/dashboard";
import { mockDashboard } from "@/lib/mock/dashboard";

describe("Dashboard", () => {
  it("renders KPI values and widget sections from mock data", () => {
    const html = renderToString(<Dashboard data={mockDashboard} />);
    expect(html).toContain(mockDashboard.kpis.safeToSpend);
    expect(html).toContain(mockDashboard.kpis.totalBalance);
    expect(html).toContain("Cash-flow forecast");
    expect(html).toContain("Spending by category");
    expect(html).toContain("Upcoming");
  });

  it("conveys bill status by label, not color alone (accessibility)", () => {
    const html = renderToString(<Dashboard data={mockDashboard} />);
    expect(html).toContain("Overdue");
    expect(html).toContain("Unpaid");
  });

  it("drill-down lists the real unpaid bills and an income hint when unset", () => {
    const math = {
      availableBalance: "$5,000.00",
      unpaidBeforeIncome: "$1,900.00",
      result: "$3,100.00",
      incomeConfigured: false,
      items: [
        { vendor: "Rent", amount: "$1,500.00", dueDate: "Jun 25" },
        { vendor: "Card", amount: "$400.00", dueDate: "Jul 02" },
      ],
    };
    const html = renderToString(<SafeToSpendPanel math={math} workspaceId="ws-1" />);
    expect(html).toContain("Rent");
    expect(html).toContain("$1,500.00");
    expect(html).toContain("Card");
    expect(html).toContain("$3,100.00");
    expect(html).toContain("Set expected income");
    expect(html).toContain("/w/ws-1/income");
  });
});
