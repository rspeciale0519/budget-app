import "dotenv/config";
import { prismaAdmin } from "../src/lib/prisma-admin";
import { calendarDate, toUtcDate } from "../src/lib/calendar-date";
import { DEFAULT_CATEGORIES } from "../src/lib/default-categories";

// A stable demo owner uuid. Real logins get their own org via bootstrap (Task 31).
const OWNER = "00000000-0000-0000-0000-000000000001";
const ORG_ID = "seed-org";

async function ensureWorkspace(id: string, name: string, type: "personal" | "business", color: string) {
  const ws = await prismaAdmin.workspace.upsert({
    where: { id },
    update: { name, color },
    create: { id, organizationId: ORG_ID, name, type, color },
  });
  await prismaAdmin.workspaceMembership.upsert({
    where: { workspaceId_userId: { workspaceId: id, userId: OWNER } },
    update: {},
    create: { workspaceId: id, userId: OWNER, role: "admin" },
  });
  if ((await prismaAdmin.category.count({ where: { workspaceId: id } })) === 0) {
    await prismaAdmin.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ workspaceId: id, name: c.name, kind: c.kind })),
    });
  }
  return ws;
}

async function main() {
  await prismaAdmin.organization.upsert({
    where: { id: ORG_ID },
    update: { name: "Demo Org" },
    create: { id: ORG_ID, name: "Demo Org" },
  });
  await prismaAdmin.orgMembership.upsert({
    where: { organizationId_userId: { organizationId: ORG_ID, userId: OWNER } },
    update: { role: "owner" },
    create: { organizationId: ORG_ID, userId: OWNER, role: "owner" },
  });

  const personal = await ensureWorkspace("seed-ws-personal", "Personal", "personal", "#3b82f6");
  const bizA = await ensureWorkspace("seed-ws-biz-a", "Acme LLC", "business", "#10b981");
  await ensureWorkspace("seed-ws-biz-b", "Side Co", "business", "#f59e0b");

  if ((await prismaAdmin.account.count({ where: { workspaceId: personal.id } })) === 0) {
    const checking = await prismaAdmin.account.create({
      data: { workspaceId: personal.id, name: "Personal Checking", type: "checking", institution: "First Bank", openingBalance: "4200.00", openingDate: toUtcDate(calendarDate("2026-01-01")) },
    });
    await prismaAdmin.transaction.createMany({
      data: [
        { workspaceId: personal.id, accountId: checking.id, date: toUtcDate(calendarDate("2026-06-03")), amount: "-1450.00", description: "Rent", source: "manual", dedupeHash: "seed-p1" },
        { workspaceId: personal.id, accountId: checking.id, date: toUtcDate(calendarDate("2026-06-10")), amount: "-86.40", description: "Groceries", source: "manual", dedupeHash: "seed-p2" },
      ],
    });
    await prismaAdmin.bill.create({
      data: { workspaceId: personal.id, vendor: "Electric Co", amount: "120.00", dueDate: toUtcDate(calendarDate("2026-06-28")), status: "unpaid", type: "bill" },
    });
  }

  if ((await prismaAdmin.account.count({ where: { workspaceId: bizA.id } })) === 0) {
    const bizChecking = await prismaAdmin.account.create({
      data: { workspaceId: bizA.id, name: "Acme Checking", type: "checking", institution: "Biz Bank", openingBalance: "18250.00", openingDate: toUtcDate(calendarDate("2026-01-01")) },
    });
    const personalChecking = await prismaAdmin.account.findFirstOrThrow({ where: { workspaceId: personal.id } });
    // An owner draw: business outflow + personal income + transfer record.
    const outflow = await prismaAdmin.transaction.create({
      data: { workspaceId: bizA.id, accountId: bizChecking.id, date: toUtcDate(calendarDate("2026-06-15")), amount: "-3000.00", description: "Owner draw", source: "manual", dedupeHash: "seed-b1" },
    });
    const income = await prismaAdmin.transaction.create({
      data: { workspaceId: personal.id, accountId: personalChecking.id, date: toUtcDate(calendarDate("2026-06-15")), amount: "3000.00", description: "Owner draw (income)", source: "manual", dedupeHash: "seed-i1" },
    });
    await prismaAdmin.workspaceTransfer.create({
      data: { organizationId: ORG_ID, fromWorkspaceId: bizA.id, toWorkspaceId: personal.id, type: "owner_draw", amount: "3000.00", date: toUtcDate(calendarDate("2026-06-15")), fromTransactionId: outflow.id, toTransactionId: income.id },
    });
  }

  console.log("Seed complete: Demo Org with Personal + 2 businesses, demo data, one owner draw.");
}

main()
  .then(() => prismaAdmin.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prismaAdmin.$disconnect();
    process.exit(1);
  });
