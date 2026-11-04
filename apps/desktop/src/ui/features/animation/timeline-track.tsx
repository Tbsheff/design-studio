import type { ReactElement } from "react";

import type { KeyframeRef, Track } from "./animation-model.js";
import { TimelineLane } from "./timeline-lane.js";

import styles from "./animation.module.css";

interface TimelineTrackProps {
  readonly durationMs: number;
  readonly headPercent: number;
  readonly onDrag: (ref: KeyframeRef, clientX: number, lane: Element) => void;
  readonly onSelect: (ref: KeyframeRef) => void;
  readonly selected: KeyframeRef | null;
  readonly track: Track;
  readonly trackIndex: number;
}

const TimelineTrack = ({
  durationMs,
  headPercent,
  onDrag,
  onSelect,
  selected,
  track,
  trackIndex,
}: TimelineTrackProps): ReactElement => (
  <div className={styles.track}>
    <div className={styles.trackName}>{track.selector}</div>
    {track.properties.map((entry, propertyIndex) => (
      <TimelineLane
        key={entry.property}
        durationMs={durationMs}
        entry={entry}
        headPercent={headPercent}
        onDrag={onDrag}
        onSelect={onSelect}
        propertyIndex={propertyIndex}
        selected={selected}
        trackIndex={trackIndex}
      />
    ))}
  </div>
);

export { TimelineTrack };
