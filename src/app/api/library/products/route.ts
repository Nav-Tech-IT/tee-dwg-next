import { listProducts, saveProduct } from "@/library/repo";
import { fail } from "../_util";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const rows = listProducts({ q: p.get("q") ?? undefined, typeId: p.get("type") ?? undefined, brandId: p.get("brand") ?? undefined, status: p.get("status") ?? undefined, includeInactive: p.get("inactive") === "1" });
  return Response.json(rows.map((r) => ({
    id: r.product.id, partNumber: r.product.partNumber, name: r.product.name, status: r.product.status, active: r.product.active,
    brand: r.brand.name, type: r.type.name, typeId: r.type.id, series: r.series.name, seriesId: r.series.id,
    complete: r.resolved.complete, missing: r.resolved.missing.map((f) => f.key), values: Object.fromEntries(Object.entries(r.resolved.values).map(([k, v]) => [k, v.value])),
  })));
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.seriesId || !b.partNumber) throw new Error("Series and part number are required");
    return Response.json({ id: saveProduct({ seriesId: b.seriesId, partNumber: b.partNumber, name: b.name ?? "", specs: b.specs ?? {}, status: "draft" }) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
