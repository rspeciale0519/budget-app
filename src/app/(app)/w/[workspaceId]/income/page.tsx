import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listIncomeSources } from "@/services/income-source-service";
import { projectIncome } from "@/services/dashboard/income-projection";
import { rlsClientFor } from "@/lib/prisma-rls";
import { getWorkspace } from "@/services/workspace-service";
import { assertWorkspaceAccess, listAccessibleWorkspaces } from "@/services/authz";
import { listAccounts } from "@/services/account-service";
import { IncomeSourceForm, type IncomeSourceView } from "@/components/income/income-source-form";
import { PayYourselfCard, type PayTargetBook } from "@/components/income/pay-yourself-card";
import { PageHeading } from "@/components/ui/page-heading";
import { fromDbDate, today as todayFn, addDays } from "@/lib/calendar-date";
import { formatDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export const metadata = { title: "Income" };

export default async function IncomePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sources: IncomeSourceView[] = (await listIncomeSources(user.id, workspaceId)).map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount.toFixed(2),
    frequency: s.frequency,
    nextDate: fromDbDate(s.nextDate),
  }));

  const now = todayFn();
  const events = await rlsClientFor(user.id).run((tx) =>
    projectIncome(tx, workspaceId, now, addDays(now, 92)),
  );
  const nextPaydays = events.slice(0, 3).map((e) => formatDate(e.date));

  // "Pay yourself" targets: for a BUSINESS book, the user's OTHER books where
  // they are admin (owner-draw needs admin on both sides), personal books first.
  const ws = await getWorkspace(user.id, workspaceId).catch(() => null);
  let payTargets: PayTargetBook[] = [];
  let fromAccounts: { id: string; name: string }[] = [];
  if (ws?.type === "business") {
    const others = (await listAccessibleWorkspaces(user.id)).filter((w) => w.id !== workspaceId);
    const adminOthers = (
      await Promise.all(
        others.map(async (w) => {
          const isAdmin = await assertWorkspaceAccess(user.id, w.id, "admin")
            .then(() => true)
            .catch(() => false);
          return isAdmin ? [w] : [];
        }),
      )
    ).flat();
    adminOthers.sort((a, b) => (a.type === b.type ? 0 : a.type === "personal" ? -1 : 1));
    payTargets = await Promise.all(
      adminOthers.map(async (w) => ({
        id: w.id,
        name: w.name,
        accounts: (await listAccounts(user.id, w.id)).map((a) => ({ id: a.id, name: a.name })),
      })),
    );
    payTargets = payTargets.filter((t) => t.accounts.length > 0);
    fromAccounts = (await listAccounts(user.id, workspaceId)).map((a) => ({ id: a.id, name: a.name }));
  }

  return (
    <div className="space-y-4">
      <PageHeading>Expected income</PageHeading>
      {ws?.type === "business" && payTargets.length > 0 && fromAccounts.length > 0 && (
        <PayYourselfCard workspaceId={workspaceId} targets={payTargets} fromAccounts={fromAccounts} />
      )}
      <IncomeSourceForm workspaceId={workspaceId} sources={sources} nextPaydays={nextPaydays} />
    </div>
  );
}
