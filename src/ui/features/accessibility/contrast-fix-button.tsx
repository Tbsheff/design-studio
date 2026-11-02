import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ContrastFix } from "./deps.js";

interface ContrastFixButtonProps {
  readonly disabled: boolean;
  readonly fix: ContrastFix | null;
  readonly onFix: (fix: ContrastFix) => void;
}

const ContrastFixButton = ({
  disabled,
  fix,
  onFix,
}: ContrastFixButtonProps): ReactElement | null => {
  const handleApplyFix = useCallback((): void => {
    if (fix !== null) {
      onFix(fix);
    }
  }, [fix, onFix]);

  if (fix === null) {
    return null;
  }

  return (
    <button
      aria-label={copy.fixLabel(fix.token)}
      className="btn small ghost"
      data-tip={copy.fixLabel(fix.token)}
      disabled={disabled}
      type="button"
      onClick={handleApplyFix}
    >
      {copy.fixText(fix.token)}
    </button>
  );
};

export { ContrastFixButton };

export type { ContrastFixButtonProps };
