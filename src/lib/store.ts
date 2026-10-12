// Projects are plain JSON files in ./projects — easy to back up, diff and hand to
// the MCP server later. One file = one order's requirements.
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseRequirements, type Requirements } from "@/engine/requirements";

const DIR = join(process.cwd(), "projects");
const ID = /^[a-z0-9][a-z0-9-]{0,80}$/;

export interface ProjectSummary {
  id: string;
  name: string;
  client: string;
  reference: string;
  revision: string;
  feeders: number;
  updatedAt: string;
}

const file = (id: string) => {
  if (!ID.test(id)) throw new Error("Invalid project id");
  return join(DIR, `${id}.json`);
};

export async function listProjects(): Promise<ProjectSummary[]> {
  await mkdir(DIR, { recursive: true });
  const names = (await readdir(DIR)).filter((n) => n.endsWith(".json"));
  const out = await Promise.all(
    names.map(async (n) => {
      const id = n.slice(0, -5);
      try {
        const [raw, st] = await Promise.all([readFile(join(DIR, n), "utf8"), stat(join(DIR, n))]);
        const r = JSON.parse(raw) as Requirements;
        return {
          id, name: r.project?.name ?? id, client: r.project?.client ?? "", reference: r.project?.reference ?? "",
          revision: r.project?.revision ?? "", feeders: (r.feeders ?? []).reduce((s, f) => s + (f.qty ?? 1), 0), updatedAt: st.mtime.toISOString(),
        };
      } catch {
        return null;
      }
    }),
  );
  return out.filter((p): p is ProjectSummary => !!p).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readProject(id: string): Promise<Requirements | null> {
  try {
    return JSON.parse(await readFile(file(id), "utf8"));
  } catch {
    return null;
  }
}

export async function saveProject(id: string, input: unknown) {
  const parsed = parseRequirements(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error };
  await mkdir(DIR, { recursive: true });
  await writeFile(file(id), JSON.stringify(parsed.data, null, 2));
  return { ok: true as const, data: parsed.data };
}

export async function deleteProject(id: string) {
  await rm(file(id), { force: true });
}

export function newId(name: string) {
  const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "project";
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`;
}
