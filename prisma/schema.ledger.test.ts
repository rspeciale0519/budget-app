import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prismaAdmin } from "@/lib/prisma-admin";
import { calendarDate, toUtcDate, fromDbDate } from "@/lib/calendar-date";

const createdAccountIds: string[] = [];

afterAll(async () => {
  await prismaAdmin.account.deleteMany({ where: { id: { in: createdAccountIds } } });
  await prismaAdmin.$disconnect();
});

describe("ledger schema", () => {
  it("stores money as Decimal and dates as calendar dates", async () => {
    const workspaceId = randomUUID();
    const account = await prismaAdmin.account.create({
      data: {
        workspaceId,
        name: "Checking",
        type: "checking",
        institution: "Acme Bank",
        openingBalance: "100.00",
        openingDate: toUtcDate(calendarDate("2026-01-01")),
        currency: "USD",
      },
    });
    createdAccountIds.push(account.id);

    const outflow = await prismaAdmin.transaction.create({
      data: {
        workspaceId,
        accountId: account.id,
        date: toUtcDate(calendarDate("2026-06-20")),
        amount: "-25.50",
        description: "Coffee",
        source: "manual",
        dedupeHash: "h1",
      },
    });
    await prismaAdmin.transaction.create({
      data: {
        workspaceId,
        accountId: account.id,
        date: toUtcDate(calendarDate("2026-06-21")),
        amount: "10.00",
        description: "Transfer in",
        source: "manual",
        dedupeHash: "h2",
        isTransfer: true,
      },
    });

    expect(Prisma.Decimal.isDecimal(account.openingBalance)).toBe(true);
    expect(account.openingBalance.toFixed(2)).toBe("100.00");
    expect(outflow.amount.toFixed(2)).toBe("-25.50");
    expect(fromDbDate(outflow.date)).toBe("2026-06-20");

    const readback = await prismaAdmin.account.findUniqueOrThrow({
      where: { id: account.id },
      include: { transactions: { orderBy: { date: "asc" } } },
    });
    expect(readback.transactions).toHaveLength(2);
    expect(readback.transactions[1]?.isTransfer).toBe(true);
    expect(fromDbDate(readback.openingDate)).toBe("2026-01-01");
  });

  it("supports a category hierarchy", async () => {
    const workspaceId = randomUUID();
    const account = await prismaAdmin.account.create({
      data: {
        workspaceId,
        name: "Cash",
        type: "cash",
        institution: "Wallet",
        openingBalance: "0.00",
        openingDate: toUtcDate(calendarDate("2026-01-01")),
      },
    });
    createdAccountIds.push(account.id);
    const parent = await prismaAdmin.category.create({
      data: { workspaceId, name: "Food", kind: "expense" },
    });
    const child = await prismaAdmin.category.create({
      data: { workspaceId, name: "Coffee", kind: "expense", parentId: parent.id },
    });
    const readChild = await prismaAdmin.category.findUniqueOrThrow({
      where: { id: child.id },
      include: { parent: true },
    });
    expect(readChild.parent?.name).toBe("Food");
  });
});
