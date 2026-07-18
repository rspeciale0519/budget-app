import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  createTransaction,
  deleteTransaction,
  flagTransfer,
  listTransactions,
} from "@/services/transaction-service";
import { createRule } from "@/services/category-rule-service";
import { toUtcDate, calendarDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;
let accountId: string;
let groceriesId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Tx Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "W", type: "business", color: "#090909" },
  });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({
    data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) },
  });
  accountId = acc.id;
  const cat = await prismaAdmin.category.create({ data: { workspaceId, name: "Groceries", kind: "expense" } });
  groceriesId = cat.id;
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("transaction-service", () => {
  it("computes a dedupeHash and applies category rules on create", async () => {
    await createRule(admin, workspaceId, { match: "contains", pattern: "market", categoryId: groceriesId, priority: 1 });
    const tx = await createTransaction(admin, workspaceId, {
      accountId,
      date: "2026-06-20",
      amount: "-30.00",
      description: "Corner Market",
    });
    expect(tx.dedupeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tx.categoryId).toBe(groceriesId);
  });

  it("links a transfer pair and flags both", async () => {
    const a = await createTransaction(admin, workspaceId, { accountId, date: "2026-06-21", amount: "-100.00", description: "to savings" });
    const b = await createTransaction(admin, workspaceId, { accountId, date: "2026-06-21", amount: "100.00", description: "from checking" });
    await flagTransfer(admin, a.id, b.id);
    const reread = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: a.id } });
    const rereadB = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: b.id } });
    expect(reread.isTransfer).toBe(true);
    expect(reread.transferPairId).toBe(b.id);
    expect(rereadB.transferPairId).toBe(a.id);
  });

  it("reopens a bill when its paying transaction is deleted", async () => {
    const tx = await createTransaction(admin, workspaceId, { accountId, date: "2026-06-22", amount: "-50.00", description: "pay bill" });
    const bill = await prismaAdmin.bill.create({
      data: { workspaceId, vendor: "Electric", amount: "50.00", dueDate: toUtcDate(calendarDate("2026-06-25")), status: "paid", type: "bill", paidTransactionId: tx.id },
    });
    await deleteTransaction(admin, tx.id);
    const reread = await prismaAdmin.bill.findUniqueOrThrow({ where: { id: bill.id } });
    expect(reread.status).toBe("unpaid");
    expect(reread.paidTransactionId).toBeNull();
  });

  it("paginates", async () => {
    const ws2 = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "P", type: "business", color: "#070707" } });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws2.id, userId: admin, role: "admin" } });
    const acc2 = await prismaAdmin.account.create({ data: { workspaceId: ws2.id, name: "A", type: "cash", institution: "x", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
    for (let i = 0; i < 3; i++) {
      await createTransaction(admin, ws2.id, { accountId: acc2.id, date: "2026-06-20", amount: "-1.00", description: `t${i}` });
    }
    const page1 = await listTransactions(admin, ws2.id, { page: 1, pageSize: 2 });
    const page2 = await listTransactions(admin, ws2.id, { page: 2, pageSize: 2 });
    expect(page1.rows).toHaveLength(2);
    expect(page2.rows).toHaveLength(1);
    expect(page1.total).toBe(3);
  });

  it("filters by search text, uncategorized, and account", async () => {
    const ws3 = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "F", type: "business", color: "#070708" } });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws3.id, userId: admin, role: "admin" } });
    const acc3 = await prismaAdmin.account.create({ data: { workspaceId: ws3.id, name: "A3", type: "cash", institution: "x", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
    const cat = await prismaAdmin.category.create({ data: { workspaceId: ws3.id, name: "Fuel", kind: "expense" } });

    await createTransaction(admin, ws3.id, { accountId: acc3.id, date: "2026-06-20", amount: "-40.00", description: "COSTCO GAS", categoryId: cat.id });
    await createTransaction(admin, ws3.id, { accountId: acc3.id, date: "2026-06-21", amount: "-15.99", description: "Netflix" });
    await createTransaction(admin, ws3.id, { accountId: acc3.id, date: "2026-06-22", amount: "-5.00", description: "Misc" });

    const bySearch = await listTransactions(admin, ws3.id, { search: "costco" });
    expect(bySearch.total).toBe(1);
    expect(bySearch.rows[0]!.description).toBe("COSTCO GAS");

    const uncategorized = await listTransactions(admin, ws3.id, { uncategorized: true });
    expect(uncategorized.total).toBe(2); // Netflix and Misc have no category
    expect(uncategorized.rows.every((r) => r.categoryId === null)).toBe(true);

    const byCategory = await listTransactions(admin, ws3.id, { categoryId: cat.id });
    expect(byCategory.total).toBe(1);

    const byAccount = await listTransactions(admin, ws3.id, { accountId: acc3.id });
    expect(byAccount.total).toBe(3);
  });
});
