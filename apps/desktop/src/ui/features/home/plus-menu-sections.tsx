import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PlusFilesSection } from "./plus-files-section.js";
import { PlusItem } from "./plus-item.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

interface PlusMenuSectionsProps {
  readonly actions: PlusMenuActions;
  readonly locationLabel: string;
  readonly onClose: (shouldRefocus: boolean) => void;
}

const toTemplatesLabel = (hasTemplatesShown: boolean): string => {
  if (hasTemplatesShown) {
    return "Hide templates and starters";
  }

  return "Templates and starters";
};

const PlusMenuSections = ({
  actions,
  locationLabel,
  onClose,
}: PlusMenuSectionsProps): ReactElement => (
  <>
    <PlusFilesSection actions={actions} onClose={onClose} />
    <div className="ui-menu-section">
      <span className="ui-menu-label">{copy.code}</span>
      <PlusItem
        icon="folder"
        label="Add app folder…"
        meta={null}
        hasChevron={false}
        action={actions.onLinkCode}
        onClose={onClose}
      />
    </div>
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
        icon="download"
        label="Import design system or tokens"
        meta={null}
        hasChevron={false}
        action={actions.onImportSystem}
        onClose={onClose}
      />
    </div>
    <div className="ui-menu-section">
      <PlusItem
        icon="palette"
        label="Design system"
        meta={null}
        hasChevron
        action={actions.onDesignSystem}
        onClose={onClose}
      />
      <PlusItem
        icon="sparkle"
        label="Skills and limits"
        meta={null}
        hasChevron={false}
        action={actions.onSkills}
        onClose={onClose}
      />
      <PlusItem
        icon="folder"
        label="Location"
        meta={locationLabel}
        hasChevron={false}
        action={actions.onLocation}
        onClose={onClose}
      />
    </div>
  </>
);

export { PlusMenuSections };
