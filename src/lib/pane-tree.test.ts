import { describe, it, expect } from "vitest";
import { paneConfigSchema, type PaneConfig } from "@/lib/zod/layout";
import {
  collectWorkspaceIds,
  defaultLayout,
  addLeaf,
  removeLeafAt,
  assignAt,
  setDirection,
  setSizes,
} from "@/lib/pane-tree";

const leaf = (workspaceId: string): PaneConfig => ({ type: "leaf", workspaceId });
const rowAB: PaneConfig = { type: "split", direction: "row", children: [leaf("a"), leaf("b")] };

describe("paneConfigSchema", () => {
  it("accepts a nested split with sizes", () => {
    const nested: PaneConfig = {
      type: "split",
      direction: "row",
      sizes: [60, 40],
      children: [leaf("a"), { type: "split", direction: "col", children: [leaf("b")] }],
    };
    expect(paneConfigSchema.safeParse(nested).success).toBe(true);
  });

  it("rejects bad direction and a leaf without workspaceId", () => {
    expect(paneConfigSchema.safeParse({ type: "split", direction: "diagonal", children: [] }).success).toBe(false);
    expect(paneConfigSchema.safeParse({ type: "leaf" }).success).toBe(false);
  });
});

describe("pure pane-tree ops", () => {
  it("collectWorkspaceIds returns deduped leaves", () => {
    expect(collectWorkspaceIds(rowAB)).toEqual(["a", "b"]);
    expect(collectWorkspaceIds({ type: "split", direction: "row", children: [leaf("a"), leaf("a")] })).toEqual(["a"]);
  });

  it("defaultLayout: one id → leaf, many → row split", () => {
    expect(defaultLayout(["a"])).toEqual(leaf("a"));
    expect(defaultLayout(["a", "b"])).toEqual(rowAB);
  });

  it("addLeaf appends to the root split (wrapping a lone leaf)", () => {
    expect(addLeaf(leaf("a"), "b")).toEqual(rowAB);
    expect(collectWorkspaceIds(addLeaf(rowAB, "c"))).toEqual(["a", "b", "c"]);
  });

  it("assignAt replaces a root child's workspace", () => {
    expect(collectWorkspaceIds(assignAt(rowAB, 1, "c"))).toEqual(["a", "c"]);
  });

  it("removeLeafAt removes; collapses to a lone leaf when one remains", () => {
    expect(removeLeafAt(rowAB, 0)).toEqual(leaf("b"));
    expect(collectWorkspaceIds(removeLeafAt(addLeaf(rowAB, "c"), 1))).toEqual(["a", "c"]);
  });

  it("setDirection and setSizes update the root split", () => {
    expect(setDirection(rowAB, "col").type === "split" && setDirection(rowAB, "col")).toMatchObject({ direction: "col" });
    expect(setSizes(rowAB, [70, 30])).toMatchObject({ sizes: [70, 30] });
  });
});
