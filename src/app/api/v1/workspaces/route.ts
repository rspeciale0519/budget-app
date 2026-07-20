import { resolveApiUserId } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/respond";
import { rateLimit } from "@/lib/rate-limit";
import { listAccessibleWorkspaces } from "@/services/authz";

export const dynamic = "force-dynamic";

/** GET /api/v1/workspaces — the caller's accessible workspaces (read-only). */
export async function GET(request: Request): Promise<Response> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`api:${ip}`, { limit: 60, windowMs: 60_000 })) {
    return jsonError(429, "Too many requests");
  }
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
