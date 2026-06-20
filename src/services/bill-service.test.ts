import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { createBill, markPaid, markUnpaid, upcomingAndOverdue } from "@/services/bill-service";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;
let accountId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Bill Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#060606" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  accountId = acc.id;
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("bill-service", () => {
  it("marks a bill paid standalone, creating a linked paying transaction atomically", async () => {
    const bill = await createBill(admin, workspaceId, { vendor: "Electric", amount: "120.00", dueDate: "2026-07-01", type: "bill" });
    const paid = await markPaid(admin, bill.id, { payFromAccountId: accountId });
    expect(paid.status).toBe("paid");
    expect(paid.paidTransactionId).not.toBeNull();
    const tx = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: paid.paidTransactionId! } });
    expect(tx.amount.toFixed(2)).toBe("-120.00");
    expect(tx.billId).toBe(bill.id);
  });

  it("links an existing transaction when marking paid", async () => {
    const bill = await createBill(admin, workspaceId, { vendor: "Water", amount: "40.00", dueDate: "2026-07-01", type: "bill" });
    const tx = await prismaAdmin.transaction.create({ data: { workspaceId, accountId, date: toUtcDate(calendarDate("2026-07-01")), amount: "-40.00", description: "Water", source: "manual", dedupeHash: "wtr1" } });
    const paid = await markPaid(admin, bill.id, { transactionId: tx.id });
    expect(paid.paidTransactionId).toBe(tx.id);
    const reread = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(reread.billId).toBe(bill.id);
  });

  it("reverses with markUnpaid", async () => {
    const bill = await createBill(admin, workspaceId, { vendor: "Gas", amount: "60.00", dueDate: "2026-07-01", type: "bill" });
    const paid = await markPaid(admin, bill.id, { payFromAccountId: accountId });
    const txId = paid.paidTransactionId!;
    const unpaid = await markUnpaid(admin, bill.id);
    expect(unpaid.status).toBe("unpaid");
    expect(unpaid.paidTransactionId).toBeNull();
    const tx = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: txId } });
    expect(tx.billId).toBeNull();
  });

  it("splits bills into overdue vs upcoming by calendar date", async () => {
    const ws2 = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "P", type: "business", color: "#050505" } });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws2.id, userId: admin, role: "admin" } });
    await createBill(admin, ws2.id, { vendor: "Past", amount: "10.00", dueDate: "2026-06-01", type: "bill" });
    await createBill(admin, ws2.id, { vendor: "Soon", amount: "10.00", dueDate: "2026-06-22", type: "bill" });
    const buckets = await upcomingAndOverdue(admin, ws2.id, calendarDate("2026-06-20"));
    expect(buckets.overdue.map((b) => b.vendor)).toContain("Past");
    expect(buckets.next7.map((b) => b.vendor)).toContain("Soon");
    expect(buckets.overdue.map((b) => b.vendor)).not.toContain("Soon");
  });
});
