// Local SQLite database for the component library: web/data/library.sqlite.
// Tables are created on first use and seeded once.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { SEED_TYPES, type FieldDef } from "./schema";
import { seed } from "./seed";

export const DATA_DIR = join(process.cwd(), "data");
export const FILES_DIR = join(DATA_DIR, "library-files");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, website TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS types (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, name TEXT NOT NULL, fields TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 100,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY, brand_id TEXT NOT NULL REFERENCES brands(id), type_id TEXT NOT NULL REFERENCES types(id),
  name TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', specs TEXT NOT NULL DEFAULT '{}', files TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (brand_id, type_id, name));
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, series_id TEXT NOT NULL REFERENCES series(id), part_number TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
  specs TEXT NOT NULL DEFAULT '{}', files TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft',
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (series_id, part_number));
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, brand_id TEXT REFERENCES brands(id), title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'catalogue',
  url TEXT NOT NULL DEFAULT '', file TEXT, notes TEXT NOT NULL DEFAULT '', retrieved_at TEXT NOT NULL DEFAULT (date('now')));
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL DEFAULT (datetime('now')), entity TEXT NOT NULL,
  entity_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '{}');
CREATE INDEX IF NOT EXISTS history_entity ON history (entity, entity_id);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

const g = globalThis as unknown as { __libdb?: Database.Database };

export function db(): Database.Database {
  if (g.__libdb) return g.__libdb;
  mkdirSync(FILES_DIR, { recursive: true });
  const d = new Database(join(DATA_DIR, "library.sqlite"));
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SCHEMA);
  const seeded = d.prepare("SELECT value FROM settings WHERE key = 'seeded'").get();
  if (!seeded) {
    d.transaction(() => {
      seed(d);
      d.prepare("INSERT INTO settings (key, value) VALUES ('seeded', ?)").run(JSON.stringify(new Date().toISOString()));
    })();
  }
  syncSeedTypes(d);
  g.__libdb = d;
  return d;
}

/**
 * New versions of the app may add component types or fields. Add what is missing,
 * never change or remove what the user edited.
 */
function syncSeedTypes(d: Database.Database) {
  const rows = d.prepare("SELECT id, fields FROM types").all() as { id: string; fields: string }[];
  const have = new Map(rows.map((r) => [r.id, JSON.parse(r.fields) as FieldDef[]]));
  d.transaction(() => {
    for (const t of SEED_TYPES) {
      const cur = have.get(t.id);
      if (!cur) {
        d.prepare("INSERT INTO types (id, category, name, fields, sort) VALUES (?, ?, ?, ?, ?)").run(t.id, t.category, t.name, JSON.stringify(t.fields), t.sort);
        d.prepare("INSERT INTO history (entity, entity_id, action, detail) VALUES ('type', ?, 'create', ?)").run(t.id, JSON.stringify({ from: "app update" }));
        continue;
      }
      const missing = t.fields.filter((f) => !cur.some((c) => c.key === f.key));
      if (!missing.length) continue;
      d.prepare("UPDATE types SET fields = ? WHERE id = ?").run(JSON.stringify([...cur, ...missing]), t.id);
      d.prepare("INSERT INTO history (entity, entity_id, action, detail) VALUES ('type', ?, 'update', ?)").run(t.id, JSON.stringify({ from: "app update", added: missing.map((f) => f.key) }));
    }
  })();
}
