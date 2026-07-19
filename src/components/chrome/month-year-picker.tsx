"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";
import { MONTHS } from "@/lib/month-nav";

/** Jump straight to a month/year instead of clicking Prev/Next repeatedly.
 * The year range is centered on whatever's currently shown, not wall-clock
 * "today" — keeps server and client render identical, no hydration risk. */
export function MonthYearPicker({
  basePath,
  year,
  month,
}: {
  basePath: string;
  year: number;
  month: number;
}) {
  const router = useRouter();
  const years = Array.from({ length: 6 }, (_, i) => year - 3 + i);

  function go(y: number, m: number) {
    router.push(`${basePath}?ym=${y}-${String(m).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select
        aria-label="Month"
        className="h-8 w-auto text-xs"
        value={month}
        onChange={(e) => go(year, Number(e.target.value))}
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Year"
        className="h-8 w-auto text-xs"
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
