// Shared helpers for the library API routes.
export function fail(e: unknown, status = 400) {
  return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
}
