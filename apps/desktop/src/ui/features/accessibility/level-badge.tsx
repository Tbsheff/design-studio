import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./accessibility.module.css";

interface LevelBadgeProps {
  readonly isPassing: boolean;
  readonly level: string;
}

const LevelBadge = ({ isPassing, level }: LevelBadgeProps): ReactElement => {
  let tone = styles.fail;
  let verdict: string = copy.contrastFail;

  if (isPassing) {
    tone = styles.pass;
    verdict = copy.contrastPass;
  }

  return (
    <span
      className={`${styles.badge} ${tone}`}
      data-tip={`${level} ${verdict}`}
    >
      {level}
    </span>
  );
};

export { LevelBadge };

export type { LevelBadgeProps };
