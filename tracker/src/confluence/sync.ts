import { config } from "../config.js";
import { log } from "../util/logger.js";
import { ConfluenceClient } from "./client.js";
import { mergeStatusBlock, synthesizeForProject } from "../synth/synthesis.js";
import { eventsByProject, loadDaily, saveDaily, todayIso } from "../log/dailyTracking.js";
import { scanAttachments } from "../ingest/attachments.js";

export interface SyncResult {
  pagesUpdated: number;
  attachmentsUploaded: number;
  skipped: number;
  errors: { pageId: string; message: string }[];
}

/**
 * Drain unsynced events from the master log onto Confluence:
 *   1. Group events by project page.
 *   2. Synthesize a per-day "Status Update" panel and merge it onto the page.
 *   3. Upload any attachments that aren't already attached (by hash → comment).
 */
export async function syncAll(day: string = todayIso()): Promise<SyncResult> {
  const result: SyncResult = { pagesUpdated: 0, attachmentsUploaded: 0, skipped: 0, errors: [] };
  const daily = loadDaily();
  const grouped = eventsByProject(daily, day);

  if (grouped.size === 0) {
    log.info(`No mapped events for ${day}; nothing to sync.`);
    return result;
  }
  if (config.tuning.dryRun) {
    log.warn("SYNC_DRY_RUN is true — skipping all Confluence writes.");
  }

  const client = config.tuning.dryRun ? null : new ConfluenceClient();
  const attachments = scanAttachments();
  const attByHash = new Map(attachments.map((a) => [a.hash, a]));

  for (const [pageId, events] of grouped) {
    const projectTitle = events[0]?.projectTitle ?? "(unknown)";
    try {
      const synth = synthesizeForProject(projectTitle, pageId, day, events);

      if (client) {
        const page = await client.getPage(pageId);
        const existing = page.body.storage?.value ?? "";
        const merged = mergeStatusBlock(existing, synth);
        await client.updatePageBody(page, merged, `Tracker status update for ${day}`);

        const existingAttachments = await client.listAttachments(pageId);
        const seenComments = new Set(existingAttachments.map((a) => a.comment).filter(Boolean));
        for (const ev of events) {
          for (const hash of ev.attachmentHashes ?? []) {
            const rec = attByHash.get(hash);
            if (!rec) continue;
            const tag = `tracker-sha256:${hash}`;
            if (seenComments.has(tag)) continue;
            await client.uploadAttachment(pageId, rec.absPath, tag);
            result.attachmentsUploaded++;
          }
        }
      } else {
        log.info(`[dry-run] would update page ${pageId} (${synth.eventCount} events, ${projectTitle}).`);
      }

      for (const ev of events) {
        ev.synced = true;
        ev.syncedAt = new Date().toISOString();
      }
      result.pagesUpdated++;
    } catch (err) {
      const message = (err as Error).message;
      log.error(`Sync failed for page ${pageId}: ${message}`);
      result.errors.push({ pageId, message });
    }
  }

  saveDaily(daily);
  log.info(
    `Sync done: ${result.pagesUpdated} page(s) updated, ${result.attachmentsUploaded} attachment(s) uploaded, ${result.errors.length} error(s).`,
  );
  return result;
}
