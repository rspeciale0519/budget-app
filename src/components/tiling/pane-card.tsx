import { statusInk } from "@/components/ui/status-tag";
import type { PaneSummary } from "@/services/dashboard/pane-summary";

export function PaneCard({ summary }: { summary: PaneSummary }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-rule bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-rule px-3 py-2.5 text-[12.5px] font-semibold text-ink">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: summary.color }} aria-hidden />
        {summary.name}
      </div>
      <div className="space-y-3 p-3">
        <div className="flex gap-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
              Balance
            </div>
            <div className="tabular mt-0.5 text-base font-semibold text-ink">{summary.balance}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
              Safe to spend
            </div>
            <div className="tabular mt-0.5 text-base font-semibold text-credit">
              {summary.safeToSpend}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          {summary.topBills.length === 0 ? (
            <p className="text-xs text-muted">No upcoming bills</p>
          ) : (
            summary.topBills.map((b, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-ink/85">
                  {b.vendor}{" "}
                  <span className={`text-[10px] font-semibold ${statusInk(b.status)}`}>
                    {b.statusLabel}
                  </span>
                </span>
                <span className="tabular text-ink">{b.amount}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function PanePlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-card border border-dashed border-rule bg-surface text-sm text-muted">
      Loading…
    </div>
  );
}
