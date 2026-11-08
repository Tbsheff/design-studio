import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const EditNotice = ({
  edits,
}: {
  edits: { notice: string | null; clearNotice: () => void };
}): ReactElement | null => {
  const handleClear = edits.clearNotice;

  if (!edits.notice) {
    return null;
  }

  return (
    <output className="edit-notice">
      <span>{edits.notice}</span>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        onClick={handleClear}
      >
        <Icon name="close" size={14} />
      </button>
    </output>
  );
};

export { EditNotice };
