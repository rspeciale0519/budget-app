import { z } from "zod";
import { Frequency } from "@prisma/client";
import { zMoney, zCalendarDate } from "@/lib/zod/money";

export const createIncomeSourceSchema = z.object({
  name: z.string().min(1).max(80),
  amount: zMoney,
  frequency: z.nativeEnum(Frequency),
  interval: z.number().int().min(1).default(1),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  nextDate: zCalendarDate,
  endDate: zCalendarDate.optional(),
});

export type CreateIncomeSourceInput = z.input<typeof createIncomeSourceSchema>;
