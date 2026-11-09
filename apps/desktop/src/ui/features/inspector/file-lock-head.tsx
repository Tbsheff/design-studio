import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { FileLockState } from "./use-file-lock.js";

interface Props {
  readonly lock: FileLockState;
}

const ICON_SIZE = 12;

const FileLockHead = ({ lock }: Props): ReactElement => (
  <div className="ins-lock-head">
    <span className="ins-lock-title">{copy.lockedForClaude}</span>
    <button
      type="button"
      className="btn ghost small has-icon"
      disabled={!lock.canLockFile || lock.isPending}
      data-tip={copy.lockFileTip}
      onClick={lock.handleLockFile}
    >
      <Icon name="lock" size={ICON_SIZE} />
      {copy.lockFile}
    </button>
    <button
      type="button"
      className="btn ghost small has-icon"
      disabled={!lock.canLockFolder || lock.isPending}
      data-tip={copy.lockFolderTip}
      onClick={lock.handleLockFolder}
    >
      <Icon name="lock" size={ICON_SIZE} />
      {copy.lockFolder}
    </button>
  </div>
);

export { FileLockHead };
