import { resolveApiUserId } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/respond";
import { listAccessibleWorkspaces } from "@/services/authz";

export const dynamic = "force-dynamic";

/** GET /api/v1/workspaces — the caller's accessible workspaces (read-only). */
export async function GET(request: Request): Promise<Response> {
  const userId = await resolveApiUserId(request);
  if (!userId) return jsonError(401, "Unauthorized");
  const workspaces = await listAccessibleWorkspaces(userId);
  return jsonOk({
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      color: w.color,
    })),
  });
}
