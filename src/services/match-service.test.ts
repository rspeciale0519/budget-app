import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { matchSuggestions } from "@/services/match-service";
import { ForbiddenError } from "@/services/authz";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;
let accountId: string;
const today = calendarDate("2026-07-01");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Match Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "Acme", type: "business", color: "#10b981" },
  });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acct = await prismaAdmin.account.create({
    data: {
      workspaceId, name: "Chk", type: "checking", institution: "B",
      openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")),
    },
  });
  accountId = acct.id;
  await prismaAdmin.bill.create({
    data: { workspaceId, vendor: "USPS Postage Account", amount: "2150.00", dueDate: toUtcDate(calendarDate("2026-07-03")), status: "unpaid", type: "bill" },
  });
  await prismaAdmin.transaction.createMany({
    data: [
      { workspaceId, accountId, date: toUtcDate(calendarDate("2026-07-03")), amount: "-2150.00", description: "USPS POSTAGE", merchant: "USPS", source: "manual", dedupeHash: "m1" },
      { workspaceId, accountId, date: toUtcDate(calendarDate("2026-07-02")), amount: "500.00", description: "Deposit", source: "manual", dedupeHash: "m2" },
      { workspaceId, accountId, date: toUtcDate(calendarDate("2026-07-02")), amount: "-90.00", description: "Coffee", source: "manual", dedupeHash: "m3" },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("matchSuggestions", () => {
  it("suggests the matching outflow for the bill", async () => {
    const s = await matchSuggestions(admin, workspaceId, today);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({
      vendor: "USPS Postage Account",
      txnDescription: "USPS POSTAGE",
      amount: "$2,150.00",
    });
  });

  it("denies a non-member", async () => {
    await expect(matchSuggestions(stranger, workspaceId, today)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
