export interface AuditEntryView {
  action: string;
  entityType: string;
  after?: unknown;
}

const ACTION_VERB: Record<string, string> = {
  mark_paid: "marked paid",
  mark_paid_standalone: "marked paid",
  mark_unpaid: "reopened",
  create: "added",
  update: "updated",
  delete: "deleted",
  import: "imported into",
};

// User-facing nouns for the affected thing. Note "Workspace" → "book": the stored
// entityType keeps its model name, but the activity feed must read in book language.
const ENTITY_NOUN: Record<string, string> = {
  Workspace: "book",
  Bill: "bill",
  Account: "account",
  Category: "category",
  Transaction: "transaction",
  Transfer: "transfer",
  IncomeSource: "income source",
};

export function auditVerb(action: string): string {
  return ACTION_VERB[action] ?? action.replace(/_/g, " ");
}

/** A human name for the affected thing: a name from the recorded `after` JSON if
 * one is there, otherwise the entity's book-language noun. */
export function auditObject(entityType: string, after: unknown): string {
  const a = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const named = a.vendor ?? a.name ?? a.description ?? a.title;
  if (typeof named === "string" && named.trim()) return named.trim();
  return ENTITY_NOUN[entityType] ?? entityType.toLowerCase();
}

/**
 * A one-line "who did what" for the activity feed, e.g.
 * "Rob marked paid Electric Co" or "You added an account".
 */
export function formatAuditLine(actor: string, entry: AuditEntryView): string {
  if (entry.action === "income_bridge") {
    return `${actor} paid themselves — moved money between books`;
  }
  return `${actor} ${auditVerb(entry.action)} ${auditObject(entry.entityType, entry.after)}`;
}
