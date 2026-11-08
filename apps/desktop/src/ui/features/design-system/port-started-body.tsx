import type { PortStartResult } from "@design-studio/contracts/port";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toStartedLine } from "./port-model.js";

const StartedBody = ({
  result,
  appName,
}: {
  result: PortStartResult;
  appName: string;
}): ReactElement => (
  <div className="modal-body port-body">
    <output className="port-done">
      <Icon name="check" size={14} />
      {toStartedLine(result, appName)}
    </output>
  </div>
);

export { StartedBody };
