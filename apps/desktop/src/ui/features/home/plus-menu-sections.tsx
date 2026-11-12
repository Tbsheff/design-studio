import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PlusDesignsSection } from "./plus-designs-section.js";
import { PlusFilesSection } from "./plus-files-section.js";
import { PlusItem } from "./plus-item.js";
import { PlusKindItem } from "./plus-kind-item.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

interface PlusMenuSectionsProps {
  readonly actions: PlusMenuActions;
  readonly locationLabel: string;
  readonly onClose: (shouldRefocus: boolean) => void;
}

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
      <PlusItem
        icon="download"
        label={copy.importFromGithub}
        meta={null}
        hasChevron={false}
        action={actions.onImportRepo}
        onClose={onClose}
      />
      <PlusKindItem actions={actions} />
    </div>
    <PlusDesignsSection actions={actions} onClose={onClose} />
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
        label="Skills and DESIGN.md"
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
