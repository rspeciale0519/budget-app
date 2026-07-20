// Mock dashboard data, typed to the shapes Phase 2 will compute from services.
// Values mirror the approved v1 mockup (Yellow Letter Shop) for visual fidelity.

import type { MatchSuggestion } from "@/services/match-service";

export interface DashboardKpis {
  totalBalance: string;
  totalBalanceNote: string;
  moneyIn: string;
  moneyInDelta: string;
  moneyInUp: boolean;
  moneyOut: string;
  moneyOutDelta: string;
  moneyOutUp: boolean;
  safeToSpend: string;
  safeToSpendNote: string;
  safeToSpendNegative: boolean;
}

export interface SafeToSpendItem {
  vendor: string;
  amount: string;
  dueDate: string;
}

export interface SafeToSpendMath {
  availableBalance: string;
  unpaidBeforeIncome: string;
  result: string;
  items: SafeToSpendItem[];
  incomeConfigured: boolean;
}

export interface ForecastPoint {
  date: string;
  balance: string;
  payday?: boolean;
}

export interface CategorySlice {
  name: string;
  amount: string;
  pct: number;
  color: string;
}

export interface BillItem {
  id: string;
  vendor: string;
  amount: string;
  dueLabel: string;
  status: "overdue" | "today" | "soon" | "later" | "paid";
  statusLabel: string;
  icon: string;
}

export interface PaidVsUnpaid {
  paid: string;
  unpaid: string;
  paidPct: number;
}

export interface GoalItem {
  name: string;
  icon: string;
  target: string;
  saved: string;
  pct: number;
  color: string;
  linked?: boolean;
}

export interface DebtItem {
  name: string;
  balance: string;
  aprMin: string;
  linked?: boolean;
  due?: { key: "overdue" | "today" | "soon" | "later" | "paid"; label: string };
}

export interface DashboardData {
  accountCount: number;
  periodLabel: string;
  overspentCount: number;
  kpis: DashboardKpis;
  matchSuggestions: MatchSuggestion[];
  safeToSpendMath: SafeToSpendMath;
  forecast: ForecastPoint[];
  lowestPoint: ForecastPoint;
  categories: CategorySlice[];
  categoriesTotal: string;
  bills: BillItem[];
  paidVsUnpaid: PaidVsUnpaid;
  goals: GoalItem[];
  debts: DebtItem[];
  debtsTotal: string;
}

export const mockDashboard: DashboardData = {
  accountCount: 3,
  periodLabel: "this month",
  overspentCount: 0,
  matchSuggestions: [],
  kpis: {
    totalBalance: "$48,210",
    totalBalanceNote: "across 3 accounts",
    moneyIn: "$32,540",
    moneyInDelta: "▲ 12% vs last month",
    moneyInUp: true,
    moneyOut: "$27,880",
    moneyOutDelta: "▲ 4% vs last month",
    moneyOutUp: false,
    safeToSpend: "$9,140",
    safeToSpendNote: "after 6 unpaid bills due before next deposit",
    safeToSpendNegative: false,
  },
  safeToSpendMath: {
    availableBalance: "$48,210",
    unpaidBeforeIncome: "$39,070",
    result: "$9,140",
    incomeConfigured: true,
    items: [
      { vendor: "Office Rent", amount: "$4,200", dueDate: "Jun 28" },
      { vendor: "Payroll run", amount: "$8,400", dueDate: "Jun 30" },
    ],
  },
  forecast: [
    { date: "Jun 14", balance: "$13,200" },
    { date: "Jun 17", balance: "$12,100" },
    { date: "Jun 21", balance: "$9,800" },
    { date: "Jun 24", balance: "$8,400" },
    { date: "Jun 28", balance: "$6,420" },
    { date: "Jul 01", balance: "$7,900" },
    { date: "Jul 05", balance: "$6,900" },
    { date: "Jul 09", balance: "$8,300" },
    { date: "Jul 14", balance: "$9,140" },
  ],
  lowestPoint: { date: "Jun 28", balance: "$6,420" },
  categories: [
    { name: "Payroll", amount: "$8,400", pct: 30, color: "#2563eb" },
    { name: "Print & postage", amount: "$6,100", pct: 22, color: "#16a34a" },
    { name: "Software / SaaS", amount: "$5,000", pct: 18, color: "#d97706" },
    { name: "Contractors", amount: "$3,900", pct: 14, color: "#7c3aed" },
    { name: "Other", amount: "$4,480", pct: 16, color: "#64748b" },
  ],
  categoriesTotal: "$27.9k",
  bills: [
    { id: "mock-1", vendor: "Electric — Duke Energy", amount: "$640", dueLabel: "Due Jun 17 · 3 days ago", status: "overdue", statusLabel: "Overdue", icon: "⚡" },
    { id: "mock-2", vendor: "Office Rent", amount: "$4,200", dueLabel: "Due Jun 28", status: "soon", statusLabel: "in 5 days", icon: "🏢" },
    { id: "mock-3", vendor: "Payroll run", amount: "$8,400", dueLabel: "Due Jun 30 · recurring", status: "later", statusLabel: "Due later", icon: "👥" },
    { id: "mock-4", vendor: "USPS postage account", amount: "$2,150", dueLabel: "Due Jul 03", status: "later", statusLabel: "Due later", icon: "🖨️" },
  ],
  paidVsUnpaid: { paid: "$18,300", unpaid: "$11,390", paidPct: 62 },
  goals: [
    { name: "Team retreat", icon: "🏝️", target: "$6,000", saved: "$3,200", pct: 53, color: "#16a34a" },
    { name: "New equipment", icon: "🖥️", target: "$4,500", saved: "$1,400", pct: 31, color: "#2563eb" },
  ],
  debts: [
    { name: "Amex Business", balance: "$9,200", aprMin: "22.9% APR · min $310" },
    { name: "Equipment loan", balance: "$12,400", aprMin: "7.4% APR · min $480" },
  ],
  debtsTotal: "$21,600",
};
