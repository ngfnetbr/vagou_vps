import fs from "node:fs";
import path from "node:path";

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const repoRoot = process.cwd();
const reportJsonPath = path.join(repoRoot, "playwright-report", "report.json");
const report = readJsonIfExists(reportJsonPath);

if (!report) {
  console.log(
    `Playwright report not found at ${reportJsonPath}. Run "npm run test:e2e" first.`
  );
  process.exit(0);
}

const lines = [];
lines.push("# Relatório E2E (Playwright)");
lines.push("");
lines.push(`- Gerado em: ${new Date().toISOString()}`);
lines.push(`- Fonte: \`playwright-report/report.json\``);
lines.push("");

const stats = report?.stats;
if (stats) {
  lines.push("## Resumo");
  lines.push("");
  lines.push(`- **Suites**: ${stats.suites ?? "?"}`);
  lines.push(`- **Tests**: ${stats.tests ?? "?"}`);
  lines.push(`- **Passed**: ${stats.passed ?? "?"}`);
  lines.push(`- **Failed**: ${stats.failed ?? "?"}`);
  lines.push(`- **Skipped**: ${stats.skipped ?? "?"}`);
  lines.push(`- **Flaky**: ${stats.flaky ?? "?"}`);
  lines.push("");
}

const outDir = path.join(repoRoot, "test-results");
const outPath = path.join(outDir, "e2e-report.md");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

console.log(`Wrote ${outPath}`);

