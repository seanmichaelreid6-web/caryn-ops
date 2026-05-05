import { useState } from "react";
import type { ProjectFolder, SynthesisRecord } from "../types";

interface Props {
  folder: ProjectFolder;
  onClose: () => void;
  onSynthesize: () => void | Promise<void>;
  onPush: () => void | Promise<void>;
}

export function SynthesisModal({ folder, onClose, onSynthesize, onPush }: Props): JSX.Element {
  const [busy, setBusy] = useState<"synth" | "push" | null>(null);
  const synth = folder.context.syntheses?.[0];
  const pushed = !!synth?.pushedToConfluence;

  const wrap = (kind: "synth" | "push", fn: () => void | Promise<void>) => async (): Promise<void> => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <div>
            <div className="modal__eyebrow">SYNTHESIS</div>
            <h2 className="modal__title">{folder.context.subject}</h2>
          </div>
          <div className="modal__actions">
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className="chips">
          <span className="chip chip--ok">model: claude-opus-4-7</span>
          {synth && synth.cacheReadTokens > 0 && (
            <span className="chip">cache hit: {synth.cacheReadTokens.toLocaleString()} tok</span>
          )}
          {folder.context.projectTitle ? (
            <span className="chip chip--ok">→ {folder.context.projectTitle}</span>
          ) : (
            <span className="chip chip--warn">unmapped — will not push</span>
          )}
          {folder.context.attachments.map((a) => (
            <span className="chip" key={a.hash}>
              {a.fileName}
            </span>
          ))}
        </div>

        {!synth && (
          <div className="empty">
            <p>No synthesis yet for this email.</p>
            <button className="btn btn--primary" disabled={busy === "synth"} onClick={wrap("synth", onSynthesize)}>
              {busy === "synth" ? "Synthesizing…" : "Synthesize"}
            </button>
          </div>
        )}

        {synth && (
          <>
            <Section
              n={1}
              title="CONFLUENCE STATUS"
              text={synth.confluenceStatus}
              extraAction={
                folder.context.projectPageId ? (
                  <button className="btn btn--primary" disabled={busy === "push"} onClick={wrap("push", onPush)}>
                    {busy === "push" ? "Pushing…" : pushed ? "Push again" : "Push to Confluence"}
                  </button>
                ) : null
              }
            />
            <SectionJira items={synth.jiraActionItems} />
            <Section n={3} title="STAKEHOLDER EMAIL" text={synth.stakeholderEmail} />
            <div className="modal__foot">
              <button className="btn" disabled={busy === "synth"} onClick={wrap("synth", onSynthesize)}>
                {busy === "synth" ? "Re-synthesizing…" : "Re-synthesize"}
              </button>
              {pushed && (
                <span className="muted">
                  Pushed {new Date(synth.pushedToConfluence!.pushedAt).toLocaleString()} →{" "}
                  page {synth.pushedToConfluence!.pageId}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  n,
  title,
  text,
  extraAction,
}: {
  n: number;
  title: string;
  text: string;
  extraAction?: JSX.Element | null;
}): JSX.Element {
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__num">{n}</span>
        <span className="card__title">{title}</span>
        <div className="card__actions">
          {extraAction}
          <button className="btn" onClick={() => navigator.clipboard.writeText(text)}>
            Copy
          </button>
        </div>
      </div>
      <pre className="card__body">{text}</pre>
    </div>
  );
}

function SectionJira({ items }: { items: SynthesisRecord["jiraActionItems"] }): JSX.Element {
  const text = items
    .map((i) => `• ${i.title}\n  ${i.description}${i.projectHint ? `\n  → ${i.projectHint}` : ""}`)
    .join("\n\n");
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__num">2</span>
        <span className="card__title">JIRA ACTION ITEMS</span>
        <div className="card__actions">
          <button className="btn" onClick={() => navigator.clipboard.writeText(text || "(none)")}>
            Copy
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="card__body muted">No action items detected.</div>
      ) : (
        <ul className="jira-list">
          {items.map((i, idx) => (
            <li key={idx}>
              <strong>{i.title}</strong>
              {i.projectHint && <span className="chip chip--ok">{i.projectHint}</span>}
              <p>{i.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
