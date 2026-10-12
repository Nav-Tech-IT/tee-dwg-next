// CLI import into the local library (same rules as the Import page).
//   npx tsx scripts/import-csv.ts <file.csv|xlsx> [--commit]
import { readFileSync } from "node:fs";
import { commit, preview, readTable } from "../src/library/importer";

async function main() {
  const [file, flag] = process.argv.slice(2);
  const buf = readFileSync(file);
  const { rows, unknownColumns } = preview(await readTable(file, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
  const bad = rows.filter((r) => r.errors.length);
  console.log(`${rows.length} rows: ${rows.filter((r) => r.action === "create").length} new, ${rows.filter((r) => r.action === "update").length} updates, ${bad.length} with errors`);
  if (unknownColumns.length) console.log("Ignored columns:", unknownColumns.join(", "));
  for (const r of bad.slice(0, 20)) console.log(`  line ${r.line} ${r.partNumber}: ${r.errors.join("; ")}`);
  const warn = new Map<string, number>();
  for (const r of rows) for (const w of r.warnings) warn.set(w, (warn.get(w) ?? 0) + 1);
  for (const [w, n] of warn) console.log(`  warning x${n}: ${w}`);
  if (flag === "--commit") console.log("Committed:", commit(rows));
  else console.log("Preview only. Add --commit to write.");
}
main();
