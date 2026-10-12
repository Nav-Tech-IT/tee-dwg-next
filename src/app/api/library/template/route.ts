import { csvTemplate } from "@/library/importer";
import { getType } from "@/library/repo";

export async function GET(req: Request) {
  const t = getType(new URL(req.url).searchParams.get("type") ?? "");
  if (!t) return new Response("Unknown type", { status: 404 });
  return new Response(csvTemplate(t), { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="import-${t.id}.csv"` } });
}
