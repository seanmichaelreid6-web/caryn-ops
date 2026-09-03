// Assembles tools/email-to-context.html from context-app.html by inlining the
// email/attachment parsing bundle and pdf.js.
//
// Usage:
//   npm install postal-mime @kenjiuno/msgreader @kenjiuno/decompressrtf rtf-stream-parser \
//               iconv-lite turndown xlsx mammoth fflate pdfjs-dist@3.11.174 \
//               buffer string_decoder stream-browserify events util process esbuild --no-save
//   node build-context.mjs [dir-containing-node_modules-and-ctxlibs.js]
//
// ctxlibs.js is produced by:
//   npx esbuild ctxlibs-entry.js --bundle --format=iife --global-name=CtxLibs --minify \
//     --platform=browser --inject:./shim-buffer.js --alias:buffer=buffer \
//     --alias:string_decoder=string_decoder --alias:stream=stream-browserify \
//     --define:global=globalThis --outfile=ctxlibs.js
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const assetDir = process.argv[2] || here;
const nm = join(assetDir, "node_modules");

const assets = {
  "/*__CTXLIBS__*/": readFileSync(join(assetDir, "ctxlibs.js"), "utf8"),
  "/*__PDFJS__*/": readFileSync(join(nm, "pdfjs-dist", "legacy", "build", "pdf.min.js"), "utf8"),
  "/*__PDFJS_WORKER__*/": readFileSync(join(nm, "pdfjs-dist", "legacy", "build", "pdf.worker.min.js"), "utf8"),
};

for (const [marker, src] of Object.entries(assets)) {
  if (src.includes("</script")) throw new Error(`asset for ${marker} contains "</script"`);
}

let out = readFileSync(join(here, "context-app.html"), "utf8");
for (const [marker, src] of Object.entries(assets)) {
  if (!out.includes(marker)) throw new Error(`marker ${marker} missing from context-app.html`);
  out = out.replace(marker, () => src);
}

const dest = join(here, "..", "email-to-context.html");
writeFileSync(dest, out);
console.log(`Wrote ${dest} (${(out.length / 1024 / 1024).toFixed(2)} MB)`);
