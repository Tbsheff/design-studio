import type { DoctorCause } from "@design-studio/contracts/app-doctor";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const toFixLabel = (isBusy: boolean, label: string): string => {
  if (isBusy) {
    return "Restarting…";
  }

  return label;
};

const DoctorCardFoot = ({
  cause,
  isBusy,
  onFix,
  onLog,
  onRestart,
  version,
}: {
  cause: DoctorCause;
  isBusy: boolean;
  onFix: () => void;
  onLog: () => void;
  onRestart: (() => void) | undefined;
  version: string | null;
}): ReactElement => (
  <div className="app-fail-foot">
    <button type="button" className="btn small ghost" onClick={onLog}>
      {COPY.textShowTheLog}
    </button>
    <span className="grow" />
    {version && (
      <span className="mono" data-tip={COPY.tipDesignStudioVersion}>
        {COPY.textV}
        {version}
      </span>
    )}
    {cause.fix && (
      <button
        type="button"
        className="btn small primary"
        disabled={isBusy}
        onClick={onFix}
      >
        {toFixLabel(isBusy, cause.fix.label)}
      </button>
    )}
    {!cause.fix && onRestart && cause.severity === "error" && (
      <button type="button" className="btn small primary" onClick={onRestart}>
        {COPY.textRestartDevServer}
      </button>
    )}
  </div>
);

export { DoctorCardFoot };
