import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccounts } from "@/services/account-service";
import { listTransactions } from "@/services/transaction-service";
import { listCategories } from "@/services/category-service";
import { listRules } from "@/services/category-rule-service";
import { listRecurringSchedules } from "@/services/recurring-service";
import { RecurringCard, type RecurringView } from "@/components/manage/recurring-card";
import { ManageForms } from "@/components/manage/manage-forms";
import { CategoryManager } from "@/components/manage/category-form";
import { RulesCard, type RuleView } from "@/components/manage/rules-card";
import { TransferForm } from "@/components/manage/transfer-form";
import { ExportPanel } from "@/components/manage/export-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { fromDbDate } from "@/lib/calendar-date";
import { formatDate } from "@/lib/format-date";
import { money, format } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = { title: "Accounts & bills" };

export default async function ManagePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accounts = (await listAccounts(user.id, workspaceId)).map((a) => ({ id: a.id, name: a.name }));
  const { rows: txns } = await listTransactions(user.id, workspaceId, { pageSize: 20 });
  const categories = (await listCategories(user.id, workspaceId)).map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
  }));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const rules: RuleView[] = (await listRules(user.id, workspaceId)).map((r) => ({
    id: r.id,
    pattern: r.pattern,
    categoryName: categoryName.get(r.categoryId) ?? "a category",
  }));
  const recurring: RecurringView[] = (await listRecurringSchedules(user.id, workspaceId)).map((s) => ({
    id: s.id,
    vendor: s.vendor,
    amount: s.amount,
    frequencyLabel: s.frequencyLabel,
    nextDueDate: s.nextDueDate,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading>Accounts &amp; bills</PageHeading>
        <ExportPanel workspaceId={workspaceId} />
      </div>
      {accounts.length === 0 && (
        <EmptyState
          title="No accounts yet"
          description="Add your first bank or credit account below to start tracking transactions, or import a CSV from your bank."
        />
      )}
      <CategoryManager workspaceId={workspaceId} categories={categories} />
      <RulesCard workspaceId={workspaceId} rules={rules} />
      <ManageForms workspaceId={workspaceId} accounts={accounts} />
      <RecurringCard workspaceId={workspaceId} schedules={recurring} />
      <TransferForm workspaceId={workspaceId} accounts={accounts} />
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {txns.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Add one above, or import a CSV from your bank."
              action={
                <a
                  href={`/w/${workspaceId}/import`}
                  className="inline-flex h-9 items-center justify-center rounded-control border border-rule-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-dim hover:bg-raised"
                >
                  Import CSV
                </a>
              }
            />
          ) : (
            txns.map((t) => (
              <div key={t.id} className="flex justify-between border-b border-rule py-1">
                <span className="text-ink/85">
                  {formatDate(fromDbDate(t.date))} · {t.description}
                </span>
                <span className="tabular-nums text-ink">{format(money(t.amount.toFixed(2)))}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
