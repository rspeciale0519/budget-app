import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { billCalendar } from "@/services/dashboard/bill-calendar";
import { today as todayFn } from "@/lib/calendar-date";
import { BillCalendarView } from "@/components/calendar/bill-calendar-view";

export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseYm(ym: string | undefined, fallback: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(ym ?? "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) };
  const p = fallback.split("-");
  return { year: Number(p[0]), month: Number(p[1]) };
}

function shiftMonth(year: number, month: number, delta: number): string {
  const idx = year * 12 + (month - 1) + delta;
  const y = Math.floor(idx / 12);
  const mo = (idx % 12) + 1;
  return `${y}-${String(mo).padStart(2, "0")}`;
}

const navCls =
  "rounded-md border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-bg-elev";

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
        <h1 className="text-xl font-bold text-ink">
          {MONTHS[month - 1] ?? ""} {year}
        </h1>
        <div className="flex items-center gap-2">
          <Link href={`/w/${workspaceId}/calendar?ym=${shiftMonth(year, month, -1)}`} className={navCls}>
            ← Prev
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
