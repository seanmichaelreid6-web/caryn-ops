import type { Settings } from "../types";

interface Props {
  settings: Settings | null;
  indexCount: number | null;
  projectCount: number;
  onRebuildIndex: () => void;
}

export function SettingsPanel({ settings, indexCount, projectCount, onRebuildIndex }: Props): JSX.Element {
  if (!settings) return <div className="panel muted">Loading settings…</div>;
  return (
    <div className="panel">
      <Row label="Watched inbox" value={settings.inbox} mono />
      <Row label="Projects output" value={settings.projectsDir} mono />
      <Row label="Directory .docx" value={settings.directoryDocx} mono />
      <Row
        label="Atlassian"
        value={`${settings.site} · ${settings.email}`}
        suffix={settings.hasApiToken ? <span className="ok">token ✓</span> : <span className="warn">no token</span>}
      />
      <Row
        label="Claude API"
        value={settings.hasAnthropicKey ? "ANTHROPIC_API_KEY set" : "ANTHROPIC_API_KEY missing"}
        suffix={settings.hasAnthropicKey ? <span className="ok">ready</span> : <span className="warn">required</span>}
      />
      <Row
        label="Project index"
        value={indexCount === null ? `${projectCount} ingested email(s)` : `${indexCount} routing entries`}
        suffix={
          <button className="btn" onClick={onRebuildIndex}>
            Rebuild
          </button>
        }
      />
    </div>
  );
}

function Row({ label, value, mono, suffix }: { label: string; value: string; mono?: boolean; suffix?: JSX.Element }): JSX.Element {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className={`row-value ${mono ? "mono" : ""}`}>{value}</span>
      {suffix && <span className="row-suffix">{suffix}</span>}
    </div>
  );
}
