import { getCurrentUser } from "@/lib/supabase/server";
import { exportTransactionsCsv, exportBillsCsv } from "@/services/export-service";
import { today } from "@/lib/calendar-date";

export const dynamic = "force-dynamic";

function friendlyError(status: number): Response {
  return new Response(
    "<p>You don't have access to this export. Go back and sign in with the right account.</p>",
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
): Promise<Response> {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) return friendlyError(401);
  const type = new URL(request.url).searchParams.get("type") ?? "transactions";
  try {
    const csv =
      type === "bills"
        ? await exportBillsCsv(user.id, workspaceId)
        : await exportTransactionsCsv(user.id, workspaceId);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledger-${type}-${today()}.csv"`,
      },
    });
  } catch {
    return friendlyError(403);
  }
}
