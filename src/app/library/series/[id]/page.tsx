import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SeriesEditor } from "@/components/library/series-editor";
import { Nav } from "@/components/nav";
import { getSeries, getType, history, listBrands, listProducts, listSources } from "@/library/repo";

export default async function SeriesPage(props: PageProps<"/library/series/[id]">) {
  await connection();
  const { id } = await props.params;
  const series = getSeries(id);
  if (!series) notFound();
  const type = getType(series.typeId)!;
  const brand = listBrands().find((b) => b.id === series.brandId)!;
  const products = listProducts({ includeInactive: true }).filter((r) => r.series.id === id)
    .map((r) => ({ id: r.product.id, partNumber: r.product.partNumber, status: r.product.status, active: r.product.active, complete: r.resolved.complete }));
  return (
    <>
      <Nav active="library" />
      <SeriesEditor initial={series} type={type} brand={brand} products={products} sources={listSources()} history={history("series", id)} />
    </>
  );
}
