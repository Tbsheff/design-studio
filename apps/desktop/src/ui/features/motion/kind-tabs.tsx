import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { MotionKind } from "./deps.js";
import { KindTab } from "./kind-tab.js";

import styles from "./motion.module.css";

interface KindTabsProps {
  readonly disabled: boolean;
  readonly value: MotionKind;
  readonly onPick: (kind: MotionKind) => void;
}

const KINDS: readonly MotionKind[] = ["none", "transition", "entrance"];

const KindTabs = ({ disabled, value, onPick }: KindTabsProps): ReactElement => (
  <fieldset className={styles.tabs}>
    <legend className={styles.legend}>{copy.kindLabel}</legend>
    {KINDS.map((kind) => (
      <KindTab
        checked={kind === value}
        disabled={disabled}
        key={kind}
        kind={kind}
        onPick={onPick}
      />
    ))}
  </fieldset>
);

export { KindTabs };
