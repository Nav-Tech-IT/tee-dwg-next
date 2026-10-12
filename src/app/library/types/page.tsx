import Link from "next/link";
import { connection } from "next/server";
import { TypesAdmin } from "@/components/library/admin";
import { Nav } from "@/components/nav";
import { listTypes } from "@/library/repo";

export default async function Page() {
  await connection();
  return (
    <>
      <Nav active="library" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 grid gap-4">
        <nav className="text-sm text-muted"><Link href="/library" className="hover:text-fg">Library</Link> › Types & fields</nav>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide">Types & fields</h1>
          <p className="text-sm text-muted">Each component type defines which values its products need. Add a type or a field here: no code change needed.</p>
        </div>
        <TypesAdmin initial={listTypes()} />
      </main>
    </>
  );
}
