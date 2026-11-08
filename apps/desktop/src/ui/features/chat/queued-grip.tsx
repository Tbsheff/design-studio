import type { ReactElement } from "react";

import { copy } from "./copy.js";

const QueuedGrip = (): ReactElement => (
  <span
    className="queued-grip"
    aria-hidden="true"
    data-tip={copy.dragOrAlt}
    data-tip-side="top"
    data-tip-align="start"
  >
    {copy.text8}
  </span>
);

export { QueuedGrip };
