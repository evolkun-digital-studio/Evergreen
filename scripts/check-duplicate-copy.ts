/**
 * Flags any run of 6+ consecutive words that Evergreen's visible copy shares with the
 * IndiaWMS website. Two sites with copied text compete with each other in search.
 *
 * Usage: npm run copy:check -- [path-to-indiawms-src]
 * Default IndiaWMS source: ../indiawms-premium/src (or INDIAWMS_SRC).
 * Exit code 1 when overlaps are found.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const N = 6;
const ROOT = process.cwd();
const indiaSrc = path.resolve(process.argv[2] || process.env.INDIAWMS_SRC || path.join(ROOT, "..", "indiawms-premium", "src"));

/** Visible-copy locations on each side. Admin/CMS/editor code and UI primitives are excluded. */
const INDIA_FILES = ["components/home", "app/layout.tsx", "app/page.tsx"];
const EG_FILES = ["components/home", "components/site", "components/pages", "content", "config", "app"];
const EG_EXCLUDE = [/[\\/]app[\\/]admin[\\/]/, /[\\/]app[\\/]api[\\/]/, /[\\/]app[\\/]blog[\\/]/, /[\\/]app[\\/]og[\\/]/, /[\\/]app[\\/]uploads[\\/]/];

/** Attributes whose values are never visible text. */
const NON_VISIBLE_ATTRS = new Set(["className", "style", "href", "src", "id", "key", "type", "rel", "target", "role", "name", "htmlFor", "autoComplete", "sizes", "media", "viewBox", "d", "fill", "stroke", "transform", "aria-controls", "aria-labelledby", "data-scroll-behavior", "poster", "preload", "loading", "decoding"]);

type Snippet = { text: string; file: string; line: number };

function walk(target: string): string[] {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return /\.(tsx?|mdx?)$/.test(target) ? [target] : [];
  return readdirSync(target).flatMap(f => walk(path.join(target, f)));
}

const looksLikeCode = (s: string) => {
  const t = s.trim();
  if (!/[a-z]/i.test(t) || !/\s/.test(t)) return true; // single tokens, numbers, symbols
  if (/^(https?:|\/|#|mailto:|tel:)/.test(t)) return true;
  const tokens = t.split(/\s+/);
  const codey = tokens.filter(tok => /[-[\]:/=@{}]|^\d/.test(tok)).length;
  return codey / tokens.length > 0.4; // tailwind class lists, selectors
};

function extract(file: string): Snippet[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Snippet[] = [];
  const push = (text: string, node: ts.Node) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean && !looksLikeCode(clean)) out.push({ text: clean, file, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      if (NON_VISIBLE_ATTRS.has(name)) return;
    }
    if (ts.isCallExpression(node) && /^(cn|clsx|require|import)$/.test(node.expression.getText(sf))) return;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxText(node)) push(node.getText(sf), node);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) push(node.text, node);
    else if (ts.isTemplateExpression(node)) {
      push([node.head.text, ...node.templateSpans.map(s => s.literal.text)].join(" "), node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // JSX text is split around {expressions}; also join each element's direct text children.
  const visitJsx = (node: ts.Node) => {
    if (ts.isJsxElement(node)) {
      const joined = node.children
        .map(c => (ts.isJsxText(c) ? c.getText(sf) : ts.isJsxExpression(c) ? " " : ""))
        .join("");
      if (node.children.length > 1) push(joined, node);
    }
    ts.forEachChild(node, visitJsx);
  };
  visitJsx(sf);
  return out;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/&apos;|[’‘]/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[“”"]/g, " ")
    .replace(/[^a-z0-9₹%&'+ ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function ngrams(snippets: Snippet[]) {
  const map = new Map<string, Snippet>();
  for (const s of snippets) {
    const w = words(s.text);
    for (let i = 0; i + N <= w.length; i++) {
      const key = w.slice(i, i + N).join(" ");
      if (!map.has(key)) map.set(key, s);
    }
  }
  return map;
}

function main() {
  if (!existsSync(indiaSrc)) {
    console.error(`IndiaWMS source not found at ${indiaSrc}. Pass the path as the first argument.`);
    process.exit(2);
  }
  const indiaFiles = INDIA_FILES.flatMap(p => walk(path.join(indiaSrc, p)));
  const egFiles = EG_FILES.flatMap(p => walk(path.join(ROOT, "src", p))).filter(f => !EG_EXCLUDE.some(rx => rx.test(f)));

  const india = ngrams(indiaFiles.flatMap(extract));
  const egSnippets = egFiles.flatMap(extract);

  const hits = new Map<string, { eg: Snippet; india: Snippet; grams: string[] }>();
  for (const s of egSnippets) {
    const w = words(s.text);
    for (let i = 0; i + N <= w.length; i++) {
      const key = w.slice(i, i + N).join(" ");
      const match = india.get(key);
      if (!match) continue;
      const id = `${s.file}:${s.line}`;
      const entry = hits.get(id) ?? { eg: s, india: match, grams: [] };
      entry.grams.push(key);
      hits.set(id, entry);
    }
  }

  const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, "/");
  console.log(`Compared ${egSnippets.length} Evergreen strings (${egFiles.length} files) with ${indiaFiles.length} IndiaWMS files.`);
  if (!hits.size) {
    console.log(`✓ 0 overlaps of ${N}+ consecutive words.`);
    return;
  }
  console.log(`✗ ${hits.size} string(s) share ${N}+ consecutive words with IndiaWMS:\n`);
  for (const { eg, india: m, grams } of hits.values()) {
    console.log(`  ${rel(eg.file)}:${eg.line}`);
    console.log(`    Evergreen: "${eg.text.slice(0, 160)}"`);
    console.log(`    IndiaWMS : ${rel(m.file)}:${m.line} "${m.text.slice(0, 160)}"`);
    console.log(`    shared   : "${grams[0]}"${grams.length > 1 ? ` (+${grams.length - 1} more)` : ""}\n`);
  }
  process.exit(1);
}

main();
