import type { MouseEvent, ReactElement } from "react";
import { useCallback } from "react";

import { toHunkCount } from "./change-rings-model.js";
import { copy } from "./copy.js";
import type { ChangeRings } from "./use-change-rings.js";

interface ChangePillProps {
  readonly control: ChangeRings;
}

const toCountText = (count: number): string => {
  if (count === 1) {
    return copy.changeSpotOne;
  }

  return `${count}${copy.changeSpotCount}`;
};

const toUndoText = (count: number): string => {
  if (count > 1) {
    return `${copy.changeSpotUndoMany}${count}${copy.changeSpotUndoManyEnd}`;
  }

  return copy.changeSpotUndo;
};

const toStepText = (step: number | null, count: number): string | null => {
  if (step === null) {
    return null;
  }

  return `${step + 1}${copy.changeSpotOf}${count}`;
};

const ChangePill = ({ control }: ChangePillProps): ReactElement | null => {
  const { clear, isPending, message, spot, step, undo } = control;

  const onStep = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      if (event.shiftKey) {
        clear();

        return;
      }

      step();
    },
    [clear, step]
  );

  if (!spot) {
    return null;
  }

  const count = spot.rings.length;
  const stepText = toStepText(spot.step, count);

  return (
    <div className="change-pill">
      <button
        type="button"
        className="change-pill-count"
        data-tip={copy.changeSpotTip}
        onClick={onStep}
      >
        {toCountText(count)}
        {stepText && <span className="change-pill-step">{stepText}</span>}
      </button>
      {stepText && (
        <button
          type="button"
          className="change-pill-undo"
          data-tip={copy.changeSpotUndoTip}
          disabled={isPending}
          onClick={undo}
        >
          {toUndoText(toHunkCount(spot))}
        </button>
      )}
      <button
        type="button"
        className="change-pill-clear"
        aria-label={copy.changeSpotClear}
        data-tip={copy.changeSpotClear}
        onClick={clear}
      >
        {copy.times}
      </button>
      {message && <span className="change-pill-error">{message}</span>}
    </div>
  );
};

export { ChangePill };
