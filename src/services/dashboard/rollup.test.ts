import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rollup } from "@/services/dashboard/rollup";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const owner = randomUUID();
let orgId: string;
let personalWs: string;
let businessWs: string;
const today = calendarDate("2026-06-20");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Rollup Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: owner, role: "owner" } });
  const personal = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Personal", type: "personal", color: "#111111" } });
  const business = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Business", type: "business", color: "#222222" } });
  personalWs = personal.id;
  businessWs = business.id;
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: personalWs, userId: owner, role: "admin" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: businessWs, userId: owner, role: "admin" } });
  const pAcc = await prismaAdmin.account.create({ data: { workspaceId: personalWs, name: "P", type: "checking", institution: "B", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  const bAcc = await prismaAdmin.account.create({ data: { workspaceId: businessWs, name: "B", type: "checking", institution: "B", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  const draw = toUtcDate(calendarDate("2026-06-15"));
  const inc = await prismaAdmin.transaction.create({ data: { workspaceId: personalWs, accountId: pAcc.id, date: draw, amount: "500.00", description: "Owner draw (income)", source: "manual", dedupeHash: "ru-i" } });
  const out = await prismaAdmin.transaction.create({ data: { workspaceId: businessWs, accountId: bAcc.id, date: draw, amount: "-500.00", description: "Owner draw", source: "manual", dedupeHash: "ru-o" } });
  await prismaAdmin.workspaceTransfer.create({
    data: { organizationId: orgId, fromWorkspaceId: businessWs, toWorkspaceId: personalWs, type: "owner_draw", amount: "500.00", date: draw, fromTransactionId: out.id, toTransactionId: inc.id },
  });
});

afterAll(async () => {
  await prismaAdmin.workspaceTransfer.deleteMany({ where: { organizationId: orgId } });
  await prismaAdmin.account.deleteMany({ where: { workspaceId: { in: [personalWs, businessWs] } } });
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("rollup", () => {
  it("nets owner draws out of the combined in/out total", async () => {
    const r = await rollup(owner, orgId, "month", today);
    const personal = r.rows.find((row) => row.workspaceId === personalWs)!;
    const business = r.rows.find((row) => row.workspaceId === businessWs)!;
    expect(format(personal.in)).toBe("$500.00"); // owner draw income shows per-workspace
    expect(format(business.out)).toBe("$500.00"); // and as a business outflow

    expect(format(r.combined.in)).toBe("$0.00"); // netted out
    expect(format(r.combined.out)).toBe("$0.00"); // netted out
    expect(format(r.combined.net)).toBe("$0.00"); // internal movement nets to zero
  });
});
