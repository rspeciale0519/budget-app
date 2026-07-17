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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = suggestions.filter((s) => !dismissed.has(s.billId));
  if (visible.length === 0) return null;

  function confirm(s: MatchSuggestion) {
    setError(null);
    startTransition(async () => {
      const res = await confirmMatchAction(workspaceId, s.billId, s.transactionId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not mark this bill paid.");
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
          className="flex flex-wrap items-center gap-2 rounded-card border border-debit/40 bg-debit-tint px-3.5 py-2.5 text-[13px] text-debit"
        >
          <span className="min-w-0 flex-1">
            💡 An imported transaction <b>“{s.txnDescription} {s.txnAmount}”</b> on {s.txnDate} looks like your bill{" "}
            <b>“{s.vendor}.”</b> Mark it paid?
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(s)}
            className="rounded-control bg-credit px-3 py-1.5 text-xs font-semibold text-paper transition-colors hover:opacity-85 disabled:opacity-50"
          >
            Yes, match
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => dismiss(s.billId)}
            className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink/85 transition-colors hover:bg-raised disabled:opacity-50"
          >
            No
          </button>
        </div>
      ))}
      {error && <p className="text-xs font-semibold text-alert">{error}</p>}
    </div>
  );
}
