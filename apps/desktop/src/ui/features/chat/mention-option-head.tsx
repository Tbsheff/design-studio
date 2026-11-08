import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { mentionIcon } from "./mention-picker.js";
import type { MentionOption } from "./mention-picker.js";

const MentionOptionHead = ({
  option,
}: {
  option: MentionOption;
}): ReactElement => (
  <span className="skill-opt-head">
    <Icon name={option.icon ?? mentionIcon(option.mention)} size={14} />
    <strong className="mention-label">{option.label}</strong>
    {option.detail && option.detail !== option.label && (
      <span className="skill-origin mention-detail">{option.detail}</span>
    )}
  </span>
);

export { MentionOptionHead };
