import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccounts } from "@/services/account-service";
import { listTransactions } from "@/services/transaction-service";
import { ManageForms } from "@/components/manage/manage-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fromDbDate } from "@/lib/calendar-date";

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
      <h1 className="text-xl font-semibold text-slate-900">Manage</h1>
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
                <span className="tabular-nums text-slate-900">${t.amount.toFixed(2)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
