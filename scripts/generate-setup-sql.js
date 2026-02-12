/**
 * Reads the migration SQL + canon.json and outputs a single combined SQL script
 * that creates all tables and seeds the canon data.
 *
 * Usage: node scripts/generate-setup-sql.js > supabase/setup.sql
 */

const fs = require("fs");
const path = require("path");

const canon = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/canon.json"), "utf-8"),
);

const migration1 = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"),
  "utf-8",
);

let migration2 = "";
const m2Path = path.join(
  __dirname,
  "../supabase/migrations/002_pattern_store.sql",
);
if (fs.existsSync(m2Path)) {
  migration2 = fs.readFileSync(m2Path, "utf-8");
}

function esc(s) {
  return s.replace(/'/g, "''");
}

function pgArray(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  return (
    "ARRAY[" + arr.map((v) => "'" + esc(v) + "'").join(", ") + "]::text[]"
  );
}

let sql = "";

sql += "-- ============================================================\n";
sql += "-- Shared Light Atlas — Complete Database Setup\n";
sql += "-- Generated from migration SQL + canon.json\n";
sql += `-- Generated at: ${new Date().toISOString()}\n`;
sql += "-- \n";
sql += "-- Paste this entire script into the Supabase SQL Editor and run.\n";
sql += "-- ============================================================\n\n";

// Migration 1
sql += "-- ────────────────────────────────────────────────────────────\n";
sql += "-- PART 1: Schema (001_initial_schema.sql)\n";
sql += "-- ────────────────────────────────────────────────────────────\n\n";
sql += migration1;
sql += "\n\n";

// Migration 2
if (migration2) {
  sql += "-- ────────────────────────────────────────────────────────────\n";
  sql += "-- PART 2: Pattern Store (002_pattern_store.sql)\n";
  sql += "-- ────────────────────────────────────────────────────────────\n\n";
  sql += migration2;
  sql += "\n\n";
}

// Seed data
sql += "-- ────────────────────────────────────────────────────────────\n";
sql += "-- PART 3: Seed Canon Data\n";
sql += "-- ────────────────────────────────────────────────────────────\n\n";

// Meta
sql += "INSERT INTO canon_meta (schema_version, generated_at, notes) VALUES (\n";
sql += `  '${esc(canon.meta.schema_version)}',\n`;
sql += `  '${canon.meta.generated_at}'::timestamptz,\n`;
sql += `  ${pgArray(canon.meta.notes)}\n`;
sql += ");\n\n";

// Objects
for (const obj of canon.objects) {
  sql += "INSERT INTO canon_objects (id, type, name, one_liner, description, temp_primary, dim_cap, reads_tokens, writes_tokens, produces_receipts, constraints, links) VALUES (\n";
  sql += `  '${esc(obj.id)}',\n`;
  sql += `  '${esc(obj.type)}',\n`;
  sql += `  '${esc(obj.name)}',\n`;
  sql += `  '${esc(obj.one_liner)}',\n`;
  sql += `  '${esc(obj.description)}',\n`;
  sql += `  '${esc(obj.temp_primary)}',\n`;
  sql += `  '${esc(obj.dim_cap)}',\n`;
  sql += `  ${pgArray(obj.reads_tokens)},\n`;
  sql += `  ${pgArray(obj.writes_tokens)},\n`;
  sql += `  ${pgArray(obj.produces_receipts)},\n`;
  sql += `  ${pgArray(obj.constraints)},\n`;
  sql += `  ${pgArray(obj.links)}\n`;
  sql += ");\n\n";
}

// Links (deduplicated — only insert if target exists in canon)
const validIds = new Set(canon.objects.map((o) => o.id));
const linkPairs = new Set();

for (const obj of canon.objects) {
  for (const linkId of obj.links) {
    if (validIds.has(linkId)) {
      const key = `${obj.id}|${linkId}`;
      if (!linkPairs.has(key)) {
        linkPairs.add(key);
        sql += `INSERT INTO canon_links (source_id, target_id) VALUES ('${esc(obj.id)}', '${esc(linkId)}') ON CONFLICT DO NOTHING;\n`;
      }
    }
  }
}

sql += "\n-- ────────────────────────────────────────────────────────────\n";
sql += `-- Setup complete: ${canon.objects.length} canon objects seeded\n`;
sql += "-- ────────────────────────────────────────────────────────────\n";

const outPath = path.join(__dirname, "../supabase/setup.sql");
fs.writeFileSync(outPath, sql, "utf-8");
console.log(`Wrote ${outPath} (${sql.length} chars, ${canon.objects.length} objects)`);
