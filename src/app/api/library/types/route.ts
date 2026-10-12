import { listTypes, saveType } from "@/library/repo";
import { fail } from "../_util";

export async function GET() {
  return Response.json(listTypes());
}

/** Create or update a component type and its field definitions. */
export async function POST(req: Request) {
  try {
    const t = await req.json();
    if (!t.name?.trim() || !t.category?.trim()) throw new Error("Category and name are required");
    return Response.json({ id: saveType(t) });
  } catch (e) {
    return fail(e);
  }
}
