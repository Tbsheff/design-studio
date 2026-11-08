import type { RunMention } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { GROUP_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { MentionChip } from "./mention-chip.js";
import { mentionKey } from "./mention-picker.js";

const MentionChips = ({
  mentions,
  onRemove,
}: {
  mentions: RunMention[];
  onRemove: (key: string) => void;
}): ReactElement | null => {
  if (mentions.length === 0) {
    return null;
  }

  return (
    <div
      className="skill-chips"
      role={GROUP_ROLE}
      aria-label={copy.mentionsForThis}
    >
      {mentions.map((mention) => (
        <MentionChip
          key={mentionKey(mention)}
          mention={mention}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export { MentionChips };
