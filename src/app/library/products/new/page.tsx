import { connection } from "next/server";
import { NewProductForm } from "@/components/library/new-product";
import { Nav } from "@/components/nav";
import { listBrands, listSeries, listTypes } from "@/library/repo";

export default async function NewProductPage() {
  await connection();
  return (
    <>
      <Nav active="library" />
      <NewProductForm types={listTypes()} brands={listBrands().filter((b) => b.active)} series={listSeries()} />
    </>
  );
}
