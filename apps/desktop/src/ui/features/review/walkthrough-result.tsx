import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { WalkthroughView } from "./use-walkthrough.js";
import { WalkthroughFrictionRow } from "./walkthrough-friction-row.js";
import { WalkthroughStepRow } from "./walkthrough-step-row.js";

interface ResultProps {
  readonly projectId: string;
  readonly result: WalkthroughView;
}

const WalkthroughResult = ({
  projectId,
  result,
}: ResultProps): ReactElement => (
  <>
    {result.steps.length === 0 && (
      <p className="review-msg">{copy.walkNoSteps}</p>
    )}
    {result.steps.length > 0 && (
      <ul aria-label={copy.walkSteps} className="review-list">
        {result.steps.map((step) => (
          <WalkthroughStepRow
            key={step.index}
            projectId={projectId}
            step={step}
          />
        ))}
      </ul>
    )}
    {result.frictions.length > 0 && (
      <ul aria-label={copy.walkFrictions} className="review-list">
        {result.frictions.map((friction) => (
          <WalkthroughFrictionRow
            key={`${friction.step}|${friction.text}`}
            friction={friction}
          />
        ))}
      </ul>
    )}
  </>
);

export { WalkthroughResult };

export type { ResultProps };
