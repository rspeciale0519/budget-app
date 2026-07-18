import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { budgetVsActual } from "@/services/dashboard/budget-vs-actual";
import { listCategories } from "@/services/category-service";
import { today as todayFn } from "@/lib/calendar-date";
import { BudgetView } from "@/components/budget/budget-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Budget" };

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [rows, categories] = await Promise.all([
    budgetVsActual(user.id, workspaceId, todayFn()),
    listCategories(user.id, workspaceId),
  ]);
  const expense = categories
    .filter((c) => c.kind === "expense")
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink">Budget vs. actual</h1>
      <BudgetView workspaceId={workspaceId} rows={rows} categories={expense} />
    </div>
  );
}
