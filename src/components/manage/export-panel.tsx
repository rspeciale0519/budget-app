"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui/field";

/** Optional date range for both export links; blank means "everything". */
export function ExportPanel({ workspaceId }: { workspaceId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function href(type: "transactions" | "bills") {
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/w/${workspaceId}/export?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      <div className="space-y-1">
        <Label htmlFor="export-from">From (optional)</Label>
        <Input id="export-from" type="date" className="h-8 text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="export-to">To (optional)</Label>
        <Input id="export-to" type="date" className="h-8 text-xs" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <a href={href("transactions")} className="rounded-control border border-rule px-3 py-1.5 hover:bg-raised">
        Export transactions
      </a>
      <a href={href("bills")} className="rounded-control border border-rule px-3 py-1.5 hover:bg-raised">
        Export bills
      </a>
    </div>
  );
}
