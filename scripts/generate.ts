// CLI: generate the factory package for a requirements file.
//   npx tsx scripts/generate.ts [requirements.json] [out-dir]
// Without arguments it builds the reference job.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build, exampleRequirements, factoryZip, packageName, parseRequirements } from "../src/engine";

async function main() {
  const [file, outDir = "out"] = process.argv.slice(2);
  const input = file ? JSON.parse(readFileSync(file, "utf8")) : exampleRequirements();
  const parsed = parseRequirements(input);
  if (!parsed.success) {
    console.error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
  }
  const b = build(parsed.data);
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${packageName(b)}.zip`);
  writeFileSync(path, await factoryZip(b));
  console.log(`${b.lineup.sections.length} sections, ${b.bom.length} part codes, ${b.drawings.length} DXFs -> ${path}`);
  for (const i of b.issues) console.log(`[${i.level}] ${i.message}`);
}

main();
