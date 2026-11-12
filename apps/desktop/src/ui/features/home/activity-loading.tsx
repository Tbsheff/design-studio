import type { ReactElement } from "react";

import { ActivityHead } from "./activity-head.js";
import { copy } from "./copy.js";

const ActivityLoading = (): ReactElement => (
  <aside className="ide-activity" aria-label={copy.activity}>
    <ActivityHead isOff={false} />
  </aside>
);

export { ActivityLoading };
