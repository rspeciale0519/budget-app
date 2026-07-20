import type { Bill } from "@prisma/client";
import type {
  DashboardData,
  BillItem,
  CategorySlice,
  ForecastPoint,
  GoalItem,
  DebtItem,
} from "@/lib/mock/dashboard";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { categoryColor, paletteAt } from "@/lib/chart-palette";
import { format, isNegative, money, sum, toCents, type Money } from "@/lib/money";
import { addDays, compare, diffDays, fromDbDate, type CalendarDate } from "@/lib/calendar-date";
import { periodRange, periodLabel, type Period } from "@/services/dashboard/period";
import { billDisplayStatus } from "@/services/bills/bill-status";
import { workspaceMetrics } from "@/services/dashboard/metrics";
import { safeToSpend } from "@/services/dashboard/safe-to-spend";
import { cashflowForecast } from "@/services/dashboard/forecast";
import { categoryBreakdown } from "@/services/dashboard/category-breakdown";
import { budgetVsActual } from "@/services/dashboard/budget-vs-actual";
import { paidVsUnpaid } from "@/services/dashboard/paid-unpaid";
import { listDebts, listGoals } from "@/services/dashboard/planning";
import { upcomingAndOverdue } from "@/services/bill-service";
import { materializeDueWorkspaces } from "@/services/recurring-service";
import { matchSuggestions } from "@/services/match-service";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortLabel(d: CalendarDate): string {
  const p = d.split("-");
  return `${MONTHS[Number(p[1]) - 1]} ${p[2]}`;
}

function iconFor(vendor: string): string {
  const v = vendor.toLowerCase();
  if (/electric|power|energy/.test(v)) return "⚡";
  if (/rent|office|lease/.test(v)) return "🏢";
  if (/payroll|salary|staff/.test(v)) return "👥";
  if (/postage|usps|ship/.test(v)) return "🖨️";
  if (/internet|phone|comcast|verizon/.test(v)) return "🌐";
  if (/water/.test(v)) return "💧";
  return "🧾";
}

function deltaInfo(current: Money, previous: Money, isIncome: boolean): { delta: string; up: boolean } {
  const cur = Number(toCents(current));
  const prev = Number(toCents(previous));
  if (prev === 0) return { delta: "new this period", up: isIncome };
  const pct = Math.round(((cur - prev) / prev) * 100);
  const arrow = pct >= 0 ? "▲" : "▼";
  const good = isIncome ? pct >= 0 : pct <= 0;
  return { delta: `${arrow} ${Math.abs(pct)}% vs last period`, up: good };
}

function mapBill(b: Bill, today: CalendarDate): BillItem {
  const due = fromDbDate(b.dueDate);
  const display = billDisplayStatus(b.status, due, today);
  const suffix =
    compare(due, today) < 0
      ? ` · ${Math.abs(diffDays(today, due))} days ago`
      : b.recurringScheduleId
        ? " · recurring"
        : "";
  return {
    id: b.id,
    vendor: b.vendor,
    amount: format(money(b.amount.toFixed(2))),
    dueLabel: `Due ${shortLabel(due)}${suffix}`,
    status: display.key,
    statusLabel: display.label,
    icon: iconFor(b.vendor),
  };
}

export async function getDashboardData(
  userId: string,
  workspaceId: string,
  period: Period,
  today: CalendarDate,
): Promise<DashboardData> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  await materializeDueWorkspaces(workspaceId, today);

  const { start } = periodRange(period, today);
  const prevAnchor = addDays(start, -1);

  const [cur, prev, sts, forecast, categories, pvu, debts, goals, buckets, accountCount, matches, budgetRows] =
    await Promise.all([
      workspaceMetrics(userId, workspaceId, period, today),
      workspaceMetrics(userId, workspaceId, period, prevAnchor),
      safeToSpend(userId, workspaceId, today),
      cashflowForecast(userId, workspaceId, today, 30),
      categoryBreakdown(userId, workspaceId, period, today),
      paidVsUnpaid(userId, workspaceId, period, today),
      listDebts(userId, workspaceId),
      listGoals(userId, workspaceId),
      upcomingAndOverdue(userId, workspaceId, today),
      rlsClientFor(userId).run((tx) => tx.account.count({ where: { workspaceId } })),
      matchSuggestions(userId, workspaceId, today),
      budgetVsActual(userId, workspaceId, today),
    ]);
  const overspentCount = budgetRows.filter((r) => r.status === "over").length;

  const inDelta = deltaInfo(cur.moneyIn, prev.moneyIn, true);
  const outDelta = deltaInfo(cur.moneyOut, prev.moneyOut, false);

  // Every daily point — no down-sampling, so the "Lowest: $X on <date>" caption
  // always names a point the reader can actually hover to.
  const forecastOut: ForecastPoint[] = forecast.points.map((p) => ({
    date: shortLabel(p.date),
    balance: format(p.balance),
    payday: p.isPayday,
  }));

  const categoriesOut: CategorySlice[] = categories.map((c) => ({
    name: c.name,
    amount: format(c.amount),
    pct: c.pct,
    color: categoryColor(c.categoryId),
  }));

  // Combine overdue + upcoming (dedupe by id), keep due-date order.
  const billMap = new Map<string, Bill>();
  for (const b of [...buckets.overdue, ...buckets.next30]) billMap.set(b.id, b);
  const billsOut: BillItem[] = [...billMap.values()].map((b) => mapBill(b, today));

  const items = sts.unpaidBeforeHorizon.map((u) => ({
    vendor: u.vendor,
    amount: format(u.amount),
    dueDate: shortLabel(u.dueDate),
  }));

  const goalsOut: GoalItem[] = goals.map((g, i) => ({
    name: g.name,
    icon: "🎯",
    target: format(g.target),
    saved: format(g.saved),
    pct: g.pct,
    color: paletteAt(i),
    linked: g.linked,
  }));

  const debtsOut: DebtItem[] = debts.items.map((d) => ({
    name: d.name,
    balance: format(d.balance),
    aprMin: `${d.apr} · min ${format(d.minimum)}`,
    linked: d.linked,
    due: d.due,
  }));

  const billWord = items.length === 1 ? "bill" : "bills";
  const safeNegative = isNegative(sts.result);
  const horizonLabel = shortLabel(sts.horizonDate);
  const safeNote = safeNegative
    ? `Short by ${format(money(sts.result.abs()))} — ${items.length} ${billWord} due before ${horizonLabel}`
    : sts.incomeConfigured
      ? items.length === 0
        ? `no bills due before ${horizonLabel} — the full balance is yours`
        : `after ${items.length} unpaid ${billWord} due before ${horizonLabel}`
      : `after ${items.length} unpaid ${billWord} (next 30 days) · set expected income`;

  return {
    accountCount,
    periodLabel: periodLabel(period),
    overspentCount,
    matchSuggestions: matches,
    kpis: {
      totalBalance: format(cur.totalBalance),
      totalBalanceNote: `across ${accountCount} ${accountCount === 1 ? "account" : "accounts"}`,
      moneyIn: format(cur.moneyIn),
      moneyInDelta: inDelta.delta,
      moneyInUp: inDelta.up,
      moneyOut: format(cur.moneyOut),
      moneyOutDelta: outDelta.delta,
      moneyOutUp: outDelta.up,
      safeToSpend: format(sts.result),
      safeToSpendNote: safeNote,
      safeToSpendNegative: safeNegative,
    },
    safeToSpendMath: {
      availableBalance: format(sts.availableBalance),
      unpaidBeforeIncome: format(sts.unpaidTotal),
      result: format(sts.result),
      items,
      incomeConfigured: sts.incomeConfigured,
    },
    forecast: forecastOut,
    lowestPoint: { date: shortLabel(forecast.lowest.date), balance: format(forecast.lowest.balance) },
    categories: categoriesOut,
    categoriesTotal: format(sum(categories.map((c) => c.amount))),
    bills: billsOut,
    paidVsUnpaid: { paid: format(pvu.paid), unpaid: format(pvu.unpaid), paidPct: pvu.paidPct },
    goals: goalsOut,
    debts: debtsOut,
    debtsTotal: format(debts.total),
  };
}
