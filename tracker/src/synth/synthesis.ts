import type { ActivityEvent } from "../log/dailyTracking.js";

export interface ProjectSynthesis {
  projectTitle: string;
  projectPageId: string;
  day: string;
  /** HTML body for the new "Status Update" block (storage-format friendly). */
  html: string;
  /** Number of underlying events folded into this synthesis. */
  eventCount: number;
}

/**
 * Build a single "Status Update" block for the given project + day. We emit
 * Confluence-flavored HTML using the data-type attribute conventions accepted
 * by the v2 update API, so it round-trips cleanly.
 */
export function synthesizeForProject(
  projectTitle: string,
  projectPageId: string,
  day: string,
  events: ActivityEvent[],
): ProjectSynthesis {
  const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const bullets = sorted
    .map((e) => {
      const time = e.occurredAt.slice(11, 16);
      const src = sourceLabel(e.source);
      const who = e.participants?.length ? ` <em>(${escapeHtml(e.participants.slice(0, 4).join(", "))})</em>` : "";
      const summary = e.summary ? escapeHtml(e.summary) : escapeHtml(e.rawTitle);
      const attach = e.attachmentHashes?.length
        ? ` <span data-type="status" data-color="purple">${e.attachmentHashes.length} attachment(s)</span>`
        : "";
      return `<li><strong>${time} · ${src}</strong> — ${summary}${who}${attach}</li>`;
    })
    .join("");

  const html = [
    `<div data-type="panel-info">`,
    `<p><strong>Status Update — ${escapeHtml(day)}</strong></p>`,
    `<p>Aggregated from ${sorted.length} activity event(s) by caryn-ops/tracker.</p>`,
    `<ul>${bullets}</ul>`,
    `<p><em>Generated ${new Date().toISOString()}</em></p>`,
    `</div>`,
  ].join("");

  return {
    projectTitle,
    projectPageId,
    day,
    html,
    eventCount: sorted.length,
  };
}

function sourceLabel(s: ActivityEvent["source"]): string {
  switch (s) {
    case "transcript":
      return "Transcript";
    case "msg":
      return "Email";
    case "attachment":
      return "Attachment";
    default:
      return "Note";
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Merge a freshly-built status block onto an existing page body. We strip any
 * prior block whose marker matches the same day so re-runs are idempotent,
 * then prepend the new block to the top of the page.
 */
export function mergeStatusBlock(existingHtml: string, block: ProjectSynthesis): string {
  const marker = `Status Update — ${block.day}`;
  const stripped = removePriorBlock(existingHtml, marker);
  return `${block.html}\n${stripped}`;
}

function removePriorBlock(html: string, marker: string): string {
  // Heuristic: drop any panel-info <div>...</div> whose first <strong> matches.
  // We keep this intentionally conservative — if regex misses, the worst case
  // is a duplicate block, which is recoverable by hand on Confluence.
  const rx = new RegExp(
    `<div[^>]*data-type="panel-info"[^>]*>[\\s\\S]*?${escapeRegex(marker)}[\\s\\S]*?</div>`,
    "i",
  );
  return html.replace(rx, "").trimStart();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
