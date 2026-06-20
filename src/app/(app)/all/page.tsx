import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AllWorkspacesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">All Workspaces</h1>
      <Card>
        <CardHeader>
          <CardTitle>Consolidated roll-up</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Combined net position with owner-draw netting is wired to live data in Phase 2.
        </CardContent>
      </Card>
    </div>
  );
}
