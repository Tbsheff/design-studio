import { useCallback, useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { copy } from "./copy.js";
import type { CommentPrefill } from "./deps.js";
import { MarkupNoteField } from "./markup-note-field.js";
import { MarkupSurface } from "./markup-surface.js";
import { MarkupToolbar } from "./markup-toolbar.js";
import { useMarkupDraw } from "./use-markup-draw.js";
import { useMarkupKeys } from "./use-markup-keys.js";
import { useMarkupSend } from "./use-markup-send.js";
import type { MarkupTarget } from "./use-markup-send.js";

import styles from "./markup.module.css";

const PERCENT = 100;

interface MarkupRect {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

interface MarkupOverlayProps {
  readonly onAttach: (prefill: CommentPrefill) => void;
  readonly onClose: () => void;
  readonly rect: MarkupRect;
  readonly target: MarkupTarget;
}

const MarkupOverlay = ({
  onAttach,
  onClose,
  rect,
  target,
}: MarkupOverlayProps): ReactElement => {
  const size = useMemo(
    () => ({ height: target.height, width: target.width }),
    [target.height, target.width]
  );

  const draw = useMarkupDraw(size);

  const handleDone = useCallback(
    (prefill: CommentPrefill): void => {
      onAttach(prefill);
      onClose();
    },
    [onAttach, onClose]
  );

  const send = useMarkupSend(target, handleDone);
  const { handleSend } = send;
  const { pendingNote, strokes } = draw;

  useMarkupKeys(onClose);

  const handleSendClick = useCallback(
    (): void => handleSend(strokes),
    [handleSend, strokes]
  );

  const style = useMemo<CSSProperties>(() => ({ ...rect }), [rect]);

  return (
    <section
      aria-label={copy.overlayLabel}
      className={styles.overlay}
      style={style}
    >
      <MarkupSurface draw={draw} size={size} />
      {pendingNote && (
        <MarkupNoteField
          leftPercent={(pendingNote.x / size.width) * PERCENT}
          onCancel={draw.handleCancelNote}
          onCommit={draw.handleCommitNote}
          topPercent={(pendingNote.y / size.height) * PERCENT}
        />
      )}
      <MarkupToolbar
        canSend={strokes.length > 0}
        failure={send.failure}
        isPending={send.isPending}
        onCancel={onClose}
        onPick={draw.handleTool}
        onSend={handleSendClick}
        onUndo={draw.handleUndo}
        tool={draw.tool}
      />
    </section>
  );
};

export { MarkupOverlay };

export type { MarkupOverlayProps, MarkupRect };
