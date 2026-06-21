import { getCurrentUser } from "@/lib/supabase/server";
import { exportTransactionsCsv, exportBillsCsv } from "@/services/export-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
): Promise<Response> {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const type = new URL(request.url).searchParams.get("type") ?? "transactions";
  try {
    const csv =
      type === "bills"
        ? await exportBillsCsv(user.id, workspaceId)
        : await exportTransactionsCsv(user.id, workspaceId);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-${workspaceId}.csv"`,
      },
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
