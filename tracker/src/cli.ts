#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { config } from "./config.js";
import { log } from "./util/logger.js";
import { ConfluenceClient } from "./confluence/client.js";
import { buildIndex, loadIndex, ProjectMatcher } from "./directory/projectIndex.js";
import { runIngest } from "./pipeline.js";
import { syncAll } from "./confluence/sync.js";
import { todayIso } from "./log/dailyTracking.js";

async function verify(): Promise<number> {
  log.info(`Atlassian site:    ${config.atlassian.site}`);
  log.info(`Cloud ID:          ${config.atlassian.cloudId}`);
  log.info(`Account email:     ${config.atlassian.email}`);
  log.info(`API token present: ${config.atlassian.apiToken ? "yes" : "NO — set ATLASSIAN_API_TOKEN"}`);

  if (!config.atlassian.apiToken) {
    log.error("Cannot verify Confluence REST without ATLASSIAN_API_TOKEN.");
    log.error("The Atlassian MCP connector is wired separately (see README → Verification).");
    return 2;
  }
  try {
    const client = new ConfluenceClient();
    const me = await client.whoami();
    log.info(`✔ Confluence REST reachable. Authenticated as ${me.displayName} <${me.email}>.`);
    return 0;
  } catch (err) {
    log.error(`✖ Confluence REST verification failed: ${(err as Error).message}`);
    return 1;
  }
}

async function indexCmd(): Promise<number> {
  const idx = await buildIndex();
  log.info(`Built project index with ${idx.entries.length} entries.`);
  return 0;
}

async function matchCmd(query: string): Promise<number> {
  const idx = loadIndex();
  if (idx.entries.length === 0) {
    log.error("Project index is empty. Run `tracker index` first.");
    return 1;
  }
  const matcher = new ProjectMatcher(idx);
  const m = matcher.match(query);
  if (!m) {
    log.warn(`No match for: ${query}`);
    return 1;
  }
  log.info(
    `→ ${m.entry.title}${m.entry.pageId ? ` (page ${m.entry.pageId})` : ""} [score=${m.score.toFixed(3)}, matchedOn=${m.matchedOn}]`,
  );
  return 0;
}

async function ingestCmd(): Promise<number> {
  const r = await runIngest();
  log.info(`Ingest complete: +${r.added} new, ~${r.updated} updated, ${r.unmapped.length} unmapped.`);
  return 0;
}

async function syncCmd(day: string): Promise<number> {
  const r = await syncAll(day);
  return r.errors.length === 0 ? 0 : 1;
}

async function loopCmd(intervalMs: number): Promise<number> {
  log.info(`Starting tracker loop every ${Math.round(intervalMs / 1000)}s. Ctrl+C to stop.`);
  let running = false;
  const tick = async (): Promise<void> => {
    if (running) {
      log.warn("Previous tick still running; skipping this interval.");
      return;
    }
    running = true;
    try {
      await runIngest();
      await syncAll(todayIso());
    } catch (err) {
      log.error(`loop tick failed: ${(err as Error).message}`);
    } finally {
      running = false;
    }
  };
  await tick();
  setInterval(() => void tick(), intervalMs);
  // Block forever.
  await new Promise<void>(() => undefined);
  return 0;
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("tracker")
    .command("verify", "Verify Confluence REST connection", () => undefined, async () => process.exit(await verify()))
    .command("index", "Rebuild the fuzzy project index from the directory .docx", () => undefined, async () => process.exit(await indexCmd()))
    .command(
      "match <query..>",
      "Test fuzzy matching of a meeting title",
      (y) => y.positional("query", { type: "string", array: true, demandOption: true }),
      async (args) => process.exit(await matchCmd((args.query as string[]).join(" "))),
    )
    .command("ingest", "Ingest transcripts/.msg/attachments into daily_tracking.json", () => undefined, async () => process.exit(await ingestCmd()))
    .command(
      "sync [day]",
      "Push synthesized status updates + attachments to Confluence",
      (y) => y.positional("day", { type: "string", default: todayIso() }),
      async (args) => process.exit(await syncCmd(args.day as string)),
    )
    .command(
      "loop [intervalMs]",
      "Run ingest+sync on an interval (default 10 min)",
      (y) => y.positional("intervalMs", { type: "number", default: 10 * 60 * 1000 }),
      async (args) => process.exit(await loopCmd(args.intervalMs as number)),
    )
    .demandCommand(1)
    .strict()
    .help()
    .parse();
  // Yargs handles dispatch above; if we land here without a command, exit clean.
  void argv;
}

void main();
