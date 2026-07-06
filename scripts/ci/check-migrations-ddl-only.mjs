import fs from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log("No migration files to check.");
  process.exit(0);
}

const DML_PATTERNS = [
  { id: "insert", re: /\binsert\s+into\b/i },
  { id: "update", re: /\bupdate\b/i },
  { id: "delete", re: /\bdelete\s+from\b/i },
  { id: "truncate", re: /\btruncate\b/i },
  { id: "copy", re: /\bcopy\b/i },
];

const problems = [];

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");
  for (const rule of DML_PATTERNS) {
    if (rule.re.test(sql)) {
      problems.push({ file, rule: rule.id });
    }
  }
}

if (problems.length) {
  console.error(
    [
      "Migrations must be DDL-only (schema changes). DML detected:",
      "",
      ...problems.map((p) => `- ${p.file} (${p.rule})`),
      "",
      "Move data changes (INSERT/UPDATE/DELETE/TRUNCATE/COPY) to per-city setup scripts.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("DDL-only check passed.");

