import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { toLayoutTotal, toViewportLabel } from "./render-check-model.js";
import type { ShownResult } from "./render-check-model.js";

interface CheckRowHeadProps {
  readonly shown: ShownResult;
}

const CheckRowHead = ({ shown }: CheckRowHeadProps): ReactElement => {
  const { isOverflow, layout, problems, result } = shown;
  const isOk = problems.length === 0 && !isOverflow;
  const layoutTotal = toLayoutTotal(shown);

  return (
    <div className="row">
      <span className={`badge ${pick(isOk, "ok", "fail")}`}>
        {pick(isOk, copy.pass, copy.fail)}
      </span>
      <span>{toViewportLabel(result.viewport)}</span>
      <span className="muted num">
        {`${result.width}${copy.times}${result.height}`}
      </span>
      {isOverflow && (
        <span className="badge warn">{copy.horizontalOverflow}</span>
      )}
      {layout.length > 0 && (
        <span className="badge warn">
          {`${layoutTotal}${copy.layout} ${pick(layoutTotal === 1, copy.issue, copy.issues)}`}
        </span>
      )}
    </div>
  );
};

export { CheckRowHead };
