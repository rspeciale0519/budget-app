import { getCurrentUser } from "@/lib/supabase/server";
import { exportTransactionsCsv, exportBillsCsv } from "@/services/export-service";
import { today, calendarDate } from "@/lib/calendar-date";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(v: string | null) {
  return v && DATE_RE.test(v) ? calendarDate(v) : undefined;
}

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
  const searchParams = new URL(request.url).searchParams;
  const type = searchParams.get("type") ?? "transactions";
  const range = {
    from: parseDateParam(searchParams.get("from")),
    to: parseDateParam(searchParams.get("to")),
  };
  try {
    const csv =
      type === "bills"
        ? await exportBillsCsv(user.id, workspaceId, range)
        : await exportTransactionsCsv(user.id, workspaceId, range);
    const suffix = range.from || range.to ? `-${range.from ?? "start"}_to_${range.to ?? today()}` : "";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledger-${type}${suffix}-${today()}.csv"`,
      },
    });
  } catch {
    return friendlyError(403);
  }
}
