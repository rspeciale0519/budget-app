import { createClient } from "@supabase/supabase-js";
import type { Organization, OrgRole, WorkspaceRole } from "@prisma/client";
import { prismaAdmin } from "@/lib/prisma-admin";
import { assertOrgRole } from "@/services/authz";
import { seedDefaultCategories } from "@/services/category-service";

function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export interface MemberDetails {
  userId: string;
  email: string;
  orgRole: OrgRole;
  lastSignInAt: string | null;
  workspaces: { workspaceId: string; role: WorkspaceRole }[];
}

/**
 * Idempotent first-run: ensure the user has an org. If they already belong to
 * one, return it; otherwise create an Organization, make them owner, and give
 * them a Personal workspace (admin) seeded with default categories.
 */
export async function bootstrapOrgForUser(userId: string): Promise<Organization> {
  const existing = await prismaAdmin.orgMembership.findFirst({
    where: { userId },
    include: { organization: true },
  });
  if (existing) return existing.organization;

  return prismaAdmin.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: "My Organization" } });
    await tx.orgMembership.create({ data: { organizationId: org.id, userId, role: "owner" } });
    const personal = await tx.workspace.create({
      data: { organizationId: org.id, name: "Personal", type: "personal", color: "#3b82f6" },
    });
    await tx.workspaceMembership.create({
      data: { workspaceId: personal.id, userId, role: "admin" },
    });
    await seedDefaultCategories(tx, personal.id);
    return org;
  });
}

export async function listMembers(actorUserId: string, organizationId: string) {
  await assertOrgRole(actorUserId, organizationId, "admin");
  return prismaAdmin.orgMembership.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } });
}

/** Members with resolved emails and per-workspace access, for the sharing UI. */
export async function listMembersWithDetails(
  actorUserId: string,
  organizationId: string,
): Promise<MemberDetails[]> {
  await assertOrgRole(actorUserId, organizationId, "admin");
  const memberships = await prismaAdmin.orgMembership.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
  const wsMemberships = await prismaAdmin.workspaceMembership.findMany({
    where: { workspace: { organizationId } },
  });
  const admin = supabaseAdmin();
  return Promise.all(
    memberships.map(async (m) => {
      let email = "unknown";
      let lastSignInAt: string | null = null;
      try {
        const { data } = await admin.auth.admin.getUserById(m.userId);
        email = data.user?.email ?? "unknown";
        lastSignInAt = data.user?.last_sign_in_at ?? null;
      } catch {
        // Auth lookup failing shouldn't hide the membership row.
      }
      return {
        userId: m.userId,
        email,
        orgRole: m.role,
        lastSignInAt,
        workspaces: wsMemberships
          .filter((w) => w.userId === m.userId)
          .map((w) => ({ workspaceId: w.workspaceId, role: w.role })),
      };
    }),
  );
}

/** Resolve a set of user ids to emails (best-effort) for read-only display, e.g.
 * naming the actor in the activity feed. Missing lookups become "A teammate". */
export async function resolveMemberEmails(userIds: string[]): Promise<Record<string, string>> {
  const admin = supabaseAdmin();
  const out: Record<string, string> = {};
  await Promise.all(
    [...new Set(userIds)].map(async (id) => {
      try {
        const { data } = await admin.auth.admin.getUserById(id);
        out[id] = data.user?.email ?? "A teammate";
      } catch {
        out[id] = "A teammate";
      }
    }),
  );
  return out;
}

export async function assignWorkspaceMembership(
  actorUserId: string,
  input: { userId: string; workspaceId: string; role: WorkspaceRole },
) {
  const ws = await prismaAdmin.workspace.findUnique({ where: { id: input.workspaceId } });
  if (!ws) throw new Error("Book not found");
  await assertOrgRole(actorUserId, ws.organizationId, "admin");
  return prismaAdmin.workspaceMembership.upsert({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    update: { role: input.role },
    create: { workspaceId: input.workspaceId, userId: input.userId, role: input.role },
  });
}

export async function revokeWorkspaceMembership(
  actorUserId: string,
  input: { userId: string; workspaceId: string },
) {
  const ws = await prismaAdmin.workspace.findUnique({ where: { id: input.workspaceId } });
  if (!ws) throw new Error("Book not found");
  await assertOrgRole(actorUserId, ws.organizationId, "admin");
  await prismaAdmin.workspaceMembership.deleteMany({
    where: { workspaceId: input.workspaceId, userId: input.userId },
  });
}

/** Invite a teammate by email (Supabase admin), then record a pending org membership. */
export async function inviteMember(
  actorUserId: string,
  organizationId: string,
  email: string,
  orgRole: OrgRole = "member",
): Promise<string> {
  await assertOrgRole(actorUserId, organizationId, "admin");
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) throw new Error(error?.message ?? "Invite failed");
  await prismaAdmin.orgMembership.upsert({
    where: { organizationId_userId: { organizationId, userId: data.user.id } },
    update: { role: orgRole },
    create: { organizationId, userId: data.user.id, role: orgRole },
  });
  return data.user.id;
}
