"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, BillItem } from "@/lib/mock/dashboard";

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-emerald-300 bg-emerald-50" : undefined}>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${accent ? "text-emerald-700" : "text-slate-900"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function statusStyle(status: BillItem["status"]): { dot: string; label: string } {
  if (status === "overdue") return { dot: "bg-red-500", label: "Overdue" };
  if (status === "paid") return { dot: "bg-emerald-500", label: "Paid" };
  return { dot: "bg-amber-500", label: "Unpaid" };
}

export function Dashboard({ data }: { data: DashboardData }) {
  const [showMath, setShowMath] = useState(false);
  const maxForecast = Math.max(...data.forecast.map((p) => Number(p.balance.replace(/[$,]/g, ""))));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total balance" value={data.kpis.totalBalance} />
        <Kpi label="Money in" value={data.kpis.moneyIn} />
        <Kpi label="Money out" value={data.kpis.moneyOut} />
        <button type="button" onClick={() => setShowMath((v) => !v)} className="text-left">
          <Kpi label="Safe to spend ⓘ" value={data.kpis.safeToSpend} accent />
        </button>
      </div>

      {showMath && (
        <Card>
          <CardContent className="pt-4 text-sm text-slate-700">
            <p className="mb-2 font-medium text-slate-900">How safe-to-spend is calculated</p>
            <div className="flex justify-between border-b border-slate-100 py-1">
              <span>Available balance</span>
              <span className="tabular-nums">{data.safeToSpendMath.availableBalance}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1">
              <span>− Unpaid bills due before next income</span>
              <span className="tabular-nums">{data.safeToSpendMath.unpaidBeforeIncome}</span>
            </div>
            <div className="flex justify-between py-1 font-semibold text-slate-900">
              <span>= Safe to spend</span>
              <span className="tabular-nums">{data.safeToSpendMath.result}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash-flow forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-2">
              {data.forecast.map((p) => {
                const v = Number(p.balance.replace(/[$,]/g, ""));
                const isLow = p.date === data.lowestPoint.date;
                return (
                  <div key={p.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${isLow ? "bg-red-400" : "bg-slate-300"}`}
                      style={{ height: `${Math.max(8, (v / maxForecast) * 100)}%` }}
                    />
                    <span className="text-[10px] text-slate-500">{p.date}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-red-600">
              ⚠ Projected low point: {data.lowestPoint.balance} on {data.lowestPoint.date}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.categories.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="tabular-nums text-slate-900">{c.amount}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-slate-400" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming &amp; overdue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.bills.map((b) => {
              const s = statusStyle(b.status);
              return (
                <div key={b.vendor} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
                    <span className="text-slate-700">{b.vendor}</span>
                    <span className="text-xs text-slate-400">{s.label} · {b.dueDate}</span>
                  </span>
                  <span className="tabular-nums text-slate-900">{b.amount}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.goals.map((g) => (
              <div key={g.name}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{g.name}</span>
                  <span className="tabular-nums text-slate-500">
                    {g.saved} / {g.target}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-emerald-400" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.debts.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{d.name}</span>
                <span className="tabular-nums text-slate-900">
                  {d.balance}
                  <span className="ml-2 text-xs text-slate-400">{d.apr} · min {d.minimum}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
