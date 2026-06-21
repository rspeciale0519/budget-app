import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { paneSummaries } from "@/services/dashboard/pane-summary";
import { defaultLayout, collectWorkspaceIds } from "@/lib/pane-tree";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let wsA: string;
let wsB: string;
const today = calendarDate("2026-06-20");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Tiles Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  for (const [name, color] of [["Personal", "#6366f1"], ["Acme", "#10b981"]] as const) {
    const ws = await prismaAdmin.workspace.create({
      data: { organizationId: orgId, name, type: "business", color },
    });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws.id, userId: admin, role: "admin" } });
    await prismaAdmin.account.create({
      data: {
        workspaceId: ws.id, name: "Chk", type: "checking", institution: "Bank",
        openingBalance: "2000.00", openingDate: toUtcDate(calendarDate("2026-01-01")),
      },
    });
    if (name === "Personal") wsA = ws.id;
    else wsB = ws.id;
  }
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("/tiles data path", () => {
  it("builds a default layout over the accessible workspaces and resolves a summary per leaf", async () => {
    const config = defaultLayout([wsA, wsB]);
    const ids = collectWorkspaceIds(config);
    expect(ids).toEqual([wsA, wsB]);

    const summaries = await paneSummaries(admin, ids, today);
    expect(Object.keys(summaries).sort()).toEqual([wsA, wsB].sort());
    expect(summaries[wsA]?.name).toBe("Personal");
    expect(summaries[wsB]?.name).toBe("Acme");
    expect(summaries[wsA]?.balance).toBe("$2,000.00");
  });
});
