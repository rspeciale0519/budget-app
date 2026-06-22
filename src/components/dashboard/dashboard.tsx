"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markBillPaidStandaloneAction } from "@/app/(app)/w/[workspaceId]/_actions";
import { MatchSuggestions } from "@/components/match/match-suggestions";
import type { DashboardData, BillItem } from "@/lib/mock/dashboard";

const TAG: Record<BillItem["status"], string> = {
  overdue: "bg-[#fee2e2] text-[#b91c1c]",
  soon: "bg-[#fef3c7] text-[#b45309]",
  scheduled: "bg-[#e0e7ff] text-[#4338ca]",
  paid: "bg-[#dcfce7] text-[#15803d]",
};

function num(money: string): number {
  return Number(money.replace(/[$,]/g, ""));
}

function ForecastChart({ data }: { data: DashboardData }) {
  const W = 560;
  const H = 150;
  const vals = data.forecast.map((p) => num(p.balance));
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min || 1;
  const pts = data.forecast.map((p, i) => {
    const x = (i / (data.forecast.length - 1)) * W;
    const y = 12 + (1 - (num(p.balance) - min) / range) * 108;
    return { x, y, largeBill: p.largeBill };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg className="mt-2 h-[150px] w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16a34a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[36, 74, 112].map((y) => (
        <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#eef0f3" />
      ))}
      <path d={area} fill="url(#forecastFill)" />
      <path d={line} fill="none" stroke="#16a34a" strokeWidth="2.5" />
      {pts
        .filter((p) => p.largeBill)
        .map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#dc2626" />
        ))}
    </svg>
  );
}

function CategoryDonut({ data }: { data: DashboardData }) {
  const slices = data.categories.map((c, i) => {
    const before = data.categories.slice(0, i).reduce((sum, x) => sum + x.pct, 0);
    return { ...c, dash: `${c.pct} ${100 - c.pct}`, offset: 25 - before };
  });
  return (
    <div className="mt-2 flex items-center gap-[18px]">
      <svg width="132" height="132" viewBox="0 0 42 42" aria-hidden>
        <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#eef0f3" strokeWidth="6" />
        {slices.map((s) => (
          <circle
            key={s.name}
            cx="21"
            cy="21"
            r="15.9155"
            fill="none"
            stroke={s.color}
            strokeWidth="6"
            strokeDasharray={s.dash}
            strokeDashoffset={s.offset}
          />
        ))}
        <text x="21" y="20.5" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#1a1d24">
          {data.categoriesTotal}
        </text>
        <text x="21" y="25.5" textAnchor="middle" fontSize="2.8" fill="#6b7280">
          out
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {data.categories.map((c) => (
          <span key={c.name} className="flex items-center gap-2 text-xs text-[#374151]">
            <i className="inline-block h-[9px] w-[9px] rounded-sm" style={{ background: c.color }} />
            {c.name} <b className="ml-1 text-ink">{c.amount}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  delta,
  deltaUp,
}: {
  label: string;
  value: string;
  note?: string;
  delta?: string;
  deltaUp?: boolean;
}) {
  return (
    <Card className="px-[17px] py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.03em] text-muted">{label}</div>
      <div className="tabular mt-2 text-2xl font-extrabold text-ink">{value}</div>
      {delta ? (
        <div className={`mt-1.5 text-xs font-semibold ${deltaUp ? "text-pos" : "text-neg"}`}>
          {delta}
        </div>
      ) : note ? (
        <div className="mt-1.5 text-xs text-muted">{note}</div>
      ) : null}
    </Card>
  );
}

export function SafeToSpendPanel({
  math,
  workspaceId,
}: {
  math: DashboardData["safeToSpendMath"];
  workspaceId?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 text-sm text-[#374151]">
        <p className="mb-2 font-semibold text-ink">How safe-to-spend is calculated</p>
        <div className="flex justify-between border-b border-line py-1">
          <span>Available balance</span>
          <span className="tabular">{math.availableBalance}</span>
        </div>
        {math.items.length === 0 ? (
          <div className="flex justify-between border-b border-line py-1 text-muted">
            <span>No unpaid bills before the next income</span>
            <span className="tabular">$0.00</span>
          </div>
        ) : (
          math.items.map((item, i) => (
            <div key={i} className="flex justify-between border-b border-line py-1 pl-3 text-muted">
              <span>
                − {item.vendor} <span className="text-[11px]">· due {item.dueDate}</span>
              </span>
              <span className="tabular">{item.amount}</span>
            </div>
          ))
        )}
        <div className="flex justify-between border-b border-line py-1">
          <span>= Unpaid before next income</span>
          <span className="tabular">{math.unpaidBeforeIncome}</span>
        </div>
        <div className="flex justify-between py-1 font-semibold text-ink">
          <span>= Safe to spend</span>
          <span className="tabular">{math.result}</span>
        </div>
        {!math.incomeConfigured && (
          <p className="mt-2 text-xs text-muted">
            Using a 30-day window.{" "}
            {workspaceId ? (
              <Link href={`/w/${workspaceId}/income`} className="font-semibold text-blue underline">
                Set expected income
              </Link>
            ) : (
              <span className="font-semibold">Set expected income</span>
            )}{" "}
            for a sharper number.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard({ data, workspaceId }: { data: DashboardData; workspaceId?: string }) {
  const [showMath, setShowMath] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const router = useRouter();

  async function payBill(billId: string) {
    if (!workspaceId) return;
    setPaying(billId);
    const result = await markBillPaidStandaloneAction(workspaceId, billId);
    setPaying(null);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total balance" value={data.kpis.totalBalance} note={data.kpis.totalBalanceNote} />
        <Kpi label="Money in · MTD" value={data.kpis.moneyIn} delta={data.kpis.moneyInDelta} deltaUp={data.kpis.moneyInUp} />
        <Kpi label="Money out · MTD" value={data.kpis.moneyOut} delta={data.kpis.moneyOutDelta} deltaUp={data.kpis.moneyOutUp} />
        <button
          type="button"
          onClick={() => setShowMath((v) => !v)}
          className="rounded-[14px] border border-[#bbf7d0] bg-gradient-to-b from-[#ecfdf3] to-white px-[17px] py-4 text-left shadow-card"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.03em] text-[#15803d]">
            Safe to spend ⓘ
          </div>
          <div className="tabular mt-2 text-2xl font-extrabold text-[#15803d]">
            {data.kpis.safeToSpend}
          </div>
          <div className="mt-1.5 text-xs text-muted">{data.kpis.safeToSpendNote}</div>
        </button>
      </div>

      {showMath && <SafeToSpendPanel math={data.safeToSpendMath} workspaceId={workspaceId} />}

      {workspaceId && <MatchSuggestions workspaceId={workspaceId} suggestions={data.matchSuggestions} />}

      {/* Two-column main */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle note="next 30 days">Cash-flow forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart data={data} />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#374151]">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[9px] w-[9px] rounded-sm bg-pos" />
                  Projected balance
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[9px] w-[9px] rounded-sm bg-neg" />
                  Large bill due
                </span>
                <span className="text-muted">
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
              <CategoryDonut data={data} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle note="next 30 days">Upcoming &amp; overdue</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {data.bills.map((b, i) => (
                <div
                  key={b.vendor}
                  className={`flex items-center gap-3 py-[11px] ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <div className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#f1f3f6] text-[15px]">
                    {b.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{b.vendor}</div>
                    <div className="text-xs text-muted">{b.dueLabel}</div>
                  </div>
                  <span
                    className={`ml-auto rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.03em] ${TAG[b.status]}`}
                  >
                    {b.statusLabel}
                  </span>
                  <div className="tabular text-[13.5px] font-bold text-ink">{b.amount}</div>
                  <Button
                    variant="outline"
                    className="px-2 py-1 text-[11.5px]"
                    disabled={!workspaceId || paying === b.id}
                    onClick={() => payBill(b.id)}
                  >
                    {paying === b.id ? "…" : "Mark paid"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle note="this month">Paid vs. unpaid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="my-3 flex h-3.5 overflow-hidden rounded-[7px]">
                <div className="bg-pos" style={{ width: `${data.paidVsUnpaid.paidPct}%` }} />
                <div className="bg-[#fca5a5]" style={{ width: `${100 - data.paidVsUnpaid.paidPct}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#374151]">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[9px] w-[9px] rounded-sm bg-pos" />
                  Paid <b className="text-ink">{data.paidVsUnpaid.paid}</b>
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[9px] w-[9px] rounded-sm bg-[#fca5a5]" />
                  Unpaid <b className="text-ink">{data.paidVsUnpaid.unpaid}</b>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {data.goals.map((g, i) => (
                <div key={g.name} className={`py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
                  <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-ink">
                    <span>
                      {g.icon} {g.name}
                    </span>
                    <span className="tabular text-muted">
                      {g.saved} / {g.target}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-[#eef0f3]">
                    <div className="h-full rounded" style={{ width: `${g.pct}%`, background: g.color }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle note={`total ${data.debtsTotal}`}>Debts</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {data.debts.map((d, i) => (
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
        </div>
      </div>
    </div>
  );
}
