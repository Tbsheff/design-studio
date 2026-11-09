import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly glob: string;
  readonly onUnlock: (glob: string) => void;
}

const ICON_SIZE = 12;

const FileLockGlob = ({ glob, onUnlock }: Props): ReactElement => {
  const handleUnlockGlob = useCallback((): void => {
    onUnlock(glob);
  }, [glob, onUnlock]);

  return (
    <li className="ins-lock-item">
      <Icon name="lock" size={ICON_SIZE} />
      <span className="ins-lock-glob" data-tip={glob}>
        {glob}
      </span>
      <button
        type="button"
        className="btn ghost small"
        aria-label={`${copy.unlock} ${glob}`}
        data-tip={copy.unlockTip}
        onClick={handleUnlockGlob}
      >
        <Icon name="unlock" size={ICON_SIZE} />
      </button>
    </li>
  );
};

export { FileLockGlob };
