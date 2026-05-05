import { z } from "zod";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

function loadDotEnv(file: string): void {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
loadDotEnv(path.join(projectRoot, ".env"));
loadDotEnv(path.join(projectRoot, ".env.local"));

const Schema = z.object({
  ATLASSIAN_SITE: z.string().min(1),
  ATLASSIAN_CLOUD_ID: z.string().uuid(),
  ATLASSIAN_EMAIL: z.string().email(),
  ATLASSIAN_API_TOKEN: z.string().optional().default(""),
  DIRECTORY_DOCX: z.string().default("./data/Confluence_Pages_Directory.docx"),
  TRANSCRIPTS_DIR: z.string().default("./data/transcripts"),
  MSG_DIR: z.string().default("./data/msg"),
  ATTACHMENTS_DIR: z.string().default("./data/attachments"),
  STATE_DIR: z.string().default("./data/state"),
  DAILY_LOG: z.string().default("./data/state/daily_tracking.json"),
  INDEX_FILE: z.string().default("./data/state/project_index.json"),
  FUZZY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.42),
  SYNC_DRY_RUN: z
    .string()
    .default("false")
    .transform((s) => s.toLowerCase() === "true"),
});

const parsed = Schema.parse({
  ATLASSIAN_SITE: process.env.ATLASSIAN_SITE ?? "carynhealth.atlassian.net",
  ATLASSIAN_CLOUD_ID: process.env.ATLASSIAN_CLOUD_ID ?? "6347e5f2-420c-4290-a4d0-c0adb614e411",
  ATLASSIAN_EMAIL: process.env.ATLASSIAN_EMAIL ?? "sean.reid@carynhealth.com",
  ATLASSIAN_API_TOKEN: process.env.ATLASSIAN_API_TOKEN,
  DIRECTORY_DOCX: process.env.DIRECTORY_DOCX,
  TRANSCRIPTS_DIR: process.env.TRANSCRIPTS_DIR,
  MSG_DIR: process.env.MSG_DIR,
  ATTACHMENTS_DIR: process.env.ATTACHMENTS_DIR,
  STATE_DIR: process.env.STATE_DIR,
  DAILY_LOG: process.env.DAILY_LOG,
  INDEX_FILE: process.env.INDEX_FILE,
  FUZZY_THRESHOLD: process.env.FUZZY_THRESHOLD,
  SYNC_DRY_RUN: process.env.SYNC_DRY_RUN,
});

const resolve = (p: string): string => (path.isAbsolute(p) ? p : path.resolve(projectRoot, p));

export const config = {
  projectRoot,
  atlassian: {
    site: parsed.ATLASSIAN_SITE,
    cloudId: parsed.ATLASSIAN_CLOUD_ID,
    email: parsed.ATLASSIAN_EMAIL,
    apiToken: parsed.ATLASSIAN_API_TOKEN,
    baseUrl: `https://${parsed.ATLASSIAN_SITE}/wiki`,
  },
  paths: {
    directoryDocx: resolve(parsed.DIRECTORY_DOCX),
    transcripts: resolve(parsed.TRANSCRIPTS_DIR),
    msg: resolve(parsed.MSG_DIR),
    attachments: resolve(parsed.ATTACHMENTS_DIR),
    state: resolve(parsed.STATE_DIR),
    dailyLog: resolve(parsed.DAILY_LOG),
    indexFile: resolve(parsed.INDEX_FILE),
  },
  tuning: {
    fuzzyThreshold: parsed.FUZZY_THRESHOLD,
    dryRun: parsed.SYNC_DRY_RUN,
  },
};

export type Config = typeof config;
