"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/mock/dashboard";

interface DonutProps {
  categories: CategorySlice[];
  total: string;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategorySlice }[];
}) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-pop">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: slice.color }} />
        {slice.name}
      </div>
      <div className="mt-0.5 text-muted">
        {slice.amount} · {slice.pct}%
      </div>
    </div>
  );
}

/**
 * Spending-by-category donut. Recharts pie with a centered total label,
 * hover tooltips, and a token-styled legend beside it.
 */
export function CategoryDonut({ categories, total }: DonutProps) {
  return (
    <div className="mt-2 flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<DonutTooltip />} />
            <Pie
              data={categories}
              dataKey="pct"
              nameKey="name"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={800}
            >
              {categories.map((c) => (
                <Cell key={c.name} fill={c.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-lg font-extrabold text-ink">{total}</span>
          <span className="text-[11px] text-muted">spent</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <li key={c.name} className="flex items-center gap-2 text-xs text-muted">
            <i className="inline-block h-[9px] w-[9px] rounded-sm" style={{ background: c.color }} />
            {c.name} <b className="ml-1 text-ink">{c.amount}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
