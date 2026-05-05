import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "../config.js";
import { log } from "../util/logger.js";
import { sha256, walk } from "../util/fs.js";
import type { ActivityEvent } from "../log/dailyTracking.js";

const DATE_FROM_NAME = /(\d{4}-\d{2}-\d{2})/;

/**
 * Transcripts are user-curated, "high-fidelity" markdown / text / json files
 * dropped into TRANSCRIPTS_DIR. We accept three shapes:
 *   - .md / .txt with a leading "# Title" or first non-empty line as title
 *   - .json {"title", "occurredAt", "participants", "summary", "body"}
 *   - file name like "2025-05-01 ICHRA carrier sync.md"
 */
export function ingestTranscripts(): ActivityEvent[] {
  const dir = config.paths.transcripts;
  if (!fs.existsSync(dir)) {
    log.warn(`Transcripts dir missing at ${dir}; skipping.`);
    return [];
  }
  const events: ActivityEvent[] = [];
  for (const file of walk(dir)) {
    const ext = path.extname(file).toLowerCase();
    if (![".md", ".txt", ".json"].includes(ext)) continue;
    try {
      const ev = ext === ".json" ? parseJson(file) : parseText(file);
      if (ev) events.push(ev);
    } catch (err) {
      log.warn(`Failed to parse transcript ${file}: ${(err as Error).message}`);
    }
  }
  log.info(`Ingested ${events.length} transcript event(s) from ${dir}`);
  return events;
}

function parseJson(file: string): ActivityEvent {
  const raw = fs.readFileSync(file, "utf8");
  const obj = JSON.parse(raw) as {
    title?: string;
    occurredAt?: string;
    participants?: string[];
    summary?: string;
    body?: string;
  };
  const title = obj.title ?? path.basename(file, path.extname(file));
  const occurredAt = obj.occurredAt ?? mtimeIso(file);
  const summary = obj.summary ?? snippet(obj.body ?? "");
  return {
    id: `transcript:${sha256(`${file}:${title}:${raw.length}`)}`,
    source: "transcript",
    origin: file,
    day: occurredAt.slice(0, 10),
    occurredAt,
    rawTitle: title,
    participants: obj.participants,
    summary,
  };
}

function parseText(file: string): ActivityEvent {
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/);
  const headingLine = lines.find((l) => l.trim().startsWith("# "));
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? path.basename(file);
  const titleFromBody = headingLine ? headingLine.replace(/^#\s*/, "").trim() : firstNonEmpty.trim();
  const baseName = path.basename(file, path.extname(file));
  // Prefer body title when present, else file name (without leading date).
  const titleFromName = baseName.replace(DATE_FROM_NAME, "").trim();
  const title = titleFromBody || titleFromName || baseName;

  const dateMatch = baseName.match(DATE_FROM_NAME);
  const occurredAt = dateMatch ? `${dateMatch[1]}T00:00:00.000Z` : mtimeIso(file);

  return {
    id: `transcript:${sha256(`${file}:${title}:${raw.length}`)}`,
    source: "transcript",
    origin: file,
    day: occurredAt.slice(0, 10),
    occurredAt,
    rawTitle: title,
    summary: snippet(raw),
  };
}

function mtimeIso(file: string): string {
  return fs.statSync(file).mtime.toISOString();
}

function snippet(s: string, max = 600): string {
  const cleaned = s.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1) + "…" : cleaned;
}
