import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { SafeToSpendOrb } from "@/components/three/safe-to-spend-orb";
import { parseMoney } from "@/lib/format/money";
import type { SafeToSpendMath } from "@/lib/mock/dashboard";

/**
 * Breakdown of how safe-to-spend is computed, with a reactive 3D orb whose
 * health reflects the ratio of result to available balance.
 */
export function SafeToSpendPanel({
  math,
  workspaceId,
}: {
  math: SafeToSpendMath;
  workspaceId?: string;
}) {
  const available = parseMoney(math.availableBalance);
  const result = parseMoney(math.result);
  const health = available > 0 ? Math.max(0, Math.min(1, result / available)) : 0.5;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
        <div className="mx-auto h-28 w-28 shrink-0 sm:mx-0">
          <SafeToSpendOrb health={health} className="h-full w-full" />
        </div>
        <div className="flex-1 text-sm text-muted">
          <p className="mb-2 font-semibold text-ink">How safe-to-spend is calculated</p>
          <div className="flex justify-between border-b border-line py-1">
            <span>Available balance</span>
            <span className="tabular">{math.availableBalance}</span>
          </div>
          {math.items.length === 0 ? (
            <div className="flex justify-between border-b border-line py-1">
              <span>No unpaid bills before the next income</span>
              <span className="tabular">$0.00</span>
            </div>
          ) : (
            math.items.map((item, i) => (
              <div key={i} className="flex justify-between border-b border-line py-1 pl-3">
                <span>
                  − {item.vendor} <span className="text-[11px]">· due {item.dueDate}</span>
                </span>
                <span className="tabular">{item.amount}</span>
              </div>
            ))
          )}
          <div className="flex justify-between border-b border-line py-1">
            <span>= Unpaid before next income</span>
            <span className="tabular">{math.unpaidBeforeIncome}</span>
          </div>
          <div className="flex justify-between py-1 font-semibold text-ink">
            <span>= Safe to spend</span>
            <span className="tabular">{math.result}</span>
          </div>
          {!math.incomeConfigured && (
            <p className="mt-2 text-xs text-muted">
              Using a 30-day window.{" "}
              {workspaceId ? (
                <Link href={`/w/${workspaceId}/income`} className="font-semibold text-blue underline">
                  Set expected income
                </Link>
              ) : (
                <span className="font-semibold">Set expected income</span>
              )}{" "}
              for a sharper number.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
