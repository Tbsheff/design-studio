import { useCallback, useMemo } from "react";
import type { PointerEvent, ReactElement } from "react";

import { toPercent } from "./animation-model.js";
import type { KeyframeRef } from "./animation-model.js";

import styles from "./animation.module.css";

interface KeyframeDotProps {
  readonly durationMs: number;
  readonly isSelected: boolean;
  readonly label: string;
  readonly onDrag: (ref: KeyframeRef, clientX: number, lane: Element) => void;
  readonly onSelect: (ref: KeyframeRef) => void;
  readonly refs: KeyframeRef;
  readonly timeMs: number;
}

const KeyframeDot = ({
  durationMs,
  isSelected,
  label,
  onDrag,
  onSelect,
  refs,
  timeMs,
}: KeyframeDotProps): ReactElement => {
  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      event.currentTarget.setPointerCapture(event.pointerId);
      onSelect(refs);
    },
    [onSelect, refs]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }

      const lane = event.currentTarget.closest("[data-lane]");

      if (lane !== null) {
        onDrag(refs, event.clientX, lane);
      }
    },
    [onDrag, refs]
  );

  const style = useMemo(
    () => ({ left: `${toPercent(timeMs, durationMs)}%` }),
    [durationMs, timeMs]
  );

  return (
    <button
      aria-label={label}
      aria-pressed={isSelected}
      className={styles.key}
      data-keyframe=""
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      style={style}
      type="button"
    />
  );
};

export { KeyframeDot };

export type { KeyframeDotProps };
