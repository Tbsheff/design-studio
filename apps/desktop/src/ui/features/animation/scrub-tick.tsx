import { useMemo } from "react";
import type { ReactElement } from "react";

import { toPercent } from "./animation-model.js";

import styles from "./animation.module.css";

interface ScrubTickProps {
  readonly durationMs: number;
  readonly timeMs: number;
}

const ScrubTick = ({ durationMs, timeMs }: ScrubTickProps): ReactElement => {
  const style = useMemo(
    () => ({ left: `${toPercent(timeMs, durationMs)}%` }),
    [durationMs, timeMs]
  );

  return (
    <span className={styles.tick} style={style}>
      {timeMs}
    </span>
  );
};

export { ScrubTick };
