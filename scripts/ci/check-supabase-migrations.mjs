import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

const DANGEROUS = [
  // Keep this guard intentionally narrow.
  // This repo contains historical migrations that legitimately include UPDATE/DELETE/DROP TABLE
  // as part of schema evolution and seed/setup flows. We only block the highest-risk ops.
  { id: "truncate", re: /\btruncate\b/i },
  { id: "drop-schema", re: /\bdrop\s+schema\b/i },
];

const ALLOW_MARKER = /--\s*allow-destructive\b/i;

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
    .map((e) => path.join(dir, e.name))
    .sort();
}

const files = listSqlFiles(migrationsDir);
if (files.length === 0) {
  console.log("No migration files found in supabase/migrations.");
  process.exit(0);
}

const problems = [];

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");
  const allowed = ALLOW_MARKER.test(sql);

  for (const rule of DANGEROUS) {
    if (rule.re.test(sql)) {
      if (!allowed) {
        problems.push({
          file: path.relative(repoRoot, file),
          rule: rule.id,
        });
      }
    }
  }
}

if (problems.length) {
  console.error(
    [
      "Potentially destructive SQL detected in migrations.",
      "If this is intentional, add a line with: -- allow-destructive",
      "",
      ...problems.map((p) => `- ${p.file} (${p.rule})`),
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Migrations check passed (no destructive statements detected).");

