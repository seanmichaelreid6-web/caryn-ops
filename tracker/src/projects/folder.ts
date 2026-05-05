import * as fs from "node:fs";
import * as path from "node:path";
import MsgReader from "@kenjiuno/msgreader";
import { config } from "../config.js";
import { ensureDir, sha256 } from "../util/fs.js";
import { log } from "../util/logger.js";

export interface ProjectFolder {
  /** Folder path under data/projects/. */
  dir: string;
  /** Sanitized folder name (the email subject, slugified). */
  name: string;
  context: ProjectContext;
}

export interface ProjectContext {
  id: string;
  source: "msg" | "transcript" | "manual";
  origin: string;
  ingestedAt: string;
  subject: string;
  from?: string;
  to?: string[];
  occurredAt?: string;
  body: string;
  bodyHtml?: string;
  attachments: AttachmentRef[];
  /** Filled later by the matcher. */
  projectTitle?: string;
  projectPageId?: string;
  matchScore?: number;
  /** Filled by Claude after synthesis. */
  syntheses?: SynthesisRecord[];
}

export interface AttachmentRef {
  fileName: string;
  relPath: string;
  size: number;
  hash: string;
}

export interface SynthesisRecord {
  generatedAt: string;
  model: string;
  cacheReadTokens: number;
  inputTokens: number;
  outputTokens: number;
  confluenceStatus: string;
  jiraActionItems: { title: string; description: string; projectHint: string }[];
  stakeholderEmail: string;
  pushedToConfluence?: { pageId: string; pushedAt: string; versionMessage: string };
}

interface MsgFileData {
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  recipients?: { name?: string; email?: string }[];
  body?: string;
  bodyHTML?: string;
  messageDeliveryTime?: string;
  clientSubmitTime?: string;
  attachments?: { fileName?: string; content?: Uint8Array }[];
}

/**
 * Convert a .msg file on disk into a per-project folder under data/projects/,
 * extracting attachments alongside it. Idempotent: if a context.json already
 * exists at the target path, this returns the existing folder without
 * re-extracting (so re-imports don't churn attachments).
 */
export function ingestMsgToProjectFolder(msgPath: string): ProjectFolder {
  const buf = fs.readFileSync(msgPath);
  const reader = new MsgReader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const data = reader.getFileData() as MsgFileData;

  const subject = (data.subject ?? path.basename(msgPath, ".msg")).trim();
  const slug = sanitizeFolderName(subject);
  const baseDir = path.join(config.projectRoot, "data", "projects");
  let folder = path.join(baseDir, slug);
  let n = 1;
  while (fs.existsSync(folder) && !fs.existsSync(path.join(folder, ".tracker-stem"))) {
    folder = path.join(baseDir, `${slug} (${++n})`);
  }
  ensureDir(folder);
  fs.writeFileSync(path.join(folder, ".tracker-stem"), slug, "utf8");

  // Copy the .msg in alongside.
  const msgDest = path.join(folder, `${slug}.msg`);
  if (!fs.existsSync(msgDest)) fs.copyFileSync(msgPath, msgDest);

  const attachmentsDir = path.join(folder, "attachments");
  ensureDir(attachmentsDir);

  const attachments: AttachmentRef[] = [];
  for (const att of data.attachments ?? []) {
    if (!att.fileName || !att.content) continue;
    const dest = path.join(attachmentsDir, att.fileName);
    const bytes = Buffer.from(att.content);
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, bytes);
    attachments.push({
      fileName: att.fileName,
      relPath: path.join("attachments", att.fileName),
      size: bytes.length,
      hash: sha256(bytes),
    });
  }

  const occurredAt = data.clientSubmitTime ?? data.messageDeliveryTime ?? fs.statSync(msgPath).mtime.toISOString();
  const recipients = data.recipients?.map((r) => r.name ?? r.email).filter((x): x is string => Boolean(x)) ?? [];
  const from = data.senderName ?? data.senderEmail;

  const id = `msg:${sha256(`${slug}:${buf.length}`)}`;
  const ctx: ProjectContext = {
    id,
    source: "msg",
    origin: msgPath,
    ingestedAt: new Date().toISOString(),
    subject,
    from,
    to: recipients,
    occurredAt,
    body: (data.body ?? "").trim(),
    bodyHtml: data.bodyHTML,
    attachments,
  };

  // Preserve existing synthesis state on re-ingestion.
  const ctxPath = path.join(folder, "context.json");
  if (fs.existsSync(ctxPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(ctxPath, "utf8")) as ProjectContext;
      ctx.syntheses = prev.syntheses;
      ctx.projectTitle = prev.projectTitle;
      ctx.projectPageId = prev.projectPageId;
      ctx.matchScore = prev.matchScore;
    } catch {
      // Corrupt — overwrite.
    }
  }

  fs.writeFileSync(ctxPath, JSON.stringify(ctx, null, 2) + "\n", "utf8");
  log.info(`Ingested ${subject} → ${folder} (${attachments.length} attachment(s))`);
  return { dir: folder, name: slug, context: ctx };
}

export function listProjectFolders(): ProjectFolder[] {
  const baseDir = path.join(config.projectRoot, "data", "projects");
  if (!fs.existsSync(baseDir)) return [];
  const out: ProjectFolder[] = [];
  for (const name of fs.readdirSync(baseDir)) {
    const dir = path.join(baseDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const ctxPath = path.join(dir, "context.json");
    if (!fs.existsSync(ctxPath)) continue;
    try {
      const context = JSON.parse(fs.readFileSync(ctxPath, "utf8")) as ProjectContext;
      out.push({ dir, name, context });
    } catch (err) {
      log.warn(`Skipping ${dir}: corrupt context.json (${(err as Error).message})`);
    }
  }
  out.sort((a, b) => (b.context.ingestedAt ?? "").localeCompare(a.context.ingestedAt ?? ""));
  return out;
}

export function loadProjectFolder(dir: string): ProjectFolder | null {
  const ctxPath = path.join(dir, "context.json");
  if (!fs.existsSync(ctxPath)) return null;
  const context = JSON.parse(fs.readFileSync(ctxPath, "utf8")) as ProjectContext;
  return { dir, name: path.basename(dir), context };
}

export function writeContext(folder: ProjectFolder): void {
  fs.writeFileSync(path.join(folder.dir, "context.json"), JSON.stringify(folder.context, null, 2) + "\n", "utf8");
}

const INVALID_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
function sanitizeFolderName(s: string): string {
  return s
    .replace(INVALID_CHARS, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "untitled";
}
