import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { ProjectFolder, Settings } from "./types";
import { DropZone } from "./components/DropZone";
import { SettingsPanel } from "./components/SettingsPanel";
import { RecentList } from "./components/RecentList";
import { SynthesisModal } from "./components/SynthesisModal";
import { Toast } from "./components/Toast";

export function App(): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [projects, setProjects] = useState<ProjectFolder[]>([]);
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [indexCount, setIndexCount] = useState<number | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const [s, p] = await Promise.all([api.settings.get(), api.projects.list()]);
    setSettings(s);
    setProjects(p);
  }, []);

  useEffect(() => {
    void refresh();
    const offAdded = api.on.projectAdded((folder) => {
      setProjects((prev) => [folder, ...prev.filter((p) => p.dir !== folder.dir)]);
      setToast({ kind: "info", text: `Ingested: ${folder.context.subject}` });
    });
    const offError = api.on.projectError((err) => {
      setToast({ kind: "error", text: `${err.file}: ${err.message}` });
    });
    return () => {
      offAdded();
      offError();
    };
  }, [refresh]);

  const onRebuildIndex = useCallback(async (): Promise<void> => {
    const r = await api.index.rebuild();
    setIndexCount(r.entries);
    setToast({ kind: "info", text: `Indexed ${r.entries} project entries from directory.` });
  }, []);

  const onPickFiles = useCallback(async (): Promise<void> => {
    const picked = await api.inbox.pickFile();
    if (picked.length) setToast({ kind: "info", text: `Queued ${picked.length} file(s) into inbox.` });
  }, []);

  const onDropPaths = useCallback(async (paths: string[]): Promise<void> => {
    const n = await api.inbox.dropFiles(paths);
    setToast({ kind: "info", text: `Queued ${n} file(s) into inbox.` });
  }, []);

  const active = activeDir ? projects.find((p) => p.dir === activeDir) ?? null : null;
  const onSynthesize = useCallback(async (): Promise<void> => {
    if (!active) return;
    setToast({ kind: "info", text: "Synthesizing with Claude…" });
    try {
      const updated = await api.synth.run(active.dir);
      setProjects((prev) => prev.map((p) => (p.dir === updated.dir ? updated : p)));
      setToast({ kind: "info", text: "Synthesis complete." });
    } catch (err) {
      setToast({ kind: "error", text: (err as Error).message });
    }
  }, [active]);

  const onPush = useCallback(async (): Promise<void> => {
    if (!active) return;
    setToast({ kind: "info", text: "Pushing to Confluence…" });
    try {
      const updated = await api.confluence.push(active.dir);
      setProjects((prev) => prev.map((p) => (p.dir === updated.dir ? updated : p)));
      setToast({ kind: "info", text: "Pushed status update + attachments to Confluence." });
    } catch (err) {
      setToast({ kind: "error", text: (err as Error).message });
    }
  }, [active]);

  return (
    <div className="app">
      <header className="header">
        <span className="logo">Caryn Tracker</span>
        <span className="muted">{projects.length} project(s)</span>
      </header>

      <DropZone onPickFiles={onPickFiles} onDropPaths={onDropPaths} />

      <SettingsPanel
        settings={settings}
        indexCount={indexCount}
        onRebuildIndex={onRebuildIndex}
        projectCount={projects.length}
      />

      <RecentList projects={projects} onOpen={(p) => setActiveDir(p.dir)} onReveal={(p) => api.projects.open(p.dir)} />

      {active && (
        <SynthesisModal
          folder={active}
          onClose={() => setActiveDir(null)}
          onSynthesize={onSynthesize}
          onPush={onPush}
        />
      )}

      {toast && <Toast kind={toast.kind} text={toast.text} onDismiss={() => setToast(null)} />}
    </div>
  );
}
