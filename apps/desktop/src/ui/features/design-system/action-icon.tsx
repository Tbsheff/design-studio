import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const ICON_SIZE = 14;

const ActionIcon = ({ isShown }: { isShown: boolean }): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return <Icon name="download" size={ICON_SIZE} />;
};

export { ActionIcon };
