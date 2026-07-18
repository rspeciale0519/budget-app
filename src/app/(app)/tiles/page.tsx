import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { listAccessibleWorkspaces } from "@/services/authz";
import { listLayouts, getLayout } from "@/services/layout-service";
import { paneSummaries } from "@/services/dashboard/pane-summary";
import { defaultLayout, collectWorkspaceIds } from "@/lib/pane-tree";
import { today as todayFn } from "@/lib/calendar-date";
import type { PaneConfig } from "@/lib/zod/layout";
import { TilesClient } from "@/components/tiling/tiles-client";
import { EmptyState } from "@/components/empty/empty-state";

export const dynamic = "force-dynamic";

export default async function TilesPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = await prismaAdmin.orgMembership.findFirst({ where: { userId: user.id } });
  if (!membership) redirect("/");

  const workspaces = await listAccessibleWorkspaces(user.id);
  const layouts = await listLayouts(user.id, membership.organizationId);

  if (workspaces.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="my-[22px] text-xl font-bold text-ink">Tiles</h1>
        <EmptyState
          title="Nothing to tile yet"
          description="Tiling shows several workspaces side by side. Create a second workspace with the + button in the top bar."
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
    <TilesClient
      workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, color: w.color }))}
      layouts={layouts}
      initialConfig={initialConfig}
      initialSummaries={initialSummaries}
    />
  );
}
