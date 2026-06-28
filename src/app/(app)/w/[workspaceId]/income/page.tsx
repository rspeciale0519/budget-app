import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listIncomeSources } from "@/services/income-source-service";
import { IncomeSourceForm, type IncomeSourceView } from "@/components/income/income-source-form";
import { fromDbDate } from "@/lib/calendar-date";

export const dynamic = "force-dynamic";

export default async function IncomePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let sources: IncomeSourceView[] = [];
  try {
    sources = (await listIncomeSources(user.id, workspaceId)).map((s) => ({
      id: s.id,
      name: s.name,
      amount: s.amount.toFixed(2),
      frequency: s.frequency,
      nextDate: fromDbDate(s.nextDate),
    }));
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Expected Income</h1>
      <IncomeSourceForm workspaceId={workspaceId} sources={sources} />
    </div>
  );
}
