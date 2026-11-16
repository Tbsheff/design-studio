import type { MouseEvent, ReactElement } from "react";
import { useCallback } from "react";

import { toHunkCount, toStepRing } from "./change-rings-model.js";
import type { ChangeRing, ChangeSpot } from "./change-rings-model.js";
import { copy } from "./copy.js";
import type { ChangeRings } from "./use-change-rings.js";

interface ChangePillProps {
  readonly control: ChangeRings;
}

const toCountBase = (count: number): string => {
  if (count === 1) {
    return copy.changeSpotOne;
  }

  return `${count}${copy.changeSpotCount}`;
};

const toCountText = (count: number, isStepping: boolean): string => {
  if (isStepping) {
    return toCountBase(count);
  }

  return `${toCountBase(count)}${copy.changeSpotReview}`;
};

const toHunkText = (count: number): string => {
  if (count > 1) {
    return `${copy.changeSpotUndoMany}${count}${copy.changeSpotUndoManyEnd}`;
  }

  return copy.changeSpotUndo;
};

const toUndoText = (spot: ChangeSpot, ring: ChangeRing | null): string => {
  if (ring?.isUndone) {
    return copy.changeSpotUndone;
  }

  if (ring?.isStale) {
    return toHunkText(toHunkCount(spot));
  }

  return copy.changeSpotUndo;
};

const toUndoTip = (ring: ChangeRing | null): string => {
  if (ring?.isUndone) {
    return copy.changeSpotUndoneTip;
  }

  if (ring?.isStale) {
    return copy.changeSpotStaleTip;
  }

  return copy.changeSpotUndoTip;
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

  if (!spot || spot.rings.length === 0) {
    return null;
  }

  const count = spot.rings.length;
  const stepText = toStepText(spot.step, count);
  const ring = toStepRing(spot);
  const isUndone = ring?.isUndone === true;

  return (
    <div className="change-pill">
      <button
        type="button"
        className="change-pill-count"
        data-tip={copy.changeSpotTip}
        onClick={onStep}
      >
        {toCountText(count, stepText !== null)}
        {stepText && <span className="change-pill-step">{stepText}</span>}
      </button>
      {stepText && (
        <button
          type="button"
          className="change-pill-undo"
          data-tip={toUndoTip(ring)}
          disabled={isPending || isUndone}
          onClick={undo}
        >
          {toUndoText(spot, ring)}
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
