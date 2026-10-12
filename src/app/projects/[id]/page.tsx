import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { readProject } from "@/lib/store";

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const req = await readProject(id);
  if (!req) notFound();
  return <Workspace id={id} initial={req} />;
}
