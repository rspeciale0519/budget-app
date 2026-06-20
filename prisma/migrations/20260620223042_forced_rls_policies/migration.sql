-- Forced RLS (Task 11). RLS is the real enforcer: ENABLE + FORCE on every app
-- table, so even the table owner is constrained (postgres bypasses only via its
-- BYPASSRLS attribute, used by the privileged admin client). Identifiers are
-- Prisma defaults (PascalCase tables, camelCase columns) and must be quoted.
--
-- Predicates rely on app.current_user_id() (the per-request JWT sub). The
-- membership tables use a self-only predicate (no recursion); workspace-scoped
-- tables filter by the caller's WorkspaceMembership rows.

-- ── Identity & access ────────────────────────────────────────────────────
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_rls ON "Organization" FOR ALL
  USING ("id" IN (SELECT "organizationId" FROM "OrgMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("id" IN (SELECT "organizationId" FROM "OrgMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "OrgMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgMembership" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_membership_rls ON "OrgMembership" FOR ALL
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_rls ON "Workspace" FOR ALL
  USING ("id" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("id" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "WorkspaceMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMembership" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_membership_rls ON "WorkspaceMembership" FOR ALL
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

-- ── Workspace-scoped data (membership by workspaceId) ─────────────────────
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" FORCE ROW LEVEL SECURITY;
CREATE POLICY account_rls ON "Account" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY transaction_rls ON "Transaction" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
CREATE POLICY category_rls ON "Category" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "ImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportBatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY import_batch_rls ON "ImportBatch" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "Bill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill" FORCE ROW LEVEL SECURITY;
CREATE POLICY bill_rls ON "Bill" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "RecurringSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringSchedule" FORCE ROW LEVEL SECURITY;
CREATE POLICY recurring_schedule_rls ON "RecurringSchedule" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "Debt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Debt" FORCE ROW LEVEL SECURITY;
CREATE POLICY debt_rls ON "Debt" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" FORCE ROW LEVEL SECURITY;
CREATE POLICY goal_rls ON "Goal" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "CategoryRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategoryRule" FORCE ROW LEVEL SECURITY;
CREATE POLICY category_rule_rls ON "CategoryRule" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;
CREATE POLICY budget_rls ON "Budget" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));

-- ImportMapping is account-scoped; Account is already RLS-filtered.
ALTER TABLE "ImportMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportMapping" FORCE ROW LEVEL SECURITY;
CREATE POLICY import_mapping_rls ON "ImportMapping" FOR ALL
  USING ("accountId" IN (SELECT "id" FROM "Account"))
  WITH CHECK ("accountId" IN (SELECT "id" FROM "Account"));

-- ── Cross-workspace transfer (income bridge): visible only to a member of
--    BOTH sides, or an org owner/admin. Row existence is hidden otherwise. ──
ALTER TABLE "WorkspaceTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceTransfer" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_transfer_rls ON "WorkspaceTransfer" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "OrgMembership" om
      WHERE om."organizationId" = "WorkspaceTransfer"."organizationId"
        AND om."userId" = app.current_user_id()
        AND om."role" IN ('owner', 'admin')
    )
    OR (
      "fromWorkspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id())
      AND "toWorkspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrgMembership" om
      WHERE om."organizationId" = "WorkspaceTransfer"."organizationId"
        AND om."userId" = app.current_user_id()
        AND om."role" IN ('owner', 'admin')
    )
    OR (
      "fromWorkspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id())
      AND "toWorkspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id())
    )
  );

-- ── Per-user layouts ──────────────────────────────────────────────────────
ALTER TABLE "Layout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Layout" FORCE ROW LEVEL SECURITY;
CREATE POLICY layout_rls ON "Layout" FOR ALL
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

-- ── Audit log: readable only by org owner/admin; any org member may append. ─
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON "AuditLog" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "OrgMembership" om
      WHERE om."organizationId" = "AuditLog"."organizationId"
        AND om."userId" = app.current_user_id()
        AND om."role" IN ('owner', 'admin')
    )
  );
CREATE POLICY audit_insert ON "AuditLog" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrgMembership" om
      WHERE om."organizationId" = "AuditLog"."organizationId"
        AND om."userId" = app.current_user_id()
    )
  );
