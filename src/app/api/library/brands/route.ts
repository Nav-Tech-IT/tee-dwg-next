import { listBrands, saveBrand } from "@/library/repo";
import { fail } from "../_util";

export async function GET() {
  return Response.json(listBrands());
}

/** Create or update (send id to update). */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.name?.trim()) throw new Error("Name is required");
    return Response.json({ id: saveBrand(b) });
  } catch (e) {
    return fail(e);
  }
}
