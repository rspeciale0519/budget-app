"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaidVsUnpaid, GoalItem, DebtItem } from "@/lib/mock/dashboard";

/** Animated horizontal split bar for paid vs unpaid amounts. */
export function PaidVsUnpaidWidget({ data }: { data: PaidVsUnpaid }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle note="this month">Paid vs. unpaid</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="my-3 flex h-3.5 overflow-hidden rounded-[7px] bg-bg-elev">
          <motion.div
            className="bg-pos"
            initial={{ width: 0 }}
            animate={{ width: `${data.paidPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          <motion.div
            className="bg-neg/60"
            initial={{ width: 0 }}
            animate={{ width: `${100 - data.paidPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.05 }}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-[9px] w-[9px] rounded-sm bg-pos" />
            Paid <b className="text-ink">{data.paid}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-[9px] w-[9px] rounded-sm bg-neg/60" />
            Unpaid <b className="text-ink">{data.unpaid}</b>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Savings goals with animated progress bars. */
export function GoalsWidget({ goals }: { goals: GoalItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {goals.length === 0 && (
          <p className="py-3 text-[12.5px] text-muted">
            No goals yet — add a savings goal to track progress.
          </p>
        )}
        {goals.map((g, i) => (
          <div key={g.name} className={`py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
            <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-ink">
              <span>
                {g.icon} {g.name}
              </span>
              <span className="tabular text-muted">
                {g.saved} / {g.target}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-bg-elev">
              <motion.div
                className="h-full rounded"
                style={{ background: g.color }}
                initial={{ width: 0 }}
                animate={{ width: `${g.pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 22, delay: i * 0.05 }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Tracked debts list. */
export function DebtsWidget({ debts, total }: { debts: DebtItem[]; total: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle note={`total ${total}`}>Debts</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {debts.length === 0 && <p className="py-3 text-[12.5px] text-muted">No debts tracked.</p>}
        {debts.map((d, i) => (
          <div
            key={d.name}
            className={`flex items-center gap-2 py-2.5 text-[13px] ${i > 0 ? "border-t border-line" : ""}`}
          >
            <div>
              <div className="font-semibold text-ink">{d.name}</div>
              <div className="text-[11px] text-muted">{d.aprMin}</div>
            </div>
            <div className="tabular ml-auto font-bold text-ink">{d.balance}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
