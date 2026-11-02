import type { ReactElement } from "react";

import { copy, fill } from "./copy.js";
import type { MotionInfo, MotionKind, MotionState } from "./deps.js";
import { NoteLine } from "./note-line.js";
import type { MotionNote } from "./use-motion.js";

import styles from "./motion.module.css";

interface MotionNotesProps {
  readonly info: MotionInfo | null;
  readonly kind: MotionKind;
  readonly note: MotionNote | null;
  readonly reduced: boolean;
  readonly state: MotionState | null;
}

const stateLine = (
  kind: MotionKind,
  state: MotionState | null
): string | null => {
  if (kind !== "transition") {
    return null;
  }

  if (state) {
    return fill(copy.stateEnd, { state });
  }

  return copy.stateNone;
};

const MotionNotes = ({
  info,
  kind,
  note,
  reduced,
  state,
}: MotionNotesProps): ReactElement => {
  const line = stateLine(kind, state);

  const unguarded =
    info !== null && kind !== "none" && !info.reducedMotionGuard;

  return (
    <div className={styles.notes}>
      {line !== null && <p className={styles.hint}>{line}</p>}
      {unguarded && <p className={styles.hint}>{copy.unguarded}</p>}
      {reduced && <p className={styles.hint}>{copy.reduced}</p>}
      <NoteLine note={note} />
    </div>
  );
};

export { MotionNotes };
