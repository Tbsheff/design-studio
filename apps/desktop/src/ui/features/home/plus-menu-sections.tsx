import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PlusFilesSection } from "./plus-files-section.js";
import { PlusItem } from "./plus-item.js";
import { PlusKindItem } from "./plus-kind-item.js";
import type { PlusMenuActions } from "./plus-menu-model.js";
import { PlusRoutesSection } from "./plus-routes-section.js";

interface PlusMenuSectionsProps {
  readonly actions: PlusMenuActions;
  readonly onClose: (shouldRefocus: boolean) => void;
}

const PlusMenuSections = ({
  actions,
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
      <PlusItem
        icon="folder"
        label={copy.locationItem}
        meta={null}
        hasChevron={false}
        action={actions.onLocation}
        onClose={onClose}
      />
      <PlusKindItem actions={actions} />
    </div>
    <PlusRoutesSection onClose={onClose} />
  </>
);

export { PlusMenuSections };
