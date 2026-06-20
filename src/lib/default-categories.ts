import type { CategoryKind } from "@prisma/client";

/** Seeded into each new workspace. Transfers are handled via isTransfer, not a category. */
export const DEFAULT_CATEGORIES: { name: string; kind: CategoryKind }[] = [
  { name: "Salary", kind: "income" },
  { name: "Owner Draw", kind: "income" },
  { name: "Other Income", kind: "income" },
  { name: "Housing", kind: "expense" },
  { name: "Utilities", kind: "expense" },
  { name: "Groceries", kind: "expense" },
  { name: "Dining", kind: "expense" },
  { name: "Transportation", kind: "expense" },
  { name: "Insurance", kind: "expense" },
  { name: "Healthcare", kind: "expense" },
  { name: "Entertainment", kind: "expense" },
  { name: "Shopping", kind: "expense" },
  { name: "Subscriptions", kind: "expense" },
  { name: "Taxes", kind: "expense" },
  { name: "Payroll", kind: "expense" },
  { name: "Fees", kind: "expense" },
  { name: "Office", kind: "expense" },
  { name: "Other", kind: "expense" },
];
