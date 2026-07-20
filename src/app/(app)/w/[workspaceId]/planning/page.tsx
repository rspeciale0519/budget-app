import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listGoals, listDebts } from "@/services/dashboard/planning";
import { listAccounts } from "@/services/account-service";
import { goalOnTrack } from "@/lib/goal-insight";
import { debtPayoff } from "@/lib/debt-payoff";
import { today as todayFn } from "@/lib/calendar-date";
import { format } from "@/lib/money";
import { GoalsPanel, type GoalRow, type AccountOption } from "@/components/planning/goals-panel";
import { DebtsPanel, type DebtRow } from "@/components/planning/debts-panel";
import { PageHeading } from "@/components/ui/page-heading";

export const dynamic = "force-dynamic";

export const metadata = { title: "Goals & debts" };

const GOAL_ACCOUNT_TYPES = ["savings", "checking", "cash"];
const DEBT_ACCOUNT_TYPES = ["credit_card", "loan"];

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [goals, debtsData, accounts] = await Promise.all([
    listGoals(user.id, workspaceId),
    listDebts(user.id, workspaceId),
    listAccounts(user.id, workspaceId),
  ]);
  const today = todayFn();
  const nameById = new Map(accounts.map((a) => [a.id, a.name]));

  const goalAccounts: AccountOption[] = accounts
    .filter((a) => GOAL_ACCOUNT_TYPES.includes(a.type))
    .map((a) => ({ id: a.id, name: a.name }));
  const debtAccounts: AccountOption[] = accounts
    .filter((a) => DEBT_ACCOUNT_TYPES.includes(a.type))
    .map((a) => ({ id: a.id, name: a.name }));

  const goalRows: GoalRow[] = goals.map((g) => {
    const insight = goalOnTrack({ saved: g.saved, target: g.target, targetDate: g.targetDate, today });
    return {
      id: g.id,
      name: g.name,
      target: format(g.target),
      saved: format(g.saved),
      pct: g.pct,
      linked: g.linked,
      accountName: g.accountId ? (nameById.get(g.accountId) ?? null) : null,
      reached: insight.reached,
      insight: insight.label,
      targetRaw: g.target.toFixed(2),
    };
  });

  const debtRows: DebtRow[] = debtsData.items.map((d) => {
    const payoff = debtPayoff({ balance: d.balance, apr: d.aprValue, minimumPayment: d.minimum });
    return {
      id: d.id,
      name: d.name,
      balance: format(d.balance),
      apr: d.apr,
      minimum: format(d.minimum),
      dueDay: d.dueDay,
      linked: d.linked,
      accountName: d.accountId ? (nameById.get(d.accountId) ?? null) : null,
      payoff: payoff.label,
      minimumRaw: d.minimum.toFixed(2),
    };
  });

  return (
    <div className="space-y-4">
      <PageHeading>Goals &amp; debts</PageHeading>
      <GoalsPanel workspaceId={workspaceId} goals={goalRows} accounts={goalAccounts} />
      <DebtsPanel
        workspaceId={workspaceId}
        debts={debtRows}
        total={format(debtsData.total)}
        accounts={debtAccounts}
      />
    </div>
  );
}
