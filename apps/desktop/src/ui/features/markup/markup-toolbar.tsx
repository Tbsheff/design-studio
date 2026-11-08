import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { MarkupTool } from "./markup-model.js";
import { MarkupToolButton } from "./markup-tool-button.js";

import styles from "./markup.module.css";

interface MarkupToolbarProps {
  readonly canSend: boolean;
  readonly failure: string | null;
  readonly isPending: boolean;
  readonly onCancel: () => void;
  readonly onPick: (tool: MarkupTool) => void;
  readonly onSend: () => void;
  readonly onUndo: () => void;
  readonly tool: MarkupTool;
}

const TOOL_LABELS: readonly {
  readonly label: string;
  readonly tool: MarkupTool;
}[] = [
  { label: copy.pen, tool: "pen" },
  { label: copy.arrow, tool: "arrow" },
  { label: copy.box, tool: "box" },
  { label: copy.note, tool: "note" },
];

const toSendLabel = (isPending: boolean): string => {
  if (isPending) {
    return copy.sending;
  }

  return copy.send;
};

const MarkupToolbar = ({
  canSend,
  failure,
  isPending,
  onCancel,
  onPick,
  onSend,
  onUndo,
  tool,
}: MarkupToolbarProps): ReactElement => (
  <div aria-label={copy.toolbarLabel} className={styles.toolbar} role="toolbar">
    <fieldset className={styles.tools}>
      {TOOL_LABELS.map((entry) => (
        <MarkupToolButton
          key={entry.tool}
          isActive={entry.tool === tool}
          label={entry.label}
          onPick={onPick}
          tool={entry.tool}
        />
      ))}
    </fieldset>
    <button className="btn small ghost" onClick={onUndo} type="button">
      {copy.undo}
    </button>
    <span className={styles.spacer} />
    {failure && <p className={styles.error}>{failure}</p>}
    <button
      aria-label={copy.cancelLabel}
      className="btn small ghost"
      onClick={onCancel}
      type="button"
    >
      {copy.cancel}
    </button>
    <button
      className="btn small primary"
      disabled={!canSend || isPending}
      onClick={onSend}
      type="button"
    >
      {toSendLabel(isPending)}
    </button>
  </div>
);

export { MarkupToolbar };
