import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FileLockHead } from "./file-lock-head.js";
import { FileLockList } from "./file-lock-list.js";
import { useFileLock } from "./use-file-lock.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly file: string | null;
}

const FileLockRow = ({ projectId, directionId, file }: Props): ReactElement => {
  const lock = useFileLock(projectId, directionId, file);

  return (
    <section className="ins-lock" aria-label={copy.lockedForClaude}>
      <FileLockHead lock={lock} />
      <FileLockList globs={lock.globs} onUnlock={lock.handleUnlock} />
      {lock.error && <p className="ins-code-error">{lock.error}</p>}
    </section>
  );
};

export { FileLockRow };
