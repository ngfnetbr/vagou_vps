import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/tools/generate-placeholder-migrations.mjs <version> [version...]",
      "",
      "Example:",
      "  node scripts/tools/generate-placeholder-migrations.mjs 20251202001848 20251202001914",
      "",
    ].join("\n"),
  );
}

const versions = process.argv.slice(2).filter(Boolean);
if (versions.length === 0) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const existing = new Set(
  fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
    .map((e) => e.name),
);

let created = 0;
for (const v of versions) {
  if (!/^\d{14}$/.test(v)) {
    console.error("Invalid version (expected 14 digits):", v);
    process.exit(1);
  }

  // If any file already starts with the same version, skip.
  const has = [...existing].some((name) => name.startsWith(`${v}_`));
  if (has) continue;

  const filename = `${v}_placeholder_remote_history.sql`;
  const fullPath = path.join(migrationsDir, filename);
  const content =
    `-- Placeholder migration (DDL-only).\n` +
    `--\n` +
    `-- This file exists to match a migration version already present in some target projects'\n` +
    `-- supabase_migrations.schema_migrations history table, so \`supabase db push\` can proceed.\n` +
    `\n`;

  fs.writeFileSync(fullPath, content, "utf8");
  existing.add(filename);
  created += 1;
}

console.log(`Done. Created ${created} placeholder migration(s).`);

