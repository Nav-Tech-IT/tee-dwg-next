import { exportLibrary } from "@/library/repo";

export async function GET() {
  return new Response(JSON.stringify(exportLibrary(), null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="component-library-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}
