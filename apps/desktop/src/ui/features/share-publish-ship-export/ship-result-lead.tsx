import type { ShipResult } from "@design-studio/contracts/ship";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface ShipResultLeadProps {
  readonly result: ShipResult;
}

const toLeadText = (result: ShipResult): string => {
  if (result.mode === "branch") {
    return copy.branchCreated;
  }

  return pick(result.prUrl, copy.pullRequestOpened, copy.branchPushed);
};

const ShipResultLead = ({ result }: ShipResultLeadProps): ReactElement => (
  <p className="ship-result-lead">
    <Icon name="check" size={14} />
    {` ${toLeadText(result)} ${copy.checkedOutUnchanged}`}
  </p>
);

export { ShipResultLead };
