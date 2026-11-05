import { useCallback, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { GridAxis } from "./grid-model.js";
import type { GridDragStart } from "./use-grid-drag.js";

import styles from "./grid.module.css";

interface GridTrackLineProps {
  readonly axis: GridAxis;
  readonly index: number;
  readonly isActive: boolean;
  readonly length: number;
  readonly px: readonly number[];
  readonly thickness: number;
  readonly words: readonly string[];
  readonly left: number;
  readonly top: number;
  readonly onDown: (
    start: GridDragStart,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
  readonly onMove: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onUp: (event: ReactPointerEvent<HTMLElement>) => void;
}

const AXIS_CLASS = {
  columns: styles.col ?? "",
  rows: styles.row ?? "",
} as const;

const classOf = (axis: GridAxis, isActive: boolean): string => {
  const parts = [styles.line ?? "", AXIS_CLASS[axis]];

  if (isActive) {
    parts.push(styles.drag ?? "");
  }

  return parts.filter(Boolean).join(" ");
};

const GridTrackLine = ({
  axis,
  index,
  isActive,
  length,
  px,
  thickness,
  words,
  left,
  top,
  onDown,
  onMove,
  onUp,
}: GridTrackLineProps): ReactElement => {
  const handleDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      onDown({ axis, index, px, words }, event);
    },
    [axis, index, onDown, px, words]
  );

  const box = useMemo(() => {
    const edgeLeft = left;
    const edgeTop = top;

    if (axis === "columns") {
      return {
        height: length,
        left: left - thickness / 2,
        top: edgeTop,
        width: thickness,
      };
    }

    return {
      height: thickness,
      left: edgeLeft,
      top: top - thickness / 2,
      width: length,
    };
  }, [axis, left, length, thickness, top]);

  return (
    <hr
      className={classOf(axis, isActive)}
      data-axis={axis}
      data-index={index}
      data-testid="grid-track-line"
      data-tip={copy.dragTip}
      aria-label={copy.trackEdit}
      style={box}
      onPointerDown={handleDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    />
  );
};

export { GridTrackLine };

export type { GridTrackLineProps };
