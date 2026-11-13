import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { DraftFrame } from "./draft-frame.js";
import { FirstBuildCover } from "./frame-skeleton.js";
import type { StageWait } from "./stage-wait-model.js";
import { useDraftFrame } from "./use-draft-frame.js";

interface StepCoverProps {
  readonly steps: LiveStore<string | null>;
  readonly covered: boolean;
  readonly wait: StageWait;
  readonly path: string | undefined;
  readonly projectId: string;
  readonly directionId: string | null;
}

const StepCover = ({
  steps,
  covered,
  wait,
  path,
  projectId,
  directionId,
}: StepCoverProps): ReactElement => {
  const step = useLive(steps);

  const draft = useDraftFrame({
    directionId,
    path,
    projectId,
    shouldShow: covered,
  });

  if (draft !== null) {
    return <DraftFrame draft={draft} />;
  }

  return (
    <FirstBuildCover covered={covered} wait={wait} step={step} path={path} />
  );
};

export { StepCover };
