import type { DraftSourceStatus } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { STATE_LABEL } from "./draft-sources-model.js";
import { StateMark } from "./state-mark.js";

const SourceLine = ({
  source,
}: {
  source: DraftSourceStatus;
}): ReactElement => (
  <div className="ds-src-line">
    <span className="ds-src-label truncate">{source.label}</span>
    <span className="ds-src-state" data-state={source.state}>
      <StateMark state={source.state} />
      {STATE_LABEL[source.state]}
    </span>
  </div>
);

export { SourceLine };
