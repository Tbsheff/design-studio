import type { ReactElement } from "react";

import type { WalkthroughView } from "./use-walkthrough.js";

type FrictionView = WalkthroughView["frictions"][number];

interface FrictionRowProps {
  readonly friction: FrictionView;
}

const WalkthroughFrictionRow = ({
  friction,
}: FrictionRowProps): ReactElement => (
  <li className="review-row">
    <div className="review-target">
      <span aria-hidden="true" className={`review-sev ${friction.severity}`} />
      <span className="truncate">{friction.text}</span>
    </div>
    <p className="review-msg">{friction.fix}</p>
  </li>
);

export { WalkthroughFrictionRow };

export type { FrictionRowProps, FrictionView };
