import type { PaneConfig } from "@/lib/zod/layout";

/** All leaf workspaceIds in tree order, deduped. */
export function collectWorkspaceIds(config: PaneConfig): string[] {
  const out: string[] = [];
  const walk = (c: PaneConfig) => {
    if (c.type === "leaf") {
      if (!out.includes(c.workspaceId)) out.push(c.workspaceId);
    } else {
      c.children.forEach(walk);
    }
  };
  walk(config);
  return out;
}

/** A starting layout: a lone leaf for one workspace, else a row split of leaves. */
export function defaultLayout(workspaceIds: string[]): PaneConfig {
  if (workspaceIds.length === 1) return { type: "leaf", workspaceId: workspaceIds[0]! };
  return {
    type: "split",
    direction: "row",
    children: workspaceIds.map((workspaceId) => ({ type: "leaf", workspaceId })),
  };
}

/** Normalize any config to a root split (a lone leaf becomes a 1-child split). */
function rootSplit(config: PaneConfig): Extract<PaneConfig, { type: "split" }> {
  if (config.type === "split") return config;
  return { type: "split", direction: "row", children: [config] };
}

export function addLeaf(config: PaneConfig, workspaceId: string): PaneConfig {
  const root = rootSplit(config);
  return { ...root, children: [...root.children, { type: "leaf", workspaceId }], sizes: undefined };
}

export function assignAt(config: PaneConfig, index: number, workspaceId: string): PaneConfig {
  const root = rootSplit(config);
  const children = root.children.map((child, i) =>
    i === index ? ({ type: "leaf", workspaceId } as PaneConfig) : child,
  );
  return { ...root, children };
}

export function removeLeafAt(config: PaneConfig, index: number): PaneConfig {
  const root = rootSplit(config);
  const children = root.children.filter((_, i) => i !== index);
  if (children.length === 1) return children[0]!;
  return { ...root, children, sizes: undefined };
}

export function setDirection(config: PaneConfig, direction: "row" | "col"): PaneConfig {
  const root = rootSplit(config);
  return { ...root, direction };
}

export function setSizes(config: PaneConfig, sizes: number[]): PaneConfig {
  const root = rootSplit(config);
  return { ...root, sizes };
}
