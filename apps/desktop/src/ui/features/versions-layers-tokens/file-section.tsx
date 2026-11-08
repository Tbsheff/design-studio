import type { VersionFileDiff } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { toFileName, toStatusWord } from "./compare-code-model.js";
import { DiffBadge } from "./diff-badge.js";
import { FilePatch } from "./file-patch.js";
import type { HunkReview } from "./use-hunk-review.js";

const CHEVRON_SIZE = 14;

interface FileSectionProps {
  readonly file: VersionFileDiff;
  readonly isOpen: boolean;
  readonly onToggle: (path: string) => void;
  readonly review: HunkReview;
}

const FileSection = ({
  file,
  isOpen,
  onToggle,
  review,
}: FileSectionProps): ReactNode => {
  const name = toFileName(file);

  const handleToggle = useCallback((): void => {
    onToggle(file.path);
  }, [file.path, onToggle]);

  let chevron: "chevronDown" | "chevronRight" = "chevronRight";

  if (isOpen) {
    chevron = "chevronDown";
  }

  return (
    <li className="compare-code-file">
      <button
        type="button"
        className="compare-code-head"
        aria-expanded={isOpen}
        onClick={handleToggle}
        data-tip={name}
      >
        <Icon name={chevron} size={CHEVRON_SIZE} />
        <span className="compare-code-path truncate mono">{name}</span>
        <span className={`compare-code-status ${file.status}`}>
          {toStatusWord(file.status)}
        </span>
        <DiffBadge additions={file.additions} deletions={file.deletions} />
      </button>
      {isOpen && <FilePatch file={file} review={review} />}
    </li>
  );
};

export { FileSection };
