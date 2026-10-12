import { listSeries, saveSeries } from "@/library/repo";
import { fail } from "../_util";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return Response.json(listSeries({ brandId: p.get("brand") ?? undefined, typeId: p.get("type") ?? undefined }));
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.brandId || !b.typeId || !b.name) throw new Error("Brand, type and name are required");
    return Response.json({ id: saveSeries({ brandId: b.brandId, typeId: b.typeId, name: b.name, notes: b.notes ?? "", specs: {} }) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
