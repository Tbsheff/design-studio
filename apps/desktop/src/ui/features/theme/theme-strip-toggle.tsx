import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./theme.module.css";

const ICON_SIZE = 14;
const CHEVRON_SIZE = 12;

interface ThemeStripToggleProps {
  readonly bodyId: string;
  readonly count: number;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

const ThemeStripToggle = ({
  bodyId,
  count,
  isOpen,
  onToggle,
}: ThemeStripToggleProps): ReactElement => (
  <button
    aria-controls={bodyId}
    aria-expanded={isOpen}
    className={styles.toggle}
    data-tip={copy.generateTip}
    onClick={onToggle}
    type="button"
  >
    <Icon name="sparkle" size={ICON_SIZE} />
    <span className={styles.toggleLabel}>{copy.generateTitle}</span>
    {count > 0 && <span className={styles.toggleCount}>{count}</span>}
    <span className={styles.chevron} aria-hidden="true">
      <Icon name="chevronRight" size={CHEVRON_SIZE} />
    </span>
  </button>
);

export { ThemeStripToggle };
