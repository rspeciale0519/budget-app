import { describe, it, expect } from "vitest";
import { buildDemoData, type DemoDataset } from "./demo-data";
import { calendarDate, isBefore, isAfter } from "@/lib/calendar-date";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

const ANCHOR = calendarDate("2026-07-22");
const CATEGORY_NAMES = new Set(DEFAULT_CATEGORIES.map((c) => c.name));
const MONEY = /^-?\d+\.\d{2}$/;

function build(): DemoDataset {
  return buildDemoData(ANCHOR);
}

describe("buildDemoData — shape", () => {
  it("produces exactly one personal book and two business books", () => {
    const { workspaces } = build();
    expect(workspaces.filter((w) => w.type === "personal")).toHaveLength(1);
    expect(workspaces.filter((w) => w.type === "business")).toHaveLength(2);
  });

  it("gives every workspace a distinct key and a hex color", () => {
    const { workspaces } = build();
    const keys = workspaces.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const w of workspaces) expect(w.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("buildDemoData — referential integrity", () => {
  it("references only workspace keys that exist", () => {
    const d = build();
    const wsKeys = new Set(d.workspaces.map((w) => w.key));
    for (const a of d.accounts) expect(wsKeys.has(a.workspaceKey)).toBe(true);
    for (const t of d.transactions) expect(wsKeys.has(t.workspaceKey)).toBe(true);
    for (const b of d.bills) expect(wsKeys.has(b.workspaceKey)).toBe(true);
    for (const g of d.goals) expect(wsKeys.has(g.workspaceKey)).toBe(true);
    for (const de of d.debts) expect(wsKeys.has(de.workspaceKey)).toBe(true);
    for (const i of d.incomeSources) expect(wsKeys.has(i.workspaceKey)).toBe(true);
    for (const bu of d.budgets) expect(wsKeys.has(bu.workspaceKey)).toBe(true);
  });

  it("references only account keys that exist, scoped to the same workspace", () => {
    const d = build();
    const byKey = new Map(d.accounts.map((a) => [a.key, a]));
    for (const t of d.transactions) {
      const acct = byKey.get(t.accountKey);
      expect(acct).toBeDefined();
      expect(acct!.workspaceKey).toBe(t.workspaceKey);
    }
  });

  it("uses only known default category names", () => {
    const d = build();
    for (const t of d.transactions) if (t.categoryName) expect(CATEGORY_NAMES.has(t.categoryName)).toBe(true);
    for (const b of d.budgets) expect(CATEGORY_NAMES.has(b.categoryName)).toBe(true);
  });
});

describe("buildDemoData — money & dates", () => {
  it("formats every monetary amount as a 2-decimal string", () => {
    const d = build();
    for (const a of d.accounts) expect(a.openingBalance).toMatch(MONEY);
    for (const t of d.transactions) expect(t.amount).toMatch(MONEY);
    for (const b of d.bills) expect(b.amount).toMatch(MONEY);
    for (const g of d.goals) { expect(g.targetAmount).toMatch(MONEY); expect(g.currentSaved).toMatch(MONEY); }
    for (const de of d.debts) expect(de.currentBalance).toMatch(MONEY);
  });

  it("uses valid calendar dates everywhere", () => {
    const d = build();
    // calendarDate() throws on an invalid date, so re-parsing proves validity.
    for (const t of d.transactions) expect(() => calendarDate(t.date)).not.toThrow();
    for (const b of d.bills) expect(() => calendarDate(b.dueDate)).not.toThrow();
  });

  it("keeps every dedupe hash unique", () => {
    const hashes = build().transactions.map((t) => t.dedupeHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});

describe("buildDemoData — camera-ready richness", () => {
  it("has a personal book with several categories of spending", () => {
    const d = build();
    const personal = d.workspaces.find((w) => w.type === "personal")!;
    const cats = new Set(
      d.transactions.filter((t) => t.workspaceKey === personal.key && t.categoryName).map((t) => t.categoryName),
    );
    expect(cats.size).toBeGreaterThanOrEqual(6);
  });

  it("has at least one overdue and several upcoming bills in the personal book", () => {
    const d = build();
    const personal = d.workspaces.find((w) => w.type === "personal")!;
    const bills = d.bills.filter((b) => b.workspaceKey === personal.key);
    expect(bills.some((b) => isBefore(b.dueDate, ANCHOR))).toBe(true);
    expect(bills.filter((b) => !isBefore(b.dueDate, ANCHOR)).length).toBeGreaterThanOrEqual(2);
  });

  it("configures expected income summing above zero for the personal book", () => {
    const d = build();
    const personal = d.workspaces.find((w) => w.type === "personal")!;
    const total = d.incomeSources
      .filter((i) => i.workspaceKey === personal.key)
      .reduce((sum, i) => sum + Number(i.amount), 0);
    expect(total).toBeGreaterThan(0);
  });

  it("gives at least one goal real progress (0 < saved < target)", () => {
    const d = build();
    expect(
      d.goals.some((g) => Number(g.currentSaved) > 0 && Number(g.currentSaved) < Number(g.targetAmount)),
    ).toBe(true);
  });
});

describe("buildDemoData — owner-draw bridge", () => {
  it("pairs each transfer with a matching business outflow and personal income", () => {
    const d = build();
    const byHash = new Map(d.transactions.map((t) => [t.dedupeHash, t]));
    expect(d.transfers.length).toBeGreaterThanOrEqual(1);
    for (const tr of d.transfers) {
      const out = byHash.get(tr.fromTxnDedupe);
      const inc = byHash.get(tr.toTxnDedupe);
      expect(out).toBeDefined();
      expect(inc).toBeDefined();
      // Business outflow is negative, personal income is positive, magnitudes match the transfer.
      expect(Number(out!.amount)).toBeLessThan(0);
      expect(Number(inc!.amount)).toBeGreaterThan(0);
      expect(Math.abs(Number(out!.amount))).toBe(Number(tr.amount));
      expect(Number(inc!.amount)).toBe(Number(tr.amount));
      // Each side lands in its own workspace.
      expect(out!.workspaceKey).toBe(tr.fromWorkspaceKey);
      expect(inc!.workspaceKey).toBe(tr.toWorkspaceKey);
    }
  });

  it("routes every owner draw into the personal book", () => {
    const d = build();
    const personal = d.workspaces.find((w) => w.type === "personal")!;
    for (const tr of d.transfers) expect(tr.toWorkspaceKey).toBe(personal.key);
  });
});

// Determinism: the builder must be a pure function of its anchor (no Date.now()).
describe("buildDemoData — determinism", () => {
  it("produces identical output for the same anchor", () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });

  it("shifts relative dates forward when the anchor advances", () => {
    const later = buildDemoData(calendarDate("2026-08-22"));
    const earlier = build();
    const laterMax = later.transactions.map((t) => t.date).sort().at(-1)!;
    const earlierMax = earlier.transactions.map((t) => t.date).sort().at(-1)!;
    expect(isAfter(laterMax, earlierMax)).toBe(true);
  });
});
