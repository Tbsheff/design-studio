import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import { pick } from "./pick.js";

const ROW_ICON_SIZE = 12;
const ICON_SIZE = 14;

interface Props {
  readonly icon: IconName;
  readonly isBusy: boolean;
  readonly isOpen: boolean;
  readonly isRow: boolean;
  readonly text: string;
}

const CopyCodeTriggerContent = ({
  icon,
  isBusy,
  isOpen,
  isRow,
  text,
}: Props): ReactElement => {
  if (isRow) {
    return (
      <>
        <span>{text}</span>
        <Icon
          name={pick(isOpen, "chevronDown", "chevronRight")}
          size={ROW_ICON_SIZE}
        />
      </>
    );
  }

  if (isBusy) {
    return <span className="spinner" />;
  }

  return <Icon name={icon} size={ICON_SIZE} />;
};

export { CopyCodeTriggerContent };
