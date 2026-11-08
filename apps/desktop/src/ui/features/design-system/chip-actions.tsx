import type { ReactElement } from "react";

import { ChipActionButton } from "./chip-action-button.js";
import type { ChipDialog } from "./chip-model.js";
import { COPY } from "./copy.js";

const ChipActions = ({
  onOpen,
}: {
  onOpen: (dialog: ChipDialog) => void;
}): ReactElement => (
  <div className="ds-actions">
    <ChipActionButton
      dialog="change"
      label={COPY.textChangeDesignSystem}
      onOpen={onOpen}
    />
    <ChipActionButton
      dialog="save"
      label={COPY.textSaveToLibrary}
      onOpen={onOpen}
    />
  </div>
);

export { ChipActions };
