// Pure, deterministic builder for the camera-ready demo dataset.
// No Date.now(): every date derives from the passed anchor so seeds stay fresh
// when re-run later and tests stay deterministic. The DB orchestrator
// (seed-demo.ts) maps the string "keys" here onto real cuid primary keys.

import { addDays, calendarDate, type CalendarDate } from "@/lib/calendar-date";
import type {
  AccountType,
  BillStatus,
  BillType,
  Frequency,
  TransferType,
  WorkspaceType,
} from "@prisma/client";

export interface DemoWorkspace {
  key: string;
  name: string;
  type: WorkspaceType;
  color: string;
  icon: string;
  sortOrder: number;
}
export interface DemoAccount {
  key: string;
  workspaceKey: string;
  name: string;
  type: AccountType;
  institution: string;
  last4?: string;
  openingBalance: string;
  openingDate: CalendarDate;
}
export interface DemoTxn {
  workspaceKey: string;
  accountKey: string;
  date: CalendarDate;
  amount: string;
  description: string;
  categoryName?: string;
  merchant?: string;
  dedupeHash: string;
}
export interface DemoBill {
  workspaceKey: string;
  vendor: string;
  amount: string;
  dueDate: CalendarDate;
  status: BillStatus;
  type: BillType;
  categoryName?: string;
  recurringKey?: string;
}
export interface DemoRecurring {
  key: string;
  workspaceKey: string;
  frequency: Frequency;
  dayOfMonth: number;
  startDate: CalendarDate;
  nextRunDate: CalendarDate;
  templateVendor: string;
  templateAmount: string;
  templateCategoryName?: string;
}
export interface DemoBudget {
  workspaceKey: string;
  categoryName: string;
  amount: string;
}
export interface DemoGoal {
  workspaceKey: string;
  name: string;
  targetAmount: string;
  currentSaved: string;
  targetDate?: CalendarDate;
  accountKey?: string;
}
export interface DemoDebt {
  workspaceKey: string;
  name: string;
  type: string;
  currentBalance: string;
  apr: string;
  minimumPayment: string;
  dueDay: number;
}
export interface DemoIncomeSource {
  workspaceKey: string;
  name: string;
  amount: string;
  frequency: Frequency;
  dayOfMonth: number;
  nextDate: CalendarDate;
}
export interface DemoTransfer {
  fromWorkspaceKey: string;
  toWorkspaceKey: string;
  type: TransferType;
  amount: string;
  date: CalendarDate;
  fromTxnDedupe: string;
  toTxnDedupe: string;
}
export interface DemoDataset {
  workspaces: DemoWorkspace[];
  accounts: DemoAccount[];
  transactions: DemoTxn[];
  bills: DemoBill[];
  recurring: DemoRecurring[];
  budgets: DemoBudget[];
  goals: DemoGoal[];
  debts: DemoDebt[];
  incomeSources: DemoIncomeSource[];
  transfers: DemoTransfer[];
}

const PERSONAL = "personal";
const ACME = "acme";
const SIDECO = "sideco";

export function buildDemoData(anchor: CalendarDate): DemoDataset {
  const at = (offset: number): CalendarDate => addDays(anchor, offset);
  let n = 0;
  const hash = (): string => `demo-tx-${(n++).toString().padStart(3, "0")}`;
  const txns: DemoTxn[] = [];
  const tx = (
    workspaceKey: string,
    accountKey: string,
    offset: number,
    amount: string,
    description: string,
    categoryName?: string,
    dedupe?: string,
  ): DemoTxn => {
    const t: DemoTxn = {
      workspaceKey,
      accountKey,
      date: at(offset),
      amount,
      description,
      categoryName,
      dedupeHash: dedupe ?? hash(),
    };
    txns.push(t);
    return t;
  };

  const workspaces: DemoWorkspace[] = [
    { key: PERSONAL, name: "Personal", type: "personal", color: "#4f46e5", icon: "home", sortOrder: 0 },
    { key: ACME, name: "Acme Studio", type: "business", color: "#0d9488", icon: "briefcase", sortOrder: 1 },
    { key: SIDECO, name: "Maple & Co", type: "business", color: "#d97706", icon: "store", sortOrder: 2 },
  ];

  const accounts: DemoAccount[] = [
    { key: "pc", workspaceKey: PERSONAL, name: "Everyday Checking", type: "checking", institution: "First National", last4: "4021", openingBalance: "5200.00", openingDate: at(-180) },
    { key: "ps", workspaceKey: PERSONAL, name: "Rainy Day Savings", type: "savings", institution: "First National", last4: "8830", openingBalance: "9200.00", openingDate: at(-180) },
    { key: "pcc", workspaceKey: PERSONAL, name: "Everyday Card", type: "credit_card", institution: "Chase", last4: "1188", openingBalance: "-1240.00", openingDate: at(-180) },
    { key: "ac", workspaceKey: ACME, name: "Acme Operating", type: "checking", institution: "Mercury", last4: "7712", openingBalance: "24500.00", openingDate: at(-180) },
    { key: "ats", workspaceKey: ACME, name: "Tax Reserve", type: "savings", institution: "Mercury", last4: "5540", openingBalance: "8000.00", openingDate: at(-180) },
    { key: "acc", workspaceKey: ACME, name: "Acme Card", type: "credit_card", institution: "Amex", last4: "2003", openingBalance: "-820.00", openingDate: at(-180) },
    { key: "sc", workspaceKey: SIDECO, name: "Maple Checking", type: "checking", institution: "Mercury", last4: "6191", openingBalance: "6300.00", openingDate: at(-180) },
  ];

  // ── Personal: income (two bridge draws) + rich spending ──────────────────
  tx(PERSONAL, "pc", -8, "6000.00", "Owner draw — Acme Studio", "Owner Draw", "demo-bridge-acme");
  tx(PERSONAL, "pc", -10, "1500.00", "Owner draw — Maple & Co", "Owner Draw", "demo-bridge-sideco");
  tx(PERSONAL, "ps", -13, "42.18", "Interest", "Other Income");
  tx(PERSONAL, "pc", -21, "-1850.00", "Mortgage", "Housing");
  tx(PERSONAL, "pc", -20, "-142.30", "City Electric", "Utilities");
  tx(PERSONAL, "pc", -19, "-68.40", "Fiber Internet", "Utilities");
  tx(PERSONAL, "pc", -18, "-210.55", "Whole Foods", "Groceries");
  tx(PERSONAL, "pc", -16, "-54.20", "Shell", "Transportation");
  tx(PERSONAL, "pc", -15, "-15.49", "Netflix", "Subscriptions");
  tx(PERSONAL, "pc", -15, "-11.99", "Spotify", "Subscriptions");
  tx(PERSONAL, "pc", -14, "-88.75", "Trattoria Nona", "Dining");
  tx(PERSONAL, "pc", -12, "-196.40", "Costco", "Groceries");
  tx(PERSONAL, "pc", -11, "-145.00", "State Farm", "Insurance");
  tx(PERSONAL, "pc", -9, "-120.00", "Dr. Alvarez copay", "Healthcare");
  tx(PERSONAL, "pc", -7, "-75.30", "Sushi Bar", "Dining");
  tx(PERSONAL, "pcc", -6, "-240.00", "Nordstrom", "Shopping");
  tx(PERSONAL, "pc", -5, "-63.10", "Chevron", "Transportation");
  tx(PERSONAL, "pc", -4, "-58.90", "Trader Joe's", "Groceries");
  tx(PERSONAL, "pcc", -3, "-42.00", "AMC Theatres", "Entertainment");
  tx(PERSONAL, "pc", -2, "-29.99", "Anytime Fitness", "Subscriptions");
  // Prior month, for trend history.
  tx(PERSONAL, "pc", -30, "-1850.00", "Mortgage", "Housing");
  tx(PERSONAL, "pc", -33, "-175.20", "Whole Foods", "Groceries");
  tx(PERSONAL, "pc", -36, "-92.10", "Osteria", "Dining");
  tx(PERSONAL, "pc", -40, "-145.00", "State Farm", "Insurance");

  // ── Acme Studio: revenue, payroll, opex, the owner-draw outflow ──────────
  tx(ACME, "ac", -20, "7500.00", "Retainer — Northwind", "Other Income");
  tx(ACME, "ac", -12, "4200.00", "Project — Globex", "Other Income");
  tx(ACME, "ac", -6, "3800.00", "Retainer — Initech", "Other Income");
  tx(ACME, "ac", -18, "-3200.00", "Payroll", "Payroll");
  tx(ACME, "ac", -17, "-1400.00", "Studio rent", "Office");
  tx(ACME, "ac", -15, "-289.00", "Adobe + Figma", "Subscriptions");
  tx(ACME, "acc", -14, "-450.00", "Freelance illustrator", "Fees");
  tx(ACME, "ac", -9, "-3200.00", "Payroll", "Payroll");
  tx(ACME, "ac", -8, "-6000.00", "Owner draw", "Owner Draw", "demo-bridge-acme-out");
  tx(ACME, "ac", -7, "-125.00", "Bank fees", "Fees");
  tx(ACME, "ac", -5, "-340.00", "Utilities", "Utilities");

  // ── Maple & Co: sales, materials, the owner-draw outflow ─────────────────
  tx(SIDECO, "sc", -16, "1200.00", "Etsy payout", "Other Income");
  tx(SIDECO, "sc", -6, "980.00", "Etsy payout", "Other Income");
  tx(SIDECO, "sc", -15, "-180.00", "Craft materials", "Shopping");
  tx(SIDECO, "sc", -11, "-45.50", "Shipping labels", "Fees");
  tx(SIDECO, "sc", -10, "-1500.00", "Owner draw", "Owner Draw", "demo-bridge-sideco-out");
  tx(SIDECO, "sc", -5, "-60.00", "Etsy seller fees", "Fees");

  const transfers: DemoTransfer[] = [
    { fromWorkspaceKey: ACME, toWorkspaceKey: PERSONAL, type: "owner_draw", amount: "6000.00", date: at(-8), fromTxnDedupe: "demo-bridge-acme-out", toTxnDedupe: "demo-bridge-acme" },
    { fromWorkspaceKey: SIDECO, toWorkspaceKey: PERSONAL, type: "owner_draw", amount: "1500.00", date: at(-10), fromTxnDedupe: "demo-bridge-sideco-out", toTxnDedupe: "demo-bridge-sideco" },
  ];

  const recurring: DemoRecurring[] = [
    { key: "rec-mortgage", workspaceKey: PERSONAL, frequency: "monthly", dayOfMonth: 1, startDate: at(-200), nextRunDate: at(8), templateVendor: "Mortgage", templateAmount: "1850.00", templateCategoryName: "Housing" },
    { key: "rec-internet", workspaceKey: PERSONAL, frequency: "monthly", dayOfMonth: 3, startDate: at(-200), nextRunDate: at(13), templateVendor: "Fiber Internet", templateAmount: "68.40", templateCategoryName: "Utilities" },
    { key: "rec-payroll", workspaceKey: ACME, frequency: "monthly", dayOfMonth: 15, startDate: at(-200), nextRunDate: at(6), templateVendor: "Payroll", templateAmount: "3200.00", templateCategoryName: "Payroll" },
  ];

  const bills: DemoBill[] = [
    { workspaceKey: PERSONAL, vendor: "City Water", amount: "78.50", dueDate: at(-3), status: "overdue", type: "bill", categoryName: "Utilities" },
    { workspaceKey: PERSONAL, vendor: "Mortgage", amount: "1850.00", dueDate: at(8), status: "unpaid", type: "bill", categoryName: "Housing", recurringKey: "rec-mortgage" },
    { workspaceKey: PERSONAL, vendor: "City Electric", amount: "142.30", dueDate: at(9), status: "unpaid", type: "bill", categoryName: "Utilities" },
    { workspaceKey: PERSONAL, vendor: "Fiber Internet", amount: "68.40", dueDate: at(13), status: "unpaid", type: "bill", categoryName: "Utilities", recurringKey: "rec-internet" },
    { workspaceKey: PERSONAL, vendor: "Chase Card", amount: "240.00", dueDate: at(16), status: "unpaid", type: "bill" },
    { workspaceKey: PERSONAL, vendor: "State Farm", amount: "145.00", dueDate: at(20), status: "unpaid", type: "bill", categoryName: "Insurance" },
    { workspaceKey: ACME, vendor: "SaaS renewal", amount: "289.00", dueDate: at(-2), status: "overdue", type: "bill", categoryName: "Subscriptions" },
    { workspaceKey: ACME, vendor: "Payroll", amount: "3200.00", dueDate: at(6), status: "unpaid", type: "payroll", categoryName: "Payroll", recurringKey: "rec-payroll" },
    { workspaceKey: ACME, vendor: "Contractor — Globex", amount: "1250.00", dueDate: at(11), status: "unpaid", type: "invoice", categoryName: "Fees" },
    { workspaceKey: ACME, vendor: "Quarterly taxes", amount: "5400.00", dueDate: at(20), status: "unpaid", type: "tax", categoryName: "Taxes" },
    { workspaceKey: SIDECO, vendor: "Yarn supplier", amount: "320.00", dueDate: at(14), status: "unpaid", type: "bill", categoryName: "Shopping" },
  ];

  const budgets: DemoBudget[] = [
    { workspaceKey: PERSONAL, categoryName: "Groceries", amount: "700.00" },
    { workspaceKey: PERSONAL, categoryName: "Dining", amount: "300.00" },
    { workspaceKey: PERSONAL, categoryName: "Transportation", amount: "250.00" },
    { workspaceKey: PERSONAL, categoryName: "Shopping", amount: "200.00" },
    { workspaceKey: PERSONAL, categoryName: "Utilities", amount: "350.00" },
    { workspaceKey: PERSONAL, categoryName: "Entertainment", amount: "150.00" },
    { workspaceKey: ACME, categoryName: "Payroll", amount: "7000.00" },
    { workspaceKey: ACME, categoryName: "Office", amount: "1500.00" },
    { workspaceKey: ACME, categoryName: "Subscriptions", amount: "400.00" },
    { workspaceKey: ACME, categoryName: "Fees", amount: "600.00" },
    { workspaceKey: SIDECO, categoryName: "Shopping", amount: "300.00" },
    { workspaceKey: SIDECO, categoryName: "Fees", amount: "150.00" },
  ];

  const goals: DemoGoal[] = [
    { workspaceKey: PERSONAL, name: "Emergency Fund", targetAmount: "15000.00", currentSaved: "9200.00", accountKey: "ps", targetDate: at(120) },
    { workspaceKey: PERSONAL, name: "Hawaii Trip", targetAmount: "6000.00", currentSaved: "2100.00", targetDate: at(210) },
    { workspaceKey: PERSONAL, name: "Home Down Payment", targetAmount: "40000.00", currentSaved: "12500.00", targetDate: at(600) },
    { workspaceKey: ACME, name: "Q3 Tax Reserve", targetAmount: "18000.00", currentSaved: "8000.00", accountKey: "ats", targetDate: at(70) },
  ];

  const debts: DemoDebt[] = [
    { workspaceKey: PERSONAL, name: "Everyday Card", type: "credit_card", currentBalance: "1240.00", apr: "19.99", minimumPayment: "45.00", dueDay: 15 },
    { workspaceKey: PERSONAL, name: "Auto Loan", type: "loan", currentBalance: "14500.00", apr: "5.90", minimumPayment: "380.00", dueDay: 5 },
    { workspaceKey: ACME, name: "Acme Card", type: "credit_card", currentBalance: "820.00", apr: "21.99", minimumPayment: "35.00", dueDay: 20 },
  ];

  const incomeSources: DemoIncomeSource[] = [
    { workspaceKey: PERSONAL, name: "Acme Studio draw", amount: "6000.00", frequency: "monthly", dayOfMonth: 14, nextDate: at(22) },
    { workspaceKey: PERSONAL, name: "Maple & Co draw", amount: "1500.00", frequency: "monthly", dayOfMonth: 12, nextDate: at(20) },
    { workspaceKey: ACME, name: "Client retainers", amount: "12000.00", frequency: "monthly", dayOfMonth: 1, nextDate: at(10) },
    { workspaceKey: SIDECO, name: "Etsy sales", amount: "2200.00", frequency: "monthly", dayOfMonth: 1, nextDate: at(10) },
  ];

  return { workspaces, accounts, transactions: txns, bills, recurring, budgets, goals, debts, incomeSources, transfers };
}

export const DEMO_ANCHOR_TODAY = (): CalendarDate => calendarDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
