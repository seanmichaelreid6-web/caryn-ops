// Assembles tools/email-pdf-to-markdown.html from app.html by inlining
// pdf.js (PDF reading) and tesseract.js (OCR for image-only PDFs).
//
// Usage:
//   npm install pdfjs-dist@3.11.174 tesseract.js@5 --no-save
//   curl -sSL -o eng.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/eng.traineddata
//   gzip -9 eng.traineddata
//   node build.mjs [dir-containing-node_modules-and-eng.traineddata.gz]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const assetDir = process.argv[2] || here;
const nm = join(assetDir, "node_modules");

const assets = {
  "/*__PDFJS__*/": readFileSync(join(nm, "pdfjs-dist", "legacy", "build", "pdf.min.js"), "utf8"),
  "/*__PDFJS_WORKER__*/": readFileSync(join(nm, "pdfjs-dist", "legacy", "build", "pdf.worker.min.js"), "utf8"),
  "/*__TESS__*/": readFileSync(join(nm, "tesseract.js", "dist", "tesseract.min.js"), "utf8"),
  "/*__TESS_CORE__*/": readFileSync(join(nm, "tesseract.js-core", "tesseract-core-simd-lstm.wasm.js"), "utf8"),
  "/*__TESS_WORKER__*/": readFileSync(join(nm, "tesseract.js", "dist", "worker.min.js"), "utf8"),
  "/*__TESS_LANG_B64__*/": readFileSync(join(assetDir, "eng.traineddata.gz")).toString("base64"),
};

for (const [marker, src] of Object.entries(assets)) {
  if (marker !== "/*__TESS_LANG_B64__*/" && src.includes("</script")) {
    throw new Error(`asset for ${marker} contains "</script" and cannot be inlined as-is`);
  }
}

let out = readFileSync(join(here, "app.html"), "utf8");
for (const [marker, src] of Object.entries(assets)) {
  if (!out.includes(marker)) throw new Error(`marker ${marker} missing from app.html`);
  out = out.replace(marker, () => src);
}

const dest = join(here, "..", "email-pdf-to-markdown.html");
writeFileSync(dest, out);
console.log(`Wrote ${dest} (${(out.length / 1024 / 1024).toFixed(2)} MB)`);
