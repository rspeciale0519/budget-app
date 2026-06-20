import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rlsClientFor } from "@/lib/prisma-rls";
import { tagOwnerDraw } from "@/services/transfer-service";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const owner = randomUUID(); // member of both
const bizOnly = randomUUID(); // member of business only
let orgId: string;
let businessWs: string;
let personalWs: string;
let bizAccount: string;
let personalAccount: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Bridge Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: owner, role: "owner" } });
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: bizOnly, role: "member" } });
  const biz = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Biz", type: "business", color: "#030303" } });
  const personal = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Personal", type: "personal", color: "#020202" } });
  businessWs = biz.id;
  personalWs = personal.id;
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: businessWs, userId: owner, role: "admin" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: personalWs, userId: owner, role: "admin" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: businessWs, userId: bizOnly, role: "admin" } });
  const ba = await prismaAdmin.account.create({ data: { workspaceId: businessWs, name: "Biz Chk", type: "checking", institution: "Bank", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  const pa = await prismaAdmin.account.create({ data: { workspaceId: personalWs, name: "Per Chk", type: "checking", institution: "Bank", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  bizAccount = ba.id;
  personalAccount = pa.id;
});

afterAll(async () => {
  await prismaAdmin.workspaceTransfer.deleteMany({ where: { organizationId: orgId } });
  await prismaAdmin.account.deleteMany({ where: { workspaceId: { in: [businessWs, personalWs] } } });
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("income bridge", () => {
  it("creates linked outflow + income + transfer atomically", async () => {
    const result = await tagOwnerDraw(owner, {
      fromWorkspaceId: businessWs,
      fromAccountId: bizAccount,
      toWorkspaceId: personalWs,
      toAccountId: personalAccount,
      amount: "500.00",
      date: "2026-06-20",
    });
    const outflow = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: result.fromTransactionId } });
    const income = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: result.toTransactionId } });
    expect(outflow.amount.toFixed(2)).toBe("-500.00");
    expect(outflow.workspaceId).toBe(businessWs);
    expect(income.amount.toFixed(2)).toBe("500.00");
    expect(income.workspaceId).toBe(personalWs);
  });

  it("hides the transfer and the Personal income from a business-only member", async () => {
    const transfers = await rlsClientFor(bizOnly).run((tx) => tx.workspaceTransfer.findMany());
    expect(transfers).toHaveLength(0);
    const personalRows = await rlsClientFor(bizOnly).run((tx) =>
      tx.transaction.findMany({ where: { workspaceId: personalWs } }),
    );
    expect(personalRows).toHaveLength(0);
    // …but the business outflow is visible to them.
    const bizRows = await rlsClientFor(bizOnly).run((tx) =>
      tx.transaction.findMany({ where: { workspaceId: businessWs } }),
    );
    expect(bizRows.length).toBeGreaterThanOrEqual(1);
  });

  it("rolls back entirely when the source transaction is invalid", async () => {
    const before = await prismaAdmin.workspaceTransfer.count({ where: { organizationId: orgId } });
    await expect(
      tagOwnerDraw(owner, {
        fromWorkspaceId: businessWs,
        toWorkspaceId: personalWs,
        toAccountId: personalAccount,
        fromTransactionId: "does-not-exist",
      }),
    ).rejects.toThrow();
    const after = await prismaAdmin.workspaceTransfer.count({ where: { organizationId: orgId } });
    expect(after).toBe(before);
  });
});
