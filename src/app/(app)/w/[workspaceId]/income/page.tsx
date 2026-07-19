import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listIncomeSources } from "@/services/income-source-service";
import { IncomeSourceForm, type IncomeSourceView } from "@/components/income/income-source-form";
import { PageHeading } from "@/components/ui/page-heading";
import { fromDbDate } from "@/lib/calendar-date";

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

  return (
    <div className="space-y-4">
      <PageHeading>Expected income</PageHeading>
      <IncomeSourceForm workspaceId={workspaceId} sources={sources} />
    </div>
  );
}
