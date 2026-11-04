import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { AnimationBody } from "./animation-body.js";
import { AnimationHead } from "./animation-head.js";
import { toAdded } from "./animation-model.js";
import type { KeyframeRef } from "./animation-model.js";
import { copy } from "./copy.js";
import type { ParentMessageBody } from "./deps.js";
import { ExportResultView } from "./export-result.js";
import { useAnimation } from "./use-animation.js";
import { usePlayback } from "./use-playback.js";

import styles from "./animation.module.css";

interface AnimationPanelProps {
  readonly directionId: string;
  readonly onClose: () => void;
  readonly post: (body: ParentMessageBody) => void;
  readonly projectId: string;
  readonly selector: string | null;
}

const AnimationPanel = ({
  directionId,
  onClose,
  post,
  projectId,
  selector,
}: AnimationPanelProps): ReactElement => {
  const state = useAnimation({ directionId, projectId, selector });

  const { draft, onCreate, onDelete, onExport, onPick, onSave, setDraft } =
    state;

  const playback = usePlayback({ draft, post });
  const [selected, setSelected] = useState<KeyframeRef | null>(null);

  const handlePick = useCallback(
    (id: string): void => {
      setSelected(null);
      onPick(id);
    },
    [onPick]
  );

  const handleAdd = useCallback((): void => {
    if (draft !== null && selected !== null) {
      setDraft(toAdded(draft, selected, playback.timeMs));
    }
  }, [draft, playback.timeMs, selected, setDraft]);

  return (
    <section aria-label={copy.animation} className={styles.panel}>
      <AnimationHead
        hasKeyframe={selected !== null}
        isBusy={state.isBusy}
        onAdd={handleAdd}
        onClose={onClose}
        onCreate={onCreate}
        onPick={handlePick}
        rows={state.rows}
        selectedId={state.selectedId}
      />
      {draft === null && <p className={styles.note}>{copy.empty}</p>}
      {draft !== null && (
        <AnimationBody
          draft={draft}
          isBusy={state.isBusy}
          isDirty={state.isDirty}
          onChange={setDraft}
          onDelete={onDelete}
          onExport={onExport}
          onSave={onSave}
          onSelect={setSelected}
          playback={playback}
          selected={selected}
        />
      )}
      {state.error !== null && (
        <span className={styles.error} role="alert">
          {state.error}
        </span>
      )}
      {state.exported !== null && <ExportResultView result={state.exported} />}
    </section>
  );
};

export { AnimationPanel };

export type { AnimationPanelProps };
