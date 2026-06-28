"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchSuggestions } from "@/components/match/match-suggestions";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { BillsWidget } from "@/components/dashboard/bills-widget";
import {
  PaidVsUnpaidWidget,
  GoalsWidget,
  DebtsWidget,
} from "@/components/dashboard/side-widgets";
import { SafeToSpendPanel } from "@/components/dashboard/safe-to-spend-panel";
import type { DashboardData } from "@/lib/mock/dashboard";

// Re-exported for tests and existing imports.
export { SafeToSpendPanel } from "@/components/dashboard/safe-to-spend-panel";

export function Dashboard({ data, workspaceId }: { data: DashboardData; workspaceId?: string }) {
  const [showMath, setShowMath] = useState(false);

  return (
    <div className="space-y-4">
      <KpiRow kpis={data.kpis} showMath={showMath} onToggleMath={() => setShowMath((v) => !v)} />

      <AnimatePresence initial={false}>
        {showMath && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <SafeToSpendPanel math={data.safeToSpendMath} workspaceId={workspaceId} />
          </motion.div>
        )}
      </AnimatePresence>

      {workspaceId && (
        <MatchSuggestions workspaceId={workspaceId} suggestions={data.matchSuggestions} />
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle note="next 30 days">Cash-flow forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart data={data.forecast} />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[9px] w-[9px] rounded-sm bg-pos" />
                  Projected balance
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[9px] w-[9px] rounded-sm bg-neg" />
                  Large bill due
                </span>
                <span>
                  Lowest point: <b className="text-ink">{data.lowestPoint.balance}</b> on{" "}
                  {data.lowestPoint.date}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle note="this month">Spending by category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryDonut categories={data.categories} total={data.categoriesTotal} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <BillsWidget bills={data.bills} workspaceId={workspaceId} />
          <PaidVsUnpaidWidget data={data.paidVsUnpaid} />
          <GoalsWidget goals={data.goals} />
          <DebtsWidget debts={data.debts} total={data.debtsTotal} />
        </div>
      </div>
    </div>
  );
}
