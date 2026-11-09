import { ChipButton } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { toChipLabel } from "./token-usage-model.js";

import styles from "./token-usage.module.css";

interface TokenUsageChipProps {
  readonly count: number;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const TokenUsageChip = ({
  count,
  isOn,
  onToggle,
}: TokenUsageChipProps): ReactNode => (
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

export { TokenUsageChip };
