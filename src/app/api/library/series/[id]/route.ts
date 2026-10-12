import type { NextRequest } from "next/server";
import { getSeries, history, saveSeries } from "@/library/repo";
import { fail } from "../../_util";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/library/series/[id]">) {
  const { id } = await ctx.params;
  const s = getSeries(id);
  return s ? Response.json({ ...s, history: history("series", id) }) : fail("Not found", 404);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/library/series/[id]">) {
  const { id } = await ctx.params;
  try {
    const cur = getSeries(id);
    if (!cur) return fail("Not found", 404);
    saveSeries({ ...cur, ...(await req.json()), id });
    return Response.json(getSeries(id));
  } catch (e) {
    return fail(e);
  }
}
