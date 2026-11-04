import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { ScrubTick } from "./scrub-tick.js";

import styles from "./animation.module.css";

interface ScrubRowProps {
  readonly durationMs: number;
  readonly onScrub: (timeMs: number) => void;
  readonly timeMs: number;
}

const TICK_MS = 200;

const SNAP_MS = 10;

const toTicks = (durationMs: number): number[] => {
  const ticks: number[] = [];

  for (let at = 0; at <= durationMs; at += TICK_MS) {
    ticks.push(at);
  }

  return ticks;
};

const ScrubRow = ({
  durationMs,
  onScrub,
  timeMs,
}: ScrubRowProps): ReactElement => {
  const handleScrubTo = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onScrub(Number(event.target.value));
    },
    [onScrub]
  );

  return (
    <div className={styles.rulerRow}>
      <span className={styles.laneName} />
      <div className={styles.ruler}>
        <input
          aria-label={copy.scrub}
          className={styles.scrub}
          max={durationMs}
          min={0}
          onChange={handleScrubTo}
          step={SNAP_MS}
          type="range"
          value={Math.round(timeMs)}
        />
        {toTicks(durationMs).map((at) => (
          <ScrubTick key={at} durationMs={durationMs} timeMs={at} />
        ))}
      </div>
    </div>
  );
};

export { ScrubRow };
