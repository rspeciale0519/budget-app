import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, add, sub, compare, type Money } from "@/lib/money";
import { addDays, fromDbDate, toUtcDate, compare as cmpDate, type CalendarDate } from "@/lib/calendar-date";
import { projectIncome } from "@/services/dashboard/income-projection";

export interface ForecastPoint {
  date: CalendarDate;
  balance: Money;
  /** An expected-income event lands on this day. */
  isPayday: boolean;
}

export interface CashflowForecast {
  points: ForecastPoint[];
  lowest: ForecastPoint;
  incomeConfigured: boolean;
}

export async function cashflowForecast(
  userId: string,
  workspaceId: string,
  today: CalendarDate,
  horizonDays = 30,
): Promise<CashflowForecast> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  return rlsClientFor(userId).run(async (tx) => {
    const accAgg = await tx.account.aggregate({ where: { workspaceId }, _sum: { openingBalance: true } });
    const txAgg = await tx.transaction.aggregate({ where: { workspaceId }, _sum: { amount: true } });
    let balance = add(
      money(accAgg._sum.openingBalance?.toFixed(2) ?? "0"),
      money(txAgg._sum.amount?.toFixed(2) ?? "0"),
    );

    const end = addDays(today, horizonDays);
    const bills = await tx.bill.findMany({
      where: {
        workspaceId,
        status: { in: ["unpaid", "scheduled", "overdue"] },
        dueDate: { gte: toUtcDate(today), lt: toUtcDate(addDays(end, 1)) },
      },
    });
    const incomeEvents = await projectIncome(tx, workspaceId, today, addDays(end, 1));
    const incomeConfigured = (await tx.incomeSource.count({ where: { workspaceId } })) > 0;

    // Per-day net delta: bills are outflows (amount positive → subtract), income adds.
    const deltas = new Map<string, Money>();
    const bump = (date: CalendarDate, signed: Money) => {
      deltas.set(date, add(deltas.get(date) ?? money(0), signed));
    };
    for (const b of bills) bump(fromDbDate(b.dueDate), sub(money(0), money(b.amount.toFixed(2))));
    const incomeDates = new Set<string>();
    for (const e of incomeEvents) {
      bump(e.date, e.amount);
      incomeDates.add(e.date);
    }

    const points: ForecastPoint[] = [];
    let lowest: ForecastPoint | null = null;
    for (let d: CalendarDate = today; cmpDate(d, end) <= 0; d = addDays(d, 1)) {
      balance = add(balance, deltas.get(d) ?? money(0));
      const point = { date: d, balance, isPayday: incomeDates.has(d) };
      points.push(point);
      if (lowest === null || compare(balance, lowest.balance) < 0) lowest = point;
    }

    return { points, lowest: lowest ?? { date: today, balance, isPayday: false }, incomeConfigured };
  });
}
