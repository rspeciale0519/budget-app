import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { Dashboard } from "@/components/dashboard/dashboard";
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
});
