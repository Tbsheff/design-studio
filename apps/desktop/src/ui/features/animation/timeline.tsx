import { useCallback } from "react";
import type { ReactElement } from "react";

import { toMoved, toPercent, toSnapped } from "./animation-model.js";
import type { Draft, KeyframeRef } from "./animation-model.js";
import { copy } from "./copy.js";
import { ScrubRow } from "./scrub-row.js";
import { TimelineTrack } from "./timeline-track.js";

import styles from "./animation.module.css";

interface TimelineProps {
  readonly draft: Draft;
  readonly onChange: (draft: Draft) => void;
  readonly onScrub: (timeMs: number) => void;
  readonly onSelect: (ref: KeyframeRef) => void;
  readonly selected: KeyframeRef | null;
  readonly timeMs: number;
}

const toTimeAt = (
  clientX: number,
  lane: Element,
  durationMs: number
): number => {
  const box = lane.getBoundingClientRect();
  const ratio = (clientX - box.left) / box.width;

  return toSnapped(ratio * durationMs, durationMs);
};

const Timeline = ({
  draft,
  onChange,
  onScrub,
  onSelect,
  selected,
  timeMs,
}: TimelineProps): ReactElement => {
  const { durationMs } = draft;

  const handleDrag = useCallback(
    (ref: KeyframeRef, clientX: number, lane: Element): void => {
      onChange(toMoved(draft, ref, toTimeAt(clientX, lane, durationMs)));
    },
    [draft, durationMs, onChange]
  );

  const headPercent = toPercent(Math.min(timeMs, durationMs), durationMs);

  return (
    <section className={styles.timeline} aria-label={copy.timeline}>
      <ScrubRow durationMs={durationMs} onScrub={onScrub} timeMs={timeMs} />
      <div className={styles.tracks}>
        {draft.tracks.map((track, trackIndex) => (
          <TimelineTrack
            key={track.selector}
            durationMs={durationMs}
            headPercent={headPercent}
            onDrag={handleDrag}
            onSelect={onSelect}
            selected={selected}
            track={track}
            trackIndex={trackIndex}
          />
        ))}
      </div>
    </section>
  );
};

export { Timeline };
