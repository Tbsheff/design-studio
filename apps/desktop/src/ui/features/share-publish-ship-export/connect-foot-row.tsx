import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { pick } from "./pick.js";

interface ConnectFootRowProps {
  readonly isRunning: boolean;
  readonly url: string;
  readonly isBusy: boolean;
  readonly onRotate: () => void;
}

const ConnectFootRow = ({
  isBusy,
  isRunning,
  onRotate,
  url,
}: ConnectFootRowProps): ReactElement => (
  <div className="export-connect-foot">
    <span className="export-sub">
      {pick(isRunning, `${uiCopy.runningAt} ${url}`, uiCopy.notRunning)}
    </span>
    <button
      type="button"
      className="btn small ghost"
      disabled={isBusy}
      onClick={onRotate}
    >
      {uiCopy.newToken}
    </button>
  </div>
);

export { ConnectFootRow };
