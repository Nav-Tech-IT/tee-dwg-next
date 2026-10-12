import Link from "next/link";
import { connection } from "next/server";
import { SourcesAdmin } from "@/components/library/admin";
import { Nav } from "@/components/nav";
import { listBrands, listSources } from "@/library/repo";

export default async function Page() {
  await connection();
  return (
    <>
      <Nav active="library" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 grid gap-4">
        <nav className="text-sm text-muted"><Link href="/library" className="hover:text-fg">Library</Link> › Sources & files</nav>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide">Sources & files</h1>
          <p className="text-sm text-muted">Catalogues, datasheets, drawings and 3D models. Every value in the library points to one of these.</p>
        </div>
        <SourcesAdmin initial={listSources()} brands={listBrands()} />
      </main>
    </>
  );
}
