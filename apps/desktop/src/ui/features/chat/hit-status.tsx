import type { RunStatus } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { STATUS_WORD } from "./chat-search-hits-model.js";

const HitStatus = ({ status }: { status: RunStatus }): ReactElement => (
  <span className={`status ${status}`} data-tip={STATUS_WORD[status]}>
    <span className="status-dot" aria-hidden="true" />
    <span className="sr-only">{STATUS_WORD[status]}</span>
  </span>
);

export { HitStatus };
