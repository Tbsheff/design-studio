import type { FrameStateDef } from "@design-studio/contracts/frame-state";
import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { clockCopy } from "./frame-clock-copy.js";
import { FrameClockFrozen } from "./frame-clock-frozen.js";
import { hasClock } from "./frame-clock-model.js";
import { useFrameClock } from "./use-frame-clock.js";

const FrameStateClockRow = ({
  def,
  frameId,
  projectId,
  run,
}: {
  def: FrameStateDef | null;
  frameId: string;
  projectId: string;
  run: (task: Promise<unknown>) => Promise<void>;
}): ReactElement => {
  const { changeClock, clearClock, isFrozen, toggleFrozen, value } =
    useFrameClock({ def, frameId, projectId, run });

  const changeFromInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      changeClock(event.target.value),
    [changeClock]
  );

  return (
    <div className="ui-menu-section frame-clock" data-tip={clockCopy.clockTip}>
      <label className="frame-clock-field">
        <span>{clockCopy.clock}</span>
        <input
          key={value}
          type="datetime-local"
          aria-label={clockCopy.pickDate}
          defaultValue={value}
          onChange={changeFromInput}
        />
      </label>
      <div className="frame-clock-actions">
        <FrameClockFrozen
          isDisabled={!hasClock(def)}
          isFrozen={isFrozen}
          onToggle={toggleFrozen}
        />
        <button
          type="button"
          className="btn small ghost"
          disabled={!hasClock(def)}
          data-tip={clockCopy.clearTip}
          onClick={clearClock}
        >
          {clockCopy.clear}
        </button>
      </div>
      <p className="frame-page-hint">{clockCopy.limit}</p>
    </div>
  );
};

export { FrameStateClockRow };
