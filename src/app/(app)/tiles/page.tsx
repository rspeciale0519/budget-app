import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccessibleWorkspaces, getUserPrimaryOrgMembership } from "@/services/authz";
import { listLayouts, getLayout } from "@/services/layout-service";
import { paneSummaries } from "@/services/dashboard/pane-summary";
import { defaultLayout, collectWorkspaceIds } from "@/lib/pane-tree";
import { today as todayFn } from "@/lib/calendar-date";
import type { PaneConfig } from "@/lib/zod/layout";
import { TilesClient } from "@/components/tiling/tiles-client";
import { EmptyState } from "@/components/empty/empty-state";
import { PageHeading } from "@/components/ui/page-heading";

export const dynamic = "force-dynamic";

export const metadata = { title: "Side by side" };

export default async function TilesPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = await getUserPrimaryOrgMembership(user.id);
  if (!membership) redirect("/");

  const workspaces = await listAccessibleWorkspaces(user.id);
  const layouts = await listLayouts(user.id, membership.organizationId);
  const isAdmin = ["owner", "admin"].includes(membership.role);

  if (workspaces.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeading>Side by side</PageHeading>
        <EmptyState
          title="Nothing to show yet"
          description={
            isAdmin
              ? "Side by side shows several books at once. Create a book with the + button in the top bar."
              : "Side by side shows several books at once. Ask the book owner to add you to more books."
          }
        />
      </div>
    );
  }

  const { layout: layoutId } = await searchParams;
  let initialConfig: PaneConfig | undefined;
  if (layoutId) {
    const saved = await getLayout(user.id, layoutId);
    initialConfig = saved?.config;
  }
  if (!initialConfig) {
    initialConfig = defaultLayout(workspaces.slice(0, 2).map((w) => w.id));
  }

  const initialSummaries = await paneSummaries(
    user.id,
    collectWorkspaceIds(initialConfig),
    todayFn(),
  );

  return (
    <div className="space-y-4">
      {workspaces.length === 1 && (
        <p className="rounded-control border border-rule bg-raised/40 px-3 py-2 text-sm text-muted">
          Side by side shines with two or more books — create another to compare them.
        </p>
      )}
      <TilesClient
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, color: w.color }))}
        layouts={layouts}
        initialConfig={initialConfig}
        initialSummaries={initialSummaries}
      />
    </div>
  );
}
