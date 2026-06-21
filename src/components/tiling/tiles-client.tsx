"use client";

import { useState } from "react";
import { TiledView } from "@/components/tiling/tiled-view";
import { setSizes } from "@/lib/pane-tree";
import type { PaneConfig } from "@/lib/zod/layout";
import type { PaneSummary } from "@/services/dashboard/pane-summary";
import type { SavedLayout } from "@/services/layout-service";

export interface WorkspaceOption {
  id: string;
  name: string;
  color: string;
}

export interface TilesClientProps {
  workspaces: WorkspaceOption[];
  layouts: SavedLayout[];
  initialConfig: PaneConfig;
  initialSummaries: Record<string, PaneSummary>;
}

export function TilesClient({ workspaces, layouts, initialConfig, initialSummaries }: TilesClientProps) {
  const [config, setConfig] = useState<PaneConfig>(initialConfig);
  const [summaries] = useState<Record<string, PaneSummary>>(initialSummaries);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="my-[22px] text-xl font-bold text-ink">Tiles</h1>
        <span className="text-[11.5px] text-muted">
          {workspaces.length} workspaces · {layouts.length} saved layouts
        </span>
      </div>
      <TiledView
        config={config}
        summaries={summaries}
        onSizesChange={(s) => setConfig((c) => setSizes(c, s))}
      />
    </div>
  );
}
