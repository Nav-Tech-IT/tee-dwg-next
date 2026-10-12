import type { NextRequest } from "next/server";
import { getProduct, setProductStatus } from "@/library/repo";
import { fail } from "../../../_util";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/library/products/[id]/status">) {
  const { id } = await ctx.params;
  try {
    const { status } = await req.json();
    if (!["draft", "extracted", "verified"].includes(status)) throw new Error("Unknown status");
    setProductStatus(id, status);
    return Response.json(getProduct(id));
  } catch (e) {
    return fail(e);
  }
}
