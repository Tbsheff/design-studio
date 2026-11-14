import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { baseName } from "../../domain/format.js";
import { copy } from "./copy.js";
import { DiffBadge } from "./diff-badge.js";
import type { FileChange } from "./tool-chips-model.js";

const fileLabel = (change: FileChange): string => {
  if (change.created) {
    return `Created ${baseName(change.path)}`;
  }

  return `Edited ${baseName(change.path)}`;
};

const toFileIcon = (change: FileChange): "doc" | "file" => {
  if (change.created) {
    return "doc";
  }

  return "file";
};

const toFileTip = (change: FileChange, action: string): string => {
  if (change.created) {
    return `${change.path} (+${change.added}, ${copy.newFile}). ${action}`;
  }

  return `${change.path} (+${change.added} −${change.removed}). ${action}`;
};

const FileChip = ({
  change,
  action,
  onOpen,
}: {
  change: FileChange;
  action: string;
  onOpen: () => void;
}): ReactElement => (
  <button
    type="button"
    className="ui-file-chip"
    data-tip-align="start"
    data-tip={toFileTip(change, action)}
    onClick={onOpen}
  >
    <Icon name={toFileIcon(change)} size={14} />
    <span className="run-change-path">{fileLabel(change)}</span>
    <DiffBadge added={change.added} removed={change.removed} />
    {change.created && <span className="diff-new">{copy.newFile}</span>}
  </button>
);

export { FileChip };
