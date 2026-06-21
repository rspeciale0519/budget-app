export function jsonOk(data: unknown): Response {
  return Response.json(data);
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
