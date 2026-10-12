// Sources: catalogues, datasheets, drawings and 3D models. Files are stored in data/library-files.
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { FILES_DIR } from "@/library/db";
import { listSources, saveSource } from "@/library/repo";
import { fail } from "../_util";

export async function GET() {
  return Response.json(listSources());
}

const ALLOWED = /\.(pdf|step|stp|dxf|dwg|png|jpe?g|xlsx|csv|zip|igs|iges)$/i;

/** multipart: title, kind, url, brandId, notes, retrievedAt, id (to update), file (optional). */
export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const s = (k: string) => (fd.get(k) as string | null) ?? undefined;
    if (!s("title")?.trim()) throw new Error("Title is required");
    let file: string | undefined;
    const up = fd.get("file");
    if (up && typeof up !== "string" && up.size > 0) {
      if (!ALLOWED.test(up.name)) throw new Error("File type not allowed");
      const buf = Buffer.from(await up.arrayBuffer());
      file = createHash("sha256").update(buf).digest("hex").slice(0, 16) + extname(up.name).toLowerCase();
      await writeFile(join(FILES_DIR, file), buf);
    }
    const id = saveSource({ id: s("id"), title: s("title")!, kind: (s("kind") as never) ?? "catalogue", url: s("url"), brandId: s("brandId") || null, notes: s("notes"), retrievedAt: s("retrievedAt"), file });
    return Response.json({ id });
  } catch (e) {
    return fail(e);
  }
}
