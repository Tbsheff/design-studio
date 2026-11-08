import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { FirstBuildCover } from "./frame-skeleton.js";
import type { StageWait } from "./stage-wait-model.js";

interface StepCoverProps {
  readonly steps: LiveStore<string | null>;
  readonly covered: boolean;
  readonly wait: StageWait;
  readonly path: string | undefined;
}

const StepCover = ({
  steps,
  covered,
  wait,
  path,
}: StepCoverProps): ReactElement => {
  const step = useLive(steps);

  return (
    <FirstBuildCover covered={covered} wait={wait} step={step} path={path} />
  );
};

export { StepCover };
