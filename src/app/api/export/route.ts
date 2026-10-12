// POST requirements -> factory package. ?format=zip (default) or ?format=pdf.
import { buildFrom } from "@/engine/build";
import { drawingSet } from "@/engine/drawings/sheets";
import { sheetsToPdf } from "@/engine/export/pdf";
import { factoryZip, packageName } from "@/engine/export/zip";

export async function POST(req: Request) {
  const format = new URL(req.url).searchParams.get("format") ?? "zip";
  const res = buildFrom(await req.json());
  if (!res.ok) return Response.json({ error: res.error.issues }, { status: 400 });
  const b = res.build, name = packageName(b);

  if (format === "pdf") {
    const pdf = await sheetsToPdf(drawingSet(b), { title: `${b.req.project.name} – drawings`, author: b.req.project.drawnBy });
    return new Response(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.pdf` },
    });
  }
  const zip = await factoryZip(b);
  return new Response(Buffer.from(zip), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.zip` },
  });
}
