import { exampleRequirements } from "@/engine/requirements";
import { listProjects, newId, saveProject } from "@/lib/store";

export async function GET() {
  return Response.json(await listProjects());
}

/** Create a project. Body: { name, client?, reference?, from?: "example" | "blank" } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; client?: string; reference?: string; from?: string };
  const base = exampleRequirements();
  const name = body.name?.trim() || "New project";
  const r = {
    ...base,
    project: { ...base.project, name, client: body.client ?? "", reference: body.reference ?? "" },
    feeders: body.from === "blank" ? [] : base.feeders,
  };
  const id = newId(name);
  const res = await saveProject(id, r);
  if (!res.ok) return Response.json({ error: res.error.issues }, { status: 400 });
  return Response.json({ id }, { status: 201 });
}
