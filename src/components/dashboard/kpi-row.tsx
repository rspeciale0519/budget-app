"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { parseMoney, moneyFormatter } from "@/lib/format/money";
import { staggerContainer, staggerItem } from "@/lib/motion/presets";
import type { DashboardKpis } from "@/lib/mock/dashboard";

function MetricCard({
  label,
  value,
  note,
  delta,
  deltaUp,
}: {
  label: string;
  value: string;
  note?: string;
  delta?: string;
  deltaUp?: boolean;
}) {
  return (
    <motion.div variants={staggerItem}>
      <Card className="px-[17px] py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.03em] text-muted">{label}</div>
        <div className="tabular mt-2 text-2xl font-extrabold text-ink">
          <AnimatedNumber value={parseMoney(value)} format={moneyFormatter(value)} />
        </div>
        {delta ? (
          <div className={`mt-1.5 text-xs font-semibold ${deltaUp ? "text-pos" : "text-neg"}`}>
            {delta}
          </div>
        ) : note ? (
          <div className="mt-1.5 text-xs text-muted">{note}</div>
        ) : null}
      </Card>
    </motion.div>
  );
}

/**
 * KPI cards row. The safe-to-spend tile is a toggle button that reveals the
 * calculation breakdown. Numbers count up on mount via AnimatedNumber.
 */
export function KpiRow({
  kpis,
  showMath,
  onToggleMath,
}: {
  kpis: DashboardKpis;
  showMath: boolean;
  onToggleMath: () => void;
}) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <MetricCard label="Total balance" value={kpis.totalBalance} note={kpis.totalBalanceNote} />
      <MetricCard label="Money in · MTD" value={kpis.moneyIn} delta={kpis.moneyInDelta} deltaUp={kpis.moneyInUp} />
      <MetricCard label="Money out · MTD" value={kpis.moneyOut} delta={kpis.moneyOutDelta} deltaUp={kpis.moneyOutUp} />
      <motion.button
        type="button"
        variants={staggerItem}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        onClick={onToggleMath}
        aria-expanded={showMath}
        className="rounded-card border border-pos/30 bg-pos/10 px-[17px] py-4 text-left shadow-card transition-shadow hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pos/40 focus-visible:ring-offset-1"
      >
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.03em] text-pos">
          <span>Safe to spend</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${showMath ? "rotate-180" : ""}`}
            aria-hidden
          />
        </div>
        <div className="tabular mt-2 text-2xl font-extrabold text-pos">
          <AnimatedNumber value={parseMoney(kpis.safeToSpend)} format={moneyFormatter(kpis.safeToSpend)} />
        </div>
        <div className="mt-1.5 text-xs text-muted">{kpis.safeToSpendNote}</div>
      </motion.button>
    </motion.div>
  );
}
