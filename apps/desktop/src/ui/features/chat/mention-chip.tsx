import type { RunMention } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import {
  mentionIcon,
  mentionKey,
  mentionLabel,
  mentionTitle,
} from "./mention-picker.js";

const MentionChip = ({
  mention,
  onRemove,
}: {
  mention: RunMention;
  onRemove: (key: string) => void;
}): ReactElement => {
  const key = mentionKey(mention);
  const remove = useCallback(() => onRemove(key), [onRemove, key]);

  return (
    <span
      className="skill-chip mention-chip"
      data-tip-side="top"
      data-tip={mentionTitle(mention)}
      data-testid="mention-chip"
    >
      <Icon name={mentionIcon(mention)} size={12} />
      {mentionLabel(mention)}
      <button
        type="button"
        aria-label={`Remove ${mentionLabel(mention)}`}
        onClick={remove}
      >
        <Icon name="close" size={11} />
      </button>
    </span>
  );
};

export { MentionChip };
