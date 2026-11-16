import { useMemo } from "react";
import type { ReactElement } from "react";

import { levelsOf } from "./accessibility-model.js";
import { ContrastFixButton } from "./contrast-fix-button.js";
import { copy } from "./copy.js";
import type { ContrastFix, ContrastPair } from "./deps.js";
import { LevelBadge } from "./level-badge.js";

import styles from "./accessibility.module.css";

interface ContrastRowProps {
  readonly disabled: boolean;
  readonly isDark: boolean;
  readonly pair: ContrastPair | null;
  readonly onFix: (fix: ContrastFix) => void;
}

const ContrastRow = ({
  disabled,
  isDark,
  pair,
  onFix,
}: ContrastRowProps): ReactElement => {
  const swatch = useMemo(() => {
    if (pair === null) {
      return null;
    }

    return { background: pair.background, borderColor: pair.foreground };
  }, [pair]);

  if (pair === null || swatch === null) {
    return <p className={styles.note}>{copy.noText}</p>;
  }

  const levels = levelsOf(pair);
  let fixLine: ReactElement | null = null;

  if (pair.fix !== null) {
    fixLine = (
      <div className={styles.line}>
        <span className={styles.spacer} />
        <ContrastFixButton
          disabled={disabled || pair.passes}
          fix={pair.fix}
          isDark={isDark}
          onFix={onFix}
        />
      </div>
    );
  }

  return (
    <div className={styles.contrastLines}>
      <div className={styles.line} data-tip={copy.contrastTip}>
        <span className={styles.label}>{copy.contrast}</span>
        <span aria-hidden="true" className={styles.swatch} style={swatch} />
        <span className={styles.ratio}>
          {copy.ratio(pair.ratio, pair.need)}
        </span>
        <LevelBadge isPassing={levels.aa} level={copy.aa} />
        <LevelBadge isPassing={levels.aaa} level={copy.aaa} />
      </div>
      {fixLine}
    </div>
  );
};

export { ContrastRow };

export type { ContrastRowProps };
