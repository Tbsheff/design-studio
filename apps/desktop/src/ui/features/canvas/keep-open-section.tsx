import type { FrameStatesView } from "@design-studio/contracts/frame-state";
import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import { copy } from "./copy.js";
import { KeepOpenRow } from "./keep-open-row.js";
import {
  canAddStep,
  selectedTrigger,
  toKeepTip,
  toStepsOf,
} from "./open-steps-model.js";
import { useKeepOpen } from "./use-keep-open.js";

const KeepOpenSection = ({
  chosen,
  frameId,
  projectId,
  run,
  view,
}: {
  chosen: string;
  frameId: string;
  projectId: string;
  run: (task: Promise<unknown>) => Promise<void>;
  view: FrameStatesView;
}): ReactElement => {
  const trigger = useLive(selectedTrigger);
  const def = view.states.find((state) => state.id === chosen) ?? null;

  const { clearSteps, custom, keepOpen } = useKeepOpen({
    def,
    frameId,
    projectId,
    run,
    trigger,
  });

  return (
    <div className="ui-menu-section">
      <KeepOpenRow
        icon="pointer"
        isDisabled={trigger === null || !canAddStep(custom)}
        label={copy.keepOpenFromSelection}
        onPick={keepOpen}
        tip={toKeepTip(trigger, custom)}
      />
      {toStepsOf(custom).length > 0 && (
        <KeepOpenRow
          icon="close"
          isDisabled={false}
          label={copy.clearOpenSteps}
          onPick={clearSteps}
          tip={null}
        />
      )}
    </div>
  );
};

export { KeepOpenSection };
