import Link from "next/link";
import { connection } from "next/server";
import { Nav } from "@/components/nav";
import { NewProject } from "@/components/new-project";
import { listProjects } from "@/lib/store";

export default async function Home() {
  await connection();
  const projects = await listProjects();
  return (
    <>
    <Nav active="projects" />
    <main className="mx-auto w-full max-w-5xl px-4 py-8 grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none tracking-wide">Projects</h1>
          <p className="text-muted mt-1">Approved order in, factory package out: line-up, 3D review, DXF and PDF drawings.</p>
        </div>
        <span className="font-mono text-xs text-muted">TSG-F · Stage 3-9 Rev A</span>
      </header>

      <NewProject />

      <section className="rounded-md border border-rule bg-panel">
        <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
          <h2 className="font-display text-xl font-semibold tracking-wide">Projects</h2>
          <span className="font-mono text-xs text-muted">{projects.length} saved</span>
        </div>
        {projects.length === 0 ? (
          <p className="px-4 py-8 text-muted">No projects yet. Create one above: it starts from the reference 4-feeder section, so you can see the whole flow straight away.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_10rem_6rem_9rem] gap-x-4 gap-y-1 items-center px-4 py-3 hover:bg-panel2">
                  <span className="min-w-0">
                    <span className="font-medium block truncate">{p.name}</span>
                    <span className="text-muted text-xs">{[p.client, p.reference].filter(Boolean).join(" · ") || "—"}</span>
                  </span>
                  <span className="hidden sm:block text-xs text-muted font-mono">rev {p.revision || "–"}</span>
                  <span className="text-xs font-mono text-muted text-right sm:text-left">{p.feeders} feeders</span>
                  <span className="hidden sm:block text-xs text-muted font-mono">{new Date(p.updatedAt).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
    </>
  );
}
