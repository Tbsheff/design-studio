import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import { Icon } from "./deps.js";

const toTipSide = (tip: string | null): string | null => {
  if (tip) {
    return "top";
  }

  return null;
};

const toButtonClass = (isDanger: boolean): string => {
  if (isDanger) {
    return "thread-icon danger";
  }

  return "thread-icon";
};

const ThreadIconButton = ({
  icon,
  isDanger,
  label,
  onClick,
  size,
  testId = null,
  tip = null,
}: {
  icon: IconName;
  isDanger: boolean;
  label: string;
  onClick: () => void;
  size: number;
  testId?: string | null;
  tip?: string | null;
}): ReactElement => (
  <button
    type="button"
    className={toButtonClass(isDanger)}
    aria-label={label}
    data-tip={tip}
    data-tip-side={toTipSide(tip)}
    data-testid={testId}
    onClick={onClick}
  >
    <Icon name={icon} size={size} />
  </button>
);

export { ThreadIconButton };
