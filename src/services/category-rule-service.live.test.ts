import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  createRule,
  listRules,
  updateRule,
  deleteRule,
  countUncategorizedMatching,
  applyCategoryToMatching,
} from "@/services/category-rule-service";
import { ForbiddenError } from "@/services/authz";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;
let accountId: string;
let catId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Rule Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#123456" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  accountId = acc.id;
  const cat = await prismaAdmin.category.create({ data: { workspaceId, name: "Streaming", kind: "expense" } });
  catId = cat.id;
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("category-rule-service CRUD", () => {
  it("creates, lists, updates, and deletes a rule; blocks non-admins", async () => {
    const rule = await createRule(admin, workspaceId, { match: "contains", pattern: "NETFLIX", categoryId: catId, priority: 0 });
    expect((await listRules(admin, workspaceId)).map((r) => r.pattern)).toContain("NETFLIX");

    await updateRule(admin, rule.id, { pattern: "NETFLIX.COM" });
    const afterUpdate = (await listRules(admin, workspaceId)).find((r) => r.id === rule.id);
    expect(afterUpdate?.pattern).toBe("NETFLIX.COM");

    await expect(deleteRule(stranger, rule.id)).rejects.toBeInstanceOf(ForbiddenError);

    await deleteRule(admin, rule.id);
    expect((await listRules(admin, workspaceId)).some((r) => r.id === rule.id)).toBe(false);
  });
});

describe("applyCategoryToMatching", () => {
  it("categorizes only uncategorized, non-transfer matches and never overwrites", async () => {
    const mk = (description: string, opts: { categoryId?: string; isTransfer?: boolean } = {}, i = 0) =>
      prismaAdmin.transaction.create({
        data: {
          workspaceId,
          accountId,
          date: toUtcDate(calendarDate("2026-06-10")),
          amount: "-9.99",
          description,
          source: "manual",
          dedupeHash: `rule-${description}-${i}-${randomUUID()}`,
          categoryId: opts.categoryId ?? null,
          isTransfer: opts.isTransfer ?? false,
        },
      });

    await mk("NETFLIX charge one", {}, 1);
    await mk("NETFLIX charge two", {}, 2);
    await mk("NETFLIX already set", { categoryId: catId }, 3); // must be left alone
    await mk("NETFLIX transfer", { isTransfer: true }, 4); // transfers excluded
    await mk("Grocery run", {}, 5); // non-match

    const count = await countUncategorizedMatching(admin, workspaceId, "NETFLIX");
    expect(count).toBe(2);

    const applied = await applyCategoryToMatching(admin, workspaceId, "NETFLIX", catId);
    expect(applied).toBe(2);

    // Running again finds nothing new (the two are now categorized).
    expect(await applyCategoryToMatching(admin, workspaceId, "NETFLIX", catId)).toBe(0);
  });
});
