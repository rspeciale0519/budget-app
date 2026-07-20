"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format-date";
import { cancelRecurringBillAction } from "@/app/(app)/w/[workspaceId]/_actions";

export interface RecurringView {
  id: string;
  vendor: string;
  amount: string;
  frequencyLabel: string;
  nextDueDate: string;
}

function Row({ workspaceId, schedule }: { workspaceId: string; schedule: RecurringView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function cancel() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setBusy(true);
    const res = await cancelRecurringBillAction(workspaceId, schedule.id);
    setBusy(false);
    if (res.ok) {
      toast(`${schedule.vendor} won't repeat anymore — upcoming unpaid bills were removed.`);
      router.refresh();
    } else {
      toast(res.error ?? "Could not stop that repeating bill.", { kind: "error" });
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule py-2 text-sm last:border-b-0">
      <span className="text-ink/85">
        <b className="font-semibold text-ink">{schedule.vendor}</b>
        {" · "}
        <span className="tabular">{schedule.amount}</span>
        {" · "}
        {schedule.frequencyLabel}
        {" · next "}
        {formatDate(schedule.nextDueDate)}
      </span>
      <Button
        variant={confirming ? "danger" : "ghost"}
        size="sm"
        disabled={busy}
        onBlur={() => setConfirming(false)}
        onClick={cancel}
        title="Future unpaid bills from this schedule are removed; past and paid ones stay"
      >
        {busy ? "Stopping…" : confirming ? "Remove future bills?" : "Stop repeating"}
      </Button>
    </div>
  );
}

export function RecurringCard({
  workspaceId,
  schedules,
}: {
  workspaceId: string;
  schedules: RecurringView[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repeating bills</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {schedules.length === 0 ? (
          <p className="py-2 text-muted">
            Nothing repeats yet — set a bill to &ldquo;Repeats monthly&rdquo; above and it&apos;ll
            appear here.
          </p>
        ) : (
          schedules.map((s) => <Row key={s.id} workspaceId={workspaceId} schedule={s} />)
        )}
      </CardContent>
    </Card>
  );
}
