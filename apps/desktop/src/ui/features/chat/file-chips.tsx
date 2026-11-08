import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FileChip } from "./file-chip.js";
import type { FileChange } from "./tool-chips-model.js";

const FileChips = ({
  changes,
  isQuiet,
  hasReview,
  onOpen,
}: {
  changes: FileChange[];
  isQuiet: boolean;
  hasReview: boolean;
  onOpen: () => void;
}): ReactElement | null => {
  let action = "Open run details";

  if (hasReview) {
    action = "Review the changes";
  }

  if (changes.length === 0 && isQuiet) {
    return <p className="run-no-changes">{copy.noFilesChanged}</p>;
  }

  if (changes.length === 0) {
    return null;
  }

  return (
    <ul
      className="run-changes"
      aria-label={copy.changedFiles}
      data-testid="run-changes"
    >
      {changes.map((change) => (
        <li key={change.path} className="run-change">
          <FileChip change={change} action={action} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
};

export { FileChips };
