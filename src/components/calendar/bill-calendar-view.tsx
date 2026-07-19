import { StatusTag } from "@/components/ui/status-tag";
import type { CalendarMonth, DayStatus } from "@/services/dashboard/bill-calendar";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The grid cell needs a full-width block chip, so it carries the color pair
// directly rather than the inline StatusTag pill the agenda uses.
const CELL_CHIP: Record<DayStatus, string> = {
  overdue: "bg-alert-tint text-alert",
  today: "bg-debit-tint text-debit",
  soon: "bg-debit-tint text-debit",
  later: "bg-scheduled-tint text-scheduled",
  paid: "bg-credit-tint text-credit",
};

function dayNumber(date: string): string {
  return String(Number(date.split("-")[2]));
}

function agendaLabel(date: string): string {
  const parts = date.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS_FULL[weekday] ?? ""} ${MONTHS[m - 1] ?? ""} ${d}`;
}

/** Phone view: a scrollable agenda of the month's days that have bills. */
function Agenda({ month }: { month: CalendarMonth }) {
  const days = month.weeks.flat().filter((d) => d.inMonth && d.events.length > 0);
  return (
    <div className="overflow-hidden rounded-card border border-rule bg-surface shadow-card sm:hidden">
      {days.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">No bills this month.</p>
      ) : (
        days.map((d) => (
          <div key={d.date} className="border-b border-rule px-4 py-3 last:border-b-0">
            <div className={`text-[12.5px] font-semibold ${d.isToday ? "text-now" : "text-ink"}`}>
              {agendaLabel(d.date)}
              {d.isToday ? " · Today" : ""}
            </div>
            <div className="mt-2 space-y-1.5">
              {d.events.map((e) => (
                <div key={e.billId} className="flex items-center justify-between gap-3 text-[13px]">
                  <StatusTag status={e.status}>{e.vendor}</StatusTag>
                  <span className="tabular font-semibold text-ink">{e.amount}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** Tablet/desktop view: the full month grid (scrolls horizontally if narrow). */
function MonthGrid({ month }: { month: CalendarMonth }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-rule bg-surface shadow-card sm:block">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-rule bg-raised/50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {month.weeks.flat().map((day) => (
            <div
              key={day.date}
              className={`min-h-[88px] border-b border-r border-rule p-1.5 last:border-r-0 ${
                day.inMonth ? "bg-surface" : "bg-sunken/40"
              }`}
            >
              <div
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  day.isToday
                    ? "bg-ink text-paper"
                    : day.inMonth
                      ? "text-ink"
                      : "text-dim"
                }`}
              >
                {dayNumber(day.date)}
              </div>
              <div className="space-y-1">
                {day.events.map((e) => (
                  <div
                    key={e.billId}
                    className={`truncate rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${CELL_CHIP[e.status]}`}
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
    </div>
  );
}

export function BillCalendarView({ month }: { month: CalendarMonth }) {
  return (
    <>
      <Agenda month={month} />
      <MonthGrid month={month} />
    </>
  );
}
