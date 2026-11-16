import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import type { WalkthroughView } from "./use-walkthrough.js";

interface HeadProps {
  readonly isBusy: boolean;
  readonly isDisabled: boolean;
  readonly outcome: WalkthroughView["outcome"] | null;
}

const ICON_SIZE = 12;

const OUTCOME_BADGE: Readonly<
  Record<
    WalkthroughView["outcome"],
    { readonly className: string; readonly text: string }
  >
> = {
  done: { className: "badge ok", text: copy.walkOutcomeDone },
  "max-steps": { className: "badge warn", text: copy.walkOutcomeMaxSteps },
  stuck: { className: "badge fail", text: copy.walkOutcomeStuck },
};

const WalkthroughHead = ({
  isBusy,
  isDisabled,
  outcome,
}: HeadProps): ReactElement => (
  <div className="review-group-head">
    <span className="review-group-name">{copy.walkTitle}</span>
    {outcome !== null && (
      <span className={OUTCOME_BADGE[outcome].className}>
        {OUTCOME_BADGE[outcome].text}
      </span>
    )}
    <div className="spacer" />
    <button
      className="btn small"
      data-tip={copy.walkRunTip}
      data-tip-align="end"
      disabled={isDisabled}
      type="submit"
    >
      {isBusy && <span className="spinner" />}
      {!isBusy && <Icon name="review" size={ICON_SIZE} />}
      <span>{pick(isBusy, copy.walkRunning, copy.walkRun)}</span>
    </button>
  </div>
);

export { WalkthroughHead };

export type { HeadProps };
