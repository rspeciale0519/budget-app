import { z } from "zod";
import { money, type Money } from "@/lib/money";
import { calendarDate, type CalendarDate } from "@/lib/calendar-date";

/** A money input: a decimal string with at most 2 places. Coerces to Money. */
export const zMoney = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Must be a decimal string with at most 2 places")
  .transform((s): Money => money(s));

/** A calendar date input: a real YYYY-MM-DD. Coerces to CalendarDate. */
export const zCalendarDate = z
  .string()
  .refine(
    (s) => {
      try {
        calendarDate(s);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be a real YYYY-MM-DD date" },
  )
  .transform((s): CalendarDate => calendarDate(s));
