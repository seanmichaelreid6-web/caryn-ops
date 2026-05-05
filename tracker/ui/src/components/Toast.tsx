import { useEffect } from "react";

interface Props {
  kind: "info" | "error";
  text: string;
  onDismiss: () => void;
}

export function Toast({ kind, text, onDismiss }: Props): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onDismiss, kind === "error" ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [kind, text, onDismiss]);
  return (
    <div className={`toast toast--${kind}`} onClick={onDismiss} role="status">
      {text}
    </div>
  );
}
