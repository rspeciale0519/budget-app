import type { CalendarMonth, DayStatus } from "@/services/dashboard/bill-calendar";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const CHIP: Record<DayStatus, string> = {
  overdue: "bg-[#fee2e2] text-[#b91c1c]",
  soon: "bg-[#fef3c7] text-[#b45309]",
  scheduled: "bg-[#e0e7ff] text-[#4338ca]",
  paid: "bg-[#dcfce7] text-[#15803d]",
};

function dayNumber(date: string): string {
  return String(Number(date.split("-")[2]));
}

export function BillCalendarView({ month }: { month: CalendarMonth }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-card shadow-card">
      <div className="grid grid-cols-7 border-b border-line bg-[#f8fafc]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {month.weeks.flat().map((day) => (
          <div
            key={day.date}
            className={`min-h-[84px] border-b border-r border-line p-1.5 last:border-r-0 ${
              day.inMonth ? "bg-white" : "bg-[#fafbfc]"
            }`}
          >
            <div
              className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                day.isToday ? "bg-slate-900 text-white" : day.inMonth ? "text-ink" : "text-muted"
              }`}
            >
              {dayNumber(day.date)}
            </div>
            <div className="space-y-1">
              {day.events.map((e) => (
                <div
                  key={e.billId}
                  className={`truncate rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${CHIP[e.status]}`}
                  title={`${e.vendor} · ${e.amount}`}
                >
                  {e.vendor} {e.amount}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
