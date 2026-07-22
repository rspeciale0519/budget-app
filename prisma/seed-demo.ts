import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { createClient } from "@supabase/supabase-js";
import { prismaAdmin } from "../src/lib/prisma-admin";
import { toUtcDate } from "../src/lib/calendar-date";
import { DEFAULT_CATEGORIES } from "../src/lib/default-categories";
import { buildDemoData, DEMO_ANCHOR_TODAY, type DemoDataset } from "./demo-data";

// The public demo. Everything lives under this org id and this user; the seed
// never touches or deletes anything outside them. Deterministic ids make every
// re-run an idempotent no-op.
const ORG_ID = "demo-org";
const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo-budget-2026";

const wsId = (key: string) => `demo-ws-${key}`;
const acctId = (key: string) => `demo-acct-${key}`;
const txnId = (dedupe: string) => `demo-txn-${dedupe}`;
const recId = (key: string) => `demo-rec-${key}`;

async function ensureDemoUser(): Promise<string> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed the demo user.");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  // Look for an existing demo user first (idempotent).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === DEMO_EMAIL);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Owner" },
  });
  if (error || !data.user) throw error ?? new Error("Failed to create demo user.");
  return data.user.id;
}

async function nonDemoCounts() {
  const orgs = await prismaAdmin.organization.count({ where: { id: { not: ORG_ID } } });
  const rows = await prismaAdmin.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM auth.users WHERE email <> ${DEMO_EMAIL}`;
  return { orgs, users: Number(rows[0]?.count ?? 0) };
}

async function seed(userId: string, data: DemoDataset) {
  await prismaAdmin.organization.upsert({ where: { id: ORG_ID }, update: { name: "Demo" }, create: { id: ORG_ID, name: "Demo" } });
  await prismaAdmin.orgMembership.upsert({
    where: { organizationId_userId: { organizationId: ORG_ID, userId } },
    update: { role: "owner" },
    create: { organizationId: ORG_ID, userId, role: "owner" },
  });

  // Workspaces + memberships + categories.
  const catId = new Map<string, string>(); // `${wsKey}:${name}` -> categoryId
  for (const w of data.workspaces) {
    await prismaAdmin.workspace.upsert({
      where: { id: wsId(w.key) },
      update: { name: w.name, color: w.color, icon: w.icon, sortOrder: w.sortOrder },
      create: { id: wsId(w.key), organizationId: ORG_ID, name: w.name, type: w.type, color: w.color, icon: w.icon, sortOrder: w.sortOrder },
    });
    await prismaAdmin.workspaceMembership.upsert({
      where: { workspaceId_userId: { workspaceId: wsId(w.key), userId } },
      update: { role: "admin" },
      create: { workspaceId: wsId(w.key), userId, role: "admin" },
    });
    if ((await prismaAdmin.category.count({ where: { workspaceId: wsId(w.key) } })) === 0) {
      await prismaAdmin.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({ workspaceId: wsId(w.key), name: c.name, kind: c.kind })),
      });
    }
    const cats = await prismaAdmin.category.findMany({ where: { workspaceId: wsId(w.key) } });
    for (const c of cats) catId.set(`${w.key}:${c.name}`, c.id);
  }

  // Accounts.
  for (const a of data.accounts) {
    await prismaAdmin.account.upsert({
      where: { id: acctId(a.key) },
      update: { name: a.name, institution: a.institution, last4: a.last4 ?? null },
      create: { id: acctId(a.key), workspaceId: wsId(a.workspaceKey), name: a.name, type: a.type, institution: a.institution, last4: a.last4 ?? null, openingBalance: a.openingBalance, openingDate: toUtcDate(a.openingDate) },
    });
  }

  // Recurring schedules (before bills that reference them).
  for (const r of data.recurring) {
    await prismaAdmin.recurringSchedule.upsert({
      where: { id: recId(r.key) },
      update: { templateAmount: r.templateAmount, nextRunDate: toUtcDate(r.nextRunDate) },
      create: { id: recId(r.key), workspaceId: wsId(r.workspaceKey), frequency: r.frequency, dayOfMonth: r.dayOfMonth, startDate: toUtcDate(r.startDate), nextRunDate: toUtcDate(r.nextRunDate), templateVendor: r.templateVendor, templateAmount: r.templateAmount, templateCategoryId: r.templateCategoryName ? catId.get(`${r.workspaceKey}:${r.templateCategoryName}`) ?? null : null },
    });
  }

  // Transactions (deterministic id = demo-txn-<dedupeHash>).
  for (const t of data.transactions) {
    await prismaAdmin.transaction.upsert({
      where: { id: txnId(t.dedupeHash) },
      update: {},
      create: { id: txnId(t.dedupeHash), workspaceId: wsId(t.workspaceKey), accountId: acctId(t.accountKey), date: toUtcDate(t.date), amount: t.amount, description: t.description, merchant: t.merchant ?? null, categoryId: t.categoryName ? catId.get(`${t.workspaceKey}:${t.categoryName}`) ?? null : null, source: "manual", dedupeHash: t.dedupeHash },
    });
  }

  // Bills.
  for (let i = 0; i < data.bills.length; i++) {
    const b = data.bills[i]!;
    const id = `demo-bill-${b.workspaceKey}-${i}`;
    await prismaAdmin.bill.upsert({
      where: { id },
      update: { status: b.status, amount: b.amount, dueDate: toUtcDate(b.dueDate) },
      create: { id, workspaceId: wsId(b.workspaceKey), vendor: b.vendor, amount: b.amount, dueDate: toUtcDate(b.dueDate), status: b.status, type: b.type, categoryId: b.categoryName ? catId.get(`${b.workspaceKey}:${b.categoryName}`) ?? null : null, recurringScheduleId: b.recurringKey ? recId(b.recurringKey) : null },
    });
  }

  // Budgets (natural unique key).
  for (const bu of data.budgets) {
    const categoryId = catId.get(`${bu.workspaceKey}:${bu.categoryName}`);
    if (!categoryId) continue;
    await prismaAdmin.budget.upsert({
      where: { workspaceId_categoryId_period: { workspaceId: wsId(bu.workspaceKey), categoryId, period: "monthly" } },
      update: { amount: bu.amount },
      create: { workspaceId: wsId(bu.workspaceKey), categoryId, period: "monthly", amount: bu.amount },
    });
  }

  // Goals, debts, income sources.
  for (let i = 0; i < data.goals.length; i++) {
    const g = data.goals[i]!;
    const id = `demo-goal-${g.workspaceKey}-${i}`;
    await prismaAdmin.goal.upsert({
      where: { id },
      update: { currentSaved: g.currentSaved, targetAmount: g.targetAmount },
      create: { id, workspaceId: wsId(g.workspaceKey), name: g.name, targetAmount: g.targetAmount, currentSaved: g.currentSaved, targetDate: g.targetDate ? toUtcDate(g.targetDate) : null, accountId: g.accountKey ? acctId(g.accountKey) : null },
    });
  }
  for (let i = 0; i < data.debts.length; i++) {
    const de = data.debts[i]!;
    const id = `demo-debt-${de.workspaceKey}-${i}`;
    await prismaAdmin.debt.upsert({
      where: { id },
      update: { currentBalance: de.currentBalance },
      create: { id, workspaceId: wsId(de.workspaceKey), name: de.name, type: de.type, currentBalance: de.currentBalance, apr: de.apr, minimumPayment: de.minimumPayment, dueDay: de.dueDay },
    });
  }
  for (let i = 0; i < data.incomeSources.length; i++) {
    const s = data.incomeSources[i]!;
    const id = `demo-inc-${s.workspaceKey}-${i}`;
    await prismaAdmin.incomeSource.upsert({
      where: { id },
      update: { amount: s.amount, nextDate: toUtcDate(s.nextDate) },
      create: { id, workspaceId: wsId(s.workspaceKey), name: s.name, amount: s.amount, frequency: s.frequency, dayOfMonth: s.dayOfMonth, nextDate: toUtcDate(s.nextDate) },
    });
  }

  // Owner-draw bridge transfers.
  for (let i = 0; i < data.transfers.length; i++) {
    const tr = data.transfers[i]!;
    const id = `demo-xfer-${i}`;
    await prismaAdmin.workspaceTransfer.upsert({
      where: { id },
      update: { amount: tr.amount },
      create: { id, organizationId: ORG_ID, fromWorkspaceId: wsId(tr.fromWorkspaceKey), toWorkspaceId: wsId(tr.toWorkspaceKey), type: tr.type, amount: tr.amount, date: toUtcDate(tr.date), fromTransactionId: txnId(tr.fromTxnDedupe), toTransactionId: txnId(tr.toTxnDedupe) },
    });
  }
}

async function main() {
  const before = await nonDemoCounts();
  console.log(`[isolation] before: non-demo orgs=${before.orgs}, non-demo auth users=${before.users}`);

  const userId = await ensureDemoUser();
  const data = buildDemoData(DEMO_ANCHOR_TODAY());
  await seed(userId, data);

  const after = await nonDemoCounts();
  console.log(`[isolation] after:  non-demo orgs=${after.orgs}, non-demo auth users=${after.users}`);
  if (before.orgs !== after.orgs || before.users !== after.users) {
    throw new Error("Isolation violation: non-demo org/user counts changed during seeding.");
  }

  const [txns, bills, goals] = await Promise.all([
    prismaAdmin.transaction.count({ where: { workspaceId: { in: data.workspaces.map((w) => wsId(w.key)) } } }),
    prismaAdmin.bill.count({ where: { workspaceId: { in: data.workspaces.map((w) => wsId(w.key)) } } }),
    prismaAdmin.goal.count({ where: { workspaceId: { in: data.workspaces.map((w) => wsId(w.key)) } } }),
  ]);
  console.log(`[demo] user=${DEMO_EMAIL} pw=${DEMO_PASSWORD}`);
  console.log(`[demo] 3 books · ${txns} transactions · ${bills} bills · ${goals} goals · ${data.transfers.length} owner-draw bridges`);
  console.log("[demo] isolation verified — no non-demo data touched.");
}

main()
  .then(() => prismaAdmin.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prismaAdmin.$disconnect();
    process.exit(1);
  });
