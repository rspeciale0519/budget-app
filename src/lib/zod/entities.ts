import { z } from "zod";
import {
  WorkspaceType,
  AccountType,
  CategoryKind,
  BillType,
  TransferType,
  SignRule,
  MatchKind,
} from "@prisma/client";
import { zMoney, zCalendarDate } from "@/lib/zod/money";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a #RRGGBB hex color");

// ── Workspace ──────────────────────────────────────────────────────────────
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.nativeEnum(WorkspaceType),
  color: hexColor,
  icon: z.string().max(40).optional(),
});
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: hexColor.optional(),
  icon: z.string().max(40).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

// ── Account ────────────────────────────────────────────────────────────────
export const createAccountSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.nativeEnum(AccountType),
  institution: z.string().min(1).max(80),
  last4: z.string().regex(/^\d{4}$/).optional(),
  openingBalance: zMoney,
  openingDate: zCalendarDate,
  currency: z.string().length(3).default("USD"),
});
export const updateAccountSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  institution: z.string().min(1).max(80).optional(),
  last4: z.string().regex(/^\d{4}$/).nullable().optional(),
});

// ── Category & rules ─────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  kind: z.nativeEnum(CategoryKind),
  parentId: z.string().optional(),
});
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(60),
});
export const categoryRuleSchema = z.object({
  match: z.nativeEnum(MatchKind),
  pattern: z.string().min(1),
  categoryId: z.string().min(1),
  priority: z.number().int().min(0).default(0),
});

// ── Transaction ──────────────────────────────────────────────────────────────
export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  date: zCalendarDate,
  amount: zMoney,
  description: z.string().min(1).max(200),
  merchant: z.string().max(120).optional(),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
  isTransfer: z.boolean().default(false),
});
export const updateTransactionSchema = z.object({
  date: zCalendarDate.optional(),
  amount: zMoney.optional(),
  description: z.string().min(1).max(200).optional(),
  merchant: z.string().max(120).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  isTransfer: z.boolean().optional(),
});

// ── Bill ─────────────────────────────────────────────────────────────────────
export const createBillSchema = z.object({
  vendor: z.string().min(1).max(120),
  amount: zMoney,
  dueDate: zCalendarDate,
  type: z.nativeEnum(BillType).default("bill"),
  categoryId: z.string().optional(),
  payFromAccountId: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export const markBillPaidSchema = z
  .object({
    transactionId: z.string().optional(),
    payFromAccountId: z.string().optional(),
  })
  .refine((v) => Boolean(v.transactionId) !== Boolean(v.payFromAccountId), {
    message: "Provide exactly one of transactionId or payFromAccountId",
  });

// ── Import ───────────────────────────────────────────────────────────────────
export const importMappingSchema = z.object({
  columnMap: z.record(z.string(), z.string()),
  signRule: z.nativeEnum(SignRule),
  dateFormat: z.string().min(1),
});
/** A raw CSV row: arbitrary string columns keyed by header. */
export const csvRowSchema = z.record(z.string(), z.string());

// ── Income bridge ────────────────────────────────────────────────────────────
export const tagOwnerDrawSchema = z
  .object({
    fromWorkspaceId: z.string().min(1),
    toWorkspaceId: z.string().min(1),
    type: z.nativeEnum(TransferType).default("owner_draw"),
    amount: zMoney.optional(),
    date: zCalendarDate.optional(),
    fromTransactionId: z.string().optional(),
  })
  .refine((v) => v.fromWorkspaceId !== v.toWorkspaceId, {
    message: "from and to workspaces must differ",
  })
  .refine((v) => Boolean(v.fromTransactionId) || (Boolean(v.amount) && Boolean(v.date)), {
    message: "Provide fromTransactionId, or both amount and date",
  });

export type CreateWorkspaceInput = z.input<typeof createWorkspaceSchema>;
export type CreateAccountInput = z.input<typeof createAccountSchema>;
export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type CreateBillInput = z.input<typeof createBillSchema>;
