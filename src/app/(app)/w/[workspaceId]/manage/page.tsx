import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { WorkspaceSubNav } from "@/components/workspace/workspace-sub-nav";
import { listAccounts } from "@/services/account-service";
import { listTransactions } from "@/services/transaction-service";
import { ManageForms } from "@/components/manage/manage-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty/empty-state";
import { fromDbDate } from "@/lib/calendar-date";
import { money, format } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let accounts: { id: string; name: string }[] = [];
  let txns: { id: string; date: Date; description: string; amount: { toFixed(n: number): string } }[] = [];
  try {
    accounts = (await listAccounts(user.id, workspaceId)).map((a) => ({ id: a.id, name: a.name }));
    txns = await listTransactions(user.id, workspaceId, { pageSize: 20 });
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <WorkspaceSubNav workspaceId={workspaceId} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Manage</h1>
        <div className="flex gap-2 text-sm">
          <a href={`/w/${workspaceId}/export?type=transactions`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Export transactions
          </a>
          <a href={`/w/${workspaceId}/export?type=bills`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Export bills
          </a>
        </div>
      </div>
      {accounts.length === 0 && (
        <EmptyState
          title="No accounts yet"
          description="Add your first bank or credit account below to start tracking transactions, or import a CSV from your bank."
        />
      )}
      <ManageForms workspaceId={workspaceId} accounts={accounts} />
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {txns.length === 0 ? (
            <p className="text-slate-500">No transactions yet.</p>
          ) : (
            txns.map((t) => (
              <div key={t.id} className="flex justify-between border-b border-slate-100 py-1">
                <span className="text-slate-700">
                  {fromDbDate(t.date)} · {t.description}
                </span>
                <span className="tabular-nums text-slate-900">{format(money(t.amount.toFixed(2)))}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
