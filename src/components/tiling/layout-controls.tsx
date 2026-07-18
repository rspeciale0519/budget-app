"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import type { PaneConfig } from "@/lib/zod/layout";
import type { SavedLayout } from "@/services/layout-service";
import type { WorkspaceOption } from "@/components/tiling/tiles-client";

const EYEBROW = "text-[10px] font-semibold uppercase tracking-[0.06em] text-muted";

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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const children = rootChildren(config);
  const direction = config.type === "split" ? config.direction : "row";
  const firstWs = workspaces[0]?.id ?? "";

  return (
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={EYEBROW}>Panes</span>
        {children.map((child, i) => (
          <div key={i} className="flex items-center gap-1">
            <Select
              aria-label={`Pane ${i + 1} workspace`}
              className="h-8 w-auto min-w-[8rem] text-xs"
              value={child.type === "leaf" ? child.workspaceId : ""}
              disabled={busy}
              onChange={(e) => onAssign(i, e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || children.length <= 1}
              onClick={() => onRemovePane(i)}
              title="Remove pane"
            >
              ✕
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" disabled={busy || !firstWs} onClick={() => onAddPane(firstWs)}>
          + Add pane
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={onToggleDirection}>
          {direction === "row" ? "⬍ Stack as column" : "⬌ Arrange as row"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3">
        <Input
          aria-label="Layout name"
          className="h-8 w-auto min-w-[9rem] flex-1 text-xs"
          placeholder="Layout name"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={busy || name.trim() === ""}
          onClick={() => {
            onSave(name.trim());
            setName("");
          }}
        >
          Save layout
        </Button>

        <span className={`ml-2 ${EYEBROW}`}>Restore</span>
        <Select
          aria-label="Saved layouts"
          className="h-8 w-auto min-w-[9rem] text-xs"
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
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || restoreId === ""}
          onClick={() => onRestore(restoreId)}
        >
          Restore
        </Button>
        <Button
          variant={confirmingDelete ? "danger" : "ghost"}
          size="sm"
          className={confirmingDelete ? undefined : "text-alert"}
          disabled={busy || restoreId === ""}
          onClick={() => {
            if (!confirmingDelete) {
              setConfirmingDelete(true);
              return;
            }
            setConfirmingDelete(false);
            onDelete(restoreId);
            setRestoreId("");
          }}
          onBlur={() => setConfirmingDelete(false)}
        >
          {confirmingDelete ? "Delete?" : "Delete"}
        </Button>
      </div>
    </Card>
  );
}
