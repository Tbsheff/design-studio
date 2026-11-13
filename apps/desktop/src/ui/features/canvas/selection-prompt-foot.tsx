import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { SelectionPictureChip } from "../../ai/components/ai/selection-picture-chip.js";
import { copy } from "./copy.js";

const FOOT_ICON = 12;

interface SelectionPromptFootProps {
  readonly count: number;
  readonly onChat: () => void;
  readonly onClose: () => void;
}

const SelectionPromptFoot = ({
  count,
  onChat,
  onClose,
}: SelectionPromptFootProps): ReactElement => (
  <div className="selection-prompt-foot">
    <button
      type="button"
      className="selection-prompt-link"
      data-tip={copy.selectionPrompt.openInChatTip}
      onClick={onChat}
    >
      <Icon name="chat" size={FOOT_ICON} />
      <span>{copy.selectionPrompt.openInChat}</span>
    </button>
    <SelectionPictureChip
      count={count}
      label={copy.selectionPicture.label}
      removeLabel={copy.selectionPicture.remove}
      tip={copy.selectionPicture.tip}
    />
    <button
      type="button"
      className="selection-prompt-link"
      aria-label={copy.selectionPrompt.close}
      data-tip={copy.selectionPrompt.close}
      onClick={onClose}
    >
      <Icon name="close" size={FOOT_ICON} />
    </button>
  </div>
);

export { SelectionPromptFoot };
