import { useCallback } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { startCopy } from "./copy.js";
import { StartPointAdd } from "./start-point-add.js";
import { StartPointRow } from "./start-point-row.js";
import {
  hasStartName,
  isStartFull,
  toFreeStartName,
} from "./start-points-model.js";
import type { StartPointEdits } from "./use-start-points.js";

interface StartPointsPanelProps {
  readonly edits: StartPointEdits;
  readonly frames: CanvasFrame[];
  readonly active: CanvasFrame | null;
  readonly toTitle: (frame: CanvasFrame) => string;
}

const stopKeys = (event: KeyboardEvent<HTMLElement>): void => {
  if (event.key !== "Escape") {
    event.stopPropagation();
  }
};

const toAddReason = (
  active: CanvasFrame | null,
  isFull: boolean
): string | null => {
  if (isFull) {
    return startCopy.full;
  }

  if (active === null) {
    return startCopy.noFrame;
  }

  return null;
};

const StartPointsPanel = ({
  edits,
  frames,
  active,
  toTitle,
}: StartPointsPanelProps): ReactElement => {
  const { add, points, remove, rename } = edits;

  const isTaken = useCallback(
    (name: string, index: number): boolean => hasStartName(points, name, index),
    [points]
  );

  const onAdd = useCallback(
    (name: string): void => {
      if (active !== null) {
        add(active.id, name);
      }
    },
    [active, add]
  );

  const titleOf = (frameId: string): string => {
    const frame = frames.find((item) => item.id === frameId);

    return (frame && toTitle(frame)) || frameId;
  };

  const suggested = toFreeStartName(
    points,
    active?.label || (active && toTitle(active)) || startCopy.menu
  );

  return (
    <div
      className="ui-menu start-menu is-above"
      role="presentation"
      onKeyDown={stopKeys}
    >
      <div className="ui-menu-label">{startCopy.menu}</div>
      {points.length === 0 && (
        <p className="start-menu-empty">{startCopy.empty}</p>
      )}
      {points.map((point, index) => (
        <StartPointRow
          key={point.name}
          index={index}
          point={point}
          frameTitle={titleOf(point.frame)}
          isTaken={isTaken}
          onRename={rename}
          onRemove={remove}
        />
      ))}
      <StartPointAdd
        key={suggested}
        suggested={suggested}
        reason={toAddReason(active, isStartFull(points))}
        onAdd={onAdd}
      />
    </div>
  );
};

export { StartPointsPanel };
