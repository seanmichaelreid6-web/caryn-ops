import * as fs from "node:fs";
import * as path from "node:path";
import MsgReader from "@kenjiuno/msgreader";
import { config } from "../config.js";
import { log } from "../util/logger.js";
import { ensureDir, sha256, walk } from "../util/fs.js";
import type { ActivityEvent } from "../log/dailyTracking.js";

interface MsgFileData {
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  recipients?: { name?: string; email?: string }[];
  body?: string;
  bodyHTML?: string;
  messageDeliveryTime?: string;
  clientSubmitTime?: string;
  attachments?: { fileName?: string; contentLength?: number; content?: Uint8Array }[];
}

/**
 * Parses Outlook .msg files in MSG_DIR and emits one ActivityEvent per message.
 * Embedded attachments are extracted into ATTACHMENTS_DIR/<msg-stem>/ so the
 * attachment ingester picks them up on its own pass.
 */
export function ingestMsg(): ActivityEvent[] {
  const dir = config.paths.msg;
  if (!fs.existsSync(dir)) {
    log.warn(`MSG dir missing at ${dir}; skipping.`);
    return [];
  }
  const events: ActivityEvent[] = [];
  for (const file of walk(dir)) {
    if (path.extname(file).toLowerCase() !== ".msg") continue;
    try {
      const ev = parseMsg(file);
      if (ev) events.push(ev);
    } catch (err) {
      log.warn(`Failed to parse .msg ${file}: ${(err as Error).message}`);
    }
  }
  log.info(`Ingested ${events.length} .msg event(s) from ${dir}`);
  return events;
}

function parseMsg(file: string): ActivityEvent {
  const buf = fs.readFileSync(file);
  const reader = new MsgReader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const data = reader.getFileData() as MsgFileData;

  const subject = (data.subject ?? path.basename(file, ".msg")).trim();
  const occurredAt = data.clientSubmitTime ?? data.messageDeliveryTime ?? fs.statSync(file).mtime.toISOString();
  const participants = [
    data.senderName ?? data.senderEmail,
    ...(data.recipients?.map((r) => r.name ?? r.email) ?? []),
  ].filter((x): x is string => Boolean(x));

  const attachmentHashes: string[] = [];
  if (data.attachments?.length) {
    const stem = path.basename(file, ".msg");
    const outDir = path.join(config.paths.attachments, stem);
    ensureDir(outDir);
    for (const a of data.attachments) {
      if (!a.fileName || !a.content) continue;
      const dest = path.join(outDir, a.fileName);
      const bytes = Buffer.from(a.content);
      fs.writeFileSync(dest, bytes);
      attachmentHashes.push(sha256(bytes));
    }
  }

  return {
    id: `msg:${sha256(`${file}:${subject}:${buf.length}`)}`,
    source: "msg",
    origin: file,
    day: occurredAt.slice(0, 10),
    occurredAt,
    rawTitle: subject,
    participants,
    summary: snippet(data.body ?? stripHtml(data.bodyHTML ?? "")),
    attachmentHashes: attachmentHashes.length ? attachmentHashes : undefined,
  };
}

function snippet(s: string, max = 800): string {
  const c = s.replace(/\s+/g, " ").trim();
  return c.length > max ? c.slice(0, max - 1) + "…" : c;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
}
