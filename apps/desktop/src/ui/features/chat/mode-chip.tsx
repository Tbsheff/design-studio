import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC } from "../../chat-slots.js";
import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { MODE_ICON } from "./prompt-box-model.js";
import { StateChip } from "./state-chip.js";

const MODE_ICON_SIZE = 14;

const MODE_ICONS: Record<ComposerMode, ReactElement> = {
  critique: <Icon name={MODE_ICON.critique} size={MODE_ICON_SIZE} />,
  edit: <Icon name={MODE_ICON.edit} size={MODE_ICON_SIZE} />,
  plan: <Icon name={MODE_ICON.plan} size={MODE_ICON_SIZE} />,
};

const ModeChip = ({
  mode,
  onClear,
}: {
  mode: ComposerMode;
  onClear: () => void;
}): ReactElement | null => {
  if (mode === "edit") {
    return null;
  }

  return (
    <StateChip
      label={MODE_LABEL[mode]}
      short={MODE_ICONS[mode]}
      tip={`${MODE_LABEL[mode]} mode. ${shortcutLabel("composer-mode", IS_MAC)} cycles modes.`}
      onClear={onClear}
    />
  );
};

export { ModeChip };
