-- Least-privilege admin role (security launch hardening). app_admin replaces
-- the postgres role for the runtime prismaAdmin client: it can DML every app
-- table across tenants (blanket policies below) but cannot ALTER/DROP/CREATE
-- objects, create roles, or touch other schemas (incl. auth).
--
-- Why policies instead of BYPASSRLS: hosted Supabase's postgres role is not a
-- superuser and cannot create BYPASSRLS roles. Permissive policies are OR'd,
-- so these do not widen app_runtime's access (they apply only TO app_admin).
--
-- MAINTENANCE RULE: every future table migration must add BOTH the tenant
-- policy AND an admin_all_<table> policy like the ones below.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin LOGIN PASSWORD 'app_admin_local_pw'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_admin;
GRANT USAGE ON SCHEMA app TO app_admin;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_admin;

CREATE POLICY admin_all_organization ON "Organization" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_org_membership ON "OrgMembership" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_workspace ON "Workspace" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_workspace_membership ON "WorkspaceMembership" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_account ON "Account" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_category ON "Category" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_import_batch ON "ImportBatch" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_transaction ON "Transaction" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_bill ON "Bill" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_recurring_schedule ON "RecurringSchedule" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_income_source ON "IncomeSource" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_debt ON "Debt" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_goal ON "Goal" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_workspace_transfer ON "WorkspaceTransfer" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_import_mapping ON "ImportMapping" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_category_rule ON "CategoryRule" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_budget ON "Budget" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_layout ON "Layout" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_audit_log ON "AuditLog" FOR ALL TO app_admin USING (true) WITH CHECK (true);
