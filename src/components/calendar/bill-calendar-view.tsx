"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/ui/status-tag";
import { useToast } from "@/components/ui/toast";
import {
  markBillPaidStandaloneAction,
  markBillUnpaidAction,
} from "@/app/(app)/w/[workspaceId]/_actions";
import type { CalendarMonth, CalendarEvent, DayStatus } from "@/services/dashboard/bill-calendar";

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

const LEGEND: { key: DayStatus; label: string }[] = [
  { key: "paid", label: "Paid" },
  { key: "soon", label: "Due soon" },
  { key: "later", label: "Due later" },
  { key: "overdue", label: "Overdue" },
];

/** A short marker so status never rides on color alone. */
function marker(status: DayStatus): string {
  if (status === "paid") return "✓ ";
  if (status === "overdue") return "! ";
  return "";
}

function dayNumber(date: string): string {
  return String(Number(date.split("-")[2]));
}

function fullLabel(date: string): string {
  const parts = date.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS_FULL[weekday] ?? ""} ${MONTHS[m - 1] ?? ""} ${d}`;
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
      {LEGEND.map((l) => (
        <span key={l.key} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-sm ${CELL_CHIP[l.key]}`} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

export function BillCalendarView({
  month,
  workspaceId,
}: {
  month: CalendarMonth;
  workspaceId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<{ event: CalendarEvent; date: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function markPaid(event: CalendarEvent) {
    setBusy(true);
    const res = await markBillPaidStandaloneAction(workspaceId, event.billId);
    setBusy(false);
    setSelected(null);
    if (res.ok) {
      toast(`Paid ✓ — ${event.vendor} off the list`, {
        actionLabel: "Undo",
        onAction: async () => {
          await markBillUnpaidAction(workspaceId, event.billId);
          router.refresh();
        },
      });
      router.refresh();
    } else {
      toast(res.error ?? "Could not mark that bill paid — try again.", { kind: "error" });
    }
  }

  const summary = month.summary;

  return (
    <div className="space-y-3">
      {summary.hasBills ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-muted">
            This month: <b className="tabular font-semibold text-ink">{summary.total}</b> in bills ·{" "}
            <b className="tabular font-semibold text-credit">{summary.paid}</b> paid ·{" "}
            <b className="tabular font-semibold text-ink">{summary.unpaid}</b> still to pay
          </p>
          <Legend />
        </div>
      ) : (
        <p className="rounded-control border border-rule bg-raised/40 px-3 py-2 text-sm text-muted">
          No bills this month. Add them in Accounts &amp; bills, or import transactions from your bank.
        </p>
      )}

      <Agenda month={month} onSelect={setSelected} />
      <MonthGrid month={month} onSelect={setSelected} />

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-sunken/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.event.vendor} details`}
            className="w-full max-w-xs space-y-3 rounded-card border border-rule-strong bg-surface p-4 shadow-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{selected.event.vendor}</span>
              <StatusTag status={selected.event.status}>{selected.event.statusLabel}</StatusTag>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>Due {fullLabel(selected.date)}</span>
              <span className="tabular font-semibold text-ink">{selected.event.amount}</span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
              {selected.event.status !== "paid" && (
                <Button size="sm" disabled={busy} onClick={() => markPaid(selected.event)}>
                  {busy ? "…" : "Mark paid"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Phone view: a scrollable agenda of the month's days that have bills. */
function Agenda({
  month,
  onSelect,
}: {
  month: CalendarMonth;
  onSelect: (s: { event: CalendarEvent; date: string }) => void;
}) {
  const days = month.weeks.flat().filter((d) => d.inMonth && d.events.length > 0);
  return (
    <div className="overflow-hidden rounded-card border border-rule bg-surface shadow-card sm:hidden">
      {days.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">No bills this month.</p>
      ) : (
        days.map((d) => (
          <div key={d.date} className="border-b border-rule px-4 py-3 last:border-b-0">
            <div className={`text-[12.5px] font-semibold ${d.isToday ? "text-now" : "text-ink"}`}>
              {fullLabel(d.date)}
              {d.isToday ? " · Today" : ""}
            </div>
            <div className="mt-2 space-y-1.5">
              {d.events.map((e) => (
                <button
                  key={e.billId}
                  type="button"
                  onClick={() => onSelect({ event: e, date: d.date })}
                  className="flex w-full items-center justify-between gap-3 text-left text-[13px]"
                >
                  <span className="flex items-center gap-2">
                    <StatusTag status={e.status}>{e.statusLabel}</StatusTag>
                    <span className="text-ink">{e.vendor}</span>
                  </span>
                  <span className="tabular font-semibold text-ink">{e.amount}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** Tablet/desktop view: the full month grid (scrolls horizontally if narrow). */
function MonthGrid({
  month,
  onSelect,
}: {
  month: CalendarMonth;
  onSelect: (s: { event: CalendarEvent; date: string }) => void;
}) {
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
                  day.isToday ? "bg-ink text-paper" : day.inMonth ? "text-ink" : "text-dim"
                }`}
              >
                {dayNumber(day.date)}
              </div>
              <div className="space-y-1">
                {day.events.map((e) => (
                  <button
                    key={e.billId}
                    type="button"
                    onClick={() => onSelect({ event: e, date: day.date })}
                    className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10.5px] font-semibold ${CELL_CHIP[e.status]}`}
                    title={`${e.statusLabel} · ${e.vendor} · ${e.amount}`}
                  >
                    {marker(e.status)}
                    {e.vendor} {e.amount}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
