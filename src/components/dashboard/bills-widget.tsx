"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCelebration } from "@/lib/motion/use-celebration";
import { markBillPaidStandaloneAction } from "@/app/(app)/w/[workspaceId]/_actions";
import type { BillItem } from "@/lib/mock/dashboard";

const TAG: Record<BillItem["status"], string> = {
  overdue: "bg-neg/15 text-neg",
  soon: "bg-amber/15 text-amber",
  scheduled: "bg-primary/15 text-primary",
  paid: "bg-pos/15 text-pos",
};

/** Upcoming & overdue bills with an optimistic "Mark paid" + confetti reward. */
export function BillsWidget({
  bills,
  workspaceId,
}: {
  bills: BillItem[];
  workspaceId?: string;
}) {
  const [paying, setPaying] = useState<string | null>(null);
  const [paid, setPaid] = useState<Set<string>>(new Set());
  const router = useRouter();
  const celebrate = useCelebration();

  async function payBill(billId: string) {
    if (!workspaceId) return;
    setPaying(billId);
    const result = await markBillPaidStandaloneAction(workspaceId, billId);
    setPaying(null);
    if (result.ok) {
      setPaid((prev) => new Set(prev).add(billId));
      celebrate();
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle note="next 30 days">Upcoming &amp; overdue</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <AnimatePresence initial={false}>
          {bills.map((b, i) => (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className={`flex items-center gap-3 py-[11px] ${i > 0 ? "border-t border-line" : ""}`}
            >
              <div className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-bg-elev text-[15px]">
                {b.icon}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-ink">{b.vendor}</div>
                <div className="text-xs text-muted">{b.dueLabel}</div>
              </div>
              <span
                className={`ml-auto rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.03em] ${
                  paid.has(b.id) ? TAG.paid : TAG[b.status]
                }`}
              >
                {paid.has(b.id) ? "Paid" : b.statusLabel}
              </span>
              <div className="tabular text-[13.5px] font-bold text-ink">{b.amount}</div>
              <Button
                variant="outline"
                className="h-auto whitespace-nowrap px-2 py-1 text-[11.5px]"
                disabled={!workspaceId || paying === b.id || paid.has(b.id)}
                onClick={() => payBill(b.id)}
              >
                {paying === b.id ? "…" : paid.has(b.id) ? "Done" : "Mark paid"}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
