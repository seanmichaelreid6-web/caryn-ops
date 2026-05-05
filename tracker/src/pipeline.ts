import { config } from "./config.js";
import { log } from "./util/logger.js";
import { buildIndex, loadIndex, ProjectMatcher } from "./directory/projectIndex.js";
import { ingestTranscripts } from "./ingest/transcripts.js";
import { ingestMsg } from "./ingest/msg.js";
import { scanAttachments } from "./ingest/attachments.js";
import {
  type ActivityEvent,
  loadDaily,
  logSummary,
  saveDaily,
  upsertEvent,
} from "./log/dailyTracking.js";

export interface IngestReport {
  added: number;
  updated: number;
  unmapped: { id: string; rawTitle: string }[];
}

/**
 * End-to-end ingestion: pulls events from every source, resolves each event
 * to a Confluence page through the fuzzy project matcher, and persists the
 * union into daily_tracking.json. Returns an "unmapped" list so the caller
 * can prompt the user to add aliases.
 */
export async function runIngest(): Promise<IngestReport> {
  // Always rebuild the index from the source-of-truth .docx; that file is the
  // user's master list and changes more often than expected.
  let index = await buildIndex();
  if (index.entries.length === 0) {
    log.warn("Project index is empty. Did you point DIRECTORY_DOCX at the directory file?");
    index = loadIndex();
  }
  const matcher = new ProjectMatcher(index);

  const events: ActivityEvent[] = [
    ...ingestTranscripts(),
    ...ingestMsg(),
    ...attachmentEvents(),
  ];

  const daily = loadDaily();
  let added = 0;
  let updated = 0;
  const unmapped: IngestReport["unmapped"] = [];

  for (const ev of events) {
    // Build a "rich" query that includes folder hints, participants, and the
    // raw title — meeting titles alone are routinely too noisy to match.
    const query = [ev.rawTitle, ev.summary?.slice(0, 200), (ev.participants ?? []).join(" ")]
      .filter(Boolean)
      .join(" \n ");
    const m = matcher.match(query);
    if (m) {
      ev.projectTitle = m.entry.title;
      ev.projectPageId = m.entry.pageId;
      ev.matchScore = m.score;
    } else {
      unmapped.push({ id: ev.id, rawTitle: ev.rawTitle });
    }
    if (upsertEvent(daily, ev)) added++;
    else updated++;
  }

  saveDaily(daily);
  logSummary(daily);
  if (unmapped.length) {
    log.warn(`${unmapped.length} event(s) could not be mapped. Examples:`);
    for (const u of unmapped.slice(0, 5)) log.warn(`  • ${u.rawTitle}`);
    log.warn(`Add aliases to ${config.paths.directoryDocx} (e.g. "(aka short-name)") and re-run.`);
  }
  return { added, updated, unmapped };
}

function attachmentEvents(): ActivityEvent[] {
  // Standalone attachments (those NOT carried in by a .msg) become their own
  // events so they get mapped + uploaded even without a matching email.
  const records = scanAttachments();
  const out: ActivityEvent[] = [];
  const today = new Date().toISOString();
  for (const rec of records) {
    out.push({
      id: `attachment:${rec.hash}`,
      source: "attachment",
      origin: rec.absPath,
      day: rec.mtime.slice(0, 10),
      occurredAt: rec.mtime,
      rawTitle: `${rec.folderHint} / ${rec.relPath}`,
      summary: `Attachment ${rec.relPath} (${rec.size} bytes)`,
      attachmentHashes: [rec.hash],
    });
  }
  return out;
}
