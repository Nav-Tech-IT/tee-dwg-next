import type { NextRequest } from "next/server";
import { getProduct, history, saveProduct } from "@/library/repo";
import { fail } from "../../_util";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/library/products/[id]">) {
  const { id } = await ctx.params;
  const row = getProduct(id);
  return row ? Response.json({ ...row, history: history("product", id) }) : fail("Not found", 404);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/library/products/[id]">) {
  const { id } = await ctx.params;
  try {
    const cur = getProduct(id);
    if (!cur) return fail("Not found", 404);
    const b = await req.json();
    saveProduct({ ...cur.product, ...b, id });
    return Response.json(getProduct(id));
  } catch (e) {
    return fail(e);
  }
}
