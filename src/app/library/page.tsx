import Link from "next/link";
import { connection } from "next/server";
import { Nav } from "@/components/nav";
import { StatusPill } from "@/components/library/ui";
import { listBrands, listProducts, listTypes } from "@/library/repo";

export default async function LibraryPage(props: PageProps<"/library">) {
  await connection();
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filter = { q: one("q"), typeId: one("type"), brandId: one("brand"), status: one("status"), includeInactive: one("inactive") === "1" };
  const types = listTypes(), brands = listBrands();
  const all = listProducts({ includeInactive: filter.includeInactive });
  const rows = listProducts(filter);
  const categories = [...new Set(types.map((t) => t.category))];
  const base = { q: filter.q, type: filter.typeId, brand: filter.brandId, status: filter.status, inactive: filter.includeInactive ? "1" : undefined };
  const qs = (patch: Partial<typeof base>) => {
    const p = new URLSearchParams(Object.entries({ ...base, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/library${p.size ? `?${p}` : ""}`;
  };
  const counts = { verified: all.filter((r) => r.product.status === "verified").length, extracted: all.filter((r) => r.product.status === "extracted").length, draft: all.filter((r) => r.product.status === "draft").length };

  return (
    <>
      <Nav active="library" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide">Component library</h1>
            <p className="text-muted text-sm max-w-2xl">Every product the panel engine may use, with its dimensions and where each value came from. Only <b>verified</b> products can be used in a design.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/library/products/new" className="rounded-md bg-accent text-white px-3 py-1.5 font-medium">+ Add product</Link>
            <Link href="/library/import" className="rounded-md border border-rule bg-panel px-3 py-1.5">Import Excel / CSV</Link>
            <Link href="/library/sources" className="rounded-md border border-rule bg-panel px-3 py-1.5">Sources & files</Link>
            <Link href="/library/types" className="rounded-md border border-rule bg-panel px-3 py-1.5">Types & fields</Link>
            <Link href="/library/brands" className="rounded-md border border-rule bg-panel px-3 py-1.5">Brands</Link>
            <a href="/api/library/export" className="rounded-md border border-rule bg-panel px-3 py-1.5">Export JSON</a>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {(["verified", "extracted", "draft"] as const).map((s) => (
            <Link key={s} href={qs({ status: filter.status === s ? undefined : s })} className={`rounded-md border px-4 py-3 bg-panel ${filter.status === s ? "border-fg" : "border-rule"}`}>
              <div className="font-display text-3xl font-bold">{counts[s]}</div>
              <div className="text-sm"><StatusPill status={s} /> <span className="text-muted ml-1">{s === "verified" ? "usable in designs" : s === "extracted" ? "from a source, waiting for a check" : "incomplete"}</span></div>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="grid gap-3 content-start text-sm">
            <Link href={qs({ type: undefined })} className={`px-2 py-1 rounded ${!filter.typeId ? "bg-fg text-bg" : "hover:bg-panel2"}`}>All types <span className="opacity-60">({all.length})</span></Link>
            {categories.map((c) => (
              <div key={c} className="grid gap-0.5">
                <div className="font-mono text-[11px] uppercase tracking-wider text-muted px-2">{c}</div>
                {types.filter((t) => t.category === c).map((t) => {
                  const n = all.filter((r) => r.type.id === t.id).length;
                  return (
                    <Link key={t.id} href={qs({ type: t.id })} className={`px-2 py-1 rounded flex justify-between ${filter.typeId === t.id ? "bg-fg text-bg" : "hover:bg-panel2"}`}>
                      <span>{t.name}</span><span className="opacity-60">{n}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </aside>

          <section className="grid gap-3 content-start min-w-0">
            <form className="flex flex-wrap gap-2 items-center" action="/library">
              {filter.typeId && <input type="hidden" name="type" value={filter.typeId} />}
              {filter.status && <input type="hidden" name="status" value={filter.status} />}
              <input name="q" defaultValue={filter.q} placeholder="Search part number, series, brand" className="rounded-md border border-rule bg-panel px-3 py-1.5 text-sm w-72 max-w-full" />
              <select name="brand" defaultValue={filter.brandId ?? ""} className="rounded-md border border-rule bg-panel px-2 py-1.5 text-sm">
                <option value="">All brands</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" name="inactive" value="1" defaultChecked={filter.includeInactive} /> Show deactivated</label>
              <button className="rounded-md border border-rule bg-panel px-3 py-1.5 text-sm">Filter</button>
            </form>

            <div className="overflow-x-auto rounded-md border border-rule bg-panel">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted font-mono">
                  <tr className="border-b border-rule">
                    <th className="px-3 py-2">Part number</th><th className="px-3 py-2">Brand · series</th><th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Rating</th><th className="px-3 py-2">Poles</th><th className="px-3 py-2">W × H × D</th><th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ product: p, series: s, brand: b, type: t, resolved: r }) => {
                    const v = (k: string) => r.values[k]?.value;
                    const dims = ["width", "height", "depth"].map((k) => v(k) ?? "?").join(" × ");
                    return (
                      <tr key={p.id} className={`border-t border-rule/60 hover:bg-panel2 ${p.active ? "" : "opacity-50"}`}>
                        <td className="px-3 py-1.5"><Link href={`/library/products/${p.id}`} className="font-mono text-xs font-medium hover:text-accent">{p.partNumber}</Link><div className="text-xs text-muted truncate max-w-xs">{p.name}</div></td>
                        <td className="px-3 py-1.5">{b.name}<Link href={`/library/series/${s.id}`} className="block text-xs text-muted hover:text-accent">{s.name}</Link></td>
                        <td className="px-3 py-1.5 text-xs">{t.name}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs">{String(v("rating") ?? v("rating_ac3") ?? "")}{v("rating") || v("rating_ac3") ? " A" : ""}</td>
                        <td className="px-3 py-1.5 font-mono text-xs">{String(v("poles") ?? "")}</td>
                        <td className="px-3 py-1.5 font-mono text-xs whitespace-nowrap">{dims}</td>
                        <td className="px-3 py-1.5">
                          <StatusPill status={p.status} />
                          {!r.complete && <div className="text-[11px] text-muted">{r.missing.length} missing{r.unsourced.length ? `, ${r.unsourced.length} unsourced` : ""}</div>}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No products match.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
