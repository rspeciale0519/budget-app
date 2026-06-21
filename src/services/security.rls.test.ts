import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { prisma } from "@/lib/prisma";
import { rlsClientFor } from "@/lib/prisma-rls";
import { toUtcDate, calendarDate } from "@/lib/calendar-date";

// userA owns everything (org owner; member of both workspaces).
// userB is business-only (org member; member of the Business workspace only).
const userA = randomUUID();
const userB = randomUUID();

let orgId: string;
let personalWs: string;
let businessWs: string;
let personalTxId: string;
let businessTxId: string;
let transferId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "RLS Test Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({
    data: { organizationId: orgId, userId: userA, role: "owner" },
  });
  await prismaAdmin.orgMembership.create({
    data: { organizationId: orgId, userId: userB, role: "member" },
  });

  const personal = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "Personal", type: "personal", color: "#111111" },
  });
  const business = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "Business", type: "business", color: "#222222" },
  });
  personalWs = personal.id;
  businessWs = business.id;

  await prismaAdmin.workspaceMembership.create({
    data: { workspaceId: personalWs, userId: userA, role: "admin" },
  });
  await prismaAdmin.workspaceMembership.create({
    data: { workspaceId: businessWs, userId: userA, role: "admin" },
  });
  await prismaAdmin.workspaceMembership.create({
    data: { workspaceId: businessWs, userId: userB, role: "admin" },
  });

  const pAcc = await prismaAdmin.account.create({
    data: {
      workspaceId: personalWs,
      name: "P Checking",
      type: "checking",
      institution: "Bank",
      openingBalance: "0.00",
      openingDate: toUtcDate(calendarDate("2026-01-01")),
    },
  });
  const bAcc = await prismaAdmin.account.create({
    data: {
      workspaceId: businessWs,
      name: "B Checking",
      type: "checking",
      institution: "Bank",
      openingBalance: "0.00",
      openingDate: toUtcDate(calendarDate("2026-01-01")),
    },
  });

  const pTx = await prismaAdmin.transaction.create({
    data: {
      workspaceId: personalWs,
      accountId: pAcc.id,
      date: toUtcDate(calendarDate("2026-06-20")),
      amount: "500.00",
      description: "Owner draw income",
      source: "manual",
      dedupeHash: "p1",
    },
  });
  const bTx = await prismaAdmin.transaction.create({
    data: {
      workspaceId: businessWs,
      accountId: bAcc.id,
      date: toUtcDate(calendarDate("2026-06-20")),
      amount: "-500.00",
      description: "Owner draw",
      source: "manual",
      dedupeHash: "b1",
    },
  });
  personalTxId = pTx.id;
  businessTxId = bTx.id;

  const transfer = await prismaAdmin.workspaceTransfer.create({
    data: {
      organizationId: orgId,
      fromWorkspaceId: businessWs,
      toWorkspaceId: personalWs,
      type: "owner_draw",
      amount: "500.00",
      date: toUtcDate(calendarDate("2026-06-20")),
      fromTransactionId: bTx.id,
      toTransactionId: pTx.id,
    },
  });
  transferId = transfer.id;
});

afterAll(async () => {
  await prismaAdmin.workspaceTransfer.deleteMany({ where: { organizationId: orgId } });
  await prismaAdmin.account.deleteMany({ where: { workspaceId: { in: [personalWs, businessWs] } } });
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
  await prisma.$disconnect();
});

describe("cross-workspace RLS isolation", () => {
  it("a business-only user reads ZERO Personal transactions", async () => {
    const rows = await rlsClientFor(userB).run((tx) =>
      tx.transaction.findMany({ where: { workspaceId: personalWs } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("a business-only user cannot read a Personal transaction by id", async () => {
    const row = await rlsClientFor(userB).run((tx) =>
      tx.transaction.findUnique({ where: { id: personalTxId } }),
    );
    expect(row).toBeNull();
  });

  it("a business-only user still sees the Business-side outflow", async () => {
    const row = await rlsClientFor(userB).run((tx) =>
      tx.transaction.findUnique({ where: { id: businessTxId } }),
    );
    expect(row?.id).toBe(businessTxId);
  });

  it("a business-only user cannot see the cross-workspace transfer AT ALL", async () => {
    const rows = await rlsClientFor(userB).run((tx) => tx.workspaceTransfer.findMany());
    expect(rows).toHaveLength(0);
  });

  it("the owner (member of both sides) sees the transfer", async () => {
    const rows = await rlsClientFor(userA).run((tx) =>
      tx.workspaceTransfer.findMany({ where: { id: transferId } }),
    );
    expect(rows).toHaveLength(1);
  });

  it("a business-only user reads ZERO Personal accounts", async () => {
    const rows = await rlsClientFor(userB).run((tx) =>
      tx.account.findMany({ where: { workspaceId: personalWs } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("a claimless connection sees nothing", async () => {
    const rows = await prisma.transaction.findMany({
      where: { workspaceId: { in: [personalWs, businessWs] } },
    });
    expect(rows).toHaveLength(0);
  });
});
