import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rlsClientFor } from "@/lib/prisma-rls";
import { saveLayout, listLayouts, deleteLayout } from "@/services/layout-service";
import type { PaneConfig } from "@/lib/zod/layout";

const owner = randomUUID();
const other = randomUUID();
let orgId: string;

const rowAB: PaneConfig = {
  type: "split",
  direction: "row",
  children: [
    { type: "leaf", workspaceId: "a" },
    { type: "leaf", workspaceId: "b" },
  ],
};

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Layout Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: owner, role: "owner" } });
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: other, role: "member" } });
});

afterAll(async () => {
  await prismaAdmin.layout.deleteMany({ where: { organizationId: orgId } });
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("layout-service", () => {
  it("saves and lists a layout with a parsed config", async () => {
    const saved = await saveLayout(owner, orgId, "Morning review", rowAB);
    expect(saved.config).toEqual(rowAB);
    const list = await listLayouts(owner, orgId);
    const found = list.find((l) => l.id === saved.id);
    expect(found?.name).toBe("Morning review");
    expect(found?.config).toEqual(rowAB); // parsed back to a PaneConfig, not raw JSON
  });

  it("saving the same name updates in place (no duplicate row)", async () => {
    await saveLayout(owner, orgId, "Dup", rowAB);
    await saveLayout(owner, orgId, "Dup", { ...rowAB, sizes: [70, 30] });
    const list = (await listLayouts(owner, orgId)).filter((l) => l.name === "Dup");
    expect(list).toHaveLength(1);
    expect(list[0]?.config).toMatchObject({ sizes: [70, 30] });
  });

  it("a second user cannot see another user's layouts (RLS)", async () => {
    await saveLayout(owner, orgId, "Private", rowAB);
    const seen = await rlsClientFor(other).run((tx) => tx.layout.findMany({ where: { organizationId: orgId } }));
    expect(seen).toHaveLength(0);
  });

  it("deletes a layout", async () => {
    const saved = await saveLayout(owner, orgId, "Temp", rowAB);
    await deleteLayout(owner, saved.id);
    const list = await listLayouts(owner, orgId);
    expect(list.map((l) => l.id)).not.toContain(saved.id);
  });

  it("rejects an invalid config", async () => {
    await expect(
      saveLayout(owner, orgId, "Bad", { type: "split", direction: "diagonal", children: [] } as never),
    ).rejects.toThrow();
  });
});
