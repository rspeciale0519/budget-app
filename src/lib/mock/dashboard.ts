// Mock dashboard data, typed to the shapes Phase 2 will compute from services.
export interface DashboardKpis {
  totalBalance: string;
  moneyIn: string;
  moneyOut: string;
  safeToSpend: string;
}

export interface SafeToSpendMath {
  availableBalance: string;
  unpaidBeforeIncome: string;
  result: string;
}

export interface ForecastPoint {
  date: string;
  balance: string;
}

export interface CategorySlice {
  name: string;
  amount: string;
  pct: number;
}

export interface BillItem {
  vendor: string;
  amount: string;
  dueDate: string;
  status: "unpaid" | "overdue" | "paid";
}

export interface GoalItem {
  name: string;
  target: string;
  saved: string;
  pct: number;
}

export interface DebtItem {
  name: string;
  balance: string;
  apr: string;
  minimum: string;
}

export interface DashboardData {
  kpis: DashboardKpis;
  safeToSpendMath: SafeToSpendMath;
  forecast: ForecastPoint[];
  lowestPoint: ForecastPoint;
  categories: CategorySlice[];
  bills: BillItem[];
  goals: GoalItem[];
  debts: DebtItem[];
}

export const mockDashboard: DashboardData = {
  kpis: {
    totalBalance: "$12,480.36",
    moneyIn: "$6,200.00",
    moneyOut: "$4,118.64",
    safeToSpend: "$2,140.36",
  },
  safeToSpendMath: {
    availableBalance: "$12,480.36",
    unpaidBeforeIncome: "$10,340.00",
    result: "$2,140.36",
  },
  forecast: [
    { date: "Jun 20", balance: "$12,480.36" },
    { date: "Jun 27", balance: "$11,030.36" },
    { date: "Jul 04", balance: "$9,480.36" },
    { date: "Jul 11", balance: "$8,210.36" },
    { date: "Jul 18", balance: "$10,910.36" },
  ],
  lowestPoint: { date: "Jul 11", balance: "$8,210.36" },
  categories: [
    { name: "Housing", amount: "$1,450.00", pct: 35 },
    { name: "Groceries", amount: "$642.18", pct: 16 },
    { name: "Transportation", amount: "$380.00", pct: 9 },
    { name: "Dining", amount: "$295.40", pct: 7 },
    { name: "Utilities", amount: "$210.06", pct: 5 },
  ],
  bills: [
    { vendor: "Rent", amount: "$1,450.00", dueDate: "Jul 01", status: "unpaid" },
    { vendor: "Electric Co", amount: "$120.00", dueDate: "Jun 18", status: "overdue" },
    { vendor: "Internet", amount: "$79.99", dueDate: "Jul 05", status: "unpaid" },
  ],
  goals: [
    { name: "Emergency Fund", target: "$10,000.00", saved: "$6,500.00", pct: 65 },
    { name: "Vacation", target: "$5,000.00", saved: "$1,200.00", pct: 24 },
  ],
  debts: [
    { name: "Visa", balance: "$2,480.00", apr: "19.99%", minimum: "$75.00" },
    { name: "Car Loan", balance: "$11,200.00", apr: "5.40%", minimum: "$310.00" },
  ],
};
