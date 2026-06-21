"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PaneConfig } from "@/lib/zod/layout";
import type { SavedLayout } from "@/services/layout-service";
import type { WorkspaceOption } from "@/components/tiling/tiles-client";

const selectCls = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
const inputCls = "rounded-md border border-slate-300 px-3 py-1.5 text-sm";

function rootChildren(config: PaneConfig): PaneConfig[] {
  return config.type === "split" ? config.children : [config];
}

export interface LayoutControlsProps {
  workspaces: WorkspaceOption[];
  layouts: SavedLayout[];
  config: PaneConfig;
  busy?: boolean;
  onAddPane: (workspaceId: string) => void;
  onRemovePane: (index: number) => void;
  onAssign: (index: number, workspaceId: string) => void;
  onToggleDirection: () => void;
  onSave: (name: string) => void;
  onRestore: (layoutId: string) => void;
  onDelete: (layoutId: string) => void;
}

export function LayoutControls({
  workspaces,
  layouts,
  config,
  busy,
  onAddPane,
  onRemovePane,
  onAssign,
  onToggleDirection,
  onSave,
  onRestore,
  onDelete,
}: LayoutControlsProps) {
  const [name, setName] = useState("");
  const [restoreId, setRestoreId] = useState("");
  const children = rootChildren(config);
  const direction = config.type === "split" ? config.direction : "row";
  const firstWs = workspaces[0]?.id ?? "";

  return (
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted">Panes</span>
        {children.map((child, i) => (
          <div key={i} className="flex items-center gap-1">
            <select
              aria-label={`Pane ${i + 1} workspace`}
              className={selectCls}
              value={child.type === "leaf" ? child.workspaceId : ""}
              disabled={busy}
              onChange={(e) => onAssign(i, e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs"
              disabled={busy || children.length <= 1}
              onClick={() => onRemovePane(i)}
              title="Remove pane"
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          className="px-2 py-1 text-xs"
          disabled={busy || !firstWs}
          onClick={() => onAddPane(firstWs)}
        >
          + Add pane
        </Button>
        <Button variant="outline" className="px-2 py-1 text-xs" disabled={busy} onClick={onToggleDirection}>
          {direction === "row" ? "⬍ Stack as column" : "⬌ Arrange as row"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <input
          aria-label="Layout name"
          className={inputCls}
          placeholder="Layout name"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          variant="primary"
          className="px-3 py-1.5 text-xs"
          disabled={busy || name.trim() === ""}
          onClick={() => {
            onSave(name.trim());
            setName("");
          }}
        >
          Save layout
        </Button>

        <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.04em] text-muted">Restore</span>
        <select
          aria-label="Saved layouts"
          className={selectCls}
          value={restoreId}
          disabled={busy || layouts.length === 0}
          onChange={(e) => setRestoreId(e.target.value)}
        >
          <option value="">{layouts.length === 0 ? "No saved layouts" : "Select a layout…"}</option>
          {layouts.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="px-3 py-1.5 text-xs"
          disabled={busy || restoreId === ""}
          onClick={() => onRestore(restoreId)}
        >
          Restore
        </Button>
        <Button
          variant="ghost"
          className="px-2 py-1.5 text-xs text-neg"
          disabled={busy || restoreId === ""}
          onClick={() => {
            onDelete(restoreId);
            setRestoreId("");
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
