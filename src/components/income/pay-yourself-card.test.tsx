import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { PayYourselfCard } from "@/components/income/pay-yourself-card";
import { ToastProvider } from "@/components/ui/toast";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

const targets = [
  { id: "personal", name: "Personal", accounts: [{ id: "chk", name: "Everyday Checking" }] },
  { id: "other", name: "Side Biz", accounts: [{ id: "biz2", name: "Biz2 Checking" }] },
];
const fromAccounts = [{ id: "bchk", name: "Business Checking" }];

describe("PayYourselfCard", () => {
  it("renders the pay-yourself form with book/account selects and the no-double-count explainer", () => {
    const html = renderToString(
      <ToastProvider>
        <PayYourselfCard workspaceId="biz" targets={targets} fromAccounts={fromAccounts} />
      </ToastProvider>,
    );
    expect(html).toContain("Pay yourself");
    expect(html).toContain("Personal");
    expect(html).toContain("Everyday Checking");
    expect(html).toContain("Business Checking");
    expect(html).toContain("never double-counts");
  });
});
