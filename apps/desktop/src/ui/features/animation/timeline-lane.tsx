import { useMemo } from "react";
import type { ReactElement } from "react";

import { isSameRef, toRefKey } from "./animation-model.js";
import type { KeyframeRef, PropertyTrack } from "./animation-model.js";
import { KeyframeDot } from "./keyframe-dot.js";

import styles from "./animation.module.css";

interface TimelineLaneProps {
  readonly durationMs: number;
  readonly entry: PropertyTrack;
  readonly headPercent: number;
  readonly onDrag: (ref: KeyframeRef, clientX: number, lane: Element) => void;
  readonly onSelect: (ref: KeyframeRef) => void;
  readonly propertyIndex: number;
  readonly selected: KeyframeRef | null;
  readonly trackIndex: number;
}

const TimelineLane = ({
  durationMs,
  entry,
  headPercent,
  onDrag,
  onSelect,
  propertyIndex,
  selected,
  trackIndex,
}: TimelineLaneProps): ReactElement => {
  const headStyle = useMemo(() => ({ left: `${headPercent}%` }), [headPercent]);

  const refs = useMemo(
    () =>
      entry.keyframes.map((_key, keyIndex) => ({
        keyIndex,
        propertyIndex,
        trackIndex,
      })),
    [entry.keyframes, propertyIndex, trackIndex]
  );

  return (
    <div className={styles.lane}>
      <span className={styles.laneName}>{entry.property}</span>
      <div className={styles.laneBar} data-lane="">
        <span className={styles.headLine} style={headStyle} />
        {refs.map((ref) => (
          <KeyframeDot
            key={toRefKey(ref)}
            durationMs={durationMs}
            isSelected={isSameRef(selected, ref)}
            label={`${entry.property} ${entry.keyframes[ref.keyIndex]?.timeMs ?? 0} ms`}
            onDrag={onDrag}
            onSelect={onSelect}
            refs={ref}
            timeMs={entry.keyframes[ref.keyIndex]?.timeMs ?? 0}
          />
        ))}
      </div>
    </div>
  );
};

export { TimelineLane };
