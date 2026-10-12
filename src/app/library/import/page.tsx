import Link from "next/link";
import { connection } from "next/server";
import { Importer } from "@/components/library/importer";
import { Nav } from "@/components/nav";
import { listTypes } from "@/library/repo";

export default async function Page() {
  await connection();
  return (
    <>
      <Nav active="library" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 grid gap-4">
        <nav className="text-sm text-muted"><Link href="/library" className="hover:text-fg">Library</Link> › Import</nav>
        <h1 className="font-display text-3xl font-bold tracking-wide">Import from Excel / CSV</h1>
        <Importer types={listTypes()} />
      </main>
    </>
  );
}
