import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { exportTransactionsCsv, exportBillsCsv, exportRollupCsv } from "@/services/export-service";
import { ForbiddenError } from "@/services/authz";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Export Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#010101" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "100.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  await prismaAdmin.transaction.create({ data: { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-06-20")), amount: "-30.00", description: "Coffee, large", source: "manual", dedupeHash: "e1" } });
  await prismaAdmin.bill.create({ data: { workspaceId, vendor: "Electric", amount: "50.00", dueDate: toUtcDate(calendarDate("2026-07-01")), status: "unpaid", type: "bill" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("export-service", () => {
  it("exports transactions with plain decimal amounts and calendar dates, CSV-escaped", async () => {
    const csv = await exportTransactionsCsv(admin, workspaceId);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("date,description,merchant,amount,categoryId,isTransfer,source");
    expect(lines[1]).toContain("2026-06-20");
    expect(lines[1]).toContain("-30.00");
    expect(lines[1]).toContain('"Coffee, large"'); // comma triggers quoting
  });

  it("exports bills", async () => {
    const csv = await exportBillsCsv(admin, workspaceId);
    expect(csv.split("\n")[0]).toBe("vendor,amount,dueDate,status,type");
    expect(csv).toContain("Electric,50.00,2026-07-01,unpaid,bill");
  });

  it("rolls up per-workspace balance and unpaid bills", async () => {
    const csv = await exportRollupCsv(admin, orgId);
    expect(csv.split("\n")[0]).toBe("workspace,type,balance,unpaidBills");
    expect(csv).toContain("W,business,70.00,50.00"); // 100 - 30 = 70 balance; 50 unpaid
  });

  it("denies export to a non-member", async () => {
    await expect(exportTransactionsCsv(stranger, workspaceId)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
