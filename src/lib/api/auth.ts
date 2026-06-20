import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Resolve a scoped, read-only service token to its mapped user id. This is the
 * future-AI seam: the advisor authenticates as a configured service user whose
 * workspace memberships (and RLS) define exactly what it can read.
 */
export function resolveServiceUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const expected = process.env.API_SERVICE_TOKEN;
  if (expected && token === expected) return process.env.API_SERVICE_USER_ID ?? null;
  return null;
}

/** A service token wins; otherwise fall back to the logged-in session. */
export async function resolveApiUserId(request: Request): Promise<string | null> {
  const serviceUserId = resolveServiceUserId(request.headers.get("authorization"));
  if (serviceUserId) return serviceUserId;
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}
