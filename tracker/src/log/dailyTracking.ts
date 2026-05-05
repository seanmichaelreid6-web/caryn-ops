import * as path from "node:path";
import { config } from "../config.js";
import { ensureDir, readJson, writeJson } from "../util/fs.js";
import { log } from "../util/logger.js";

export type EventSource = "transcript" | "msg" | "attachment" | "manual";

export interface ActivityEvent {
  /** Stable id derived from source + content hash. Dedupes re-ingestion. */
  id: string;
  source: EventSource;
  /** Original artifact path or URI. */
  origin: string;
  /** ISO date "YYYY-MM-DD". */
  day: string;
  /** ISO timestamp of when the activity actually happened (best effort). */
  occurredAt: string;
  /** Free-form raw subject / meeting title pre-mapping. */
  rawTitle: string;
  /** People involved if known. */
  participants?: string[];
  /** Short summary or first lines of content. */
  summary?: string;
  /** Resolved project mapping (post project-index pass). */
  projectTitle?: string;
  projectPageId?: string;
  matchScore?: number;
  /** Hashes of any attachments associated with this event. */
  attachmentHashes?: string[];
  /** Set true once the synthesis for this event has been pushed to Confluence. */
  synced?: boolean;
  syncedAt?: string;
}

export interface DailyTracking {
  version: 1;
  updatedAt: string;
  events: ActivityEvent[];
}

const empty: DailyTracking = { version: 1, updatedAt: "", events: [] };

export function loadDaily(): DailyTracking {
  return readJson<DailyTracking>(config.paths.dailyLog, empty);
}

export function saveDaily(d: DailyTracking): void {
  d.updatedAt = new Date().toISOString();
  ensureDir(path.dirname(config.paths.dailyLog));
  writeJson(config.paths.dailyLog, d);
}

export function upsertEvent(d: DailyTracking, ev: ActivityEvent): boolean {
  const i = d.events.findIndex((e) => e.id === ev.id);
  if (i < 0) {
    d.events.push(ev);
    return true;
  }
  // Preserve sync state and any post-mapping fields already populated.
  const prev = d.events[i]!;
  d.events[i] = {
    ...ev,
    projectTitle: ev.projectTitle ?? prev.projectTitle,
    projectPageId: ev.projectPageId ?? prev.projectPageId,
    matchScore: ev.matchScore ?? prev.matchScore,
    synced: prev.synced,
    syncedAt: prev.syncedAt,
  };
  return false;
}

export function eventsByProject(d: DailyTracking, day?: string): Map<string, ActivityEvent[]> {
  const out = new Map<string, ActivityEvent[]>();
  for (const ev of d.events) {
    if (day && ev.day !== day) continue;
    if (!ev.projectPageId) continue;
    const key = ev.projectPageId;
    const list = out.get(key) ?? [];
    list.push(ev);
    out.set(key, list);
  }
  return out;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function logSummary(d: DailyTracking): void {
  const total = d.events.length;
  const mapped = d.events.filter((e) => e.projectPageId).length;
  const synced = d.events.filter((e) => e.synced).length;
  log.info(`daily_tracking: ${total} events, ${mapped} mapped, ${synced} synced.`);
}
