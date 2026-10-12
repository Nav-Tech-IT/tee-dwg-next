import type { NextRequest } from "next/server";
import { deleteProject, readProject, saveProject } from "@/lib/store";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const r = await readProject(id);
  return r ? Response.json(r) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const res = await saveProject(id, await req.json());
  if (!res.ok) return Response.json({ error: res.error.issues }, { status: 400 });
  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  await deleteProject(id);
  return new Response(null, { status: 204 });
}
