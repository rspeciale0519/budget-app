import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { budgetVsActual } from "@/services/dashboard/budget-vs-actual";
import { listBudgets } from "@/services/budget-service";
import { listCategories } from "@/services/category-service";
import { projectIncome } from "@/services/dashboard/income-projection";
import { periodRange } from "@/services/dashboard/period";
import { rlsClientFor } from "@/lib/prisma-rls";
import { today as todayFn, calendarDate } from "@/lib/calendar-date";
import { MONTHS, parseYm, shiftMonth } from "@/lib/month-nav";
import { money, add, sub, format, isNegative, sum } from "@/lib/money";
import { BudgetView, type BudgetSummary } from "@/components/budget/budget-view";
import { MonthYearPicker } from "@/components/chrome/month-year-picker";

export const dynamic = "force-dynamic";

export const metadata = { title: "Budget" };

const navCls =
  "rounded-control border border-rule bg-surface px-3 py-1.5 text-sm font-medium text-ink/85 transition-colors hover:border-dim hover:bg-raised";

export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { ym } = await searchParams;
  const today = todayFn();
  const { year, month } = parseYm(ym, today);
  const monthDate = calendarDate(`${year}-${String(month).padStart(2, "0")}-01`);
  const { start, end } = periodRange("month", monthDate);

  const [rows, categories, budgets, incomeEvents] = await Promise.all([
    budgetVsActual(user.id, workspaceId, monthDate),
    listCategories(user.id, workspaceId),
    listBudgets(user.id, workspaceId),
    rlsClientFor(user.id).run((tx) => projectIncome(tx, workspaceId, start, end)),
  ]);
  const expense = categories
    .filter((c) => c.kind === "expense")
    .map((c) => ({ id: c.id, name: c.name }));

  const totalBudgeted = budgets.reduce((acc, b) => add(acc, b.amount), money(0));
  const expectedIncome = sum(incomeEvents.map((e) => e.amount));
  const left = sub(expectedIncome, totalBudgeted);
  const summary: BudgetSummary = {
    totalBudgeted: format(totalBudgeted),
    expectedIncome: format(expectedIncome),
    incomeConfigured: incomeEvents.length > 0,
    unbudgeted: format(isNegative(left) ? sub(money(0), left) : left),
    overCommitted: isNegative(left),
    overspentCount: rows.filter((r) => r.status === "over").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink">
            Budget — {MONTHS[month - 1] ?? ""} {year}
          </h1>
          <p className="text-sm text-muted">
            Give each category a monthly limit, then watch spending fill the bar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthYearPicker basePath={`/w/${workspaceId}/budget`} year={year} month={month} />
          <Link href={`/w/${workspaceId}/budget?ym=${shiftMonth(year, month, -1)}`} className={navCls}>
            ← Prev
          </Link>
          <Link href={`/w/${workspaceId}/budget`} className={navCls}>
            Today
          </Link>
          <Link href={`/w/${workspaceId}/budget?ym=${shiftMonth(year, month, 1)}`} className={navCls}>
            Next →
          </Link>
        </div>
      </div>
      <BudgetView workspaceId={workspaceId} rows={rows} categories={expense} summary={summary} />
    </div>
  );
}
