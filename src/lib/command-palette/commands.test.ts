import { describe, it, expect } from "vitest";
import { buildCommands, filterCommands } from "@/lib/command-palette/commands";

const workspaces = [
  { id: "A", name: "Personal", color: "#6366f1" },
  { id: "B", name: "Acme", color: "#10b981" },
];

describe("buildCommands", () => {
  it("scopes quick actions to the current workspace and lists a go-to per workspace", () => {
    const cmds = buildCommands({ workspaces, currentWorkspaceId: "A" });
    const addExpense = cmds.find((c) => c.label.startsWith("Add expense"));
    expect(addExpense).toMatchObject({ href: "/w/A/manage", group: "Quick actions" });
    const goto = cmds.filter((c) => c.group === "Go to workspace");
    expect(goto.map((c) => c.href)).toEqual(["/w/A", "/w/B"]);
  });

  it("omits workspace-scoped quick actions when there is no current workspace", () => {
    const cmds = buildCommands({ workspaces, currentWorkspaceId: null });
    expect(cmds.some((c) => c.group === "Quick actions")).toBe(false);
    expect(cmds.filter((c) => c.group === "Go to workspace")).toHaveLength(2);
  });
});

describe("filterCommands", () => {
  it("subsequence-matches labels case-insensitively", () => {
    const cmds = buildCommands({ workspaces, currentWorkspaceId: "A" });
    const r = filterCommands(cmds, "add exp");
    expect(r).toHaveLength(1);
    expect(r[0]!.label).toMatch(/^Add expense/);
  });

  it("returns all commands for an empty query", () => {
    const cmds = buildCommands({ workspaces, currentWorkspaceId: "A" });
    expect(filterCommands(cmds, "")).toHaveLength(cmds.length);
  });
});
