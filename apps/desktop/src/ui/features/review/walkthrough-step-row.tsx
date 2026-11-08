import type { ReactElement } from "react";

import { CheckScreenshot } from "./check-screenshot.js";
import { copy } from "./copy.js";
import type { WalkthroughView } from "./use-walkthrough.js";

type StepView = WalkthroughView["steps"][number];

interface StepRowProps {
  readonly projectId: string;
  readonly step: StepView;
}

const WalkthroughStepRow = ({
  projectId,
  step,
}: StepRowProps): ReactElement => (
  <li className="review-row">
    <div className="review-target">
      <span className="review-count num">{step.index}</span>
      <span className="truncate">
        {step.action}
        {copy.colon}
        {step.targetName}
      </span>
    </div>
    <p className="review-msg">{step.reason}</p>
    <CheckScreenshot
      filePath={step.shotPath}
      label={`${copy.walkSteps} ${step.index}`}
      projectId={projectId}
    />
  </li>
);

export { WalkthroughStepRow };

export type { StepRowProps, StepView };
