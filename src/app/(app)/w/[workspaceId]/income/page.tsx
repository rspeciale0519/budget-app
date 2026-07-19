import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listIncomeSources } from "@/services/income-source-service";
import { projectIncome } from "@/services/dashboard/income-projection";
import { rlsClientFor } from "@/lib/prisma-rls";
import { IncomeSourceForm, type IncomeSourceView } from "@/components/income/income-source-form";
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

  return (
    <div className="space-y-4">
      <PageHeading>Expected income</PageHeading>
      <IncomeSourceForm workspaceId={workspaceId} sources={sources} nextPaydays={nextPaydays} />
    </div>
  );
}
