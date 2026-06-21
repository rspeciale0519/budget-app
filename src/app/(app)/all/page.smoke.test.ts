import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rollup } from "@/services/dashboard/rollup";
import { calendarDate } from "@/lib/calendar-date";

const owner = randomUUID();
let orgId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "All Page Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: owner, role: "owner" } });
  for (const name of ["Personal", "Business"]) {
    const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name, type: "business", color: "#123456" } });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws.id, userId: owner, role: "admin" } });
  }
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("/all roll-up page data path", () => {
  it("returns a row per workspace plus a combined total", async () => {
    const data = await rollup(owner, orgId, "month", calendarDate("2026-06-20"));
    expect(data.rows).toHaveLength(2);
    expect(data.rows.map((r) => r.name).sort()).toEqual(["Business", "Personal"]);
    expect(data.combined).toBeDefined();
    expect(typeof data.combined.net.toFixed).toBe("function"); // a Money value
  });
});
