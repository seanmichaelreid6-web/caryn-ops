import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import chokidar, { type FSWatcher } from "chokidar";
import { config } from "../src/config.js";
import { log } from "../src/util/logger.js";
import {
  ingestMsgToProjectFolder,
  listProjectFolders,
  loadProjectFolder,
  writeContext,
  type ProjectFolder,
  type SynthesisRecord,
} from "../src/projects/folder.js";
import { buildIndex, loadIndex, ProjectMatcher } from "../src/directory/projectIndex.js";
import { ClaudeSynthesizer } from "../src/synth/claude.js";
import { ConfluenceClient } from "../src/confluence/client.js";
import { mergeStatusBlock } from "../src/synth/synthesis.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !!process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;
let watcher: FSWatcher | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    backgroundColor: "#0b0d10",
    title: "Caryn Tracker",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  registerIpc();
  await createWindow();
  startInboxWatcher();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void watcher?.close();
});

function startInboxWatcher(): void {
  const inbox = path.join(config.projectRoot, "data", "inbox");
  fs.mkdirSync(inbox, { recursive: true });
  watcher = chokidar.watch(inbox, { ignoreInitial: false, awaitWriteFinish: { stabilityThreshold: 500 } });
  watcher.on("add", (filePath: string) => {
    if (path.extname(filePath).toLowerCase() !== ".msg") return;
    try {
      const folder = ingestMsgToProjectFolder(filePath);
      runMatcher(folder);
      writeContext(folder);
      mainWindow?.webContents.send("project:added", serialize(folder));
      // Move processed .msg out of the inbox so the watcher doesn't re-fire on rebuilds.
      fs.unlinkSync(filePath);
    } catch (err) {
      log.error(`Inbox watcher: failed on ${filePath}: ${(err as Error).message}`);
      mainWindow?.webContents.send("project:error", { file: filePath, message: (err as Error).message });
    }
  });
  log.info(`Watching inbox: ${inbox}`);
}

function runMatcher(folder: ProjectFolder): void {
  const idx = loadIndex();
  if (idx.entries.length === 0) return;
  const matcher = new ProjectMatcher(idx);
  const query = [
    folder.context.subject,
    folder.context.from ?? "",
    (folder.context.to ?? []).join(" "),
  ].join(" \n ");
  const m = matcher.match(query);
  if (m) {
    folder.context.projectTitle = m.entry.title;
    folder.context.projectPageId = m.entry.pageId;
    folder.context.matchScore = m.score;
  }
}

function registerIpc(): void {
  ipcMain.handle("settings:get", () => ({
    site: config.atlassian.site,
    email: config.atlassian.email,
    cloudId: config.atlassian.cloudId,
    hasApiToken: !!config.atlassian.apiToken,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    inbox: path.join(config.projectRoot, "data", "inbox"),
    projectsDir: path.join(config.projectRoot, "data", "projects"),
    directoryDocx: config.paths.directoryDocx,
  }));

  ipcMain.handle("index:rebuild", async () => {
    const idx = await buildIndex();
    return { entries: idx.entries.length };
  });

  ipcMain.handle("projects:list", () => listProjectFolders().map(serialize));

  ipcMain.handle("projects:open", (_e, dir: string) => shell.openPath(dir));

  ipcMain.handle("projects:reveal", (_e, filePath: string) => shell.showItemInFolder(filePath));

  ipcMain.handle("inbox:pickFile", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Outlook Email", extensions: ["msg"] }],
    });
    if (result.canceled) return [];
    const inbox = path.join(config.projectRoot, "data", "inbox");
    fs.mkdirSync(inbox, { recursive: true });
    for (const src of result.filePaths) {
      fs.copyFileSync(src, path.join(inbox, path.basename(src)));
    }
    return result.filePaths;
  });

  ipcMain.handle("inbox:dropFiles", async (_e, paths: string[]) => {
    const inbox = path.join(config.projectRoot, "data", "inbox");
    fs.mkdirSync(inbox, { recursive: true });
    for (const src of paths) {
      if (path.extname(src).toLowerCase() !== ".msg") continue;
      fs.copyFileSync(src, path.join(inbox, path.basename(src)));
    }
    return paths.length;
  });

  ipcMain.handle("synth:run", async (_e, dir: string) => {
    const folder = loadProjectFolder(dir);
    if (!folder) throw new Error(`No project at ${dir}`);
    const idx = loadIndex();
    const synthesizer = new ClaudeSynthesizer();
    const result = await synthesizer.synthesize(
      {
        subject: folder.context.subject,
        from: folder.context.from,
        to: folder.context.to,
        body: folder.context.body,
        attachments: folder.context.attachments.map((a) => a.fileName),
      },
      idx.entries,
    );
    const record: SynthesisRecord = {
      generatedAt: new Date().toISOString(),
      model: result.model,
      cacheReadTokens: result.usage.cacheReadTokens,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      ...result.synthesis,
    };
    folder.context.syntheses = [record, ...(folder.context.syntheses ?? [])].slice(0, 10);
    writeContext(folder);
    return serialize(folder);
  });

  ipcMain.handle("confluence:push", async (_e, dir: string) => {
    const folder = loadProjectFolder(dir);
    if (!folder) throw new Error(`No project at ${dir}`);
    const pageId = folder.context.projectPageId;
    if (!pageId) throw new Error("No projectPageId resolved for this email yet — add an alias to the directory.");
    const synth = folder.context.syntheses?.[0];
    if (!synth) throw new Error("Generate a synthesis first.");

    const client = new ConfluenceClient();
    const page = await client.getPage(pageId);
    const day = new Date().toISOString().slice(0, 10);
    const html = renderStatusBlock(folder, synth, day);
    const merged = mergeStatusBlock(page.body.storage?.value ?? "", {
      projectTitle: folder.context.projectTitle ?? "",
      projectPageId: pageId,
      day,
      html,
      eventCount: 1,
    });
    const versionMessage = `Tracker: ${folder.context.subject}`;
    await client.updatePageBody(page, merged, versionMessage);

    // Upload any unseen attachments.
    const existing = await client.listAttachments(pageId);
    const seen = new Set(existing.map((a) => a.comment).filter(Boolean));
    for (const att of folder.context.attachments) {
      const tag = `tracker-sha256:${att.hash}`;
      if (seen.has(tag)) continue;
      const abs = path.join(folder.dir, att.relPath);
      await client.uploadAttachment(pageId, abs, tag);
    }

    synth.pushedToConfluence = { pageId, pushedAt: new Date().toISOString(), versionMessage };
    writeContext(folder);
    return serialize(folder);
  });

  ipcMain.handle("project:remap", (_e, dir: string, pageId: string, projectTitle: string) => {
    const folder = loadProjectFolder(dir);
    if (!folder) throw new Error(`No project at ${dir}`);
    folder.context.projectPageId = pageId;
    folder.context.projectTitle = projectTitle;
    folder.context.matchScore = 0;
    writeContext(folder);
    return serialize(folder);
  });
}

function renderStatusBlock(folder: ProjectFolder, synth: SynthesisRecord, day: string): string {
  const bullets = synth.confluenceStatus
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
  const items = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  const attachments = folder.context.attachments.length
    ? `<p><em>Attachments:</em> ${folder.context.attachments.map((a) => escapeHtml(a.fileName)).join(", ")}</p>`
    : "";
  return [
    `<div data-type="panel-info">`,
    `<p><strong>Status Update — ${escapeHtml(day)}</strong></p>`,
    `<p><em>From: ${escapeHtml(folder.context.from ?? "(unknown)")} · ${escapeHtml(folder.context.subject)}</em></p>`,
    `<ul>${items}</ul>`,
    attachments,
    `<p><em>Synthesized by caryn-ops/tracker (${escapeHtml(synth.model)})</em></p>`,
    `</div>`,
  ].join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serialize(folder: ProjectFolder) {
  return { dir: folder.dir, name: folder.name, context: folder.context };
}
