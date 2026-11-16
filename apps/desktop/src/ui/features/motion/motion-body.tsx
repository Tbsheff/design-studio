import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { MotionKind, MotionState } from "./deps.js";
import { KindTabs } from "./kind-tabs.js";
import { MotionActions } from "./motion-actions.js";
import { MotionFields } from "./motion-fields.js";
import { hasSavedMotion, withKind } from "./motion-model.js";
import { MotionNotes } from "./motion-notes.js";
import type { MotionView } from "./use-motion.js";

import styles from "./motion.module.css";

interface MotionBodyProps {
  readonly hasChildren: boolean;
  readonly motion: MotionView;
  readonly noSource: boolean;
  readonly reduced: boolean;
  readonly state: MotionState | null;
}

const MotionBody = ({
  hasChildren,
  motion,
  noSource,
  reduced,
  state,
}: MotionBodyProps): ReactElement => {
  const {
    draft,
    onApply: handleApply,
    onDraft,
    onPreview: handlePreview,
  } = motion;

  const disabled = noSource || motion.busy || motion.loading;

  const handleKind = useCallback(
    (kind: MotionKind): void => {
      onDraft(withKind(draft, kind));
    },
    [draft, onDraft]
  );

  return (
    <div className={styles.body}>
      {noSource && <p className={styles.hint}>{copy.noSource}</p>}
      <KindTabs disabled={disabled} value={draft.kind} onPick={handleKind} />
      {draft.kind !== "none" && (
        <MotionFields
          disabled={disabled}
          draft={draft}
          hasChildren={hasChildren}
          onDraft={onDraft}
        />
      )}
      {(draft.kind !== "none" || hasSavedMotion(motion.info)) && (
        <MotionActions
          busy={motion.busy}
          canPreview={draft.kind !== "none"}
          disabled={disabled}
          onApply={handleApply}
          onPreview={handlePreview}
        />
      )}
      <MotionNotes
        info={motion.info}
        kind={draft.kind}
        note={motion.note}
        reduced={reduced}
        state={state}
      />
    </div>
  );
};

export { MotionBody };
