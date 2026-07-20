import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { listAccessibleWorkspaces } from "@/services/authz";
import { listTransactions } from "@/services/transaction-service";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

// The palette search action is a thin wrapper over listAccessibleWorkspaces +
// listTransactions({search}) — those two seams are what this test locks down
// (the action itself needs a request-scoped Supabase session, so it's exercised
// in the browser pass).
const member = randomUUID();
const outsider = randomUUID();
let orgId: string;
let wsA: string;
let wsB: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Search Org" } });
  orgId = org.id;
  const a = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Book A", type: "personal", color: "#111111" } });
  const b = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Book B", type: "business", color: "#222222" } });
  wsA = a.id;
  wsB = b.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: member, role: "owner" } });
  await prismaAdmin.workspaceMembership.createMany({
    data: [
      { workspaceId: wsA, userId: member, role: "admin" },
      { workspaceId: wsB, userId: member, role: "admin" },
    ],
  });
  const accA = await prismaAdmin.account.create({ data: { workspaceId: wsA, name: "A Chk", type: "checking", institution: "X", openingBalance: "0", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  const accB = await prismaAdmin.account.create({ data: { workspaceId: wsB, name: "B Chk", type: "checking", institution: "X", openingBalance: "0", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  await prismaAdmin.transaction.createMany({
    data: [
      { workspaceId: wsA, accountId: accA.id, date: toUtcDate(calendarDate("2026-07-01")), amount: "-12.00", description: "ZANZIBAR COFFEE personal", source: "manual", dedupeHash: `s-${randomUUID()}` },
      { workspaceId: wsB, accountId: accB.id, date: toUtcDate(calendarDate("2026-07-02")), amount: "-99.00", description: "ZANZIBAR COFFEE business", source: "manual", dedupeHash: `s-${randomUUID()}` },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("cross-book transaction search (palette seams)", () => {
  it("finds matches in each accessible book via listTransactions search", async () => {
    const books = (await listAccessibleWorkspaces(member)).filter((w) => w.organizationId === orgId);
    expect(books.map((b) => b.id).sort()).toEqual([wsA, wsB].sort());
    const perBook = await Promise.all(
      books.map(async (w) => (await listTransactions(member, w.id, { search: "zanzibar", pageSize: 3 })).rows),
    );
    const all = perBook.flat();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.workspaceId).sort()).toEqual([wsA, wsB].sort());
  });

  it("an outsider has no accessible books here and direct search is denied", async () => {
    const books = (await listAccessibleWorkspaces(outsider)).filter((w) => w.organizationId === orgId);
    expect(books).toHaveLength(0);
    await expect(listTransactions(outsider, wsA, { search: "zanzibar" })).rejects.toThrow();
  });
});
