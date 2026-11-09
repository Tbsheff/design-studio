import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FileLockGlob } from "./file-lock-glob.js";

interface Props {
  readonly globs: readonly string[];
  readonly onUnlock: (glob: string) => void;
}

const FileLockList = ({ globs, onUnlock }: Props): ReactElement => {
  if (globs.length === 0) {
    return <p className="ins-lock-empty">{copy.nothingLocked}</p>;
  }

  return (
    <ul className="ins-lock-list">
      {globs.map((glob) => (
        <FileLockGlob key={glob} glob={glob} onUnlock={onUnlock} />
      ))}
    </ul>
  );
};

export { FileLockList };
