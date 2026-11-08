import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";

const ExportSelectionField = (): ReactElement => (
  <div className="export-field">
    <span className="export-label">{uiCopy.area}</span>
    <span className="export-selection">
      <Icon name="pointer" size={14} />
      {uiCopy.selectedElement}
    </span>
  </div>
);

export { ExportSelectionField };
