import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProductEditor } from "@/components/library/product-editor";
import { Nav } from "@/components/nav";
import { getProduct, history, listSources } from "@/library/repo";

export default async function ProductPage(props: PageProps<"/library/products/[id]">) {
  await connection();
  const { id } = await props.params;
  const row = getProduct(id);
  if (!row) notFound();
  return (
    <>
      <Nav active="library" />
      <ProductEditor initial={row} sources={listSources()} history={history("product", id)} />
    </>
  );
}
