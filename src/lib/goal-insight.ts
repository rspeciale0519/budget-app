import { money, sub, compare, format, type Money } from "@/lib/money";
import { diffDays, type CalendarDate } from "@/lib/calendar-date";

export interface GoalInsight {
  reached: boolean;
  monthsLeft: number | null;
  needPerMonth: Money | null;
  label: string;
}

/**
 * Advisory "on track?" text for a goal. Pure. Money stays decimal-exact; the
 * month count is a simple calendar estimate (~30.44 days/month).
 */
export function goalOnTrack(input: {
  saved: Money;
  target: Money;
  targetDate: CalendarDate | null;
  today: CalendarDate;
}): GoalInsight {
  const { saved, target, targetDate, today } = input;
  if (compare(saved, target) >= 0) {
    return { reached: true, monthsLeft: null, needPerMonth: null, label: "Reached ✓" };
  }
  const remaining = sub(target, saved);
  if (!targetDate) {
    return { reached: false, monthsLeft: null, needPerMonth: null, label: `${format(remaining)} to go` };
  }
  const days = diffDays(today, targetDate);
  if (days <= 0) {
    return {
      reached: false,
      monthsLeft: 0,
      needPerMonth: remaining,
      label: `${format(remaining)} short of the target date`,
    };
  }
  const months = Math.max(1, Math.round(days / 30.4375));
  const perMonth = money(remaining.div(months).toFixed(2));
  return {
    reached: false,
    monthsLeft: months,
    needPerMonth: perMonth,
    label: `≈ ${format(perMonth)}/mo to hit it in ${months} ${months === 1 ? "month" : "months"}`,
  };
}
