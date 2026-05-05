import Fuse from "fuse.js";
import { config } from "../config.js";
import { log } from "../util/logger.js";
import { readJson, writeJson } from "../util/fs.js";
import { parseDirectoryDocx, type DirectoryEntry } from "./parseDirectory.js";

export interface ProjectIndex {
  builtAt: string;
  source: string;
  entries: DirectoryEntry[];
}

export interface MatchResult {
  entry: DirectoryEntry;
  score: number;
  matchedOn: string;
}

const STOPWORDS = new Set([
  "meeting",
  "sync",
  "standup",
  "stand-up",
  "stand",
  "up",
  "weekly",
  "daily",
  "biweekly",
  "monthly",
  "review",
  "call",
  "the",
  "and",
  "with",
  "of",
  "for",
  "re",
  "fwd",
  "fw",
  "draft",
  "follow",
  "followup",
  "follow-up",
  "discussion",
  "kickoff",
  "kick-off",
  "huddle",
  "1:1",
  "1-1",
  "11",
  "team",
]);

/** Aggressive normalization for noisy meeting / email titles. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ")
    .replace(/\bq[1-4]\b/g, " ")
    .replace(/[_/\\]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t));
}

export async function buildIndex(): Promise<ProjectIndex> {
  const entries = await parseDirectoryDocx(config.paths.directoryDocx);
  const idx: ProjectIndex = {
    builtAt: new Date().toISOString(),
    source: config.paths.directoryDocx,
    entries,
  };
  writeJson(config.paths.indexFile, idx);
  log.info(`Indexed ${entries.length} project entries → ${config.paths.indexFile}`);
  return idx;
}

export function loadIndex(): ProjectIndex {
  return readJson<ProjectIndex>(config.paths.indexFile, {
    builtAt: "",
    source: "",
    entries: [],
  });
}

interface SearchableEntry {
  entry: DirectoryEntry;
  haystacks: string[];
}

function flatten(entries: DirectoryEntry[]): SearchableEntry[] {
  return entries.map((entry) => {
    const haystacks = new Set<string>();
    haystacks.add(entry.title);
    haystacks.add(normalize(entry.title));
    haystacks.add(tokenize(entry.title).join(" "));
    for (const a of entry.aliases) {
      haystacks.add(a);
      haystacks.add(normalize(a));
    }
    return { entry, haystacks: [...haystacks].filter(Boolean) };
  });
}

export class ProjectMatcher {
  private fuse: Fuse<{ haystack: string; entryRef: number }>;
  private flat: SearchableEntry[];
  private threshold: number;

  constructor(index: ProjectIndex, threshold: number = config.tuning.fuzzyThreshold) {
    this.flat = flatten(index.entries);
    this.threshold = threshold;
    const docs: { haystack: string; entryRef: number }[] = [];
    this.flat.forEach((se, i) => {
      for (const h of se.haystacks) docs.push({ haystack: h, entryRef: i });
    });
    this.fuse = new Fuse(docs, {
      keys: ["haystack"],
      threshold,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 3,
    });
  }

  match(query: string): MatchResult | null {
    if (!query) return null;

    // 1. Exact (normalized) hit short-circuits fuzzy noise.
    const norm = normalize(query);
    for (const se of this.flat) {
      for (const h of se.haystacks) {
        if (h && normalize(h) === norm) {
          return { entry: se.entry, score: 0, matchedOn: h };
        }
      }
    }

    // 2. Token overlap — useful when the title is wrapped in noise like
    //    "Re: ICHRA Carrier Onboarding — weekly sync 2025-05-01"
    const queryTokens = new Set(tokenize(query));
    let bestOverlap: { se: SearchableEntry; score: number; matched: string } | null = null;
    for (const se of this.flat) {
      const titleTokens = new Set(tokenize(se.entry.title));
      if (titleTokens.size === 0) continue;
      let inter = 0;
      for (const t of titleTokens) if (queryTokens.has(t)) inter++;
      if (inter === 0) continue;
      const score = inter / titleTokens.size; // higher = better
      if (!bestOverlap || score > bestOverlap.score) {
        bestOverlap = { se, score, matched: se.entry.title };
      }
    }
    if (bestOverlap && bestOverlap.score >= 0.6) {
      return { entry: bestOverlap.se.entry, score: 1 - bestOverlap.score, matchedOn: bestOverlap.matched };
    }

    // 3. Short-alias / initialism pass — if any single query token exactly
    //    matches a (normalized) alias or title, treat it as a direct hit.
    //    Catches "PMSA review with leadership" → PMSA, "CHM steering" → CHM.
    for (const token of queryTokens) {
      if (token.length < 3) continue;
      for (const se of this.flat) {
        for (const h of se.haystacks) {
          if (!h) continue;
          const nh = normalize(h);
          if (nh === token || tokenize(h).join(" ") === token) {
            return { entry: se.entry, score: 0.05, matchedOn: h };
          }
        }
      }
    }

    // 4. Fuzzy fallback.
    const hits = this.fuse.search(query, { limit: 3 });
    if (hits.length === 0) return null;
    const top = hits[0]!;
    if ((top.score ?? 1) > this.threshold) return null;
    const ref = this.flat[top.item.entryRef];
    if (!ref) return null;
    return { entry: ref.entry, score: top.score ?? 0, matchedOn: top.item.haystack };
  }
}
