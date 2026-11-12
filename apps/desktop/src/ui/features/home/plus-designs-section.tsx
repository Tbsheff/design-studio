import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PlusItem } from "./plus-item.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

interface PlusDesignsSectionProps {
  readonly actions: PlusMenuActions;
  readonly onClose: (shouldRefocus: boolean) => void;
}

const toTemplatesLabel = (hasTemplatesShown: boolean): string => {
  if (hasTemplatesShown) {
    return "Hide templates and starters";
  }

  return "Templates and starters";
};

const toAskFirstLabel = (shouldAskFirst: boolean): string => {
  if (shouldAskFirst) {
    return copy.buildShortBriefsNow;
  }

  return copy.askOnShortBriefs;
};

const PlusDesignsSection = ({
  actions,
  onClose,
}: PlusDesignsSectionProps): ReactElement => (
  <div className="ui-menu-section">
    <span className="ui-menu-label">{copy.designs}</span>
    <PlusItem
      icon="layers"
      label={toTemplatesLabel(actions.hasTemplatesShown)}
      meta={null}
      hasChevron={false}
      action={actions.onTemplates}
      onClose={onClose}
    />
    <PlusItem
      icon="sparkle"
      label={toAskFirstLabel(actions.shouldAskFirst)}
      meta={null}
      hasChevron={false}
      action={actions.onAskFirst}
      onClose={onClose}
    />
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
