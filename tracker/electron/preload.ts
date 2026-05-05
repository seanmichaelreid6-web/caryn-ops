import { contextBridge, ipcRenderer } from "electron";
import type { ProjectFolder } from "../src/projects/folder";

const api = {
  settings: {
    get: (): Promise<{
      site: string;
      email: string;
      cloudId: string;
      hasApiToken: boolean;
      hasAnthropicKey: boolean;
      inbox: string;
      projectsDir: string;
      directoryDocx: string;
    }> => ipcRenderer.invoke("settings:get"),
  },
  index: {
    rebuild: (): Promise<{ entries: number }> => ipcRenderer.invoke("index:rebuild"),
  },
  projects: {
    list: (): Promise<ProjectFolder[]> => ipcRenderer.invoke("projects:list"),
    open: (dir: string): Promise<string> => ipcRenderer.invoke("projects:open", dir),
    reveal: (filePath: string): Promise<void> => ipcRenderer.invoke("projects:reveal", filePath),
    remap: (dir: string, pageId: string, projectTitle: string): Promise<ProjectFolder> =>
      ipcRenderer.invoke("project:remap", dir, pageId, projectTitle),
  },
  inbox: {
    pickFile: (): Promise<string[]> => ipcRenderer.invoke("inbox:pickFile"),
    dropFiles: (paths: string[]): Promise<number> => ipcRenderer.invoke("inbox:dropFiles", paths),
  },
  synth: {
    run: (dir: string): Promise<ProjectFolder> => ipcRenderer.invoke("synth:run", dir),
  },
  confluence: {
    push: (dir: string): Promise<ProjectFolder> => ipcRenderer.invoke("confluence:push", dir),
  },
  on: {
    projectAdded: (cb: (folder: ProjectFolder) => void): (() => void) => {
      const handler = (_e: unknown, folder: ProjectFolder): void => cb(folder);
      ipcRenderer.on("project:added", handler);
      return () => ipcRenderer.removeListener("project:added", handler);
    },
    projectError: (cb: (err: { file: string; message: string }) => void): (() => void) => {
      const handler = (_e: unknown, err: { file: string; message: string }): void => cb(err);
      ipcRenderer.on("project:error", handler);
      return () => ipcRenderer.removeListener("project:error", handler);
    },
  },
};

contextBridge.exposeInMainWorld("tracker", api);

export type TrackerApi = typeof api;
