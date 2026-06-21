import Link from "next/link";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/services/workspace-service";
import { getDashboardData } from "@/services/dashboard/index";
import { PERIODS, parsePeriod } from "@/services/dashboard/period";
import { today as todayFn } from "@/lib/calendar-date";

export const dynamic = "force-dynamic";

export default async function WorkspaceDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { workspaceId } = await params;
  const period = parsePeriod((await searchParams).period);
  const user = await getCurrentUser();

  if (!user) {
    return <NoAccess />;
  }

  let name = "Workspace";
  let type = "";
  let color = "#16a34a";
  let data;
  try {
    const ws = await getWorkspace(user.id, workspaceId);
    if (ws) {
      name = ws.name;
      type = ws.type;
      color = ws.color;
    }
    data = await getDashboardData(user.id, workspaceId, period, todayFn());
  } catch {
    return <NoAccess />;
  }

  const subtitle = type ? type[0]?.toUpperCase() + type.slice(1) : "";

  return (
    <div>
      <div className="my-[22px] flex items-center gap-3">
        <div
          className="grid h-[34px] w-[34px] place-items-center rounded-[10px] font-extrabold text-white"
          style={{ background: color }}
        >
          {name[0]?.toUpperCase() ?? "W"}
        </div>
        <div>
          <div className="text-xl font-bold text-ink">{name}</div>
          <div className="text-[12.5px] text-muted">
            {subtitle} · {data.kpis.totalBalanceNote}
          </div>
        </div>
        <div className="ml-auto flex overflow-hidden rounded-[9px] border border-line bg-white">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/w/${workspaceId}?period=${p}`}
              className={`px-3 py-[7px] text-[12.5px] font-semibold capitalize ${
                p === period ? "bg-pos text-white" : "text-muted hover:bg-[#f3f5f8]"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>

      <nav className="mb-4 flex gap-1 text-[13px]">
        {[
          ["Dashboard", ""],
          ["Manage", "/manage"],
          ["Income", "/income"],
          ["Import", "/import"],
          ["Audit", "/audit"],
        ].map(([label, sub]) => (
          <Link
            key={label}
            href={`/w/${workspaceId}${sub}`}
            className="rounded-md px-2.5 py-1 font-semibold text-muted hover:bg-[#f3f5f8] hover:text-ink"
          >
            {label}
          </Link>
        ))}
      </nav>

      <Dashboard data={data} workspaceId={workspaceId} />
    </div>
  );
}

function NoAccess() {
  return (
    <div className="py-16">
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted">
          You don&apos;t have access to this workspace.
        </CardContent>
      </Card>
    </div>
  );
}
