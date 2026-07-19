"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { undoImportAction } from "@/app/(app)/w/[workspaceId]/import/_actions";

export interface BatchView {
  id: string;
  filename: string;
  rowCount: number;
  importedAt: string;
  account?: string;
}

export function ImportHistory({
  workspaceId,
  batches,
}: {
  workspaceId: string;
  batches: BatchView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (batches.length === 0) return null;

  async function undo(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    setConfirmingId(null);
    setBusyId(id);
    const res = await undoImportAction(workspaceId, id);
    setBusyId(null);
    if (res.ok) {
      toast("Import undone — those transactions were removed");
      router.refresh();
    } else {
      toast(res.error ?? "Could not undo that import.", { kind: "error" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Past imports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {batches.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 border-b border-rule py-1.5 last:border-b-0">
            <span className="min-w-0 truncate text-ink/85">
              {b.filename} · {b.rowCount} row{b.rowCount === 1 ? "" : "s"}
              {b.account ? <> · into {b.account}</> : null} ·{" "}
              <span className="text-muted">{b.importedAt}</span>
            </span>
            <Button
              variant={confirmingId === b.id ? "danger" : "ghost"}
              size="sm"
              disabled={busyId === b.id}
              onClick={() => undo(b.id)}
              onBlur={() => setConfirmingId(null)}
            >
              {busyId === b.id ? "Undoing…" : confirmingId === b.id ? "Undo?" : "Undo"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
