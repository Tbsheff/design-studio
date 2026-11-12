import { ChipButton } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { toChipLabel } from "./token-usage-model.js";

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
  <ChipButton
    isOn={isOn}
    label={toChipLabel(count)}
    tip={COPY.usageChipTip}
    value={count}
    onPick={onToggle}
  />
);

export { TokenUsageChip };
