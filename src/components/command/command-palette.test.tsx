import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { CommandPalette } from "@/components/command/command-palette";

vi.mock("next/navigation", () => ({
  usePathname: () => "/w/A",
  useRouter: () => ({ push: () => {} }),
}));

const workspaces = [
  { id: "A", name: "Personal", color: "#6366f1" },
  { id: "B", name: "Acme", color: "#10b981" },
];

describe("CommandPalette", () => {
  it("renders nothing (no command list) when closed by default", () => {
    const html = renderToString(<CommandPalette workspaces={workspaces} />);
    expect(html).not.toContain("Add expense / transaction");
    expect(html).not.toContain("Go to Personal");
  });
});
