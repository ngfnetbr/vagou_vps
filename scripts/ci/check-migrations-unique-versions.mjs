import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

if (!fs.existsSync(migrationsDir)) {
  console.log("No supabase/migrations directory.");
  process.exit(0);
}

const files = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
  .map((e) => e.name)
  .sort();

const byVersion = new Map();

for (const name of files) {
  const m = name.match(/^(\d{14})_/);
  if (!m) continue;
  const version = m[1];
  const arr = byVersion.get(version) ?? [];
  arr.push(name);
  byVersion.set(version, arr);
}

const duplicates = [...byVersion.entries()].filter(([, arr]) => arr.length > 1);
if (duplicates.length) {
  console.error("Duplicate migration versions detected (must be unique):\n");
  for (const [v, arr] of duplicates) {
    console.error(`- ${v}`);
    for (const f of arr) console.error(`  - ${f}`);
  }
  console.error("");
  process.exit(1);
}

console.log("Migration versions are unique.");

