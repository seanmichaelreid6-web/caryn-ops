import type { ProjectFolder } from "../types";

interface Props {
  projects: ProjectFolder[];
  onOpen: (p: ProjectFolder) => void;
  onReveal: (p: ProjectFolder) => void;
}

export function RecentList({ projects, onOpen, onReveal }: Props): JSX.Element {
  if (projects.length === 0) {
    return (
      <section className="recent">
        <h2>Recent</h2>
        <div className="muted">No emails ingested yet. Drop a .msg above to start.</div>
      </section>
    );
  }
  return (
    <section className="recent">
      <h2>Recent</h2>
      {projects.map((p) => (
        <div className="recent-row" key={p.dir}>
          <div className="recent-row__main">
            <div className="recent-row__title">
              <span className={`status ${p.context.syntheses?.[0]?.pushedToConfluence ? "status--pushed" : "status--ready"}`}>
                {p.context.syntheses?.[0]?.pushedToConfluence ? "✓" : "·"}
              </span>
              {p.context.subject}
            </div>
            <div className="recent-row__chips">
              {p.context.projectTitle ? (
                <span className="chip chip--ok">→ {p.context.projectTitle}</span>
              ) : (
                <span className="chip chip--warn">unmapped</span>
              )}
              {p.context.attachments.length > 0 && (
                <span className="chip">{p.context.attachments.length} attachment(s)</span>
              )}
              {p.context.from && <span className="chip chip--muted">from {p.context.from}</span>}
            </div>
          </div>
          <div className="recent-row__actions">
            <button className="btn btn--primary" onClick={() => onOpen(p)}>
              {p.context.syntheses?.length ? "View synthesis" : "Draft update"}
            </button>
            <button className="btn" onClick={() => onReveal(p)}>
              Open folder
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
