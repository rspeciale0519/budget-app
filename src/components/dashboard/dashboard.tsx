"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/ui/status-tag";
import { ForecastChart, type ForecastPoint } from "@/components/dashboard/forecast-chart";
import { markBillPaidStandaloneAction, markBillUnpaidAction } from "@/app/(app)/w/[workspaceId]/_actions";
import { MatchSuggestions } from "@/components/match/match-suggestions";
import { FirstRun } from "@/components/dashboard/first-run";
import { useToast } from "@/components/ui/toast";
import type { DashboardData } from "@/lib/mock/dashboard";

function num(money: string): number {
  return Number(money.replace(/[$,]/g, ""));
}

function CategoryDonut({ data }: { data: DashboardData }) {
  const slices = data.categories.map((c, i) => {
    const before = data.categories.slice(0, i).reduce((s, x) => s + x.pct, 0);
    return { ...c, dash: `${c.pct} ${100 - c.pct}`, offset: 25 - before };
  });
  return (
    <div className="flex items-center gap-5">
      <svg width="128" height="128" viewBox="0 0 42 42" aria-hidden>
        <circle cx="21" cy="21" r="15.9155" fill="none" className="stroke-rule" strokeWidth="5" />
        {slices.map((s) => (
          <circle
            key={s.name}
            cx="21"
            cy="21"
            r="15.9155"
            fill="none"
            stroke={s.color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={s.dash}
            strokeDashoffset={s.offset}
            transform="rotate(-90 21 21)"
          />
        ))}
        <text
          x="21"
          y="20.6"
          textAnchor="middle"
          fontSize="5"
          fontWeight="700"
          className="tabular fill-ink"
        >
          {data.categoriesTotal}
        </text>
        <text x="21" y="25.5" textAnchor="middle" fontSize="2.6" className="fill-muted uppercase">
          out
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {data.categories.length === 0 ? (
          <p className="max-w-[240px] text-xs leading-relaxed text-muted">
            Nothing categorized this period. Give transactions a category and the
            breakdown fills in.
          </p>
        ) : (
          data.categories.map((c) => (
            <span key={c.name} className="flex items-center gap-2 text-xs text-muted">
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
              {c.name} <b className="tabular ml-1 text-ink">{c.amount}</b>
            </span>
          ))
        )}
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
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{label}</div>
      <div className="tabular mt-2 text-[26px] font-semibold leading-none text-ink">{value}</div>
      {delta ? (
        <div className={`mt-2 text-xs font-medium ${deltaUp ? "text-credit" : "text-debit"}`}>
          {delta}
        </div>
      ) : note ? (
        <div className="mt-2 text-xs text-muted">{note}</div>
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
  const resultNegative = math.result.trim().startsWith("-");
  return (
    <Card>
      <CardContent className="text-sm text-ink/85">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          How safe-to-spend is calculated
        </p>
        <div className="flex justify-between border-b border-rule py-1.5">
          <span>Available balance (all accounts)</span>
          <span className="tabular text-ink">{math.availableBalance}</span>
        </div>
        {math.items.length === 0 ? (
          <div className="flex justify-between border-b border-rule py-1.5 text-muted">
            <span>No unpaid bills before the next income</span>
            <span className="tabular">$0.00</span>
          </div>
        ) : (
          math.items.map((item, i) => (
            <div key={i} className="flex justify-between border-b border-rule py-1.5 pl-3 text-muted">
              <span>
                − {item.vendor} <span className="text-[11px]">· due {item.dueDate}</span>
              </span>
              <span className="tabular text-debit">{item.amount}</span>
            </div>
          ))
        )}
        <div className="flex justify-between border-b border-rule py-1.5">
          <span>{math.incomeConfigured ? "= Unpaid before next income" : "= Unpaid in the next 30 days"}</span>
          <span className="tabular text-ink">{math.unpaidBeforeIncome}</span>
        </div>
        <div className="flex justify-between py-1.5 font-semibold text-ink">
          <span>= Safe to spend</span>
          <span className={`tabular ${resultNegative ? "text-alert" : "text-credit"}`}>{math.result}</span>
        </div>
        {!math.incomeConfigured && (
          <p className="mt-3 text-xs text-muted">
            Using a 30-day window.{" "}
            {workspaceId ? (
              <Link href={`/w/${workspaceId}/income`} className="font-semibold text-now hover:underline">
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
  const { toast } = useToast();

  const forecastPoints: ForecastPoint[] = data.forecast.map((p) => ({
    label: p.date,
    value: num(p.balance),
    display: p.balance,
    payday: p.payday,
  }));
  const stsNeg = data.kpis.safeToSpendNegative;

  if (data.accountCount === 0 && workspaceId) {
    return <FirstRun workspaceId={workspaceId} />;
  }

  async function payBill(billId: string) {
    if (!workspaceId) return;
    setPaying(billId);
    const openCount = data.bills.length;
    const result = await markBillPaidStandaloneAction(workspaceId, billId);
    setPaying(null);
    if (result.ok) {
      const message = openCount <= 1 ? "That was the last one — all bills paid this month" : "Paid ✓";
      toast(message, {
        actionLabel: "Undo",
        onAction: async () => {
          await markBillUnpaidAction(workspaceId, billId);
          router.refresh();
        },
      });
      router.refresh();
    } else {
      toast(result.error ?? "Could not mark that bill paid — try again.", { kind: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total balance" value={data.kpis.totalBalance} note={data.kpis.totalBalanceNote} />
        <Kpi
          label={`Money in · ${data.periodLabel}`}
          value={data.kpis.moneyIn}
          delta={data.kpis.moneyInDelta}
          deltaUp={data.kpis.moneyInUp}
        />
        <Kpi
          label={`Money out · ${data.periodLabel}`}
          value={data.kpis.moneyOut}
          delta={data.kpis.moneyOutDelta}
          deltaUp={data.kpis.moneyOutUp}
        />
        {/* The one figure the whole app exists to answer, so it gets the accent.
            When it goes negative it flips to the alert tone — the app's most
            important warning must never wear the success color. */}
        <button
          type="button"
          onClick={() => setShowMath((v) => !v)}
          aria-expanded={showMath}
          className={`group relative overflow-hidden rounded-card border p-4 text-left transition-colors ${
            stsNeg
              ? "border-alert/40 bg-alert-tint/50 hover:border-alert/60 hover:bg-alert-tint/70"
              : "border-credit/30 bg-credit-tint/40 hover:border-credit/50 hover:bg-credit-tint/70"
          }`}
        >
          <div
            className={`flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.07em] ${
              stsNeg ? "text-alert" : "text-credit"
            }`}
          >
            <span>Safe to spend</span>
            <span
              className={`text-[10px] transition-transform duration-200 ${showMath ? "rotate-180" : ""}`}
              aria-hidden
            >
              ▾
            </span>
          </div>
          <div
            className={`tabular mt-2 text-[26px] font-semibold leading-none ${
              stsNeg ? "text-alert" : "text-credit"
            }`}
          >
            {data.kpis.safeToSpend}
          </div>
          <div className={`mt-2 text-xs ${stsNeg ? "text-alert/80" : "text-muted"}`}>
            {data.kpis.safeToSpendNote}
          </div>
        </button>
      </div>

      {showMath && <SafeToSpendPanel math={data.safeToSpendMath} workspaceId={workspaceId} />}

      {workspaceId && data.overspentCount > 0 && (
        <Link
          href={`/w/${workspaceId}/budget`}
          className="flex items-center justify-between gap-2 rounded-card border border-alert/30 bg-alert-tint/40 px-4 py-2.5 text-sm transition-colors hover:bg-alert-tint/60"
        >
          <span className="font-medium text-alert">
            {data.overspentCount} {data.overspentCount === 1 ? "category is" : "categories are"} over
            budget
          </span>
          <span className="whitespace-nowrap text-xs font-semibold text-alert">Cover it →</span>
        </Link>
      )}

      {workspaceId && <MatchSuggestions workspaceId={workspaceId} suggestions={data.matchSuggestions} />}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle note="next 30 days">Cash-flow forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart points={forecastPoints} lowestLabel={data.lowestPoint.balance} />
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2 w-2 rounded-sm bg-credit" />
                  Projected balance
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2 w-2 rounded-full bg-ink/70" />
                  Lowest point
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-credit" aria-hidden>
                    ▲
                  </span>
                  Payday
                </span>
                <span className="ml-auto">
                  Lowest: <b className="tabular text-ink">{data.lowestPoint.balance}</b> on{" "}
                  {data.lowestPoint.date}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle note={data.periodLabel}>Spending by category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryDonut data={data} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle note="next 30 days">Upcoming &amp; overdue</CardTitle>
            </CardHeader>
            <CardContent className="py-1.5">
              {data.bills.length === 0 &&
                (data.paidVsUnpaid.paid !== "$0.00" ? (
                  <p className="py-2 text-sm font-medium text-credit">
                    All caught up — every bill this month is paid ✓
                  </p>
                ) : (
                  <p className="py-2 text-sm text-muted">
                    Nothing due. Add bills in Accounts &amp; bills and they&apos;ll show up here with
                    due dates.
                  </p>
                ))}
              {data.bills.map((b, i) => (
                <div
                  key={b.vendor}
                  className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-rule" : ""}`}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-raised text-[13px] font-semibold text-muted">
                    {b.vendor.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{b.vendor}</div>
                    <div className="text-xs text-muted">{b.dueLabel}</div>
                  </div>
                  <StatusTag status={b.status} className="ml-auto">
                    {b.statusLabel}
                  </StatusTag>
                  <div className="tabular text-[13.5px] font-semibold text-ink">{b.amount}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
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
              <CardTitle note={data.periodLabel}>Paid vs. unpaid</CardTitle>
            </CardHeader>
            <CardContent>
              {/* No bills at all → an empty track, not a full "unpaid" bar. A bar
                  that's 100% gold when nothing is owed reads as a warning. */}
              {data.paidVsUnpaid.paid === "$0.00" && data.paidVsUnpaid.unpaid === "$0.00" ? (
                <>
                  <div className="mb-3 h-3 rounded-full bg-raised" />
                  <p className="text-xs text-muted">No bills {data.periodLabel} — nothing to pay yet.</p>
                </>
              ) : (
                <>
                  {data.paidVsUnpaid.paidPct === 100 && (
                    <p className="mb-2 text-xs font-semibold text-credit">100% paid this month ✓</p>
                  )}
                  <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-raised">
                    <div className="bg-credit" style={{ width: `${data.paidVsUnpaid.paidPct}%` }} />
                    <div className="bg-debit" style={{ width: `${100 - data.paidVsUnpaid.paidPct}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <i className="inline-block h-2 w-2 rounded-sm bg-credit" />
                      Paid <b className="tabular text-ink">{data.paidVsUnpaid.paid}</b>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="inline-block h-2 w-2 rounded-sm bg-debit" />
                      Unpaid <b className="tabular text-ink">{data.paidVsUnpaid.unpaid}</b>
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
            </CardHeader>
            <CardContent className="py-1.5">
              {data.goals.length === 0 &&
                (workspaceId ? (
                  <Link
                    href={`/w/${workspaceId}/planning`}
                    className="block py-3 text-[12.5px] font-medium text-now hover:underline"
                  >
                    Set a savings goal →
                  </Link>
                ) : (
                  <p className="py-3 text-[12.5px] text-muted">
                    No goals yet — add a savings goal to track progress.
                  </p>
                ))}
              {data.goals.map((g, i) => (
                <div key={g.name} className={`py-3 ${i > 0 ? "border-t border-rule" : ""}`}>
                  <div className="mb-2 flex justify-between text-[13px] font-semibold text-ink">
                    <span>
                      {g.name}
                      {g.linked && <span className="ml-1 text-[10px] font-normal text-dim">· linked</span>}
                    </span>
                    <span className="tabular font-medium text-muted">
                      {g.saved} / {g.target}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                    <div
                      className={`h-full rounded-full ${g.pct >= 100 ? "bg-credit" : "bg-now"}`}
                      style={{ width: `${Math.min(g.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle note={`total ${data.debtsTotal}`}>Debts</CardTitle>
            </CardHeader>
            <CardContent className="py-1.5">
              {data.debts.length === 0 &&
                (workspaceId ? (
                  <Link
                    href={`/w/${workspaceId}/planning`}
                    className="block py-3 text-[12.5px] font-medium text-now hover:underline"
                  >
                    Track a debt →
                  </Link>
                ) : (
                  <p className="py-3 text-[12.5px] text-muted">No debts tracked.</p>
                ))}
              {data.debts.map((d, i) => (
                <div
                  key={d.name}
                  className={`flex items-center gap-2 py-3 text-[13px] ${i > 0 ? "border-t border-rule" : ""}`}
                >
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      {d.name}
                      {d.due && <StatusTag status={d.due.key}>{d.due.label}</StatusTag>}
                    </div>
                    <div className="text-[11px] text-muted">
                      {d.aprMin}
                      {d.linked ? " · linked" : ""}
                    </div>
                  </div>
                  <div className="tabular ml-auto font-semibold text-ink">{d.balance}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
