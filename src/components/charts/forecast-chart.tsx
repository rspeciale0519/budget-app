"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from "recharts";
import type { ForecastPoint } from "@/lib/mock/dashboard";

function toNum(money: string): number {
  return Number(money.replace(/[$,]/g, ""));
}

interface Row {
  date: string;
  balance: number;
  display: string;
  largeBill?: boolean;
}

function ForecastTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-pop">
      <div className="font-semibold text-ink">{row.display}</div>
      <div className="text-muted">{row.date}</div>
      {row.largeBill ? <div className="mt-1 font-semibold text-neg">Large bill due</div> : null}
    </div>
  );
}

/**
 * Themed cash-flow forecast as a Recharts area chart with hover tooltips
 * and red markers on days with a large bill. Colors come from CSS tokens
 * so the chart adapts to light/dark automatically.
 */
export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  const rows: Row[] = data.map((p) => ({
    date: p.date,
    balance: toNum(p.balance),
    display: p.balance,
    largeBill: p.largeBill,
  }));
  const markers = rows.filter((r) => r.largeBill);

  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pos)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--pos)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis hide domain={["dataMin - 800", "dataMax + 800"]} />
        <Tooltip content={<ForecastTooltip />} cursor={{ stroke: "var(--line-strong)" }} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="var(--pos)"
          strokeWidth={2.5}
          fill="url(#forecastFill)"
          isAnimationActive
          animationDuration={900}
          dot={false}
          activeDot={{ r: 5, fill: "var(--pos)", stroke: "var(--card)", strokeWidth: 2 }}
        />
        {markers.map((m) => (
          <ReferenceDot
            key={m.date}
            x={m.date}
            y={m.balance}
            r={4}
            fill="var(--neg)"
            stroke="var(--card)"
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
