import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PlusItem } from "./plus-item.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

interface PlusDesignsSectionProps {
  readonly actions: PlusMenuActions;
  readonly onClose: (shouldRefocus: boolean) => void;
}

const PlusDesignsSection = ({
  actions,
  onClose,
}: PlusDesignsSectionProps): ReactElement => (
  <div className="ui-menu-section">
    <span className="ui-menu-label">{copy.designs}</span>
    <PlusItem
      icon="download"
      label="Import design system or tokens"
      meta={null}
      hasChevron={false}
      action={actions.onImportSystem}
      onClose={onClose}
    />
  </div>
);

export { PlusDesignsSection };
