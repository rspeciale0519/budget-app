import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  await params;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">CSV Import</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upload → Map → Preview → Commit</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          The import wizard UI wraps the preview→commit→undo pipeline. Pipeline is built and tested;
          the wizard UI lands in Task 29.
        </CardContent>
      </Card>
    </div>
  );
}
