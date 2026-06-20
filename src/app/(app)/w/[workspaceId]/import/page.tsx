import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccounts } from "@/services/account-service";
import { ImportWizard } from "@/components/import/import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let accounts: { id: string; name: string }[] = [];
  try {
    accounts = (await listAccounts(user.id, workspaceId)).map((a) => ({ id: a.id, name: a.name }));
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">CSV Import</h1>
      <ImportWizard workspaceId={workspaceId} accounts={accounts} />
    </div>
  );
}
