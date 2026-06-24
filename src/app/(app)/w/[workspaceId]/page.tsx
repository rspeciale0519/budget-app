import Link from "next/link";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getCurrentUser } from "@/lib/supabase/server";
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
  if (!user) return null; // the workspace layout handles auth + access

  const data = await getDashboardData(user.id, workspaceId, period, todayFn());

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex overflow-hidden rounded-[9px] border border-line bg-white">
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
      <Dashboard data={data} workspaceId={workspaceId} />
    </div>
  );
}
