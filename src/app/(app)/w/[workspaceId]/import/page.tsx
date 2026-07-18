import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccounts } from "@/services/account-service";
import { listImportBatches } from "@/services/import";
import { ImportWizard } from "@/components/import/import-wizard";
import { ImportHistory } from "@/components/import/import-history";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accounts = (await listAccounts(user.id, workspaceId)).map((a) => ({ id: a.id, name: a.name }));
  const batches = (await listImportBatches(user.id, workspaceId)).map((b) => ({
    id: b.id,
    filename: b.filename,
    rowCount: b.rowCount,
    importedAt: b.importedAt.toISOString().slice(0, 10),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">CSV Import</h1>
      <ImportWizard workspaceId={workspaceId} accounts={accounts} />
      <ImportHistory workspaceId={workspaceId} batches={batches} />
    </div>
  );
}
