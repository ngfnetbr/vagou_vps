#!/usr/bin/env node
/**
 * Design System Audit
 * --------------------
 * Varre o código (src + modules) e reporta desvios do design system:
 *  - Cores fixas (text-/bg-/border- com paleta Tailwind crua) que deveriam
 *    usar tokens semânticos (primary, muted, success, warning, info...).
 *  - Cores hex/rgb diretas em className.
 *  - Ícones com tamanho numérico cru (size={20}) em vez de classes h-N w-N.
 *  - Ícones com cor não-semântica (color="..." ou text-<paleta>-<n>).
 *
 * Uso: node scripts/tools/design-audit.mjs            (resumo)
 *      node scripts/tools/design-audit.mjs --full     (lista por arquivo)
 *      node scripts/tools/design-audit.mjs --json      (saída JSON)
 *
 * Cores semânticas de ESTADO (success/warning/destructive/info) continuam
 * válidas — o objetivo é migrar paletas cruas para tokens, não remover
 * significado. Itens marcados como "revisar" exigem decisão humana.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "modules"];
const EXTS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const IGNORE = new Set(["node_modules", "dist", "build", ".git", "ui"]); // ui = shadcn primitives já tokenizados

const RAW_PALETTE =
  "white|black|gray|slate|zinc|neutral|stone|red|green|blue|yellow|amber|emerald|indigo|violet|purple|orange|teal|cyan|sky|rose|pink|lime|fuchsia";

const RULES = [
  {
    id: "hardcoded-color",
    label: "Cor fixa da paleta Tailwind (migrar p/ token semântico)",
    re: new RegExp(`\\b(?:text|bg|border|ring|from|to|via|fill|stroke)-(?:${RAW_PALETTE})-(?:50|[1-9]00|950)\\b`, "g"),
  },
  {
    id: "hex-color",
    label: "Cor hex/rgb direta em className",
    re: /(?:text|bg|border)-\[#[0-9a-fA-F]{3,8}\]|\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\]/g,
  },
  {
    id: "icon-raw-size",
    label: 'Ícone com size numérico (use className="h-4 w-4")',
    // Ignora componentes que legitimamente recebem size em px (QR codes, etc.)
    re: /<(?!QRCode|QRCodeSVG|QRCodeCanvas|ResponsiveContainer)[A-Z][A-Za-z0-9]*\s[^>]*\bsize=\{?\d+\}?/g,
  },
  {
    id: "icon-raw-color",
    label: "Ícone/SVG com prop color= crua (use text-* semântico)",
    re: /<[A-Z][A-Za-z0-9]*\s[^>]*\bcolor=["'#]/g,
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (EXTS.has(extname(entry))) files.push(full);
  }
  return files;
}

const args = process.argv.slice(2);
const FULL = args.includes("--full");
const JSON_OUT = args.includes("--json");

const files = TARGET_DIRS.flatMap((d) => {
  try {
    return walk(join(ROOT, d));
  } catch {
    return [];
  }
});

const totals = Object.fromEntries(RULES.map((r) => [r.id, 0]));
const perFile = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const hits = {};
  let fileTotal = 0;
  for (const rule of RULES) {
    const matches = text.match(rule.re);
    const count = matches ? matches.length : 0;
    if (count) {
      hits[rule.id] = count;
      totals[rule.id] += count;
      fileTotal += count;
    }
  }
  if (fileTotal) perFile.push({ file: relative(ROOT, file), hits, fileTotal });
}

perFile.sort((a, b) => b.fileTotal - a.fileTotal);

if (JSON_OUT) {
  console.log(JSON.stringify({ totals, files: perFile }, null, 2));
  process.exit(0);
}

const grand = Object.values(totals).reduce((a, b) => a + b, 0);
console.log("\n🎨  Design System Audit\n" + "=".repeat(40));
for (const rule of RULES) {
  console.log(`  ${String(totals[rule.id]).padStart(5)}  ${rule.label}`);
}
console.log("-".repeat(40));
console.log(`  ${String(grand).padStart(5)}  total de ocorrências em ${perFile.length} arquivos\n`);

if (FULL) {
  for (const f of perFile) {
    const detail = Object.entries(f.hits)
      .map(([k, v]) => `${k}:${v}`)
      .join("  ");
    console.log(`${String(f.fileTotal).padStart(4)}  ${f.file}\n        ${detail}`);
  }
} else {
  console.log("Top 15 arquivos a revisar:");
  for (const f of perFile.slice(0, 15)) {
    console.log(`  ${String(f.fileTotal).padStart(4)}  ${f.file}`);
  }
  console.log("\nUse --full para a lista completa ou --json para integração.\n");
}

// Falha somente em hex cru, que nunca deve existir.
process.exit(totals["hex-color"] > 0 ? 1 : 0);
