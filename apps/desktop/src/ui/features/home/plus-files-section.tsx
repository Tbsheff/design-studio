import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PlusItem } from "./plus-item.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

interface PlusFilesSectionProps {
  readonly actions: PlusMenuActions;
  readonly onClose: (shouldRefocus: boolean) => void;
}

const PlusFilesSection = ({
  actions,
  onClose,
}: PlusFilesSectionProps): ReactElement => (
  <div className="ui-menu-section">
    <span className="ui-menu-label">{copy.files}</span>
    <PlusItem
      icon="paperclip"
      label="Attach images"
      meta="⌘V"
      hasChevron={false}
      action={actions.onAttachFile}
      onClose={onClose}
    />
    <PlusItem
      icon="folder"
      label={copy.attachFolder}
      meta={null}
      hasChevron={false}
      action={actions.onAttachFolder}
      onClose={onClose}
    />
    <PlusItem
      icon="globe"
      label={copy.attachWebPage}
      meta={null}
      hasChevron={false}
      action={actions.onAttachUrl}
      onClose={onClose}
    />
    <PlusItem
      icon="file"
      label={copy.attachZipOrFile}
      meta={null}
      hasChevron={false}
      action={actions.onAttachZip}
      onClose={onClose}
    />
  </div>
);

export { PlusFilesSection };
