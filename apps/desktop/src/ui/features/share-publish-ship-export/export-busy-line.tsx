import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { pick } from "./pick.js";

const ExportBusyLine = ({
  elapsed,
  isHandoff,
}: {
  readonly elapsed: number;
  readonly isHandoff: boolean;
}): ReactElement => (
  <span className="export-progress">
    <span className="spinner" />
    {`${pick(isHandoff, uiCopy.buildingHandoff, uiCopy.exporting)}… `}
    <span className="tabular">{`${elapsed} s`}</span>
  </span>
);

export { ExportBusyLine };
