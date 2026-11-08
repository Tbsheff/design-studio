import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { PackYoursTag } from "./pack-yours-tag.js";

const PackName = ({ pack }: { pack: PackSummary }): ReactElement => (
  <span className="pack-name">
    <span className="truncate">{pack.name}</span>
    <PackYoursTag isUser={pack.source === "user"} />
  </span>
);

export { PackName };
