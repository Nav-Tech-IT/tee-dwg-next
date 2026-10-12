import Link from "next/link";
import { connection } from "next/server";
import { BrandsAdmin } from "@/components/library/admin";
import { Nav } from "@/components/nav";
import { listBrands } from "@/library/repo";

export default async function Page() {
  await connection();
  return (
    <>
      <Nav active="library" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 grid gap-4">
        <nav className="text-sm text-muted"><Link href="/library" className="hover:text-fg">Library</Link> › Brands</nav>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide">Brands</h1>
          <p className="text-sm text-muted">Manufacturers in the library. Deactivate a brand instead of deleting it.</p>
        </div>
        <BrandsAdmin initial={listBrands()} />
      </main>
    </>
  );
}
