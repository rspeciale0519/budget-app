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
    <div className="space-y-5">
      <div className="flex justify-end">
        <div className="inline-flex gap-0.5 rounded-control border border-rule bg-surface p-0.5">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/w/${workspaceId}?period=${p}`}
              aria-current={p === period ? "true" : undefined}
              className={
                p === period
                  ? "rounded-[7px] bg-raised px-3 py-1.5 text-[12.5px] font-semibold capitalize text-ink"
                  : "rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold capitalize text-muted transition-colors hover:text-ink"
              }
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
