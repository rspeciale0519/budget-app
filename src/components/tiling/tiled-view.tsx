"use client";

import { Fragment } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import type { PaneConfig } from "@/lib/zod/layout";
import type { PaneSummary } from "@/services/dashboard/pane-summary";
import { collectWorkspaceIds } from "@/lib/pane-tree";
import { PaneCard, PanePlaceholder } from "@/components/tiling/pane-card";

type Summaries = Record<string, PaneSummary>;

function Leaf({ workspaceId, summaries }: { workspaceId: string; summaries: Summaries }) {
  const summary = summaries[workspaceId];
  return summary ? <PaneCard summary={summary} /> : <PanePlaceholder />;
}

function Split({
  node,
  summaries,
  onLayout,
}: {
  node: Extract<PaneConfig, { type: "split" }>;
  summaries: Summaries;
  onLayout?: (sizes: number[]) => void;
}) {
  const handleCls = node.direction === "row" ? "w-1.5" : "h-1.5";
  const defaultLayout = node.sizes
    ? Object.fromEntries(node.sizes.map((s, i) => [String(i), s]))
    : undefined;
  return (
    <Group
      orientation={node.direction === "row" ? "horizontal" : "vertical"}
      defaultLayout={defaultLayout}
      onLayoutChange={
        onLayout && ((layout) => onLayout(node.children.map((_, i) => layout[String(i)] ?? 0)))
      }
      className="h-full"
    >
      {node.children.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <Separator
              className={`${handleCls} rounded bg-rule transition-colors hover:bg-now`}
            />
          )}
          <Panel id={String(i)} minSize={12} className="overflow-auto p-1">
            {child.type === "leaf" ? (
              <Leaf workspaceId={child.workspaceId} summaries={summaries} />
            ) : (
              <Split node={child} summaries={summaries} />
            )}
          </Panel>
        </Fragment>
      ))}
    </Group>
  );
}

/** Desktop: a resizable pane tree. Below lg: a stacked single column (the
 * tiling is a desktop-only enhancement). */
export function TiledView({
  config,
  summaries,
  onSizesChange,
  revision = 0,
}: {
  config: PaneConfig;
  summaries: Summaries;
  onSizesChange?: (sizes: number[]) => void;
  /** Bump to remount the tree so saved `sizes` re-apply (the panel library
   * only reads `defaultLayout` at mount). Never bump on drag. */
  revision?: number;
}) {
  const leaves = collectWorkspaceIds(config);
  return (
    <>
      <div key={revision} className="hidden h-[70vh] lg:block">
        {config.type === "leaf" ? (
          <Leaf workspaceId={config.workspaceId} summaries={summaries} />
        ) : (
          <Split node={config} summaries={summaries} onLayout={onSizesChange} />
        )}
      </div>
      <div className="space-y-4 lg:hidden">
        {leaves.map((id) => (
          <div key={id} className="min-h-[180px]">
            <Leaf workspaceId={id} summaries={summaries} />
          </div>
        ))}
      </div>
    </>
  );
}
