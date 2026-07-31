// Assembles tools/email-pdf-to-markdown.html from app.html by inlining pdf.js.
// Usage:  npm install pdfjs-dist@3.11.174 --no-save   (anywhere; pass its path if not local)
//         node build.mjs [path/to/node_modules/pdfjs-dist]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pdfjsDir = process.argv[2] || join(here, "node_modules", "pdfjs-dist");

const lib = readFileSync(join(pdfjsDir, "legacy", "build", "pdf.min.js"), "utf8");
const worker = readFileSync(join(pdfjsDir, "legacy", "build", "pdf.worker.min.js"), "utf8");

for (const [name, src] of [["pdf.min.js", lib], ["pdf.worker.min.js", worker]]) {
  if (src.includes("</script")) {
    throw new Error(`${name} contains "</script" and cannot be inlined as-is`);
  }
}

const template = readFileSync(join(here, "app.html"), "utf8");
const out = template
  .replace("/*__PDFJS__*/", () => lib)
  .replace("/*__PDFJS_WORKER__*/", () => worker);

const dest = join(here, "..", "email-pdf-to-markdown.html");
writeFileSync(dest, out);
console.log(`Wrote ${dest} (${(out.length / 1024 / 1024).toFixed(2)} MB)`);
