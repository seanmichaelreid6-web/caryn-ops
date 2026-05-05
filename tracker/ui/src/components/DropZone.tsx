import { useState } from "react";

interface Props {
  onPickFiles: () => void;
  onDropPaths: (paths: string[]) => void;
}

export function DropZone({ onPickFiles, onDropPaths }: Props): JSX.Element {
  const [hot, setHot] = useState(false);

  return (
    <button
      type="button"
      className={`drop ${hot ? "drop--hot" : ""}`}
      onClick={onPickFiles}
      onDragEnter={(e) => {
        e.preventDefault();
        setHot(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setHot(true);
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHot(false);
        const paths: string[] = [];
        for (const f of Array.from(e.dataTransfer.files)) {
          // Electron exposes the absolute path on dropped files
          const p = (f as File & { path?: string }).path;
          if (p) paths.push(p);
        }
        if (paths.length) onDropPaths(paths);
      }}
    >
      <div className="drop-icon">✉ · 📎</div>
      <div className="drop-title">Drop emails here</div>
      <div className="drop-sub">.msg · click to choose</div>
    </button>
  );
}
