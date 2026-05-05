import * as fs from "node:fs";
import * as path from "node:path";
import mammoth from "mammoth";
import { log } from "../util/logger.js";

export interface DirectoryEntry {
  /** Canonical project / page title as written in the directory. */
  title: string;
  /** Confluence pageId if present in the directory. */
  pageId?: string;
  /** Space key (e.g. ICHRA, PMSA2) if present. */
  spaceKey?: string;
  /** Extra aliases / nicknames the team uses for this project. */
  aliases: string[];
  /** Original raw line / paragraph the entry was extracted from. */
  raw: string;
}

const PAGE_ID_RX = /pageId=(\d+)/i;
const TINY_RX = /\/wiki\/x\/([A-Za-z0-9_-]+)/;
const SPACE_KEY_RX = /\/wiki\/spaces\/([A-Z0-9~]+)\//;
const ALIAS_RX = /\baka[: ]([^)\n]+)/i;

/**
 * Parse the team's "Confluence Pages Directory" .docx into structured entries.
 *
 * The directory is human-edited so we tolerate several shapes:
 *   - "Project Title — https://carynhealth.atlassian.net/wiki/spaces/ICHRA/pages/123/Foo"
 *   - "Project Title (aka Foo Bar; FooBar)"
 *   - Plain titles, one per line
 *   - Tables where the first cell is the title and a later cell is the URL
 */
export async function parseDirectoryDocx(file: string): Promise<DirectoryEntry[]> {
  if (!fs.existsSync(file)) {
    log.warn(`Directory .docx not found at ${file}; returning empty index.`);
    return [];
  }
  const ext = path.extname(file).toLowerCase();
  let text: string;
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: file });
    text = result.value;
  } else {
    // Allow .txt / .md fallback for tests and emergencies.
    text = fs.readFileSync(file, "utf8");
  }
  return parseDirectoryText(text);
}

export function parseDirectoryText(text: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.length < 3) continue;
    if (/^(table of contents|index|directory)$/i.test(line)) continue;

    const pageIdMatch = line.match(PAGE_ID_RX) ?? line.match(/\/pages\/(\d+)/);
    const spaceMatch = line.match(SPACE_KEY_RX);
    const tinyMatch = line.match(TINY_RX);

    // Title: text before any URL / em-dash separator / parenthetical metadata.
    const splitIdx = firstSeparator(line);
    let title = (splitIdx >= 0 ? line.slice(0, splitIdx) : line).trim();
    title = title.replace(/^[-•*\d.\s]+/, "").trim();
    if (!title) continue;

    const aliases: string[] = [];
    const aliasMatch = line.match(ALIAS_RX);
    if (aliasMatch?.[1]) {
      for (const a of aliasMatch[1].split(/[;,]/)) {
        const t = a.trim().replace(/[)\].]+$/, "");
        if (t) aliases.push(t);
      }
    }

    const dedupKey = title.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    entries.push({
      title,
      pageId: pageIdMatch?.[1],
      spaceKey: spaceMatch?.[1],
      aliases,
      raw: line,
    });

    // tinyMatch is captured for downstream resolution (Confluence resolves /x/ID to a pageId)
    if (!pageIdMatch && tinyMatch) {
      entries[entries.length - 1]!.aliases.push(`tiny:${tinyMatch[1]}`);
    }
  }

  return entries;
}

function firstSeparator(s: string): number {
  const candidates = [s.indexOf(" — "), s.indexOf(" – "), s.indexOf(" - "), s.indexOf("\thttp"), s.indexOf("http"), s.indexOf("(aka"), s.indexOf("[")];
  let min = -1;
  for (const c of candidates) {
    if (c < 0) continue;
    if (min < 0 || c < min) min = c;
  }
  return min;
}
