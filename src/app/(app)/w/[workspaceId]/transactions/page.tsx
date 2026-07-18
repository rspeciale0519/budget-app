import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listTransactions } from "@/services/transaction-service";
import { listAccounts } from "@/services/account-service";
import { listCategories } from "@/services/category-service";
import { fromDbDate } from "@/lib/calendar-date";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Transactions" };

const PAGE_SIZE = 50;

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ q?: string; account?: string; category?: string; page?: string; filter?: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, account, category, page, filter } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? 1) || 1);

  const [result, uncategorized, accounts, categories] = await Promise.all([
    listTransactions(user.id, workspaceId, {
      search: q,
      accountId: account,
      categoryId: category,
      uncategorized: filter === "uncategorized",
      page: pageNum,
      pageSize: PAGE_SIZE,
    }),
    listTransactions(user.id, workspaceId, { uncategorized: true, pageSize: 1 }),
    listAccounts(user.id, workspaceId),
    listCategories(user.id, workspaceId),
  ]);

  return (
    <TransactionsView
      workspaceId={workspaceId}
      rows={result.rows.map((t) => ({
        id: t.id,
        date: fromDbDate(t.date),
        description: t.description,
        merchant: t.merchant,
        amount: t.amount.toFixed(2),
        categoryId: t.categoryId,
        isTransfer: t.isTransfer,
      }))}
      total={result.total}
      page={pageNum}
      pageSize={PAGE_SIZE}
      uncategorizedCount={uncategorized.total}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
      filters={{ q: q ?? "", account: account ?? "", category: category ?? "", filter: filter ?? "" }}
    />
  );
}
