import type { ReactElement } from "react";
import { useMemo } from "react";
import { createPortal } from "react-dom";

import type { DragGhostState } from "./component-drag-state.js";

const GHOST_OFFSET = 12;

const toPortalTarget = (): HTMLElement => document.body;

const toHintClass = (ghost: DragGhostState): string => {
  if (ghost.hint && !ghost.hint.ok) {
    return "cmp-ghost-hint bad";
  }

  return "cmp-ghost-hint";
};

const toHintText = (ghost: DragGhostState): string =>
  ghost.hint?.text ?? "Drop on an element in the frame";

const DragGhost = ({
  ghost,
}: {
  ghost: DragGhostState | null;
}): ReactElement | null => {
  const left = (ghost?.x ?? 0) + GHOST_OFFSET;
  const top = (ghost?.y ?? 0) + GHOST_OFFSET;
  const style = useMemo(() => ({ left, top }), [left, top]);

  if (!ghost) {
    return null;
  }

  return (
    <>
      {createPortal(
        <output className="cmp-ghost" style={style} aria-live="polite">
          <span className="cmp-ghost-name">{ghost.name}</span>
          <span className={toHintClass(ghost)}>{toHintText(ghost)}</span>
        </output>,
        toPortalTarget()
      )}
    </>
  );
};

export { DragGhost };
