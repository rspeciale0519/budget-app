import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { TiledView } from "@/components/tiling/tiled-view";
import type { PaneConfig } from "@/lib/zod/layout";
import type { PaneSummary } from "@/services/dashboard/pane-summary";

const rowAB: PaneConfig = {
  type: "split",
  direction: "row",
  children: [
    { type: "leaf", workspaceId: "a" },
    { type: "leaf", workspaceId: "b" },
  ],
};

const summary = (workspaceId: string, name: string, balance: string): PaneSummary => ({
  workspaceId,
  name,
  color: "#10b981",
  balance,
  safeToSpend: "$1,000.00",
  topBills: [],
});

describe("TiledView", () => {
  it("renders a pane per leaf with its name and balance (stacked fallback)", () => {
    const html = renderToString(
      <TiledView
        config={rowAB}
        summaries={{ a: summary("a", "Personal", "$4,200.00"), b: summary("b", "Acme", "$48,210.00") }}
      />,
    );
    expect(html).toContain("Personal");
    expect(html).toContain("$4,200.00");
    expect(html).toContain("Acme");
    expect(html).toContain("$48,210.00");
  });

  it("renders a Loading placeholder for a leaf with no summary (no crash)", () => {
    const html = renderToString(<TiledView config={rowAB} summaries={{ a: summary("a", "Personal", "$1.00") }} />);
    expect(html).toContain("Loading…");
  });
});
