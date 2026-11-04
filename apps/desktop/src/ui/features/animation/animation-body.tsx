import type { ReactElement } from "react";

import { AnimationActions } from "./animation-actions.js";
import { toKeyframe } from "./animation-model.js";
import type { Draft, KeyframeRef } from "./animation-model.js";
import { AnimationToolbar } from "./animation-toolbar.js";
import { copy } from "./copy.js";
import { KeyframeForm } from "./keyframe-form.js";
import { Timeline } from "./timeline.js";
import type { ExportFormat } from "./use-animation-actions.js";
import type { PlaybackState } from "./use-playback.js";

import styles from "./animation.module.css";

interface AnimationBodyProps {
  readonly draft: Draft;
  readonly isBusy: boolean;
  readonly isDirty: boolean;
  readonly onChange: (draft: Draft) => void;
  readonly onDelete: () => void;
  readonly onExport: (format: ExportFormat) => void;
  readonly onSave: () => void;
  readonly onSelect: (ref: KeyframeRef) => void;
  readonly playback: PlaybackState;
  readonly selected: KeyframeRef | null;
}

const AnimationBody = ({
  draft,
  isBusy,
  isDirty,
  onChange,
  onDelete,
  onExport,
  onSave,
  onSelect,
  playback,
  selected,
}: AnimationBodyProps): ReactElement => {
  const { isPlaying, onScrub: handleScrub, onToggle: handleToggle } = playback;
  const { timeMs } = playback;
  let keyframe = null;

  if (selected !== null) {
    keyframe = toKeyframe(draft, selected);
  }

  return (
    <>
      <AnimationToolbar draft={draft} onChange={onChange} />
      <AnimationActions
        isBusy={isBusy}
        isDirty={isDirty}
        isPlaying={isPlaying}
        onDelete={onDelete}
        onExport={onExport}
        onSave={onSave}
        onToggle={handleToggle}
        timeMs={timeMs}
      />
      <Timeline
        draft={draft}
        onChange={onChange}
        onScrub={handleScrub}
        onSelect={onSelect}
        selected={selected}
        timeMs={timeMs}
      />
      {keyframe && selected && (
        <KeyframeForm
          draft={draft}
          keyframe={keyframe}
          onChange={onChange}
          refs={selected}
        />
      )}
      {!keyframe && <p className={styles.note}>{copy.hold}</p>}
      <p className={styles.note}>{copy.frameNote}</p>
    </>
  );
};

export { AnimationBody };
