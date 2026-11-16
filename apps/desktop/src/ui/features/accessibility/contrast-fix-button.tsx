import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ContrastFix } from "./deps.js";

import styles from "./accessibility.module.css";

interface ContrastFixButtonProps {
  readonly disabled: boolean;
  readonly fix: ContrastFix | null;
  readonly isDark: boolean;
  readonly onFix: (fix: ContrastFix) => void;
}

const ContrastFixButton = ({
  disabled,
  fix,
  isDark,
  onFix,
}: ContrastFixButtonProps): ReactElement | null => {
  const handleApplyFix = useCallback((): void => {
    if (fix !== null && !isDark) {
      onFix(fix);
    }
  }, [fix, isDark, onFix]);

  if (fix === null) {
    return null;
  }

  if (isDark) {
    return (
      <button
        aria-disabled="true"
        aria-label={copy.fixDarkTip}
        className={`btn small ghost ${styles.fixOff}`}
        data-tip={copy.fixDarkTip}
        type="button"
        onClick={handleApplyFix}
      >
        {copy.fixText(fix.token)}
      </button>
    );
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
