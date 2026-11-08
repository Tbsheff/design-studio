import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { toBadgeText } from "./chip-model.js";
import { PackDescription } from "./pack-description.js";

const ChipHead = ({
  name,
  pack,
}: {
  name: string;
  pack: PackSummary | null;
}): ReactElement => (
  <div className="ds-head">
    <div className="ds-titles">
      <strong>{name}</strong>
      <PackDescription pack={pack} />
    </div>
    <span className="badge">{toBadgeText(pack)}</span>
  </div>
);

export { ChipHead };
