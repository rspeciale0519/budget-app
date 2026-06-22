"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMatchAction } from "@/app/(app)/w/[workspaceId]/_actions";
import type { MatchSuggestion } from "@/services/match-service";

export function MatchSuggestions({
  workspaceId,
  suggestions,
}: {
  workspaceId: string;
  suggestions: MatchSuggestion[];
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const visible = suggestions.filter((s) => !dismissed.has(s.billId));
  if (visible.length === 0) return null;

  function confirm(s: MatchSuggestion) {
    startTransition(async () => {
      const res = await confirmMatchAction(workspaceId, s.billId, s.transactionId);
      if (res.ok) router.refresh();
    });
  }

  function dismiss(billId: string) {
    setDismissed((prev) => new Set(prev).add(billId));
  }

  return (
    <div className="space-y-2">
      {visible.map((s) => (
        <div
          key={s.billId}
          className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2.5 text-[13px] text-[#92400e]"
        >
          <span className="min-w-0 flex-1">
            💡 An imported transaction <b>“{s.txnDescription} {s.txnAmount}”</b> on {s.txnDate} looks like your bill{" "}
            <b>“{s.vendor}.”</b> Mark it paid?
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(s)}
            className="rounded-md bg-[#16a34a] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#15803d] disabled:opacity-50"
          >
            Yes, match
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => dismiss(s.billId)}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            No
          </button>
        </div>
      ))}
    </div>
  );
}
