import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { previewImport, commitImport, undoImport } from "@/services/import/pipeline";
import type { MappingConfig } from "@/services/import/types";
import { dedupeHash } from "@/lib/dedupe";
import { money } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;
let accountId: string;

const mapping: MappingConfig = {
  columnMap: { date: "Date", description: "Description", amount: "Amount", runningBalance: "Balance" },
  signRule: "single_signed",
  dateFormat: "MM/DD/YYYY",
};

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Import Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#040404" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "1000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  accountId = acc.id;

  // An existing transaction that one CSV row will duplicate.
  await prismaAdmin.transaction.create({
    data: {
      workspaceId,
      accountId,
      date: toUtcDate(calendarDate("2026-06-18")),
      amount: "-12.00",
      description: "Coffee",
      source: "manual",
      // Hash as if previously imported from this same CSV (includes running balance).
      dedupeHash: dedupeHash({ accountId, date: calendarDate("2026-06-18"), amount: money("-12.00"), description: "Coffee", runningBalance: money("988.00") }),
    },
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

const csv = [
  "Date,Description,Amount,Balance",
  "06/18/2026,Coffee,-12.00,988.00", // duplicate of the existing tx
  "06/19/2026,Paycheck,500.00,1488.00",
  "06/20/2026,Groceries,-40.00,1448.00",
].join("\n");

describe("CSV import pipeline", () => {
  it("previews with duplicate flagged and others importable", async () => {
    const preview = await previewImport(admin, { accountId, csvText: csv, mapping });
    expect(preview.rows).toHaveLength(3);
    const dup = preview.rows.find((r) => r.parsed?.description === "Coffee");
    expect(dup?.isDuplicate).toBe(true);
    expect(dup?.skip).toBe(true);
    const importable = preview.rows.filter((r) => !r.skip);
    expect(importable).toHaveLength(2);
  });

  it("commits non-skipped rows atomically, then undo removes them", async () => {
    const preview = await previewImport(admin, { accountId, csvText: csv, mapping });
    const batch = await commitImport(admin, { accountId, filename: "june.csv", rows: preview.rows });
    expect(batch.rowCount).toBe(2);

    const afterCommit = await prismaAdmin.transaction.findMany({ where: { importBatchId: batch.id } });
    expect(afterCommit).toHaveLength(2);
    expect(afterCommit.map((t) => t.source)).toEqual(["csv", "csv"]);

    await undoImport(admin, batch.id);
    const afterUndo = await prismaAdmin.transaction.findMany({ where: { importBatchId: batch.id } });
    expect(afterUndo).toHaveLength(0);
    const rereadBatch = await prismaAdmin.importBatch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(rereadBatch.archivedAt).not.toBeNull();
  });

  it("a dateOverride fixes an unparseable row and lets it fully derive (category, hash, commit)", async () => {
    const badCsv = [
      "Date,Description,Amount,Balance",
      "not-a-date,Rent,-1500.00,",
      "06/21/2026,Internet,-60.00,",
    ].join("\n");

    const broken = await previewImport(admin, { accountId, csvText: badCsv, mapping });
    const rentRow = broken.rows[0]!;
    expect(rentRow.parsed).toBeNull();
    // "not-a-date" splits into 3 parts, so it fails calendarDate()'s own
    // validation rather than parseImportDate's missing-part guard — both are
    // date-parse failures the review UI must recognize (see isDateError there).
    expect(rentRow.errors[0]).toContain("Invalid calendar date");
    expect(rentRow.skip).toBe(true);

    // The other date-failure shape: too few parts to even attempt a real date.
    const missingPart = await previewImport(admin, {
      accountId,
      csvText: "Date,Description,Amount,Balance\n06/2026,Rent,-1500.00,",
      mapping,
    });
    expect(missingPart.rows[0]!.errors[0]).toContain("Cannot parse date");

    const fixed = await previewImport(admin, {
      accountId,
      csvText: badCsv,
      mapping,
      dateOverrides: { 0: "2026-06-22" },
    });
    const fixedRent = fixed.rows[0]!;
    expect(fixedRent.errors).toHaveLength(0);
    expect(fixedRent.parsed?.date).toBe("2026-06-22");
    expect(fixedRent.skip).toBe(false);
    expect(fixedRent.dedupeHash).not.toBeNull();

    const batch = await commitImport(admin, { accountId, filename: "fixed.csv", rows: fixed.rows });
    expect(batch.rowCount).toBe(2);
    const committed = await prismaAdmin.transaction.findMany({ where: { importBatchId: batch.id } });
    const rentTxn = committed.find((t) => t.description === "Rent");
    expect(rentTxn?.date.toISOString().slice(0, 10)).toBe("2026-06-22");
    await undoImport(admin, batch.id);
  });
});
