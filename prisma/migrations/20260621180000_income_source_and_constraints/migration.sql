-- Phase 2a Task 1: IncomeSource (owner-configured expected income) + race-safe
-- recurring materialization constraint + forced RLS for the new table.

-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfMonth" INTEGER,
    "nextDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncomeSource_workspaceId_idx" ON "IncomeSource"("workspaceId");

-- CreateIndex (race-safe recurring materialization; nulls distinct)
CREATE UNIQUE INDEX "Bill_recurringScheduleId_dueDate_key" ON "Bill"("recurringScheduleId", "dueDate");

-- Forced RLS for IncomeSource (workspace-membership predicate, matching the
-- other workspace-scoped tables).
ALTER TABLE "IncomeSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IncomeSource" FORCE ROW LEVEL SECURITY;
CREATE POLICY income_source_rls ON "IncomeSource" FOR ALL
  USING ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()))
  WITH CHECK ("workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMembership" WHERE "userId" = app.current_user_id()));
