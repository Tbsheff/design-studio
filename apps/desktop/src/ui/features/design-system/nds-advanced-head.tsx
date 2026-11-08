import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const AdvancedSummary = (): ReactElement => (
  <>
    <span className="nds-section-head">
      <span className="nds-section-title">{COPY.textAdvanced}</span>
      <span className="nds-section-hint">{COPY.textCodeFolderAndImport}</span>
    </span>
    <Icon name="chevronRight" size={14} />
  </>
);

export { AdvancedSummary };
