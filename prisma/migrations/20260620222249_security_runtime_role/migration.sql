-- Security plumbing (Task 10): the `app` schema + claim helper, and the
-- unprivileged, RLS-subject `app_runtime` runtime role with table DML grants.
-- DDL runs via DIRECT_URL (postgres). Idempotent so the Prisma shadow DB
-- (which shares the cluster's global roles) replays cleanly.

-- Claim helper: reads the per-request JWT 'sub' set by rlsClientFor.
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
  LANGUAGE sql STABLE
AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

-- Unprivileged runtime role (subject to RLS; never the table owner).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime_local_pw' NOBYPASSRLS;
  END IF;
END
$$;

-- Schema usage + claim helper execution.
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT USAGE ON SCHEMA app TO app_runtime;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_runtime;

-- DML on all current tables; default privileges cover tables created later
-- by postgres (i.e. future Prisma migrations).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
