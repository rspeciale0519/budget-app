import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { assertWorkspaceAccess } from "@/services/authz";
import { getWorkspace } from "@/services/workspace-service";
import { WorkspaceSubNav } from "@/components/workspace/workspace-sub-nav";
import { WorkspaceBreadcrumb } from "@/components/workspace/workspace-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) return {};
  const ws = await getWorkspace(user.id, workspaceId).catch(() => null);
  if (!ws) return {};
  return { title: { template: `%s · ${ws.name} — Ledger`, default: ws.name } };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ws = await getWorkspace(user.id, workspaceId).catch(() => null);
  if (!ws) {
    return (
      <div className="py-16">
        <Card>
          <CardContent className="space-y-4 py-10 text-center text-sm text-muted">
            <p>You don&apos;t have access to this book.</p>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-control border border-rule-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-dim hover:bg-raised"
            >
              Back to your books
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeLabel = ws.type.charAt(0).toUpperCase() + ws.type.slice(1);
  const isAdmin = await assertWorkspaceAccess(user.id, workspaceId, "admin")
    .then(() => true)
    .catch(() => false);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-control text-[15px] font-bold text-white shadow-lift"
          style={{ background: ws.color }}
        >
          {ws.name.charAt(0).toUpperCase() || "B"}
        </div>
        <div>
          <Link href={`/w/${workspaceId}`} className="hover:underline">
            <h1 className="font-serif text-[22px] leading-tight tracking-[-0.01em] text-ink">
              {ws.name}
              <WorkspaceBreadcrumb workspaceId={workspaceId} />
            </h1>
          </Link>
          <div className="text-xs font-medium uppercase tracking-[0.06em] text-dim">
            {typeLabel}
          </div>
        </div>
      </div>
      <WorkspaceSubNav workspaceId={workspaceId} showActivity={isAdmin} />
      {children}
    </div>
  );
}
