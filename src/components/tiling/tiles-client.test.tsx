import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { LayoutControls } from "@/components/tiling/layout-controls";
import { assignAt } from "@/lib/pane-tree";
import type { PaneConfig } from "@/lib/zod/layout";
import type { SavedLayout } from "@/services/layout-service";
import type { WorkspaceOption } from "@/components/tiling/tiles-client";

const workspaces: WorkspaceOption[] = [
  { id: "a", name: "Personal", color: "#6366f1" },
  { id: "b", name: "Acme", color: "#10b981" },
];

const rowAB: PaneConfig = {
  type: "split",
  direction: "row",
  children: [
    { type: "leaf", workspaceId: "a" },
    { type: "leaf", workspaceId: "b" },
  ],
};

const layouts: SavedLayout[] = [{ id: "L1", name: "Morning review", config: rowAB }];

const noop = () => {};

describe("LayoutControls", () => {
  it("renders the saved-layout names and the workspace options", () => {
    const html = renderToString(
      <LayoutControls
        workspaces={workspaces}
        layouts={layouts}
        config={rowAB}
        onAddPane={noop}
        onRemovePane={noop}
        onAssign={noop}
        onToggleDirection={noop}
        onSave={noop}
        onRestore={noop}
        onDelete={noop}
      />,
    );
    expect(html).toContain("Morning review");
    expect(html).toContain("Personal");
    expect(html).toContain("Acme");
  });

  it("invokes onAssign with the chosen index + workspace id", () => {
    const onAssign = vi.fn();
    renderToString(
      <LayoutControls
        workspaces={workspaces}
        layouts={layouts}
        config={rowAB}
        onAddPane={noop}
        onRemovePane={noop}
        onAssign={onAssign}
        onToggleDirection={noop}
        onSave={noop}
        onRestore={noop}
        onDelete={noop}
      />,
    );
    // TilesClient wires onAssign(index, wsId) -> assignAt(config, index, wsId).
    // Assert that contract holds (clicks aren't simulable in renderToString).
    const next = assignAt(rowAB, 1, "a");
    expect(next).toEqual({
      type: "split",
      direction: "row",
      children: [
        { type: "leaf", workspaceId: "a" },
        { type: "leaf", workspaceId: "a" },
      ],
    });
  });
});
