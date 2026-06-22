import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MatchSuggestions } from "@/components/match/match-suggestions";
import type { MatchSuggestion } from "@/services/match-service";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

const one: MatchSuggestion = {
  billId: "b1",
  vendor: "USPS Postage Account",
  dueDate: "2026-07-03",
  amount: "$2,150.00",
  transactionId: "t1",
  txnDescription: "USPS POSTAGE",
  txnDate: "2026-07-03",
  txnAmount: "$2,150.00",
  score: 0.87,
};

describe("MatchSuggestions", () => {
  it("renders a confirm row with the transaction + bill and a prompt", () => {
    const html = renderToString(<MatchSuggestions workspaceId="w" suggestions={[one]} />);
    expect(html).toContain("USPS POSTAGE");
    expect(html).toContain("USPS Postage Account");
    expect(html).toContain("Mark it paid?");
    expect(html).toContain("Yes, match");
  });

  it("renders nothing when there are no suggestions", () => {
    const html = renderToString(<MatchSuggestions workspaceId="w" suggestions={[]} />);
    expect(html).toBe("");
  });
});
