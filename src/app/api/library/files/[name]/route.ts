import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { FILES_DIR } from "@/library/db";

const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", dxf: "application/dxf", csv: "text/csv" };

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/library/files/[name]">) {
  const { name } = await ctx.params;
  if (!/^[a-f0-9]{16}\.[a-z0-9]+$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(join(FILES_DIR, name));
    const ext = name.split(".").pop()!;
    return new Response(buf, { headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Content-Disposition": `inline; filename="${name}"` } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
