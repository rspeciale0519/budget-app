"use client";

import { useState, useTransition } from "react";
import { TiledView } from "@/components/tiling/tiled-view";
import { LayoutControls } from "@/components/tiling/layout-controls";
import { addLeaf, removeLeafAt, assignAt, setDirection, setSizes, collectWorkspaceIds } from "@/lib/pane-tree";
import {
  paneSummariesAction,
  saveLayoutAction,
  deleteLayoutAction,
} from "@/app/(app)/tiles/_actions";
import { PageHeading } from "@/components/ui/page-heading";
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
  const [summaries, setSummaries] = useState<Record<string, PaneSummary>>(initialSummaries);
  const [saved, setSaved] = useState<SavedLayout[]>(layouts);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [pending, startTransition] = useTransition();

  /** Apply a config from a control action (add/remove/assign/toggle/restore):
   * remount the tree so its `sizes` re-apply, then fetch any missing summaries.
   * (Drag resizes go through `setConfig` directly — no remount.) */
  function applyConfig(next: PaneConfig) {
    setConfig(next);
    setRevision((v) => v + 1);
    const missing = collectWorkspaceIds(next).filter((id) => !summaries[id]);
    if (missing.length === 0) return;
    startTransition(async () => {
      try {
        const fetched = await paneSummariesAction(missing);
        setSummaries((prev) => ({ ...prev, ...fetched }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load pane");
      }
    });
  }

  function handleSave(name: string) {
    startTransition(async () => {
      try {
        const layout = await saveLayoutAction(name, config);
        setSaved((prev) => [...prev.filter((l) => l.name !== layout.name), layout]);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function handleRestore(layoutId: string) {
    const layout = saved.find((l) => l.id === layoutId);
    if (layout) applyConfig(layout.config);
  }

  function handleDelete(layoutId: string) {
    startTransition(async () => {
      try {
        await deleteLayoutAction(layoutId);
        setSaved((prev) => prev.filter((l) => l.id !== layoutId));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <PageHeading>Side by side</PageHeading>
      <LayoutControls
        workspaces={workspaces}
        layouts={saved}
        config={config}
        busy={pending}
        onAddPane={(wsId) => applyConfig(addLeaf(config, wsId))}
        onRemovePane={(i) => applyConfig(removeLeafAt(config, i))}
        onAssign={(i, wsId) => applyConfig(assignAt(config, i, wsId))}
        onToggleDirection={() =>
          applyConfig(setDirection(config, config.type === "split" && config.direction === "row" ? "col" : "row"))
        }
        onSave={handleSave}
        onRestore={handleRestore}
        onDelete={handleDelete}
      />
      {error && <p className="text-sm text-alert">{error}</p>}
      <TiledView
        config={config}
        summaries={summaries}
        revision={revision}
        onSizesChange={(s) => setConfig((c) => setSizes(c, s))}
      />
    </div>
  );
}
