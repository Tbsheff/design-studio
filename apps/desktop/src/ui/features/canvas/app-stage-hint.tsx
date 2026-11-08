import type { ReactElement } from "react";

import type { Hint } from "./app-hint-types.js";
import { HintIcon } from "./hint-icon.js";
import { RouteHintActions } from "./route-hint-actions.js";

const AppStageHint = ({
  hint,
  onClose,
}: {
  hint: Hint;
  onClose: () => void;
}): ReactElement => (
  <output className="stage-message app-stage-note" data-kind={hint.kind}>
    <HintIcon hint={hint} />
    {hint.text}
    {hint.kind === "route" && <RouteHintActions onClose={onClose} />}
  </output>
);

export { AppStageHint };
