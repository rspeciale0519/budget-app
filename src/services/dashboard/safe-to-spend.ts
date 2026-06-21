import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, add, sub, sum, type Money } from "@/lib/money";
import { addDays, fromDbDate, isBefore, type CalendarDate } from "@/lib/calendar-date";
import { projectIncome, nextIncomeEvent } from "@/services/dashboard/income-projection";

export interface UnpaidItem {
  vendor: string;
  amount: Money;
  dueDate: CalendarDate;
}

export interface SafeToSpend {
  result: Money;
  availableBalance: Money;
  horizonDate: CalendarDate;
  incomeConfigured: boolean;
  incomeSourceName: string | null;
  unpaidBeforeHorizon: UnpaidItem[];
  unpaidTotal: Money;
}

const NO_INCOME_HORIZON_DAYS = 30;

/**
 * Safe-to-spend = available balance − unpaid bills due before the next expected
 * income. Horizon comes from the shared income-projection helper; with no
 * income configured it falls back to a 30-day window (incomeConfigured=false so
 * the UI can hint), keeping the number traceable rather than silently fake.
 */
export async function safeToSpend(
  userId: string,
  workspaceId: string,
  today: CalendarDate,
): Promise<SafeToSpend> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  return rlsClientFor(userId).run(async (tx) => {
    const accAgg = await tx.account.aggregate({ where: { workspaceId }, _sum: { openingBalance: true } });
    const txAgg = await tx.transaction.aggregate({ where: { workspaceId }, _sum: { amount: true } });
    const availableBalance = add(
      money(accAgg._sum.openingBalance?.toFixed(2) ?? "0"),
      money(txAgg._sum.amount?.toFixed(2) ?? "0"),
    );

    const events = await projectIncome(tx, workspaceId, today, addDays(today, 90));
    const next = nextIncomeEvent(events, today);
    const incomeConfigured = next !== null;
    const horizonDate = next?.date ?? addDays(today, NO_INCOME_HORIZON_DAYS);

    const openBills = await tx.bill.findMany({
      where: { workspaceId, status: { in: ["unpaid", "scheduled", "overdue"] } },
      orderBy: { dueDate: "asc" },
    });
    const unpaidBeforeHorizon: UnpaidItem[] = openBills
      .filter((b) => isBefore(fromDbDate(b.dueDate), horizonDate))
      .map((b) => ({ vendor: b.vendor, amount: money(b.amount.toFixed(2)), dueDate: fromDbDate(b.dueDate) }));
    const unpaidTotal = sum(unpaidBeforeHorizon.map((b) => b.amount));

    return {
      result: sub(availableBalance, unpaidTotal),
      availableBalance,
      horizonDate,
      incomeConfigured,
      incomeSourceName: next?.sourceName ?? null,
      unpaidBeforeHorizon,
      unpaidTotal,
    };
  });
}
