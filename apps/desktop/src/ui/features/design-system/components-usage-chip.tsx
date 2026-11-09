import { ChipButton } from "@design-studio/ui";
import type { ReactNode } from "react";

import { toChipLabel } from "./component-usage-model.js";
import { COPY } from "./copy.js";

import styles from "./component-usage.module.css";

interface ComponentsUsageChipProps {
  readonly count: number;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const ComponentsUsageChip = ({
  count,
  isOn,
  onToggle,
}: ComponentsUsageChipProps): ReactNode => (
  <div className={styles.bar}>
    <ChipButton
      isOn={isOn}
      label={toChipLabel(count)}
      tip={COPY.usageChipTip}
      value={count}
      onPick={onToggle}
    />
  </div>
);

export { ComponentsUsageChip };
