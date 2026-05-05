import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "../config.js";
import { log } from "../util/logger.js";
import { sha256, walk } from "../util/fs.js";

export interface AttachmentRecord {
  absPath: string;
  relPath: string;
  /** First path segment under ATTACHMENTS_DIR, used as a project-name hint. */
  folderHint: string;
  size: number;
  hash: string;
  mtime: string;
}

/**
 * Scan ATTACHMENTS_DIR and produce a deduped list of files. The first directory
 * segment under the root is used as a "folder hint" — typically a meeting or
 * project name — which the project matcher consumes in addition to filenames.
 */
export function scanAttachments(): AttachmentRecord[] {
  const root = config.paths.attachments;
  if (!fs.existsSync(root)) {
    log.warn(`Attachments dir missing at ${root}; skipping.`);
    return [];
  }
  const out: AttachmentRecord[] = [];
  const seen = new Set<string>();
  for (const abs of walk(root)) {
    const rel = path.relative(root, abs);
    if (rel.startsWith("..")) continue;
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;
    const hash = sha256(fs.readFileSync(abs));
    if (seen.has(hash)) continue;
    seen.add(hash);
    const folderHint = rel.split(path.sep)[0] ?? "";
    out.push({
      absPath: abs,
      relPath: rel,
      folderHint,
      size: stat.size,
      hash,
      mtime: stat.mtime.toISOString(),
    });
  }
  log.info(`Scanned ${out.length} unique attachment(s) under ${root}`);
  return out;
}
