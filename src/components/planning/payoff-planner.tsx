"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput, Label } from "@/components/ui/field";
import { comparePlans, type PayoffStrategy } from "@/lib/payoff-plan";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface PlannerDebt {
  name: string;
  balance: string; // raw "1234.56"
  apr: string; // raw percent "19.99"
  minimum: string; // raw "50.00"
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Advisory payoff planner over the book's debts — pure client math. */
export function PayoffPlanner({ debts }: { debts: PlannerDebt[] }) {
  const [extra, setExtra] = useState("100");
  const [strategy, setStrategy] = useState<PayoffStrategy>("avalanche");

  const extraNum = Math.max(0, Number(extra.replace(/[$,]/g, "")) || 0);
  const comparison = useMemo(
    () =>
      comparePlans(
        debts.map((d) => ({
          name: d.name,
          balance: money(d.balance),
          apr: money(d.apr),
          minimum: money(d.minimum),
        })),
        extraNum,
      ),
    [debts, extraNum],
  );
  const active = comparison[strategy];

  const toggleCls = (on: boolean) =>
    cn(
      "flex-1 rounded-control border px-2 py-1.5 text-xs font-semibold transition-colors",
      on
        ? "border-ink bg-ink text-paper"
        : "border-rule-strong bg-surface text-muted hover:border-dim hover:text-ink",
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle note="estimates at today's balances">Payoff plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="pp-extra">Extra per month</Label>
            <AmountInput
              id="pp-extra"
              className="w-auto min-w-[7rem]"
              placeholder="100.00"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </div>
          <div className="flex min-w-[14rem] flex-1 gap-1.5" role="group" aria-label="Payoff strategy">
            <button type="button" className={toggleCls(strategy === "avalanche")} onClick={() => setStrategy("avalanche")}>
              Avalanche · highest rate first
            </button>
            <button type="button" className={toggleCls(strategy === "snowball")} onClick={() => setStrategy("snowball")}>
              Snowball · smallest debt first
            </button>
          </div>
        </div>

        {active.ok ? (
          <div className="space-y-1.5 text-sm">
            <p className="text-ink">
              <b className="font-semibold">{active.label}</b>
              {" · about "}
              <b className="tabular font-semibold">{fmt(active.totalInterest)}</b>
              {" in interest."}
              {comparison.avalancheSaves > 0 && (
                <span className="text-muted">
                  {" "}
                  Avalanche saves about{" "}
                  <b className="tabular font-semibold text-credit">{fmt(comparison.avalancheSaves)}</b> vs
                  snowball.
                </span>
              )}
            </p>
            <ol className="list-inside list-decimal text-xs text-muted">
              {active.order.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-sm font-medium text-alert">{active.label}</p>
        )}
      </CardContent>
    </Card>
  );
}
