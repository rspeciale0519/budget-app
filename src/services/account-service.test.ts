import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { createAccount, listAccounts, getAccountBalance, archiveAccount } from "@/services/account-service";
import { ForbiddenError } from "@/services/authz";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Acct Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "W", type: "business", color: "#1a1a1a" },
  });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
});

afterAll(async () => {
  await prismaAdmin.account.deleteMany({ where: { workspaceId } });
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("account-service", () => {
  it("computes balance = opening + Σ transactions", async () => {
    const acc = await createAccount(admin, workspaceId, {
      name: "Checking",
      type: "checking",
      institution: "Bank",
      openingBalance: "100.00",
      openingDate: "2026-01-01",
    });
    await prismaAdmin.transaction.createMany({
      data: [
        { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-06-01")), amount: "-25.50", description: "a", source: "manual", dedupeHash: "x1" },
        { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-06-02")), amount: "10.00", description: "b", source: "manual", dedupeHash: "x2" },
      ],
    });
    expect(format(await getAccountBalance(admin, acc.id))).toBe("$84.50");
  });

  it("an empty account's balance equals its opening balance", async () => {
    const acc = await createAccount(admin, workspaceId, {
      name: "Savings",
      type: "savings",
      institution: "Bank",
      openingBalance: "1000.00",
      openingDate: "2026-01-01",
    });
    expect(format(await getAccountBalance(admin, acc.id))).toBe("$1,000.00");
  });

  it("excludes archived accounts from the list and denies non-members", async () => {
    const acc = await createAccount(admin, workspaceId, {
      name: "Temp",
      type: "cash",
      institution: "Wallet",
      openingBalance: "0.00",
      openingDate: "2026-01-01",
    });
    await archiveAccount(admin, acc.id);
    const list = await listAccounts(admin, workspaceId);
    expect(list.map((a) => a.id)).not.toContain(acc.id);

    await expect(
      createAccount(stranger, workspaceId, {
        name: "Nope",
        type: "checking",
        institution: "Bank",
        openingBalance: "0.00",
        openingDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
