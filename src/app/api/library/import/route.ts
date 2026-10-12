// step=preview: multipart file -> preview rows. step=commit: JSON { rows } -> write.
import { commit, preview, readTable, type PreviewRow } from "@/library/importer";
import { fail } from "../_util";

export async function POST(req: Request) {
  try {
    const step = new URL(req.url).searchParams.get("step");
    if (step === "commit") {
      const { rows } = (await req.json()) as { rows: PreviewRow[] };
      return Response.json(commit(rows));
    }
    const fd = await req.formData();
    const f = fd.get("file");
    if (!f || typeof f === "string") throw new Error("Choose a .csv or .xlsx file");
    return Response.json(preview(await readTable(f.name, await f.arrayBuffer())));
  } catch (e) {
    return fail(e);
  }
}
