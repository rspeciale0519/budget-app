import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { billCalendar } from "@/services/dashboard/bill-calendar";
import { today as todayFn } from "@/lib/calendar-date";
import { MONTHS, parseYm, shiftMonth } from "@/lib/month-nav";
import { BillCalendarView } from "@/components/calendar/bill-calendar-view";
import { MonthYearPicker } from "@/components/chrome/month-year-picker";
import { PageHeading } from "@/components/ui/page-heading";

export const dynamic = "force-dynamic";

export const metadata = { title: "Calendar" };

const navCls =
  "rounded-control border border-rule bg-surface px-3 py-1.5 text-sm font-medium text-ink/85 transition-colors hover:border-dim hover:bg-raised";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { ym } = await searchParams;
  const today = todayFn();
  const { year, month } = parseYm(ym, today);
  const data = await billCalendar(user.id, workspaceId, year, month, today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeading>{MONTHS[month - 1] ?? ""} {year}</PageHeading>
        <div className="flex flex-wrap items-center gap-2">
          <MonthYearPicker basePath={`/w/${workspaceId}/calendar`} year={year} month={month} />
          <Link href={`/w/${workspaceId}/calendar?ym=${shiftMonth(year, month, -1)}`} className={navCls}>
            ← Prev
          </Link>
          <Link href={`/w/${workspaceId}/calendar`} className={navCls}>
            Today
          </Link>
          <Link href={`/w/${workspaceId}/calendar?ym=${shiftMonth(year, month, 1)}`} className={navCls}>
            Next →
          </Link>
        </div>
      </div>
      <BillCalendarView month={data} />
    </div>
  );
}
