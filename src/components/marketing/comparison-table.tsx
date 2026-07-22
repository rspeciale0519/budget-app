import { Fragment } from "react";
import { comparison, tiers } from "@/lib/site-config";
import { cn } from "@/lib/utils";

// Full plan comparison. Sticky header keeps the tier names in view while the
// visitor scans rows. A dash means "not on this plan"; a check means included.
function Cell({ value }: { value: string }) {
  const isNo = value === "—";
  const isYes = value === "✓";
  return (
    <td className="border-t border-rule px-4 py-3 text-center text-sm">
      <span className={cn(isYes && "text-credit", isNo && "text-dim", !isYes && !isNo && "text-ink tabular")}>
        {value}
      </span>
    </td>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead className="sticky top-16 z-10 bg-paper">
          <tr>
            <th className="w-2/5 px-4 py-4 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-dim">
              Compare plans
            </th>
            {tiers.map((t) => (
              <th key={t.id} className="px-4 py-4 text-center">
                <span className={cn("font-serif text-lg", t.highlight ? "text-credit" : "text-ink")}>{t.name}</span>
                <span className="mt-0.5 block font-mono text-xs text-muted">${t.monthly}/mo</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.map((group) => (
            <Fragment key={group.group}>
              <tr>
                <td
                  colSpan={4}
                  className="border-t border-rule-strong bg-raised/40 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink"
                >
                  {group.group}
                </td>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.label}>
                  <td className="border-t border-rule px-4 py-3 text-sm text-ink">{row.label}</td>
                  <Cell value={row.starter} />
                  <Cell value={row.pro} />
                  <Cell value={row.team} />
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
